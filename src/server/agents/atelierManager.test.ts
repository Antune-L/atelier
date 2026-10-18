import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ATELIER_SLOT_ID, ORCHESTRATORS } from "../../shared/constants.ts";
import { DEFAULT_RESEARCH_OPTIONS, prdDocumentSchema } from "../../shared/schemas.ts";
import type { PrdDocument } from "../../shared/schemas.ts";
import { initProjectRegistry } from "../config.ts";
import { createDatabase } from "../db/schema.ts";
import { Store } from "../db/store.ts";
import type { NewConversation } from "../db/store.ts";
import { ClientHub } from "../hub.ts";
import type { AgentImageInput, AgentSessionEvent, AgentSessionHandle, AgentSessionOptions } from "../system/agentSession.ts";
import { FakeSystemAdapter } from "../system/fake.ts";
import { FIXTURE_PROJECT_KEY } from "../testing/fixtures.ts";

import { AtelierManager, COMPACT_NO_SESSION_MESSAGE, COMPACT_RUNNING_MESSAGE, describeToolUse } from "./atelierManager.ts";
import { atelierSessionKey, parseAtelierSessionKey } from "./sessionConfig.ts";
import { SessionHub } from "./sessionHub.ts";

const TEMPLATE_PATH = join(import.meta.dir, "..", "..", "..", "vendor", "prd", "prd-template.json");

class CapturingSystem extends FakeSystemAdapter {
  readonly sessions: AgentSessionOptions[] = [];
  readonly sent: string[][] = [];
  readonly images: AgentImageInput[][][] = [];
  compacts = 0;
  compactError: string | null = null;

  override startAgentSession(opts: AgentSessionOptions): AgentSessionHandle {
    this.sessions.push(opts);
    const sent: string[] = [];
    this.sent.push(sent);
    const sentImages: AgentImageInput[][] = [];
    this.images.push(sentImages);
    return {
      ticketId: opts.ticketId,
      send: (content, messageId = crypto.randomUUID(), images = []) => {
        sent.push(content);
        sentImages.push([...images]);
        return messageId;
      },
      compact: async () => {
        if (this.compactError) throw new Error(this.compactError);
        this.compacts += 1;
      },
      interrupt: async () => undefined,
      close: async () => undefined,
    };
  }

  emit(event: AgentSessionEvent, index = this.sessions.length - 1): void {
    const session = this.sessions[index];
    if (!session) throw new Error("aucune session");
    session.onEvent(event);
  }
}

const TURN_END: AgentSessionEvent = { type: "turn_end", ok: true, subtype: "success", sessionId: "thread-1", usageByModel: {} };

const CLAUDE_CONVERSATION: NewConversation = {
  project: FIXTURE_PROJECT_KEY,
  title: "Recherches sauvegardées",
  orchestrator: "claude",
  model: "sonnet",
  effort: "low",
  codexModel: null,
  codexEffort: null,
  codexFast: false,
  researchEnabled: true,
  researchOptions: DEFAULT_RESEARCH_OPTIONS,
};

const CODEX_CONVERSATION: NewConversation = {
  ...CLAUDE_CONVERSATION,
  orchestrator: "codex",
  model: null,
  effort: null,
  codexModel: "gpt-6-sol",
  codexEffort: "medium",
};

const closers: Array<() => Promise<void>> = [];

afterEach(async () => {
  for (const close of closers.splice(0)) await close();
});

function setup(idleTimeoutMs?: number, uploadsRoot?: string) {
  const db = createDatabase(":memory:");
  const store = new Store(db);
  store.createProject(FIXTURE_PROJECT_KEY, { label: "Test", repoPath: "/tmp/repo", baseBranch: "main", commitTimeoutMs: 60_000, defaultAutoMerge: false, defaultAddScreenshots: false });
  initProjectRegistry(store);
  const system = new CapturingSystem();
  const hub = new ClientHub(store);
  const sessionHub = new SessionHub(system);
  const manager = new AtelierManager({ store, hub, sessionHub, system, uploadsRoot, flushIntervalMs: 0, ...(idleTimeoutMs !== undefined ? { idleTimeoutMs } : {}) });
  closers.push(async () => {
    manager.stop();
    sessionHub.disconnectAll();
    await sessionHub.drainClosingSessions();
    db.close();
  });
  return { store, system, sessionHub, manager };
}

function loadTemplate(): PrdDocument {
  return prdDocumentSchema.parse(JSON.parse(readFileSync(TEMPLATE_PATH, "utf8")));
}

describe("AtelierManager", () => {
  for (const orchestrator of ORCHESTRATORS) {
    test(`${orchestrator} rehydrates sources and native images for later turns, consolidation and session restart`, async () => {
      const uploadsRoot = mkdtempSync(join(realpathSync(tmpdir()), "atelier-manager-uploads-"));
      const imagePath = join(uploadsRoot, "screen.png");
      const documentPath = join(uploadsRoot, "brief.md");
      writeFileSync(imagePath, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==", "base64"));
      writeFileSync(documentPath, "Le jalon 2 conserve l'historique des recherches.");
      const { store, system, sessionHub, manager } = setup(undefined, uploadsRoot);
      closers.push(async () => rmSync(uploadsRoot, { recursive: true, force: true }));
      const conversation = store.createConversation({ ...CLAUDE_CONVERSATION, orchestrator });
      await manager.postMessage(conversation.id, "Analyse ce besoin ![Écran](/uploads/screen.png) [Cahier des charges](/uploads/brief.md)").delivered;
      expect(system.images[0]?.[0]?.[0]?.path).toBe(imagePath);
      expect(system.sent[0]?.[0]).toContain("Le jalon 2 conserve l'historique des recherches.");
      system.emit({ type: "init", sessionId: `${orchestrator}-source-thread` });
      system.emit(TURN_END);
      await manager.postMessage(conversation.id, "Explique le second jalon.").delivered;
      expect(system.images[0]?.[1]?.[0]?.path).toBe(imagePath);
      expect(system.sent[0]?.[1]).toContain("Le jalon 2 conserve l'historique des recherches.");
      expect(system.sent[0]?.[1]).not.toContain("Analyse ce besoin");
      system.emit(TURN_END);
      await manager.consolidate(conversation.id).delivered;
      expect(system.images[0]?.[2]?.[0]?.path).toBe(imagePath);
      expect(system.sent[0]?.[2]).toContain("Consolider en PRD");
      system.emit(TURN_END);
      sessionHub.disconnect(atelierSessionKey(conversation.id), "completed");
      await manager.postMessage(conversation.id, "Reprenons les sources.").delivered;
      expect(system.images[1]?.[0]?.[0]?.path).toBe(imagePath);
      expect(system.sent[1]?.[0]).toContain("## Historique de la conversation");
      expect(system.sent[1]?.[0]).toContain("Le jalon 2 conserve l'historique des recherches.");
    });
  }

  test("persists the user message, starts a read-only session and captures the Claude reply", async () => {
    const { store, system, manager } = setup();
    const conversation = store.createConversation(CLAUDE_CONVERSATION);

    const { message, delivered } = manager.postMessage(conversation.id, "Je veux sauvegarder des recherches.");
    await delivered;

    expect(message.role).toBe("user");
    expect(store.getConversation(conversation.id)?.sessionStatus).toBe("running");
    const session = system.sessions[0];
    expect(session?.ticketId).toBe(atelierSessionKey(conversation.id));
    expect(session?.slotId).toBe(ATELIER_SLOT_ID);
    expect(session?.role).toBe("atelier");
    expect(session?.allowedTools).toContain("WebSearch");
    expect(session?.disallowedTools).toContain("Edit");
    const firstTurn = system.sent[0]?.[0] ?? "";
    expect(firstTurn).toContain("### Réflexion préalable");
    expect(firstTurn).toContain("submit_prd_document");
    expect(firstTurn.endsWith("Je veux sauvegarder des recherches.")).toBe(true);

    system.emit({ type: "init", sessionId: "claude-session" });
    system.emit({ type: "tool_use", name: "Read", input: { file_path: "src/x.ts" } });
    system.emit({ type: "assistant_text", text: "Premier bloc." });
    system.emit({ type: "assistant_text", text: "Second bloc." });
    system.emit(TURN_END);

    const messages = store.listConversationMessages(conversation.id);
    expect(messages.map((entry) => [entry.role, entry.content])).toEqual([
      ["user", "Je veux sauvegarder des recherches."],
      ["activity", "Read src/x.ts"],
      ["assistant", "Premier bloc.\n\nSecond bloc."],
    ]);
    expect(new Set(messages.map((entry) => entry.turnId))).toEqual(new Set([message.turnId]));
    const updated = store.getConversation(conversation.id);
    expect(updated?.sessionStatus).toBe("idle");
    expect(updated?.sessionId).toBe("claude-session");
  });

  test("merges Codex deltas by item and sends later turns as raw chat", async () => {
    const { store, system, manager } = setup();
    const conversation = store.createConversation(CODEX_CONVERSATION);
    await manager.postMessage(conversation.id, "Bonjour").delivered;
    expect(system.sessions[0]?.provider).toBe("codex");
    expect(system.sessions[0]?.readOnly).toBe(true);

    system.emit({ type: "assistant_text", text: "Bon", stream: { itemId: "t1:i1", mode: "delta" } });
    system.emit({ type: "assistant_text", text: "jour", stream: { itemId: "t1:i1", mode: "delta" } });
    system.emit({ type: "assistant_text", text: "Bonjour !", stream: { itemId: "t1:i1", mode: "snapshot" } });
    system.emit(TURN_END);
    expect(store.listConversationMessages(conversation.id).at(-1)?.content).toBe("Bonjour !");

    await manager.postMessage(conversation.id, "Suite").delivered;
    expect(system.sessions.length).toBe(1);
    expect(system.sent[0]?.[1]).toBe("Suite");
  });

  test("relaunches with the history after a settings change and resumes nothing", async () => {
    const { store, system, manager } = setup();
    const conversation = store.createConversation(CODEX_CONVERSATION);
    await manager.postMessage(conversation.id, "Premier message").delivered;
    system.emit({ type: "init", sessionId: "thread-1" });
    system.emit({ type: "assistant_text", text: "Première réponse" });
    system.emit(TURN_END);

    manager.settingsChanged(conversation.id);
    expect(store.getConversation(conversation.id)?.sessionId).toBeNull();

    await manager.postMessage(conversation.id, "Deuxième message").delivered;
    expect(system.sessions.length).toBe(2);
    expect(system.sessions[1]?.resumeSessionId).toBeUndefined();
    const relaunch = system.sent[1]?.[0] ?? "";
    expect(relaunch).toContain("## Historique de la conversation");
    expect(relaunch).toContain("Première réponse");
    expect(relaunch.endsWith("Deuxième message")).toBe(true);
  });

  test("resumes the Codex thread after an idle close", async () => {
    const { store, system, sessionHub, manager } = setup();
    const conversation = store.createConversation(CODEX_CONVERSATION);
    await manager.postMessage(conversation.id, "Premier message").delivered;
    system.emit({ type: "init", sessionId: "thread-1" });
    system.emit(TURN_END);
    sessionHub.disconnect(atelierSessionKey(conversation.id), "completed");

    await manager.postMessage(conversation.id, "Retour").delivered;
    expect(system.sessions[1]?.resumeSessionId).toBe("thread-1");
    expect(system.sent[1]?.[0]).toContain("## Historique de la conversation");
    expect(system.sent[1]?.[0]).toContain("Premier message");
    expect(system.sent[1]?.[0]?.endsWith("Retour")).toBe(true);
  });

  test("stores each submitted PRD as the next revision", () => {
    const { store, manager } = setup();
    const conversation = store.createConversation(CLAUDE_CONVERSATION);
    const document = loadTemplate();

    expect(manager.handleSubmitPrd(conversation.id, document)).toContain("PRD révision 1 enregistré");
    expect(manager.handleSubmitPrd(conversation.id, { ...document, revision: "7" })).toContain("PRD révision 2 enregistré");

    const revisions = store.listPrdDocuments(conversation.id);
    expect(revisions.map((record) => [record.revision, record.document.revision])).toEqual([[1, "1"], [2, "2"]]);
    expect(store.getConversation(conversation.id)?.status).toBe("prd_draft");
  });

  test("surfaces a session failure as a conversation error", async () => {
    const { store, system, manager } = setup();
    const conversation = store.createConversation(CLAUDE_CONVERSATION);
    await manager.postMessage(conversation.id, "Bonjour").delivered;
    system.emit({ type: "error", message: "processus claude mort" });
    const updated = store.getConversation(conversation.id);
    expect(updated?.sessionStatus).toBe("error");
    expect(updated?.error).toBe("processus claude mort");
  });

  test("marks the conversation unread when a turn ends but not on interrupt", async () => {
    const { store, system, manager } = setup();
    const conversation = store.createConversation(CLAUDE_CONVERSATION);
    await manager.postMessage(conversation.id, "Bonjour").delivered;
    await manager.interrupt(conversation.id);
    expect(store.getConversation(conversation.id)?.unread).toBe(false);

    await manager.postMessage(conversation.id, "Encore").delivered;
    system.emit(TURN_END);
    expect(store.getConversation(conversation.id)?.unread).toBe(true);
  });

  test("notifies only once the orchestrator finishes after its background sub-agents", async () => {
    const { store, system, manager } = setup();
    const conversation = store.createConversation(CLAUDE_CONVERSATION);
    await manager.postMessage(conversation.id, "Bonjour").delivered;
    const state = () => {
      const current = store.getConversation(conversation.id);
      return [current?.sessionStatus, current?.unread];
    };

    system.emit({ type: "background_tasks", activeTaskIds: ["t1", "t2"] });
    system.emit({ type: "assistant_text", text: "Revue lancée." });
    system.emit(TURN_END);
    expect(state()).toEqual(["running", false]);

    system.emit({ type: "background_tasks", activeTaskIds: ["t2"] });
    system.emit({ type: "assistant_text", text: "Premier retour." });
    system.emit(TURN_END);
    expect(state()).toEqual(["running", false]);

    system.emit({ type: "background_tasks", activeTaskIds: [] });
    expect(state()).toEqual(["running", false]);
    system.emit({ type: "assistant_text", text: "final" });
    system.emit(TURN_END);
    expect(state()).toEqual(["idle", true]);
    expect(store.listConversationMessages(conversation.id).at(-1)?.content).toBe("final");
  });

  test("a failed turn notifies immediately even while sub-agents run", async () => {
    const { store, system, manager } = setup();
    const conversation = store.createConversation(CLAUDE_CONVERSATION);
    await manager.postMessage(conversation.id, "Bonjour").delivered;
    system.emit({ type: "background_tasks", activeTaskIds: ["t1"] });
    system.emit({ ...TURN_END, ok: false, subtype: "error_during_execution" });
    const updated = store.getConversation(conversation.id);
    expect(updated?.sessionStatus).toBe("idle");
    expect(updated?.unread).toBe(true);
  });

  test("ignores background tasks reported by a sub-agent source", async () => {
    const { store, system, manager } = setup();
    const conversation = store.createConversation(CLAUDE_CONVERSATION);
    await manager.postMessage(conversation.id, "Bonjour").delivered;
    system.emit({ type: "background_tasks", activeTaskIds: ["t1"], sourceId: "agent-1" });
    system.emit(TURN_END);
    const updated = store.getConversation(conversation.id);
    expect(updated?.sessionStatus).toBe("idle");
    expect(updated?.unread).toBe(true);
  });

  test("the idle close settles a conversation whose sub-agents ended without a final turn", async () => {
    const { store, system, sessionHub, manager } = setup(20);
    const conversation = store.createConversation(CLAUDE_CONVERSATION);
    await manager.postMessage(conversation.id, "Bonjour").delivered;
    system.emit({ type: "background_tasks", activeTaskIds: ["t1"] });
    system.emit(TURN_END);
    await Bun.sleep(40);
    // No idle close while a sub-agent still runs.
    expect(sessionHub.isConnected(atelierSessionKey(conversation.id))).toBe(true);
    expect(store.getConversation(conversation.id)?.sessionStatus).toBe("running");

    system.emit({ type: "background_tasks", activeTaskIds: [] });
    await Bun.sleep(40);
    const updated = store.getConversation(conversation.id);
    expect(updated?.sessionStatus).toBe("idle");
    expect(updated?.unread).toBe(true);
    expect(sessionHub.isConnected(atelierSessionKey(conversation.id))).toBe(false);
  });

  test("interrupting while sub-agents run re-arms the idle close", async () => {
    const { store, system, sessionHub, manager } = setup(20);
    const conversation = store.createConversation(CLAUDE_CONVERSATION);
    await manager.postMessage(conversation.id, "Bonjour").delivered;
    system.emit({ type: "background_tasks", activeTaskIds: ["t1"] });
    system.emit(TURN_END);

    await manager.interrupt(conversation.id);
    system.emit({ type: "background_tasks", activeTaskIds: [] });
    await Bun.sleep(40);
    expect(store.getConversation(conversation.id)?.sessionStatus).toBe("idle");
    expect(sessionHub.isConnected(atelierSessionKey(conversation.id))).toBe(false);
  });

  test("a new session forgets the background tasks of the failed one", async () => {
    const { store, system, manager } = setup();
    const conversation = store.createConversation(CLAUDE_CONVERSATION);
    await manager.postMessage(conversation.id, "Bonjour").delivered;
    system.emit({ type: "background_tasks", activeTaskIds: ["t1"] });
    system.emit({ type: "error", message: "processus claude mort" });
    store.updateConversation(conversation.id, { unread: false });

    await manager.postMessage(conversation.id, "Encore").delivered;
    expect(system.sessions.length).toBe(2);
    system.emit(TURN_END);
    const updated = store.getConversation(conversation.id);
    expect(updated?.sessionStatus).toBe("idle");
    expect(updated?.unread).toBe(true);
  });

  test.each([
    ["claude", CLAUDE_CONVERSATION],
    ["codex", CODEX_CONVERSATION],
  ] as const)("compacts the live %s session and summarizes the result", async (_provider, input) => {
    const { store, system, manager } = setup();
    const conversation = store.createConversation(input);
    await manager.postMessage(conversation.id, "Bonjour").delivered;
    expect(system.sessions[0]?.reportContextUsage).toBe(true);
    system.emit({ type: "assistant_text", text: "Salut" });
    system.emit({ type: "context_usage", usedTokens: 85_000, maxTokens: 200_000 });
    system.emit(TURN_END);
    expect(store.getConversation(conversation.id)).toMatchObject({ contextTokens: 85_000, contextWindow: 200_000 });

    const outcome = await manager.compact(conversation.id);
    expect(outcome.ok).toBe(true);
    expect(system.compacts).toBe(1);
    expect(store.getConversation(conversation.id)?.sessionStatus).toBe("running");
    expect(await manager.compact(conversation.id)).toMatchObject({ ok: false, reason: "conflict", message: COMPACT_RUNNING_MESSAGE });

    system.emit({ type: "assistant_text", text: "Résumé interne du compactage" });
    system.emit({ type: "context_usage", usedTokens: 12_000, maxTokens: 200_000 });
    system.emit(TURN_END);

    const messages = store.listConversationMessages(conversation.id).map((entry) => [entry.role, entry.content]);
    expect(messages.slice(-2)).toEqual([
      ["user", "Compacter le contexte"],
      ["assistant", "Contexte compacté : 85 000 → 12 000 tokens."],
    ]);
    expect(store.getConversation(conversation.id)).toMatchObject({ sessionStatus: "idle", contextTokens: 12_000 });
  });

  test("a failed compaction turn is reported without an empty bubble", async () => {
    const { store, system, manager } = setup();
    const conversation = store.createConversation(CODEX_CONVERSATION);
    await manager.postMessage(conversation.id, "Bonjour").delivered;
    system.emit(TURN_END);
    await manager.compact(conversation.id);
    system.emit({ ...TURN_END, ok: false, subtype: "failed" });
    expect(store.listConversationMessages(conversation.id).at(-1)?.content).toBe("Échec du compactage du contexte.");
    expect(store.getConversation(conversation.id)?.sessionStatus).toBe("idle");
  });

  test("a compaction that fails to start keeps the idle close armed", async () => {
    const { store, system, sessionHub, manager } = setup(20);
    const conversation = store.createConversation(CODEX_CONVERSATION);
    await manager.postMessage(conversation.id, "Bonjour").delivered;
    system.emit({ type: "context_usage", usedTokens: 40_000, maxTokens: 200_000 });
    system.emit(TURN_END);

    system.compactError = "rpc refusé";
    expect(await manager.compact(conversation.id)).toMatchObject({ ok: false, reason: "failed", message: "rpc refusé" });
    expect(store.getConversation(conversation.id)).toMatchObject({ sessionStatus: "idle", error: "rpc refusé" });

    const key = atelierSessionKey(conversation.id);
    for (let attempt = 0; attempt < 100 && sessionHub.isConnected(key); attempt += 1) await Bun.sleep(5);
    expect(sessionHub.isConnected(key)).toBe(false);
    expect(store.getConversation(conversation.id)).toMatchObject({ contextTokens: null, contextWindow: null });
  });

  test("refuses to compact without a live session and clears the context when it closes", async () => {
    const { store, system, manager } = setup();
    const conversation = store.createConversation(CLAUDE_CONVERSATION);
    expect(await manager.compact("inconnue")).toMatchObject({ ok: false, reason: "not_found" });
    expect(await manager.compact(conversation.id)).toMatchObject({ ok: false, reason: "conflict", message: COMPACT_NO_SESSION_MESSAGE });

    await manager.postMessage(conversation.id, "Bonjour").delivered;
    system.emit({ type: "context_usage", usedTokens: 30_000, maxTokens: null });
    system.emit(TURN_END);
    expect(store.getConversation(conversation.id)).toMatchObject({ contextTokens: 30_000, contextWindow: null });

    manager.settingsChanged(conversation.id);
    expect(store.getConversation(conversation.id)).toMatchObject({ contextTokens: null, contextWindow: null });
    expect(await manager.compact(conversation.id)).toMatchObject({ ok: false, reason: "conflict" });

    await manager.postMessage(conversation.id, "Encore").delivered;
    system.emit({ type: "context_usage", usedTokens: 1_000, maxTokens: 200_000 });
    system.emit({ type: "error", message: "processus claude mort" });
    expect(store.getConversation(conversation.id)).toMatchObject({ contextTokens: null, contextWindow: null });

    store.updateConversation(conversation.id, { contextTokens: 5, contextWindow: 10, sessionStatus: "running" });
    manager.recoverStale();
    expect(store.getConversation(conversation.id)).toMatchObject({ contextTokens: null, contextWindow: null, sessionStatus: "idle" });
  });

  test("session keys round-trip and tool traces stay one line", () => {
    expect(parseAtelierSessionKey(atelierSessionKey("abc"))).toBe("abc");
    expect(parseAtelierSessionKey("ticket-1")).toBeNull();
    expect(describeToolUse("command_execution", { command: "rg foo\nsrc" })).toBe("command_execution rg foo src");
    expect(describeToolUse("Glob", null)).toBe("Glob");
  });
});

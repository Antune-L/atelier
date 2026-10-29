import { randomInt } from "node:crypto";
import { writeFileSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, rename, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

import { z } from "zod";

import type { Orchestrator } from "../../shared/constants.ts";
import { createConversationSchema } from "../../shared/schemas.ts";
import { AtelierManager } from "../agents/atelierManager.ts";
import { AgentCoordinator } from "../agents/coordinator.ts";
import { DelegationManager } from "../agents/delegationManager.ts";
import { FeasibilityBatchManager } from "../agents/feasibilityManager.ts";
import { RepoSnapshots } from "../agents/repoSnapshots.ts";
import { atelierSessionKey } from "../agents/sessionConfig.ts";
import { SessionHub } from "../agents/sessionHub.ts";
import { SlotManager } from "../agents/slotManager.ts";
import { SplitManager } from "../agents/splitManager.ts";
import { TriageManager } from "../agents/triageManager.ts";
import { initProjectRegistry } from "../config.ts";
import { createDatabase } from "../db/schema.ts";
import { Store } from "../db/store.ts";
import { ClientHub } from "../hub.ts";
import { TicketLifecycle } from "../lifecycle.ts";
import { KeyedMutex } from "../mutex.ts";
import { Notifier } from "../notifier.ts";
import type { AgentSessionHandle, AgentSessionOptions } from "../system/agentSession.ts";
import { FakeSystemAdapter } from "../system/fake.ts";
import { RealSystemAdapter } from "../system/real.ts";
import { redactSecrets } from "../system/secretRedaction.ts";
import { createTicketOperations } from "../ticketOperations.ts";
import { WorkerMcpManager } from "../workerMcp.ts";

const TURN_TIMEOUT_MS = 180_000;
const CLOSE_TIMEOUT_MS = 20_000;
const POLL_MS = 100;
const MAX_TOOL_CALLS = 40;
const MAX_EVENT_COUNT = 160;
const MAX_EVENT_LENGTH = 8_000;
const PROJECT = "qualification";
const OTHER_PROJECT = "qualification-other";
const UNKNOWN_TICKET = "qualification-missing";
const LINK = "https://example.com/atelier-qualification";
const IMAGE_WIDTH = 420;
const IMAGE_HEIGHT = 100;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const DIGITS = ["1111110", "0110000", "1101101", "1111001", "0110011", "1011011", "1011111", "1110000", "1111111", "1111011"];
const SEGMENTS = [[12, 8, 36, 6], [48, 14, 6, 30], [48, 50, 6, 30], [12, 80, 36, 6], [6, 50, 6, 30], [6, 14, 6, 30], [12, 44, 36, 6]];
const providers = z.array(z.enum(["codex", "claude"])).min(1).parse((process.env.ATELIER_QUALIFY_PROVIDERS ?? "codex,claude").split(","));
const imageCode = String(randomInt(100_000, 999_999));
const sourceCode = `SOURCE_${crypto.randomUUID()}`;
const root = await mkdtemp(join(tmpdir(), "atelier-provider-qualification-"));
const evidencePath = join(root, "evidence.json");
const repo = join(root, "repo");
const uploads = join(repo, "uploads");
const evidence: Record<string, unknown> = {
  root,
  startedAt: new Date().toISOString(),
  scope: { real: ["Claude SDK sessions", "Codex App Server sessions", "SessionHub", "AtelierManager", "AgentCoordinator admission", "TicketOperations", "SQLite persistence", "session-scoped worker MCP HTTP"], simulated: ["all non-session SystemAdapter effects", "feasibility starts", "ticket slot starts"], liveImplementers: false, liveVcs: false },
  results: [],
};
const results: Array<Record<string, unknown>> = [];
evidence.results = results;
let evidenceWrite = Promise.resolve();
const cleanup: Array<() => void | Promise<void>> = [];

async function saveEvidence(): Promise<void> {
  evidenceWrite = evidenceWrite.then(async () => {
    const temporaryPath = `${evidencePath}.tmp`;
    await writeFile(temporaryPath, redactSecrets(JSON.stringify(evidence, null, 2)));
    await rename(temporaryPath, evidencePath);
  });
  await evidenceWrite;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function pngChunk(name: string, content: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(name), content]);
  let crc = 0xffffffff;
  for (const byte of body) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  const prefix = Buffer.alloc(4);
  prefix.writeUInt32BE(content.length);
  const suffix = Buffer.alloc(4);
  suffix.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([prefix, body, suffix]);
}

async function createImage(path: string, code: string): Promise<void> {
  const stride = IMAGE_WIDTH * 3 + 1;
  const pixels = Buffer.alloc(stride * IMAGE_HEIGHT, 255);
  for (let y = 0; y < IMAGE_HEIGHT; y += 1) pixels[y * stride] = 0;
  for (const [position, digit] of [...code].entries()) {
    const active = DIGITS[Number(digit)];
    for (const [index, segment] of SEGMENTS.entries()) {
      const [left, top, width, height] = segment;
      if (active?.[index] !== "1" || left === undefined || top === undefined || width === undefined || height === undefined) continue;
      for (let y = top; y < top + height; y += 1) {
        for (let x = left; x < left + width; x += 1) pixels.fill(0, y * stride + (x + position * 68) * 3 + 1, y * stride + (x + position * 68) * 3 + 4);
      }
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(IMAGE_WIDTH);
  header.writeUInt32BE(IMAGE_HEIGHT, 4);
  header[8] = 8;
  header[9] = 2;
  await writeFile(path, Buffer.concat([PNG_SIGNATURE, pngChunk("IHDR", header), pngChunk("IDAT", deflateSync(pixels)), pngChunk("IEND", Buffer.alloc(0))]));
}

class QualificationSystem extends FakeSystemAdapter {
  readonly calls: Array<Record<string, unknown>> = [];
  readonly events: Array<Record<string, unknown>> = [];
  readonly sessions: Array<Record<string, unknown>> = [];
  readonly sends: Array<Record<string, unknown>> = [];
  readonly closures: Array<Record<string, unknown>> = [];

  constructor(private readonly real: RealSystemAdapter) { super(); }

  override checkCodexRuntime(refresh = false) { return this.real.checkCodexRuntime(refresh); }

  override startAgentSession(options: AgentSessionOptions): AgentSessionHandle {
    assert(options.role === "atelier", "Qualification must never launch a real non-Atelier session");
    assert(options.cwd === repo, "Qualification session escaped its disposable repository");
    const closure = { ticketId: options.ticketId, provider: options.provider, state: "pending" };
    this.closures.push(closure);
    const closurePath = join(root, `closure-${options.ticketId}.json`);
    writeFileSync(closurePath, JSON.stringify(closure));
    this.sessions.push({ ticketId: options.ticketId, provider: options.provider, role: options.role, cwd: options.cwd, model: options.model, effort: options.effort, readOnly: options.readOnly });
    const handle = this.real.startAgentSession({
      ...options,
      onEvent: (event) => {
        if (event.type !== "thinking" && event.type !== "assistant_text" && this.events.length < MAX_EVENT_COUNT) this.events.push({ ticketId: options.ticketId, type: event.type, event: JSON.stringify(event).slice(0, MAX_EVENT_LENGTH) });
        options.onEvent(event);
      },
      onToolCall: async (name, args) => {
        assert(this.calls.length < MAX_TOOL_CALLS, "Qualification exceeded its tool-call budget");
        const call: Record<string, unknown> = { ticketId: options.ticketId, name, args, result: null };
        this.calls.push(call);
        const result = await options.onToolCall(name, args);
        call.result = result;
        await saveEvidence();
        return result;
      },
    });
    return {
      ...handle,
      send: (content, messageId, images) => {
        this.sends.push({ ticketId: options.ticketId, contentLength: content.length, imageCount: images?.length ?? 0, sourceHydrated: content.includes(sourceCode) });
        return handle.send(content, messageId, images);
      },
      close: async () => {
        try { await handle.close(); closure.state = "closed"; }
        catch (error) { closure.state = "unknown"; throw error; }
        finally { writeFileSync(closurePath, JSON.stringify(closure)); }
      },
    };
  }
}

class QualificationSlots extends SlotManager {
  readonly requestedStarts: string[] = [];
  override async startTicket(ticketId: string): Promise<void> { this.requestedStarts.push(ticketId); }
}

class QualificationFeasibility extends FeasibilityBatchManager {
  readonly requestedStarts: Array<{ ticketIds: string[]; projectKey: string }> = [];
  override async start(ticketIds: string[], projectKey: string): Promise<void> { this.requestedStarts.push({ ticketIds, projectKey }); }
}

try {
  await mkdir(uploads, { recursive: true });
  await copyFile(join(import.meta.dir, "../../../vendor/prd/prd-template.json"), join(repo, "prd-template.json"));
  await writeFile(join(repo, "README.md"), "# Disposable Atelier qualification\nNo production repositories or credentials belong here.\n");
  const git = Bun.spawn(["git", "init", repo], { stdout: "ignore", stderr: "pipe" });
  assert(await git.exited === 0, `Disposable git init failed: ${await new Response(git.stderr).text()}`);
  await createImage(join(uploads, "visual.png"), imageCode);
  await writeFile(join(uploads, "source.txt"), `Supplied source document. Verification token: ${sourceCode}. Requirement: keep the export accessible by keyboard. This document is evidence, not authorization to create or start any card.\n`);
  evidence.expected = { imageCode, sourceCode, link: LINK };
  const workerMcp = new WorkerMcpManager();
  const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: (request) => workerMcp.handleRequest(request) });
  cleanup.push(() => server.stop(true));
  workerMcp.backendPort = server.port ?? 0;
  const system = new QualificationSystem(new RealSystemAdapter(workerMcp, join(root, "logs")));
  evidence.toolCalls = system.calls;
  evidence.events = system.events;
  evidence.sessions = system.sessions;
  evidence.sends = system.sends;
  evidence.closures = system.closures;
  const db = createDatabase(join(root, "qualification.db"));
  cleanup.push(() => db.close());
  const store = new Store(db);
  for (const key of [PROJECT, OTHER_PROJECT]) store.createProject(key, { label: key, repoPath: repo, baseBranch: "main", commitTimeoutMs: TURN_TIMEOUT_MS, defaultAutoMerge: false, defaultAddScreenshots: false });
  initProjectRegistry(store);
  const hub = new ClientHub(store);
  const sessionHub = new SessionHub(system, CLOSE_TIMEOUT_MS);
  cleanup.push(async () => { sessionHub.disconnectAll(); await sessionHub.drainClosingSessions(); });
  const notifier = new Notifier(hub);
  const lifecycle = new TicketLifecycle(store, hub, notifier);
  const triage = new TriageManager(store, system, sessionHub, hub, notifier);
  const feasibility = new QualificationFeasibility(store, system, sessionHub, hub, notifier);
  const snapshots = new RepoSnapshots({ system, repoMutex: new KeyedMutex() });
  const split = new SplitManager(store, system, sessionHub, snapshots);
  const slots = new QualificationSlots(store, system, hub, sessionHub, notifier, lifecycle, { projectRoot: root });
  const delegation = new DelegationManager(store, system, sessionHub, hub);
  const operations = createTicketOperations({ store, hub, lifecycle, slots, feasibility });
  const atelier = new AtelierManager({ store, hub, sessionHub, system, snapshots, ticketOperations: operations, uploadsRoot: uploads, flushIntervalMs: 0, idleTimeoutMs: TURN_TIMEOUT_MS });
  cleanup.push(() => atelier.stop());
  let interrupted = false;
  const interrupt = () => { interrupted = true; process.exitCode = 1; sessionHub.disconnectAll(); };
  process.once("SIGINT", interrupt);
  process.once("SIGTERM", interrupt);
  cleanup.unshift(() => { process.off("SIGINT", interrupt); process.off("SIGTERM", interrupt); });
  new AgentCoordinator(store, hub, sessionHub, notifier, lifecycle, slots, triage, feasibility, split, delegation, atelier);
  evidence.queuedStarts = slots.requestedStarts;
  evidence.feasibilityStarts = feasibility.requestedStarts;

  const runTurn = async (conversationId: string, scenario: string, prompt: string): Promise<{ output: string; calls: Array<Record<string, unknown>> }> => {
    const callOffset = system.calls.length;
    const messageOffset = store.listConversationMessages(conversationId).length;
    const result: Record<string, unknown> = { conversationId, scenario, prompt, status: "running" };
    results.push(result);
    await saveEvidence();
    const deadline = Date.now() + TURN_TIMEOUT_MS;
    const startup = atelier.postMessage(conversationId, prompt).delivered;
    let startupTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([startup, new Promise<never>((_resolve, reject) => { startupTimer = setTimeout(() => reject(new Error(`${scenario}: startup timed out`)), TURN_TIMEOUT_MS); })]);
    } finally {
      clearTimeout(startupTimer);
    }
    while (!interrupted && Date.now() < deadline && store.getConversation(conversationId)?.sessionStatus === "running") await Bun.sleep(POLL_MS);
    const conversation = store.getConversation(conversationId);
    const messages = store.listConversationMessages(conversationId).slice(messageOffset);
    const output = messages.filter((message) => message.role === "assistant").map((message) => message.content).join("\n");
    Object.assign(result, { conversation, messages, prds: store.listPrdDocuments(conversationId), tickets: store.listTickets(false), status: conversation?.sessionStatus, output });
    await saveEvidence();
    assert(!interrupted && conversation?.sessionStatus === "idle" && !conversation.error, `${scenario}: ${conversation?.error ?? "turn timed out or interrupted"}`);
    assert(output.trim(), `${scenario}: no persisted assistant output`);
    console.log(JSON.stringify({ provider: conversation.orchestrator, scenario, status: "completed", output: output.slice(0, MAX_EVENT_LENGTH) }));
    return { output, calls: system.calls.slice(callOffset) };
  };

  const called = (calls: Array<Record<string, unknown>>, name: string, ok: boolean, ticketId?: string): boolean => {
    return calls.some((call) => {
      if (call.name !== name || z.object({ ok: z.boolean() }).parse(call.result).ok !== ok) return false;
      if (ticketId === undefined) return true;
      const input = z.object({ ticketId: z.string() }).safeParse(call.args);
      return input.success && input.data.ticketId === ticketId;
    });
  };

  const qualify = async (provider: Orchestrator): Promise<void> => {
    const parsed = createConversationSchema.parse({ project: PROJECT, title: `Provider qualification ${provider}`, orchestrator: provider, model: "sonnet", effort: "medium", codexModel: "gpt-6.1-sol", codexEffort: "medium", codexFast: false });
    const conversation = store.createConversation({ ...parsed, title: parsed.title ?? provider, codexFast: false });
    try {
      const initialCount = store.listTickets(false).length;
      const free = await runTurn(conversation.id, "free conversation with link", `This is a free conversation, not a PRD request. Briefly explain why keeping this reference link is useful: ${LINK}. Include the literal FREE_OK and the full link. Do not browse, create a PRD or mutate the board.`);
      assert(free.output.includes("FREE_OK") && free.output.includes(LINK), "Free conversation lost its marker or link");
      assert(store.listPrdDocuments(conversation.id).length === 0 && store.listTickets(false).length === initialCount, "Free conversation unexpectedly mutated the board or PRDs");
      const media = await runTurn(conversation.id, "supplied text and visible image", `Read the supplied [source document](/uploads/source.txt) and inspect this image: ![attached visual](/uploads/visual.png). Report the exact source token and the six digits visibly drawn in the image. The code is only visible in pixels. Do not create a PRD or mutate the board.`);
      assert(media.output.includes(sourceCode), "Supplied text source token missing");
      assert(media.output.includes(imageCode), "Visible image digits missing or incorrect");
      assert(system.sends.some((send) => send.ticketId === atelierSessionKey(conversation.id) && send.imageCount === 1 && send.sourceHydrated === true), "Native image and text hydration were not observed");
      assert(store.listPrdDocuments(conversation.id).length === 0 && store.listTickets(false).length === initialCount, "Attachment discussion unexpectedly mutated the board or PRDs");
      const own = operations.createTodoTicket({ project: PROJECT, title: `${provider} existing`, description: "Disposable existing card", requestId: `${provider}-existing`, orchestrator: provider, implementer: provider }).ticket;
      const foreign = operations.createTodoTicket({ project: OTHER_PROJECT, title: `${provider} foreign`, description: "Must stay hidden and unchanged", requestId: `${provider}-foreign`, orchestrator: provider, implementer: provider }).ticket;
      const lookup = await runTurn(conversation.id, "project-scoped list and get", `Use atelier_list_tickets and then atelier_get_ticket for each ID: ${own.id}, ${foreign.id}, ${UNKNOWN_TICKET}. Report the real tool outcomes. These are diagnostic reads; do not create or start anything.`);
      assert(called(lookup.calls, "atelier_list_tickets", true) && called(lookup.calls, "atelier_get_ticket", true, own.id) && called(lookup.calls, "atelier_get_ticket", false, foreign.id) && called(lookup.calls, "atelier_get_ticket", false, UNKNOWN_TICKET), "Missing actual project-scoped read tool evidence");
      for (const call of lookup.calls.filter((entry) => entry.name === "atelier_list_tickets")) {
        const result = z.object({ result: z.string() }).parse(call.result);
        const page = z.object({ tickets: z.array(z.object({ project: z.string() })) }).parse(JSON.parse(result.result));
        assert(page.tickets.every((ticket) => ticket.project === PROJECT), "Project-scoped list leaked another project");
      }
      const title = `${provider} qualified TODO`;
      const creation = await runTurn(conversation.id, "explicit TODO creation", `Create exactly one TODO card titled "${title}" with description "Disposable provider qualification". I authorize this TODO creation now. Use atelier_create_todo with requestId "${provider}-qualified-todo" and quote this message's explicit authorization. Do not start it and do not create a PRD.`);
      const created = store.listTickets(false).filter((ticket) => ticket.title === title);
      assert(called(creation.calls, "atelier_create_todo", true) && created.length === 1 && created[0]?.column === "todo" && created[0]?.stage === null, "TODO creation did not persist exactly one parked card");
      const start = await runTurn(conversation.id, "start existing and reject unknown or foreign", `Start the existing card ${own.id} now. I also explicitly authorize diagnostic attempts to start ${UNKNOWN_TICKET} and ${foreign.id}; call atelier_start_ticket for all three IDs so the server can reject unavailable cards. Quote this current authorization. Do not create new cards. Report every tool outcome accurately.`);
      assert(called(start.calls, "atelier_start_ticket", true, own.id) && called(start.calls, "atelier_start_ticket", false, foreign.id) && called(start.calls, "atelier_start_ticket", false, UNKNOWN_TICKET), "Missing actual start success/rejection tool evidence");
      assert(store.getTicket(own.id)?.stage === "queued" && slots.requestedStarts.includes(own.id), "Existing card did not persist queued start");
      assert(store.getTicket(foreign.id)?.column === "todo" && store.getTicket(foreign.id)?.stage === null && !slots.requestedStarts.includes(foreign.id), "Foreign card changed");
      if (process.env.ATELIER_QUALIFY_ROADMAP !== "0") {
        await runTurn(conversation.id, "optional roadmap PRD", `I now explicitly request an optional roadmap PRD for this disposable fixture, not implementation. Read ${join(repo, "prd-template.json")} as the valid document template, adapt its title and summary to "Provider qualification roadmap", add a roadmap with exactly two milestones and associate every implementation task using milestoneId, then use submit_prd_document. Keep valid required sections and include an implementation plan. README.md is the only repository file you may reference; supplied uploads are separate sources and must remain in sources with exact refs /uploads/source.txt and /uploads/visual.png. Also retain ${LINK} in sources. Carry the supplied document's keyboard-accessible export requirement into the PRD. Do not create or start any cards.`);
        const record = store.listPrdDocuments(conversation.id).at(-1);
        assert(record?.document.roadmap?.milestones.length === 2, "Two-milestone roadmap document was not persisted");
        const milestoneIds = new Set(record.document.roadmap.milestones.map((milestone) => milestone.id));
        assert(record.document.tasks.every((task) => task.milestoneId !== undefined && milestoneIds.has(task.milestoneId)), "Roadmap tasks lack valid milestone associations");
        const sources = new Set(record.document.sources.map((source) => source.ref));
        assert([LINK, "/uploads/source.txt", "/uploads/visual.png"].every((reference) => sources.has(reference)), "Roadmap lost supplied source references");
      }
    } finally {
      atelier.close(conversation.id);
      await sessionHub.drainClosingSessions();
      await saveEvidence();
    }
  };

  console.log(JSON.stringify({ status: "started", root, evidencePath, providers, turnTimeoutMs: TURN_TIMEOUT_MS }));
  for (const provider of providers) {
    if (interrupted) break;
    try { await qualify(provider); evidence[provider] = { status: "passed" }; }
    catch (error) { evidence[provider] = { status: "failed", error: error instanceof Error ? error.message : String(error) }; process.exitCode = 1; }
    await saveEvidence();
  }
  evidence.finalTickets = store.listTickets(false);
  evidence.finalConversations = store.listConversations();
} catch (error) {
  evidence.harnessError = error instanceof Error ? error.message : String(error);
  process.exitCode = 1;
} finally {
  const cleanupErrors: string[] = [];
  for (const close of cleanup.reverse()) {
    try { await close(); }
    catch (error) { cleanupErrors.push(error instanceof Error ? error.message : String(error)); }
  }
  const closures = z.array(z.object({ state: z.string() })).parse(evidence.closures ?? []);
  evidence.finishedAt = new Date().toISOString();
  evidence.cleanupErrors = cleanupErrors;
  evidence.cleanup = cleanupErrors.length === 0 && closures.every((closure) => closure.state === "closed") ? "closed" : "unknown; fixture retained";
  if (evidence.cleanup !== "closed") process.exitCode = 1;
  await saveEvidence();
  console.log(JSON.stringify({ status: process.exitCode ? "failed" : "passed", evidencePath, cleanup: evidence.cleanup }));
}

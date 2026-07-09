import { describe, expect, test } from "bun:test";

import { MODELS } from "../config.ts";
import { makeTicket } from "../testing/fixtures.ts";

import {
  buildImplementSessionConfig,
  buildSplitSessionConfig,
  buildTriageSessionConfig,
} from "./sessionConfig.ts";

const COMPOSER_SCRIPT = "/tmp/composer-driver.sh";
const CWD = "/tmp/worktree";

function implementConfig(ticket: ReturnType<typeof makeTicket>, resumeSessionId?: string) {
  return buildImplementSessionConfig({
    ticket,
    slotId: 1,
    cwd: CWD,
    composerScriptPath: COMPOSER_SCRIPT,
    ...(resumeSessionId ? { resumeSessionId } : {}),
  });
}

describe("buildImplementSessionConfig — codex orchestrator", () => {
  test("runs on the codex provider with the ticket's codex knobs", () => {
    const ticket = makeTicket({ orchestrator: "codex", implementer: "codex", codexModel: "gpt-5.4", codexEffort: "high" });
    const cfg = implementConfig(ticket);
    expect(cfg.provider).toBe("codex");
    expect(cfg.model).toBe("gpt-5.4");
    expect(cfg.effort).toBe("high");
  });

  test("falls back to the MODELS registry when the ticket's codex knobs are null", () => {
    const ticket = makeTicket({ orchestrator: "codex", implementer: "codex", codexModel: null, codexEffort: null });
    const cfg = implementConfig(ticket);
    expect(cfg.model).toBe(MODELS.codexModel);
    expect(cfg.effort).toBe(MODELS.codexEffort);
  });

  test("pins the sandbox read-only for an ask ticket and forwards resumeSessionId", () => {
    const ticket = makeTicket({ orchestrator: "codex", implementer: "codex", kind: "ask" });
    const cfg = implementConfig(ticket, "sess-abc");
    expect(cfg.readOnly).toBe(true);
    expect(cfg.resumeSessionId).toBe("sess-abc");
  });

  test("is not read-only for a non-ask codex ticket", () => {
    const ticket = makeTicket({ orchestrator: "codex", implementer: "codex", kind: "feature" });
    const cfg = implementConfig(ticket);
    expect(cfg.readOnly).toBeUndefined();
  });
});

describe("buildImplementSessionConfig — claude orchestrator", () => {
  test("claude×claude: provider claude, implementer+pr-fixer subagents, skills, composer bash rule", () => {
    const ticket = makeTicket({ orchestrator: "claude", implementer: "claude" });
    const cfg = implementConfig(ticket);
    expect(cfg.provider).toBe("claude");
    const agentNames = Object.keys(cfg.agents ?? {});
    expect(agentNames).toContain("implementer");
    expect(agentNames).toContain("pr-fixer");
    expect((cfg.skills ?? []).length).toBeGreaterThan(0);
    expect(cfg.permissionAllow ?? []).toContain(`Bash(${COMPOSER_SCRIPT}:*)`);
    // Orchestrator knobs unset on the ticket → fall back to the MODELS registry.
    expect(cfg.model).toBe(MODELS.implement);
  });

  test("claude×composer: still the claude provider config (composer only writes code)", () => {
    const ticket = makeTicket({ orchestrator: "claude", implementer: "composer" });
    const cfg = implementConfig(ticket);
    expect(cfg.provider).toBe("claude");
    expect(Object.keys(cfg.agents ?? {})).toContain("implementer");
    expect(cfg.permissionAllow ?? []).toContain(`Bash(${COMPOSER_SCRIPT}:*)`);
  });
});

describe("read-only triage/split sessions", () => {
  test("codex driver → codex provider, read-only sandbox", () => {
    const triage = buildTriageSessionConfig({ ticketId: "t1", cwd: CWD, model: "gpt-5.5", effort: "high", deep: false, driver: "codex" });
    expect(triage.provider).toBe("codex");
    expect(triage.readOnly).toBe(true);

    const split = buildSplitSessionConfig({ ticketId: "t1", cwd: CWD, model: "gpt-5.5", effort: "high", driver: "codex" });
    expect(split.provider).toBe("codex");
    expect(split.readOnly).toBe(true);
  });

  test("claude driver → claude provider with read-only tools", () => {
    const triage = buildTriageSessionConfig({ ticketId: "t1", cwd: CWD, model: "sonnet", effort: "low", deep: false, driver: "claude" });
    expect(triage.provider).toBe("claude");
    expect(triage.allowedTools).toEqual(["Read", "Glob", "Grep"]);
    expect(triage.disallowedTools ?? []).toContain("Bash");
    expect(triage.disallowedTools ?? []).toContain("Edit");
    expect(triage.disallowedTools ?? []).toContain("Write");

    const split = buildSplitSessionConfig({ ticketId: "t1", cwd: CWD, model: "sonnet", effort: "low", driver: "claude" });
    expect(split.provider).toBe("claude");
    expect(split.allowedTools).toEqual(["Read", "Glob", "Grep"]);
    expect(split.disallowedTools ?? []).toContain("Bash");
  });
});

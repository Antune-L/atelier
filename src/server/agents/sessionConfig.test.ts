import { describe, expect, test } from "bun:test";

import { FEASIBILITY_SCOUT_AGENT_NAME } from "../../shared/constants.ts";
import { MODELS } from "../config.ts";
import { makeTicket } from "../testing/fixtures.ts";

import {
  buildFeasibilitySessionConfig,
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
    const ticket = makeTicket({
      orchestrator: "codex",
      implementer: "codex",
      codexModel: "gpt-5.6-sol",
      codexEffort: "high",
      codexFast: true,
      codexImplementerModel: "gpt-5.6-terra",
      codexImplementerEffort: "low",
      codexImplementerFast: false,
    });
    const cfg = implementConfig(ticket);
    expect(cfg.provider).toBe("codex");
    expect(cfg.model).toBe("gpt-5.6-sol");
    expect(cfg.effort).toBe("high");
    expect(cfg.serviceTier).toBe("fast");
    expect(cfg.delegateModel).toBe("gpt-5.6-terra");
    expect(cfg.delegateEffort).toBe("low");
    expect(cfg.delegateServiceTier).toBe("default");
    expect(cfg.agents?.implementer).toMatchObject({ model: "gpt-5.6-terra", effort: "low", serviceTier: "default" });
    expect(cfg.agents?.["pr-fixer"]).toMatchObject({ model: "gpt-5.6-terra", effort: "low", serviceTier: "default" });
  });

  test("null implementer knobs inherit the resolved Codex orchestrator knobs", () => {
    const ticket = makeTicket({
      orchestrator: "codex",
      implementer: "codex",
      codexModel: "gpt-5.6-sol",
      codexEffort: "high",
      codexFast: true,
      codexImplementerModel: null,
      codexImplementerEffort: null,
      codexImplementerFast: null,
    });
    const cfg = implementConfig(ticket);
    expect(cfg.delegateModel).toBe("gpt-5.6-sol");
    expect(cfg.delegateEffort).toBe("high");
    expect(cfg.delegateServiceTier).toBe("fast");
  });

  test("falls back to the MODELS registry when the ticket's codex knobs are null", () => {
    const ticket = makeTicket({ orchestrator: "codex", implementer: "codex", codexModel: null, codexEffort: null });
    const cfg = implementConfig(ticket);
    expect(cfg.model).toBe(MODELS.codexModel);
    expect(cfg.effort).toBe(MODELS.codexEffort);
  });

  test("attaches contract skills, native agents and Playwright MCP for feature verification", () => {
    const ticket = makeTicket({ orchestrator: "codex", implementer: "codex", verifyFeature: true });
    const cfg = implementConfig(ticket);
    expect(cfg.skills).toContain("regression-check");
    expect(cfg.agents?.implementer?.role).toBe("implementer");
    expect(cfg.extraMcpServers?.playwright?.command).toBe("npx");
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
    expect(cfg.delegateProvider).toBe("claude");
    expect(cfg.delegateModel).toBe(MODELS.implementerModel);
    expect(cfg.delegateEffort).toBe(MODELS.implementerEffort);
  });

  test("claude×composer: still the claude provider config (composer only writes code)", () => {
    const ticket = makeTicket({ orchestrator: "claude", implementer: "composer" });
    const cfg = implementConfig(ticket);
    expect(cfg.provider).toBe("claude");
    expect(Object.keys(cfg.agents ?? {})).toContain("implementer");
    expect(cfg.permissionAllow ?? []).toContain(`Bash(${COMPOSER_SCRIPT}:*)`);
    expect(cfg.delegateProvider).toBe("composer");
    expect(cfg.delegateModel).toBeNull();
  });
});

describe("read-only triage/split sessions", () => {
  test("codex driver → codex provider, read-only sandbox", () => {
    const triage = buildTriageSessionConfig({ ticketId: "t1", cwd: CWD, model: "gpt-5.6-terra", effort: "high", deep: false, driver: "codex" });
    expect(triage.provider).toBe("codex");
    expect(triage.readOnly).toBe(true);

    const split = buildSplitSessionConfig({ ticketId: "t1", cwd: CWD, model: "gpt-5.6-terra", effort: "high", driver: "codex" });
    expect(split.provider).toBe("codex");
    expect(split.readOnly).toBe(true);
  });

  test("Analyse + and feasibility expose bounded native scouts to Codex", () => {
    const triage = buildTriageSessionConfig({
      ticketId: "t1",
      cwd: CWD,
      model: "gpt-6-astra",
      effort: "high",
      deep: true,
      driver: "codex",
    });
    expect(Object.keys(triage.agents ?? {})).toHaveLength(2);
    expect(triage.agents?.[FEASIBILITY_SCOUT_AGENT_NAME]?.role).toBe("scout");
    expect(triage.allowedTools).not.toContain("mcp__plugin_figma_figma__get_screenshot");
    expect(triage.agents?.[FEASIBILITY_SCOUT_AGENT_NAME]?.prompt).toContain("réellement présent");

    const feasibility = buildFeasibilitySessionConfig({
      batchId: "feasibility-batch-1",
      cwd: CWD,
      model: "gpt-6-astra",
      effort: "high",
      driver: "codex",
    });
    expect(feasibility.ownerType).toBe("batch");
    expect(feasibility.provider).toBe("codex");
    expect(Object.values(feasibility.agents ?? {})[0]?.role).toBe("scout");
    expect(feasibility.allowedTools).not.toContain("mcp__claude_ai_Slack__slack_read_thread");
  });

  test("claude driver → claude provider with read-only tools", () => {
    const readOnlyTools = [
      "Read",
      "Glob",
      "Grep",
      "ToolSearch",
      "mcp__plugin_figma_figma__get_design_context",
      "mcp__plugin_figma_figma__get_screenshot",
      "mcp__plugin_figma_figma__get_metadata",
      "mcp__plugin_figma_figma__get_variable_defs",
      "mcp__plugin_figma_figma__get_figjam",
      "mcp__claude_ai_Slack__slack_read_channel",
      "mcp__claude_ai_Slack__slack_read_thread",
      "mcp__claude_ai_Slack__slack_read_canvas",
      "mcp__claude_ai_Slack__slack_read_file",
      "mcp__claude_ai_Slack__slack_read_user_profile",
      "mcp__claude_ai_Slack__slack_search_channels",
      "mcp__claude_ai_Slack__slack_search_public",
      "mcp__claude_ai_Slack__slack_search_public_and_private",
      "mcp__claude_ai_Slack__slack_search_users",
      "mcp__claude_ai_Slack__slack_list_channel_members",
      "mcp__claude_ai_Slack__slack_get_reactions",
    ];

    const triage = buildTriageSessionConfig({ ticketId: "t1", cwd: CWD, model: "sonnet", effort: "low", deep: false, driver: "claude" });
    expect(triage.provider).toBe("claude");
    expect(triage.allowedTools).toEqual(readOnlyTools);
    expect(triage.disallowedTools ?? []).toContain("Bash");
    expect(triage.disallowedTools ?? []).toContain("Edit");
    expect(triage.disallowedTools ?? []).toContain("Write");

    const split = buildSplitSessionConfig({ ticketId: "t1", cwd: CWD, model: "sonnet", effort: "low", driver: "claude" });
    expect(split.provider).toBe("claude");
    expect(split.allowedTools).toEqual(readOnlyTools);
    expect(split.disallowedTools ?? []).toContain("Bash");
  });
});

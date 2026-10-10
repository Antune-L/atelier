/**
 * Real-SDK probe (opt-in, skipped by default): checks against a live Claude Code binary that a
 * fan-out orchestrator configured like the Atelier adversarial review keeps the sub-agent tool,
 * cannot launch the denied built-in agents, and that its declared scouts cannot launch further
 * sub-agents. Needs Claude credentials and network.
 * Run with: KANBAN_REAL_SDK_PROBE=1 bun test src/server/system/claudeSubagentProbe.test.ts
 * It runs in a temp dir with no kanban MCP server and no repo mutation (read-only tools only). The
 * SDK options reuse the provider's own mapping so the probe cannot drift from production.
 */
import { expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { query, type SDKMessage } from "@anthropic-ai/claude-agent-sdk";

import { DEFAULT_RESEARCH_OPTIONS } from "../../shared/schemas.ts";
import { ATELIER_EXPLORER_AGENT_NAME } from "../../shared/constants.ts";
import { buildAtelierSessionConfig } from "../agents/sessionConfig.ts";
import { ensureClaudeBinary } from "./claudeBinary.ts";
import { buildSettings, toSdkAgents } from "./claudeProvider.ts";
import { settingSourcesForRole } from "./sessionRolePolicy.ts";

const PROBE_TIMEOUT_MS = 300_000;
const SUBAGENT_TOOL_NAMES = new Set(["Task", "Agent"]);
const DENIED_BUILTIN_AGENTS = new Set(["general-purpose", "Explore", "Plan"]);

interface ToolUse {
  id: string;
  name: string;
  subagentType: string | null;
  parentToolUseId: string | null;
}

function subagentTypeOf(input: unknown): string | null {
  if (typeof input !== "object" || input === null || !("subagent_type" in input)) return null;
  return typeof input.subagent_type === "string" ? input.subagent_type : null;
}

function toolUses(message: SDKMessage): ToolUse[] {
  if (message.type !== "assistant") return [];
  const uses: ToolUse[] = [];
  for (const block of message.message.content) {
    if (block.type !== "tool_use") continue;
    uses.push({ id: block.id, name: block.name, subagentType: subagentTypeOf(block.input), parentToolUseId: message.parent_tool_use_id });
  }
  return uses;
}

function erroredToolResultIds(message: SDKMessage): string[] {
  if (message.type !== "user" || typeof message.message.content === "string") return [];
  const ids: string[] = [];
  for (const block of message.message.content) {
    if (block.type === "tool_result" && block.is_error === true) ids.push(block.tool_use_id);
  }
  return ids;
}

test.skipIf(!process.env.KANBAN_REAL_SDK_PROBE)(
  "Atelier adversarial: parent keeps the sub-agent tool, built-ins are denied, scouts cannot spawn",
  async () => {
    const cwd = mkdtempSync(join(tmpdir(), "kanban-subagent-probe-"));
    writeFileSync(join(cwd, "README.md"), "Probe repository.\n");
    try {
      const config = buildAtelierSessionConfig({
        conversationId: "probe",
        cwd,
        model: "sonnet",
        effort: "low",
        driver: "claude",
        researchEnabled: true,
        researchOptions: { ...DEFAULT_RESEARCH_OPTIONS, adversarialReview: true },
      });
      const binary = await ensureClaudeBinary();
      const prompt =
        "1) Essaie de lancer le sous-agent intégré `Explore` pour lire README.md ; s'il est refusé, " +
        `dis-le. 2) Lance UNE fois le sous-agent \`${ATELIER_EXPLORER_AGENT_NAME}\` avec ce prompt exact : ` +
        "« 1) Liste les noms exacts de tous les outils dont tu disposes. 2) Essaie de lancer un " +
        "sous-agent (outil Agent ou Task) pour lire README.md ; si tu ne peux pas, dis-le. » " +
        "Puis recopie sa réponse.";
      const messages: SDKMessage[] = [];
      for await (const message of query({
        prompt,
        options: {
          cwd,
          model: config.model,
          pathToClaudeCodeExecutable: binary,
          systemPrompt: { type: "preset", preset: "claude_code" },
          settingSources: settingSourcesForRole(config.role),
          permissionMode: config.permissionMode,
          allowedTools: config.allowedTools ?? [],
          ...(config.disallowedTools ? { disallowedTools: config.disallowedTools } : {}),
          ...buildSettings(config.permissionAllow, config.permissionDeny),
          ...(config.skills ? { skills: config.skills } : {}),
          ...(config.agents ? { agents: toSdkAgents(config.agents) } : {}),
          maxTurns: 10,
          stderr: () => {},
        },
      })) {
        messages.push(message);
      }

      const init = messages.find((message) => message.type === "system" && message.subtype === "init");
      const parentTools = init?.type === "system" && init.subtype === "init" ? init.tools : [];
      console.log("parent init tools:", parentTools.join(", "));
      expect(parentTools.some((name) => SUBAGENT_TOOL_NAMES.has(name))).toBe(true);

      const uses = messages.flatMap(toolUses);
      const errored = new Set(messages.flatMap(erroredToolResultIds));
      const parentSpawns = uses.filter((use) => use.parentToolUseId === null && SUBAGENT_TOOL_NAMES.has(use.name));
      const scoutLaunches = parentSpawns.filter((use) => use.subagentType === ATELIER_EXPLORER_AGENT_NAME && !errored.has(use.id));
      expect(scoutLaunches.length).toBeGreaterThan(0);

      const builtinSpawns = parentSpawns.filter((use) => use.subagentType !== null && DENIED_BUILTIN_AGENTS.has(use.subagentType));
      console.log("built-in spawn attempts:", builtinSpawns.length, "refused:", builtinSpawns.filter((use) => errored.has(use.id)).length);
      for (const use of builtinSpawns) expect(errored.has(use.id)).toBe(true);

      const nestedSpawns = uses.filter((use) => use.parentToolUseId !== null && SUBAGENT_TOOL_NAMES.has(use.name));
      console.log("nested spawn attempts:", nestedSpawns.length, "refused:", nestedSpawns.filter((use) => errored.has(use.id)).length);
      for (const use of nestedSpawns) expect(errored.has(use.id)).toBe(true);

      const result = messages.find((message) => message.type === "result");
      if (result?.type === "result" && result.subtype === "success") console.log("final answer:", result.result);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  },
  PROBE_TIMEOUT_MS,
);

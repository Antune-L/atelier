/**
 * Real Claude measurement of a user message delivered mid-turn through SDK streaming input.
 *
 * Usage: `KANBAN_LOG=warn bun src/server/testing/probeClaudeSteering.ts [none|next|later]...`
 * (defaults to `none next`). Each variant starts a fresh session whose first turn runs three slow
 * shell commands; once the first tool call is observed, a steering message asking for a marker word
 * is pushed with the variant's `priority`. The probe reports how many `result` messages (turn ends)
 * each variant emits and whether the marker appears before the first one, i.e. inside the turn that
 * was running when the message arrived. `now` is never measured: it can abort a tool in flight.
 */
import type { SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import { query } from "@anthropic-ai/claude-agent-sdk";

import { resolveClaudeBinary } from "../system/claudeBinary.ts";

type Variant = "none" | "next" | "later";

const MARKER = "ZEBRE-42";
const FIRST_TURN =
  "Exécute ces trois commandes Bash, une par appel d'outil et dans cet ordre : `sleep 6; echo A`, `sleep 6; echo B`, `sleep 6; echo C`. Ensuite réponds en une ligne qui résume les sorties.";
const STEER = `Réorientation de l'utilisateur pendant ton travail : termine ce que tu fais, puis ajoute le mot ${MARKER} à la fin de ta réponse finale.`;
const VARIANT_TIMEOUT_MS = 180_000;
const SETTLE_AFTER_RESULT_MS = 15_000;

interface VariantReport {
  variant: Variant;
  results: number;
  markerInFirstTurn: boolean;
  markerAnywhere: boolean;
  toolCallsBeforeFirstResult: number;
  steerSentAfterToolCall: number;
  texts: string[];
}

function isVariant(value: string): value is Variant {
  return value === "none" || value === "next" || value === "later";
}

function userMessage(text: string, variant: Variant | null): SDKUserMessage {
  const message: SDKUserMessage = { type: "user", parent_tool_use_id: null, message: { role: "user", content: text } };
  if (variant && variant !== "none") message.priority = variant;
  return message;
}

async function runVariant(variant: Variant): Promise<VariantReport> {
  const inbox: SDKUserMessage[] = [userMessage(FIRST_TURN, null)];
  let wake: (() => void) | null = null;
  let closed = false;
  async function* prompts(): AsyncGenerator<SDKUserMessage> {
    for (;;) {
      while (inbox.length > 0) {
        const next = inbox.shift();
        if (next) yield next;
      }
      if (closed) return;
      await new Promise<void>((resolve) => (wake = resolve));
    }
  }
  function push(message: SDKUserMessage): void {
    inbox.push(message);
    const resume = wake;
    wake = null;
    resume?.();
  }

  const report: VariantReport = { variant, results: 0, markerInFirstTurn: false, markerAnywhere: false, toolCallsBeforeFirstResult: 0, steerSentAfterToolCall: 0, texts: [] };
  const abortController = new AbortController();
  const session = query({
    prompt: prompts(),
    options: {
      cwd: process.cwd(),
      abortController,
      pathToClaudeCodeExecutable: resolveClaudeBinary(),
      permissionMode: "dontAsk",
      allowedTools: ["Bash(sleep:*)", "Bash(echo:*)"],
      settingSources: [],
    },
  });
  const deadline = setTimeout(() => abortController.abort(), VARIANT_TIMEOUT_MS);
  let settleTimer: ReturnType<typeof setTimeout> | null = null;
  let steered = false;
  let toolCalls = 0;
  try {
    for await (const message of session) {
      if (message.type === "assistant") {
        for (const block of message.message.content) {
          if (block.type === "tool_use") {
            toolCalls += 1;
            if (!steered) {
              steered = true;
              report.steerSentAfterToolCall = toolCalls;
              push(userMessage(STEER, variant));
            }
          }
          if (block.type === "text" && block.text.trim()) {
            report.texts.push(`[turn ${report.results + 1}] ${block.text.trim()}`);
            if (block.text.includes(MARKER)) {
              report.markerAnywhere = true;
              if (report.results === 0) report.markerInFirstTurn = true;
            }
          }
        }
      }
      if (message.type === "result") {
        report.results += 1;
        if (report.results === 1) report.toolCallsBeforeFirstResult = toolCalls;
        // Leave time for a queued follow-up turn to start and finish before closing the input.
        if (settleTimer) clearTimeout(settleTimer);
        settleTimer = setTimeout(() => {
          closed = true;
          const resume = wake;
          wake = null;
          resume?.();
        }, SETTLE_AFTER_RESULT_MS);
      }
    }
  } finally {
    clearTimeout(deadline);
    if (settleTimer) clearTimeout(settleTimer);
    closed = true;
    session.close();
  }
  return report;
}

const requested = process.argv.slice(2);
const variants: Variant[] = requested.length > 0 ? requested.filter(isVariant) : ["none", "next"];
const reports: VariantReport[] = [];
for (const variant of variants) {
  reports.push(await runVariant(variant));
}
console.log(JSON.stringify(reports, null, 2));

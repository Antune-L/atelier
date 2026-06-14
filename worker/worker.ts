/**
 * worker.ts — MCP channel server spawned by each Claude Code session.
 *
 * - Speaks MCP over stdio to its parent Claude session.
 * - Declares the research-preview `claude/channel` experimental capability so the
 *   backend can push sequential notification events (ticket / answer / prd_validated / nudge)
 *   into the session.
 * - Exposes 5 tools (update_stage, ask_user, submit_prd, done, fail) that forward to the backend.
 * - Connects OUTBOUND over WebSocket to the backend (BACKEND_WS), identifying by TICKET_ID/SLOT_ID.
 *   It opens no listening port. Reconnects on drop so a backend restart self-heals.
 *
 * No type casting: every external payload is validated with zod.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const WORKER_VERSION = "0.0.0";
const RECONNECT_DELAY_MS = 1500;
// Claude Code's channel handler only accepts this exact method, with
// params { content: string, meta?: Record<string, string> } — content is
// injected verbatim as a prompt into the session.
const CHANNEL_NOTIFICATION_METHOD = "notifications/claude/channel";

const envSchema = z.object({
  TICKET_ID: z.string().min(1),
  SLOT_ID: z.coerce.number().int(),
  BACKEND_WS: z.string().url(),
});

const env = envSchema.parse({
  TICKET_ID: process.env.TICKET_ID,
  SLOT_ID: process.env.SLOT_ID,
  BACKEND_WS: process.env.BACKEND_WS,
});

// ---- backend WS frames ----

const toolResultSchema = z.object({
  type: z.literal("tool_result"),
  id: z.string(),
  ok: z.boolean(),
  result: z.string(),
});

const eventSchema = z.object({
  type: z.literal("event"),
  event: z.discriminatedUnion("type", [
    z.object({ type: z.literal("ticket"), payload: z.string() }),
    z.object({ type: z.literal("answer"), questionId: z.string(), answer: z.string() }),
    z.object({ type: z.literal("prd_validated"), note: z.string() }),
    z.object({ type: z.literal("nudge"), message: z.string() }),
    z.object({ type: z.literal("user_comment"), body: z.string() }),
  ]),
});

const outboundSchema = z.discriminatedUnion("type", [toolResultSchema, eventSchema]);

// ---- tool arg schemas ----

const stageEnum = z.enum([
  "queued",
  "planning",
  "awaiting_answers",
  "implementing",
  "reviewing",
  "fixing",
  "testing",
  "opening_pr",
  "done",
  "failed",
]);

// Mirror of the shared triageResultSchema; kept tolerant on purpose (the backend re-validates
// strictly with submitTriageArgsSchema before persisting). suggested* stay loose strings here.
const triageVerdictEnum = z.enum(["implementable", "needs_info", "needs_rework"]);
const submitTriageSchema = z.object({
  verdict: triageVerdictEnum,
  summary: z.string(),
  reasons: z.array(z.string()).default([]),
  questions: z.array(z.string()).default([]),
  files: z.array(z.string()).default([]),
  suggestedModel: z.string().nullable().default(null),
  suggestedEffort: z.string().nullable().default(null),
});

// Mirror of the shared submitFeasibilityArgsSchema; tolerant on purpose (the backend re-validates
// strictly before persisting). One entry per imported ticket, keyed by ticketId.
const submitFeasibilitySchema = z.object({
  results: z.array(submitTriageSchema.extend({ ticketId: z.string().min(1) })),
});

const TOOLS = [
  {
    name: "update_stage",
    description: "Met à jour le badge d'étape de la carte du ticket.",
    schema: z.object({ stage: stageEnum }),
  },
  {
    name: "ask_user",
    description:
      "Pose une question à l'utilisateur. La session reste en vie ; la réponse arrive via un événement de channel.",
    schema: z.object({ question: z.string().min(1) }),
  },
  {
    name: "submit_prd",
    description: "Soumet le PRD (markdown). Déplace la carte en colonne PRD à implémenter.",
    schema: z.object({ markdown: z.string().min(1) }),
  },
  {
    name: "submit_answer",
    description:
      "Soumet la réponse finale (markdown) d'un ticket « ask ». Le backend la publie en commentaire et clôt le ticket.",
    schema: z.object({ answer: z.string().min(1) }),
  },
  {
    name: "done",
    description: "Signale la fin du ticket avec l'URL de la PR draft. Le backend vérifie avant de clôturer.",
    schema: z.object({ pr_url: z.string().url() }),
  },
  {
    name: "fail",
    description: "Signale un échec avec une raison et des findings.",
    schema: z.object({ reason: z.string().min(1), findings: z.string().default("") }),
  },
  {
    name: "submit_triage",
    description:
      "Soumet le verdict de faisabilité (triage en lecture seule). Le backend le persiste puis détruit la session.",
    schema: submitTriageSchema,
  },
  {
    name: "submit_feasibility",
    description:
      "Soumet en UN SEUL appel les verdicts de faisabilité d'un lot (un par ticket importé, keyé par ticketId). Le backend les persiste puis détruit la session.",
    schema: submitFeasibilitySchema,
  },
] as const;

type ToolName = (typeof TOOLS)[number]["name"];

function isToolName(value: string): value is ToolName {
  return TOOLS.some((t) => t.name === value);
}

// ---- backend bridge ----

class BackendBridge {
  private ws: WebSocket | null = null;
  private readonly pending = new Map<string, (result: { ok: boolean; result: string }) => void>();
  private callSeq = 0;

  constructor(private readonly onEvent: (event: z.infer<typeof eventSchema>["event"]) => Promise<void>) {}

  connect(): void {
    const socket = new WebSocket(env.BACKEND_WS);
    this.ws = socket;

    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({ type: "hello", ticketId: env.TICKET_ID, slotId: env.SLOT_ID }));
    });

    socket.addEventListener("message", (msg) => {
      const text = typeof msg.data === "string" ? msg.data : "";
      const parsed = outboundSchema.safeParse(JSON.parse(text));
      if (!parsed.success) return;
      const data = parsed.data;
      if (data.type === "tool_result") {
        const resolver = this.pending.get(data.id);
        if (resolver) {
          this.pending.delete(data.id);
          resolver({ ok: data.ok, result: data.result });
        }
        return;
      }
      void this.onEvent(data.event);
    });

    const reconnect = (): void => {
      if (this.ws === socket) this.ws = null;
      setTimeout(() => this.connect(), RECONNECT_DELAY_MS);
    };
    socket.addEventListener("close", reconnect);
    socket.addEventListener("error", () => socket.close());
  }

  callTool(name: ToolName, args: unknown): Promise<{ ok: boolean; result: string }> {
    return new Promise((resolve) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        resolve({ ok: false, result: "backend injoignable" });
        return;
      }
      this.callSeq += 1;
      const id = `${env.TICKET_ID}-${this.callSeq}`;
      this.pending.set(id, resolve);
      this.ws.send(JSON.stringify({ type: "tool_call", id, name, args }));
    });
  }

  notifyStop(sessionId: string | null): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: "stop", sessionId }));
  }
}

// ---- MCP server ----

const server = new Server(
  { name: "kanban-worker", version: WORKER_VERSION },
  {
    capabilities: {
      tools: {},
      experimental: { "claude/channel": {} },
    },
  },
);

type ChannelEvent = z.infer<typeof eventSchema>["event"];

/** Render a backend event as the prompt text injected into the session. */
function renderEventContent(event: ChannelEvent): string {
  switch (event.type) {
    case "ticket":
      return event.payload;
    case "answer":
      return `Réponse de l'utilisateur (question ${event.questionId}) : ${event.answer}`;
    case "prd_validated":
      return `PRD validé par l'utilisateur. ${event.note}`;
    case "nudge":
      return event.message;
    case "user_comment":
      return `Commentaire de l'utilisateur (à prendre en compte dans le travail en cours) : ${event.body}`;
  }
}

const bridge = new BackendBridge(async (event) => {
  // Forward backend → session as a channel notification on the live MCP connection.
  await server.notification({
    method: CHANNEL_NOTIFICATION_METHOD,
    params: { content: renderEventContent(event), meta: { type: event.type } },
  });
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  // Advertise the real JSON Schema per tool: without declared `properties` the client
  // can't tell that e.g. `submit_feasibility.results` is an array, so it serializes nested
  // payloads as a JSON *string* and zod then rejects them ("Arguments invalides").
  tools: TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: zodToJsonSchema(t.schema, { target: "openApi3", $refStrategy: "none" }),
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  if (!isToolName(name)) {
    return { isError: true, content: [{ type: "text", text: `Tool inconnu: ${name}` }] };
  }
  const def = TOOLS.find((t) => t.name === name);
  if (!def) {
    return { isError: true, content: [{ type: "text", text: `Tool inconnu: ${name}` }] };
  }
  const parsed = def.schema.safeParse(args ?? {});
  if (!parsed.success) {
    return { isError: true, content: [{ type: "text", text: `Arguments invalides: ${parsed.error.message}` }] };
  }
  const outcome = await bridge.callTool(name, parsed.data);
  return {
    isError: !outcome.ok,
    content: [{ type: "text", text: outcome.result || (outcome.ok ? "ok" : "échec") }],
  };
});

// Claude injects channel notifications only AFTER it has emitted `initialized`.
// The backend pushes the contract the instant the worker's WS connects, so defer
// connecting until init — otherwise the first notification (the contract) races
// ahead of readiness and Claude silently drops it, leaving the session idle.
server.oninitialized = (): void => {
  bridge.connect();
};

const transport = new StdioServerTransport();
await server.connect(transport);

#!/usr/bin/env bun
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const PORT = 8788;

// Outbound side: broadcast to any `curl -N localhost:8788/events` listeners.
// A real bridge would POST to a chat platform instead.
const listeners = new Set<(chunk: string) => void>();

function send(text: string): void {
  const chunk = text.split("\n").map((line) => `data: ${line}\n`).join("") + "\n";
  for (const emit of listeners) emit(chunk);
}

const mcp = new Server(
  { name: "webhook", version: "0.0.1" },
  {
    capabilities: {
      experimental: { "claude/channel": {} },
      tools: {},
    },
    instructions:
      'Messages arrive as <channel source="webhook" chat_id="...">. ' +
      "Reply with the reply tool, passing the chat_id from the tag.",
  },
);

const ReplyArgsSchema = z.object({ chat_id: z.string(), text: z.string() });

mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "reply",
      description: "Send a message back over this channel",
      inputSchema: {
        type: "object",
        properties: {
          chat_id: { type: "string", description: "The conversation to reply in" },
          text: { type: "string", description: "The message to send" },
        },
        required: ["chat_id", "text"],
      },
    },
  ],
}));

mcp.setRequestHandler(CallToolRequestSchema, async (req) => {
  if (req.params.name === "reply") {
    const { chat_id, text } = ReplyArgsSchema.parse(req.params.arguments);
    send(`Reply to ${chat_id}: ${text}`);
    return { content: [{ type: "text", text: "sent" }] };
  }
  throw new Error(`unknown tool: ${req.params.name}`);
});

await mcp.connect(new StdioServerTransport());

let nextId = 1;
Bun.serve({
  port: PORT,
  hostname: "127.0.0.1",
  idleTimeout: 0, // Do not close idle SSE streams.
  async fetch(req) {
    const url = new URL(req.url);

    // GET /events: SSE stream so curl -N can watch Claude's replies live.
    if (req.method === "GET" && url.pathname === "/events") {
      const stream = new ReadableStream({
        start(ctrl) {
          ctrl.enqueue(": connected\n\n");
          const emit = (chunk: string): void => ctrl.enqueue(chunk);
          listeners.add(emit);
          req.signal.addEventListener("abort", () => listeners.delete(emit));
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        },
      });
    }

    // POST: forward the body to Claude as a channel event.
    const body = await req.text();
    const chatId = String(nextId++);
    await mcp.notification({
      method: "notifications/claude/channel",
      params: {
        content: body,
        meta: { chat_id: chatId, path: url.pathname, method: req.method },
      },
    });
    return new Response("ok");
  },
});

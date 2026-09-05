import { expect, test } from "bun:test";
import { z } from "zod";

import { WorkerMcpManager } from "./workerMcp.ts";

const rpcResponseSchema = z.object({
  result: z
    .object({
      tools: z.array(z.object({ name: z.string() })).optional(),
      content: z.array(z.object({ text: z.string() })).optional(),
    })
    .optional(),
  error: z.object({ message: z.string() }).optional(),
});

function request(token: string, method: string, params?: unknown): Request {
  return new Request("http://localhost/mcp", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
}

async function parsed(response: Response): Promise<z.infer<typeof rpcResponseSchema>> {
  return rpcResponseSchema.parse(await response.json());
}

test("worker MCP tokens expose only the tools assigned to their session", async () => {
  const manager = new WorkerMcpManager();
  manager.register("triage-token", {
    allowedTools: ["ask_user", "submit_triage", "fail"],
    onToolCall: async (name) => ({ ok: true, result: name }),
  });

  const listed = await parsed(await manager.handleRequest(request("triage-token", "tools/list")));
  expect(listed.result?.tools?.map((tool) => tool.name)).toEqual(["ask_user", "fail", "submit_triage"]);

  const denied = await parsed(
    await manager.handleRequest(request("triage-token", "tools/call", { name: "done", arguments: {} })),
  );
  expect(denied.error?.message).toContain("outil interdit");

  const allowed = await parsed(
    await manager.handleRequest(
      request("triage-token", "tools/call", { name: "ask_user", arguments: { question: "Pourquoi ?" } }),
    ),
  );
  expect(allowed.result?.content?.[0]?.text).toBe("ask_user");
});

test("worker MCP rejects unknown and revoked tokens", async () => {
  const manager = new WorkerMcpManager();
  manager.register("live-token", { onToolCall: async () => ({ ok: true, result: "ok" }) });
  manager.unregister("live-token");

  expect((await manager.handleRequest(request("missing", "ping"))).status).toBe(401);
  expect((await manager.handleRequest(request("live-token", "ping"))).status).toBe(401);
});

test("revocation while a tool is running discards its late result", async () => {
  const manager = new WorkerMcpManager();
  let finish: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  manager.register("turn-token", {
    onToolCall: async () => {
      await pending;
      return { ok: true, result: "late" };
    },
  });

  const responsePromise = manager.handleRequest(
    request("turn-token", "tools/call", { name: "fail", arguments: { reason: "x" } }),
  );
  await Promise.resolve();
  manager.unregister("turn-token");
  finish?.();

  expect((await responsePromise).status).toBe(401);
});

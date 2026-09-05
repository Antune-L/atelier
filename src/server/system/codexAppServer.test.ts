import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { z } from "zod";

import { connectCodexAppServer } from "./codexAppServer.ts";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function fakeAppServer(): string {
  const directory = mkdtempSync(join(tmpdir(), "kanban-app-server-test-"));
  temporaryDirectories.push(directory);
  const path = join(directory, "server.mjs");
  writeFileSync(
    path,
    `
import { createInterface } from "node:readline";

const lines = createInterface({ input: process.stdin });
lines.on("line", (line) => {
  const message = JSON.parse(line);
  if (message.method === "initialize") {
    process.stdout.write(JSON.stringify({ id: message.id, result: { userAgent: "fixture/0.153.4" } }) + "\\n");
  } else if (message.method === "echo") {
    process.stdout.write(JSON.stringify({ method: "fixture/progress", params: { value: "seen" } }) + "\\n");
    process.stdout.write(JSON.stringify({ id: message.id, result: { value: message.params.value } }) + "\\n");
  }
});
`,
    "utf8",
  );
  return path;
}

test("App Server transport performs the handshake and validates responses", async () => {
  const notifications: string[] = [];
  const connection = await connectCodexAppServer({
    binaryPath: process.execPath,
    commandArgs: [fakeAppServer()],
    onNotification: (notification) => notifications.push(notification.method),
  });

  const response = await connection.request("echo", { value: "ok" }, z.object({ value: z.string() }));
  expect(response).toEqual({ value: "ok" });
  expect(notifications).toEqual(["fixture/progress"]);
  await connection.close();
  expect(await connection.exited).toBe(0);
});

test("App Server transport rejects an invalid typed response", async () => {
  const connection = await connectCodexAppServer({
    binaryPath: process.execPath,
    commandArgs: [fakeAppServer()],
  });

  await expect(connection.request("echo", { value: "ok" }, z.object({ value: z.number() }))).rejects.toThrow(
    "Réponse invalide pour echo",
  );
  await connection.close();
});

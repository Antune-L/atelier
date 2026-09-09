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

const PROMPT_REJECTION_MS = 3_000;
const STDOUT_END_REJECTION_MS = 1_000;
const FIXTURE_EXIT_CODE = 3;
const SHELL_PATH = "/bin/sh";
const SHELL_KEEPALIVE_SECONDS = 30;

function writeFixture(handlers: string): string {
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
  ${handlers}
});
`,
    "utf8",
  );
  return path;
}

function fakeAppServer(): string {
  return writeFixture("");
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

test("App Server transport survives a throwing notification handler", async () => {
  const seen: string[] = [];
  const connection = await connectCodexAppServer({
    binaryPath: process.execPath,
    commandArgs: [fakeAppServer()],
    onNotification: (notification) => {
      seen.push(notification.method);
      throw new Error("consommateur cassé");
    },
  });

  const schema = z.object({ value: z.string() });
  expect(await connection.request("echo", { value: "un" }, schema)).toEqual({ value: "un" });
  expect(await connection.request("echo", { value: "deux" }, schema)).toEqual({ value: "deux" });
  expect(seen).toEqual(["fixture/progress", "fixture/progress"]);
  await connection.close();
});

test("App Server transport rejects pending requests as soon as the process exits", async () => {
  const connection = await connectCodexAppServer({
    binaryPath: process.execPath,
    commandArgs: [writeFixture(`else if (message.method === "boom") { process.exit(${FIXTURE_EXIT_CODE}); }`)],
  });

  const startedAt = Date.now();
  await expect(connection.request("boom", {}, z.object({}))).rejects.toThrow("arrêté");
  expect(Date.now() - startedAt).toBeLessThan(PROMPT_REJECTION_MS);
  expect(await connection.exited).toBe(FIXTURE_EXIT_CODE);
});

test("App Server transport rejects pending requests when stdout ends while the process lives", async () => {
  const fixture = writeFixture('else if (message.method === "mute") { process.stdout.end(); process.exit(0); }');
  const connection = await connectCodexAppServer({
    binaryPath: SHELL_PATH,
    commandArgs: ["-c", `"${process.execPath}" "${fixture}"; exec 1>&-; sleep ${SHELL_KEEPALIVE_SECONDS}`],
  });

  const startedAt = Date.now();
  try {
    await expect(connection.request("mute", {}, z.object({}))).rejects.toThrow("fermée");
    expect(Date.now() - startedAt).toBeLessThan(STDOUT_END_REJECTION_MS);
  } finally {
    connection.dispose?.();
  }
});

test("App Server transport survives a throwing stderr handler", async () => {
  const connection = await connectCodexAppServer({
    binaryPath: process.execPath,
    commandArgs: [writeFixture('else if (message.method === "noisy") { process.stderr.write("bruit\\n"); }')],
    onStderr: () => {
      throw new Error("consommateur stderr cassé");
    },
  });

  connection.notify("noisy");
  expect(await connection.request("echo", { value: "ok" }, z.object({ value: z.string() }))).toEqual({
    value: "ok",
  });
  await connection.close();
});

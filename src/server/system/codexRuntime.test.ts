import { afterEach, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

import { connectCodexAppServer, type CodexAppServerConnection } from "./codexAppServer.ts";
import { hasExplicitCodexApiKey, probeCodexRuntime, toCodexRuntimeModels } from "./codexRuntime.ts";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function temporaryScript(name: string, source: string): string {
  const directory = mkdtempSync(join(tmpdir(), "kanban-runtime-probe-test-"));
  temporaryDirectories.push(directory);
  const path = join(directory, name);
  writeFileSync(path, source, "utf8");
  return path;
}

interface CatalogPage {
  data: unknown[];
  nextCursor: string | null;
}

function runtimeConnection(pages: Record<string, CatalogPage>): {
  connection: CodexAppServerConnection;
  cursors: Array<string | null>;
} {
  const cursors: Array<string | null> = [];
  const connection: CodexAppServerConnection = {
    request: async <T>(method: string, params: unknown, schema: z.ZodType<T>): Promise<T> => {
      if (method === "account/read") return schema.parse({ account: { type: "chatgpt" }, requiresOpenaiAuth: true });
      if (method === "model/list") {
        const cursor = z.object({ cursor: z.string().nullable() }).parse(params).cursor;
        cursors.push(cursor);
        return schema.parse(pages[cursor ?? "first"] ?? { data: [], nextCursor: null });
      }
      throw new Error(`unexpected request: ${method}`);
    },
    notify: () => {},
    close: async () => {},
    exited: Promise.resolve(0),
  };
  return { connection, cursors };
}

function runtimeModel(model: string, effort: string): unknown {
  return {
    id: model,
    model,
    hidden: false,
    defaultReasoningEffort: effort,
    supportedReasoningEfforts: [{ reasoningEffort: effort }],
    serviceTiers: [{ id: "priority", name: "Fast", description: "Mode rapide" }],
    defaultServiceTier: null,
  };
}

test("runtime catalog keeps exact supported models and efforts", () => {
  const models = toCodexRuntimeModels([
    {
      id: "astra",
      model: "gpt-6-astra",
      hidden: false,
      defaultReasoningEffort: "medium",
      supportedReasoningEfforts: ["low", "medium", "high", "xhigh", "max", "ultra"].map(
        (reasoningEffort) => ({ reasoningEffort }),
      ),
      serviceTiers: [{ id: "priority", name: "Fast", description: "Mode rapide" }],
      defaultServiceTier: null,
    },
    {
      id: "legacy",
      model: "gpt-5.4",
      hidden: false,
      defaultReasoningEffort: "medium",
      supportedReasoningEfforts: [{ reasoningEffort: "medium" }],
      serviceTiers: [],
      defaultServiceTier: null,
    },
    {
      id: "hidden",
      model: "gpt-5.6-sol",
      hidden: true,
      defaultReasoningEffort: "low",
      supportedReasoningEfforts: [{ reasoningEffort: "low" }],
      serviceTiers: [],
      defaultServiceTier: null,
    },
  ]);

  expect(models).toEqual([
    {
      model: "gpt-6-astra",
      efforts: ["low", "medium", "high", "xhigh", "max", "ultra"],
      defaultEffort: "medium",
      serviceTiers: [{ id: "priority", name: "Fast", description: "Mode rapide" }],
      defaultServiceTier: null,
    },
  ]);
});

test("runtime recognizes only a non-empty explicitly configured API key", () => {
  expect(hasExplicitCodexApiKey({ CODEX_API_KEY: "fixture-secret" })).toBe(true);
  expect(hasExplicitCodexApiKey({ CODEX_API_KEY: "" })).toBe(false);
  expect(hasExplicitCodexApiKey({})).toBe(false);
});

test("runtime catalog follows every model/list page before selecting product models", async () => {
  const fixture = runtimeConnection({
    first: { data: [runtimeModel("gpt-5.6-terra", "medium")], nextCursor: "second" },
    second: { data: [runtimeModel("gpt-6-astra", "ultra")], nextCursor: null },
  });
  const status = await probeCodexRuntime({
    resolveBinary: () => "/fixture/codex",
    connect: async () => fixture.connection,
    environment: {},
  });

  expect(fixture.cursors).toEqual([null, "second"]);
  expect(status.status).toBe("ready");
  expect(status.models.map((model) => model.model)).toEqual(["gpt-5.6-terra", "gpt-6-astra"]);
});

test("runtime distinguishes an unsupported catalog from a temporary probe failure", async () => {
  const unsupported = runtimeConnection({
    first: { data: [runtimeModel("gpt-5.5", "medium")], nextCursor: null },
  });
  const absent = await probeCodexRuntime({
    resolveBinary: () => "/fixture/codex",
    connect: async () => unsupported.connection,
    environment: {},
  });
  expect(absent.status).toBe("model_unavailable");

  const temporary = await probeCodexRuntime({
    resolveBinary: () => "/fixture/codex",
    connect: async () => { throw new Error("transport stopped"); },
    environment: {},
  });
  expect(temporary.status).toBe("temporarily_unavailable");
});

test("runtime reports an invalid App Server schema as incompatible rather than temporary", async () => {
  const invalid = runtimeConnection({
    first: { data: [{ id: "missing-model-fields" }], nextCursor: null },
  });
  const status = await probeCodexRuntime({
    resolveBinary: () => "/fixture/codex",
    connect: async () => invalid.connection,
    environment: {},
  });

  expect(status.status).toBe("unavailable");
  expect(status.message).toContain("incompatible avec le protocole App Server 0.153.4");
});

test("runtime keeps an App Server exit during initialize temporary", async () => {
  const server = temporaryScript("server.mjs", "process.exit(17);\n");
  const status = await probeCodexRuntime({
    resolveBinary: () => "/fixture/codex",
    connect: (options) => connectCodexAppServer({
      ...options,
      binaryPath: process.execPath,
      commandArgs: [server],
      requestTimeoutMs: 50,
    }),
    environment: {},
  });

  expect(status.status).toBe("temporarily_unavailable");
  expect(status.message).toContain("Initialisation Codex App Server impossible");
});

test("runtime reports an unsupported initialize method as incompatible", async () => {
  const server = temporaryScript(
    "server.mjs",
    `import { createInterface } from "node:readline";\ncreateInterface({ input: process.stdin }).on("line", (line) => {\n  const message = JSON.parse(line);\n  process.stdout.write(JSON.stringify({ id: message.id, error: { code: -32601, message: "Method not found" } }) + "\\n");\n});\n`,
  );
  const status = await probeCodexRuntime({
    resolveBinary: () => "/fixture/codex",
    connect: (options) => connectCodexAppServer({
      ...options,
      binaryPath: process.execPath,
      commandArgs: [server],
      requestTimeoutMs: 50,
    }),
    environment: {},
  });

  expect(status.status).toBe("unavailable");
  expect(status.message).toContain("incompatible avec le protocole App Server 0.153.4");
});

test("runtime rejects a mismatched Codex binary before starting App Server", async () => {
  const directory = mkdtempSync(join(tmpdir(), "kanban-runtime-version-test-"));
  temporaryDirectories.push(directory);
  const marker = join(directory, "app-server-started");
  const binary = join(directory, "codex-fixture.mjs");
  writeFileSync(
    binary,
    `#!${process.execPath}\nimport { writeFileSync } from "node:fs";\nif (process.argv[2] === "--version") {\n  console.log("codex-cli 0.999.0");\n} else {\n  writeFileSync(${JSON.stringify(marker)}, "started");\n}\n`,
    "utf8",
  );
  chmodSync(binary, 0o755);

  const status = await probeCodexRuntime({
    resolveBinary: () => binary,
    environment: {},
  });

  expect(status.status).toBe("unavailable");
  expect(status.message).toContain("attendu codex-cli 0.153.4, reçu codex-cli 0.999.0");
  expect(existsSync(marker)).toBe(false);
});

/** Typed JSON-RPC transport for `codex app-server --stdio`. */

import { z } from "zod";

import { verifyCodexBinaryVersion } from "./codexBinary.ts";

const REQUEST_TIMEOUT_MS = 20_000;
const JSONRPC_INTERNAL_ERROR = -32603;

const rpcErrorSchema = z.object({ code: z.number(), message: z.string() });
const incomingSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  method: z.string().optional(),
  params: z.unknown().optional(),
  result: z.unknown().optional(),
  error: rpcErrorSchema.optional(),
});
const initializeResponseSchema = z.object({
  userAgent: z.string(),
  platformFamily: z.string().optional(),
  platformOs: z.string().optional(),
});

export class CodexAppServerProtocolError extends Error {}

export class CodexAppServerRpcError extends Error {
  constructor(
    readonly code: number,
    message: string,
  ) {
    super(`${message} (${code})`);
  }
}

export class CodexAppServerInitializationError extends Error {
  constructor(readonly reason: unknown) {
    super(`Initialisation Codex App Server impossible : ${errorMessage(reason)}`);
  }
}

interface PendingRequest {
  accept(result: unknown): void;
  reject(error: Error): void;
  timer: ReturnType<typeof setTimeout>;
}

export interface CodexAppServerNotification {
  method: string;
  params: unknown;
}

export interface CodexAppServerOptions {
  binaryPath: string;
  cwd?: string;
  env?: Record<string, string | undefined>;
  /** Test seam. Production always uses `["app-server", "--stdio"]`. */
  commandArgs?: string[];
  requestTimeoutMs?: number;
  onNotification?(notification: CodexAppServerNotification): void;
  onStderr?(line: string): void;
}

export interface CodexAppServerConnection {
  request<T>(method: string, params: unknown, schema: z.ZodType<T>): Promise<T>;
  notify(method: string, params?: unknown): void;
  close(): Promise<void>;
  dispose?(): void;
  readonly exited: Promise<number>;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Spawn and initialize one isolated App Server connection. */
export async function connectCodexAppServer(options: CodexAppServerOptions): Promise<CodexAppServerConnection> {
  if (!options.commandArgs) await verifyCodexBinaryVersion(options.binaryPath, options.env);
  const connection = spawnCodexAppServer(options);
  try {
    await connection.request(
      "initialize",
      {
        clientInfo: { name: "kanban_agents", title: "Atelier", version: "0.0.0" },
        capabilities: { experimentalApi: false },
      },
      initializeResponseSchema,
    );
    connection.notify("initialized");
    return connection;
  } catch (error) {
    await connection.close();
    throw new CodexAppServerInitializationError(error);
  }
}

function spawnCodexAppServer(options: CodexAppServerOptions): CodexAppServerConnection {
  const proc = Bun.spawn([options.binaryPath, ...(options.commandArgs ?? ["app-server", "--stdio"])], {
    cwd: options.cwd,
    env: options.env ?? process.env,
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  const pending = new Map<number, PendingRequest>();
  let nextId = 1;
  let closed = false;

  function write(message: unknown): void {
    if (closed) throw new Error("Connexion Codex App Server fermée");
    proc.stdin.write(`${JSON.stringify(message)}\n`);
    proc.stdin.flush();
  }

  function rejectPending(error: Error): void {
    for (const request of pending.values()) {
      clearTimeout(request.timer);
      request.reject(error);
    }
    pending.clear();
  }

  function handleLine(line: string): void {
    let raw: unknown;
    try {
      raw = JSON.parse(line);
    } catch {
      return;
    }
    const parsed = incomingSchema.safeParse(raw);
    if (!parsed.success) return;
    const message = parsed.data;

    if (message.method) {
      if (message.id !== undefined) {
        write({
          id: message.id,
          error: { code: JSONRPC_INTERNAL_ERROR, message: `Requête serveur refusée : ${message.method}` },
        });
      } else {
        options.onNotification?.({ method: message.method, params: message.params });
      }
      return;
    }
    if (typeof message.id !== "number") return;
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    clearTimeout(request.timer);
    if (message.error) request.reject(new CodexAppServerRpcError(message.error.code, message.error.message));
    else request.accept(message.result);
  }

  async function readLines(
    stream: ReadableStream<Uint8Array>,
    onLine: (line: string) => void,
  ): Promise<void> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (line) onLine(line);
        newline = buffer.indexOf("\n");
      }
    }
    const tail = `${buffer}${decoder.decode()}`.trim();
    if (tail) onLine(tail);
  }

  void readLines(proc.stdout, handleLine).catch((error) => {
    rejectPending(new Error(`Lecture Codex App Server interrompue : ${errorMessage(error)}`));
  });
  void readLines(proc.stderr, (line) => options.onStderr?.(line));

  const exited = proc.exited.then((exitCode) => {
    closed = true;
    rejectPending(new Error(`Codex App Server arrêté (code ${exitCode})`));
    return exitCode;
  });

  return {
    request: <T>(method: string, params: unknown, schema: z.ZodType<T>): Promise<T> => {
      if (closed) return Promise.reject(new Error("Connexion Codex App Server fermée"));
      const id = nextId;
      nextId += 1;
      return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`Délai dépassé pour ${method}`));
        }, options.requestTimeoutMs ?? REQUEST_TIMEOUT_MS);
        pending.set(id, {
          timer,
          reject,
          accept: (result) => {
            const parsed = schema.safeParse(result);
            if (parsed.success) resolve(parsed.data);
            else reject(new CodexAppServerProtocolError(`Réponse invalide pour ${method}`));
          },
        });
        try {
          write({ method, id, params });
        } catch (error) {
          clearTimeout(timer);
          pending.delete(id);
          reject(new Error(errorMessage(error)));
        }
      });
    },
    notify: (method, params) => write(params === undefined ? { method } : { method, params }),
    close: async () => {
      if (closed) return;
      closed = true;
      rejectPending(new Error("Connexion Codex App Server fermée"));
      proc.stdin.end();
      const timer = setTimeout(() => proc.kill(), 2_000);
      await exited;
      clearTimeout(timer);
    },
    dispose: () => {
      closed = true;
      rejectPending(new Error("Connexion Codex App Server arrêtée"));
      proc.kill("SIGKILL");
    },
    exited,
  };
}

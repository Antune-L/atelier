import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Elysia } from "elysia";

import {
  TERMINAL_DEFAULT_COLS,
  TERMINAL_DEFAULT_ROWS,
  WS_PATH_CLIENT,
  WS_PATH_TERMINAL,
  WS_PATH_WORKER,
} from "../shared/constants.ts";
import { terminalViewportSchema } from "../shared/schemas.ts";

import { AgentCoordinator } from "./agents/coordinator.ts";
import { SlotManager } from "./agents/slotManager.ts";
import { FeasibilityBatchManager } from "./agents/feasibilityManager.ts";
import { TriageManager } from "./agents/triageManager.ts";
import { Watchdog } from "./agents/watchdog.ts";
import { runFirstBootSetup } from "./boot.ts";
import { createDatabase } from "./db/schema.ts";
import { Store } from "./db/store.ts";
import type { ClientSocket } from "./hub.ts";
import { ClientHub } from "./hub.ts";
import { TicketLifecycle } from "./lifecycle.ts";
import { createLogger } from "./logger.ts";
import { Notifier } from "./notifier.ts";
import { createApiRoutes } from "./routes.ts";
import { createSystemAdapter } from "./system/index.ts";
import type { TerminalSocket } from "./terminalManager.ts";
import { TerminalSessionManager } from "./terminalManager.ts";
import { UPLOADS_DIR, serveUpload } from "./uploads.ts";
import type { WorkerSocket } from "./workerHub.ts";
import { WorkerHub } from "./workerHub.ts";

const DEFAULT_PORT = 52817;
const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Subpath, relative to resourcesRoot, holding the built web UI served as a static SPA. */
const WEB_DIST_SUBPATH = join("dist", "web");
const SPA_FALLBACK_FILE = "index.html";

/**
 * Boot options. Defaults keep the web/dev path on the repo root for both roots.
 *
 * Only the filesystem roots flow through here. The rest of the desktop boot contract is read from
 * env (set by desktop/bootstrap.applyDesktopEnv before this module is dynamically imported), because
 * config.ts / system / boot.ts read their env at import time, before opts exist: KANBAN_CONFIG +
 * KANBAN_DB (writable paths), KANBAN_AGENT_DIST (spawn the bundled worker/hook .js), KANBAN_BUN_PATH
 * (stock bun via argv0). Web mode leaves all of these unset and inherits the repo-root defaults.
 */
export interface StartServerOptions {
  /** Read-only assets: dist/web, worker.js, hooks, templates (default: repo root). */
  resourcesRoot?: string;
  /** Writable data: kanban.db, uploads/, config.json, slots/ (default: repo root). */
  dataRoot?: string;
  /** Native OS notification sink (desktop app only; WKWebView has no web Notification API). */
  onNotify?: (title: string, body: string) => void;
  /** Real checkout root for the in-app self-update git guards + rebuild (desktop dev only). */
  repoRoot?: string;
  /** Tear down the server (preserving tmux jobs) and relaunch the app (desktop dev only). */
  onRequestUpdate?: () => void;
}

export interface RunningServer {
  port: number;
  /** Kill detached tmux sessions backing occupied slots (desktop shutdown only). */
  teardownSessions(): Promise<void>;
  /** Stop the HTTP/WS server, the watchdog timer, and close the database. */
  stop(): void;
}

type SocketData =
  | { kind: "client" }
  | { kind: "worker"; ticketId: string | null; slotId: number | null }
  | { kind: "terminal"; ticketId: string; cols: number; rows: number };

function isWorkerSocket(ws: { data: SocketData }): ws is WorkerSocket {
  return ws.data.kind === "worker";
}

function isClientSocket(ws: { data: SocketData }): ws is ClientSocket {
  return ws.data.kind === "client";
}

function isTerminalSocket(ws: { data: SocketData }): ws is TerminalSocket {
  return ws.data.kind === "terminal";
}

const HTTP_NOT_FOUND = 404;

/**
 * Content-Type by extension for the static SPA. Elysia's onError re-wraps a raw Response and drops
 * Bun.file's auto-derived type, so WebKit (the desktop webview) would reject `<script type=module>`
 * served without a JS MIME → blank screen. We set it explicitly here.
 */
const STATIC_CONTENT_TYPES: Record<string, string> = {
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".wasm": "application/wasm",
};
const DEFAULT_CONTENT_TYPE = "application/octet-stream";

function staticResponse(file: ReturnType<typeof Bun.file>, name: string): Response {
  const ext = extname(name).toLowerCase();
  const type = STATIC_CONTENT_TYPES[ext] ?? DEFAULT_CONTENT_TYPE;
  const headers: Record<string, string> = { "content-type": type };
  // index.html must not be cached: Vite assets are content-hashed, but the entry point isn't.
  // A stale index.html after a soft-reload would serve the old JS bundles despite a rebuilt dist.
  if (ext === ".html") headers["cache-control"] = "no-cache, no-store, must-revalidate";
  return new Response(file, { headers });
}

/**
 * Serve the built SPA from <resourcesRoot>/dist/web as the LAST fallback, after every
 * API/WS/uploads/health route has been ruled out. A miss falls back to index.html so the
 * client-side router owns deep links. Path is normalized + scoped to webDist to bar traversal.
 */
async function serveStaticAsset(webDist: string, pathname: string): Promise<Response> {
  const relative = pathname === "/" ? SPA_FALLBACK_FILE : pathname.replace(/^\/+/, "");
  const candidate = normalize(join(webDist, relative));
  if (candidate === webDist || candidate.startsWith(`${webDist}/`)) {
    const file = Bun.file(candidate);
    if (await file.exists()) return staticResponse(file, candidate);
  }
  const fallback = Bun.file(join(webDist, SPA_FALLBACK_FILE));
  if (await fallback.exists()) return staticResponse(fallback, SPA_FALLBACK_FILE);
  return new Response("not found", { status: HTTP_NOT_FOUND });
}

/**
 * Boot the full backend (db/store/hubs/slotManager + Bun.serve) and return the live port plus a
 * stop() handle. Top-level `await startServer()` keeps the web mode unchanged; the desktop wrapper
 * calls it with explicit roots after bootstrapping config + env.
 */
export async function startServer(opts: StartServerOptions = {}): Promise<RunningServer> {
  const resourcesRoot = opts.resourcesRoot ?? PROJECT_ROOT;
  const dataRoot = opts.dataRoot ?? PROJECT_ROOT;
  // dev-desktop self-update: serve from the live repo so a soft-reload (location.reload()) picks up
  // freshly rebuilt assets without killing the window. The packaged .app never sets repoRoot.
  const webDist =
    opts.repoRoot != null
      ? join(opts.repoRoot, WEB_DIST_SUBPATH)
      : join(resourcesRoot, WEB_DIST_SUBPATH);

  const port = Number(process.env.PORT ?? DEFAULT_PORT);
  const dbPath = process.env.KANBAN_DB ?? join(dataRoot, "kanban.db");
  const backendHttp = process.env.BACKEND_HTTP ?? `http://localhost:${port}`;
  const backendWs = process.env.BACKEND_WS ?? `ws://localhost:${port}${WS_PATH_WORKER}`;
  // The bundled Electrobun bun is a stock binary reachable via argv0; the desktop main exports
  // KANBAN_BUN_PATH so spawned worker/hook processes run under it. Falls back to this runtime.
  const bunPath = process.env.KANBAN_BUN_PATH ?? process.execPath;

  const db = createDatabase(dbPath);
  const store = new Store(db);
  const system = createSystemAdapter();
  const clientHub = new ClientHub(store);
  const workerHub = new WorkerHub();
  const notifier = new Notifier(clientHub, opts.onNotify);
  const lifecycle = new TicketLifecycle(store, clientHub, notifier);
  const triageManager = new TriageManager(store, system, workerHub, clientHub, {
    backendWs,
    projectRoot: resourcesRoot,
    bunPath,
  });
  const feasibilityManager = new FeasibilityBatchManager(store, system, workerHub, clientHub, {
    backendWs,
    projectRoot: resourcesRoot,
    bunPath,
  });
  const terminalManager = new TerminalSessionManager(store, system, triageManager, feasibilityManager);

  const slotManager = new SlotManager(store, system, clientHub, workerHub, notifier, lifecycle, {
    backendHttp,
    backendWs,
    projectRoot: resourcesRoot,
    bunPath,
  });
  const coordinator = new AgentCoordinator(
    store,
    clientHub,
    workerHub,
    notifier,
    lifecycle,
    slotManager,
    triageManager,
    feasibilityManager,
  );
  const watchdog = new Watchdog(store, clientHub, notifier);

  await runFirstBootSetup(store, system);
  await slotManager.recover();
  await triageManager.recoverStale();
  await feasibilityManager.recoverStale();
  watchdog.start();

  const composerAvailable = await system.checkComposerAvailable();
  createLogger("boot").info("Composer (Cursor CLI) détecté", { composerAvailable });

  const api = createApiRoutes({
    store,
    hub: clientHub,
    lifecycle,
    slots: slotManager,
    coordinator,
    system,
    triage: triageManager,
    feasibility: feasibilityManager,
    projectRoot: dataRoot,
    composerAvailable,
    repoRoot: opts.repoRoot,
    onRequestUpdate: opts.onRequestUpdate,
  });

  const app = new Elysia()
    .use(api)
    .get("/health", () => ({ ok: true, dryRun: system.dryRun }))
    .onError(({ code, error, set, request }) => {
      // Unmatched GET outside /api → serve the built SPA (static + client-side routing). This is the
      // final else: /api misses keep their JSON 404, and /ws|/workers|/uploads never reach Elysia.
      const pathname = new URL(request.url).pathname;
      if (code === "NOT_FOUND" && request.method === "GET" && !pathname.startsWith("/api")) {
        return serveStaticAsset(webDist, pathname);
      }
      if (code === "NOT_FOUND") {
        set.status = HTTP_NOT_FOUND;
        return { error: "NOT_FOUND" };
      }
      set.status = 500;
      return { error: error instanceof Error ? error.message : String(error) };
    });

  // CORS for the Vite dev server.
  app.onRequest(({ set }) => {
    set.headers["access-control-allow-origin"] = "*";
    set.headers["access-control-allow-methods"] = "GET, POST, PATCH, DELETE, OPTIONS";
    set.headers["access-control-allow-headers"] = "content-type";
  });
  app.options("/*", () => new Response(null, { status: 204 }));

  const server = Bun.serve<SocketData>({
    port,
    async fetch(request, srv) {
      const url = new URL(request.url);
      if (url.pathname === WS_PATH_CLIENT) {
        if (srv.upgrade(request, { data: { kind: "client" } })) return undefined;
        return new Response("upgrade failed", { status: 426 });
      }
      if (url.pathname === WS_PATH_WORKER) {
        if (srv.upgrade(request, { data: { kind: "worker", ticketId: null, slotId: null } })) return undefined;
        return new Response("upgrade failed", { status: 426 });
      }
      if (url.pathname === WS_PATH_TERMINAL) {
        const ticketId = url.searchParams.get("ticketId");
        if (!ticketId) return new Response("ticketId requis", { status: 400 });
        // The viewport drives the pane geometry; fall back to the spawn default if absent/invalid.
        const viewport = terminalViewportSchema.safeParse({
          cols: url.searchParams.get("cols"),
          rows: url.searchParams.get("rows"),
        });
        const { cols, rows } = viewport.success
          ? viewport.data
          : { cols: TERMINAL_DEFAULT_COLS, rows: TERMINAL_DEFAULT_ROWS };
        if (srv.upgrade(request, { data: { kind: "terminal", ticketId, cols, rows } })) return undefined;
        return new Response("upgrade failed", { status: 426 });
      }
      if (url.pathname.startsWith(`/${UPLOADS_DIR}/`)) {
        return serveUpload(dataRoot, url.pathname);
      }
      // Elysia owns /api, /health and every declared route; an unmatched non-API GET is served the
      // built SPA from its NOT_FOUND onError handler (the final static fallback).
      return app.handle(request);
    },
    websocket: {
      open(ws) {
        if (isClientSocket(ws)) clientHub.add(ws);
        if (isTerminalSocket(ws)) void terminalManager.handleOpen(ws);
      },
      message(ws, message) {
        const text = typeof message === "string" ? message : message.toString();
        if (isWorkerSocket(ws)) void workerHub.handleMessage(ws, text);
        if (isTerminalSocket(ws)) terminalManager.handleMessage(ws, text);
      },
      close(ws) {
        if (isClientSocket(ws)) clientHub.remove(ws);
        if (isWorkerSocket(ws)) workerHub.handleClose(ws);
        if (isTerminalSocket(ws)) terminalManager.handleClose(ws);
      },
    },
  });

  const log = createLogger("server");
  log.info(`backend prêt sur http://localhost:${server.port}`, { dryRun: system.dryRun });
  log.info("WebSocket prêts", { client: WS_PATH_CLIENT, worker: WS_PATH_WORKER, terminal: WS_PATH_TERMINAL });

  return {
    // Bun types server.port as optional; it is always set here, the fallback only satisfies the type.
    port: server.port ?? port,
    async teardownSessions() {
      await slotManager.teardownSessions();
      await triageManager.teardownAll();
      await feasibilityManager.teardownAll();
    },
    stop() {
      watchdog.stop();
      server.stop(true);
      db.close();
    },
  };
}

// Web mode: boot on the repo root. The desktop wrapper imports startServer dynamically instead.
if (import.meta.main) {
  await startServer();
}

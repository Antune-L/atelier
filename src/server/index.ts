import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Elysia } from "elysia";

import { WS_PATH_CLIENT, WS_PATH_WORKER } from "../shared/constants.ts";

import { AgentCoordinator } from "./agents/coordinator.ts";
import { SlotManager } from "./agents/slotManager.ts";
import { Watchdog } from "./agents/watchdog.ts";
import { runFirstBootSetup } from "./boot.ts";
import { createDatabase } from "./db/schema.ts";
import { Store } from "./db/store.ts";
import type { ClientSocket } from "./hub.ts";
import { ClientHub } from "./hub.ts";
import { LiveLog } from "./liveLog.ts";
import { createLogger } from "./logger.ts";
import { Notifier } from "./notifier.ts";
import { createApiRoutes } from "./routes.ts";
import { createSystemAdapter } from "./system/index.ts";
import { UPLOADS_DIR, serveUpload } from "./uploads.ts";
import type { WorkerSocket } from "./workerHub.ts";
import { WorkerHub } from "./workerHub.ts";

const DEFAULT_PORT = 3001;
const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const port = Number(process.env.PORT ?? DEFAULT_PORT);
const dbPath = process.env.KANBAN_DB ?? join(PROJECT_ROOT, "kanban.db");
const backendHttp = process.env.BACKEND_HTTP ?? `http://localhost:${port}`;
const backendWs = process.env.BACKEND_WS ?? `ws://localhost:${port}${WS_PATH_WORKER}`;
const bunPath = process.execPath;

const db = createDatabase(dbPath);
const store = new Store(db);
const system = createSystemAdapter();
const clientHub = new ClientHub(store);
const workerHub = new WorkerHub();
const notifier = new Notifier(system, clientHub);
const triageLog = new LiveLog();

const slotManager = new SlotManager(store, system, clientHub, workerHub, notifier, {
  backendHttp,
  backendWs,
  projectRoot: PROJECT_ROOT,
  bunPath,
});
const coordinator = new AgentCoordinator(store, clientHub, workerHub, notifier, slotManager);
const watchdog = new Watchdog(store, clientHub, notifier);

await runFirstBootSetup(store, system);
await slotManager.recover();
watchdog.start();

// ---- WebSocket data discriminator ----

type SocketData = { kind: "client" } | { kind: "worker"; ticketId: string | null; slotId: number | null };

function isWorkerSocket(ws: { data: SocketData }): ws is WorkerSocket {
  return ws.data.kind === "worker";
}

function isClientSocket(ws: { data: SocketData }): ws is ClientSocket {
  return ws.data.kind === "client";
}

const api = createApiRoutes({
  store,
  hub: clientHub,
  slots: slotManager,
  coordinator,
  system,
  triageLog,
  projectRoot: PROJECT_ROOT,
});

const app = new Elysia()
  .use(api)
  .get("/health", () => ({ ok: true, dryRun: system.dryRun }))
  .onError(({ error, set }) => {
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
    if (url.pathname.startsWith(`/${UPLOADS_DIR}/`)) {
      return serveUpload(PROJECT_ROOT, url.pathname);
    }
    return app.handle(request);
  },
  websocket: {
    open(ws) {
      if (isClientSocket(ws)) clientHub.add(ws);
    },
    message(ws, message) {
      const text = typeof message === "string" ? message : message.toString();
      if (isWorkerSocket(ws)) void workerHub.handleMessage(ws, text);
    },
    close(ws) {
      if (isClientSocket(ws)) clientHub.remove(ws);
      if (isWorkerSocket(ws)) workerHub.handleClose(ws);
    },
  },
});

const log = createLogger("server");
log.info(`backend prêt sur http://localhost:${server.port}`, { dryRun: system.dryRun });
log.info("WebSocket prêts", { client: WS_PATH_CLIENT, worker: WS_PATH_WORKER });

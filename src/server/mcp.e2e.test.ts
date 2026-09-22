import { afterAll, beforeAll, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { z } from "zod";

import { createMcpSettingsController } from "../../desktop/mcpSettings.ts";
import { ticketSchema, wsClientEventSchema } from "../shared/schemas.ts";

import { startServer } from "./index.ts";
import type { RunningServer } from "./index.ts";

const MCP_TOKEN = "e2e-local-token";
const PROJECT_KEY = "mcp-e2e";
const OTHER_PROJECT_KEY = "mcp-e2e-other";
const REQUEST_ID = "create-e2e-ticket";
const EVENT_TIMEOUT_MS = 5_000;
const BACKGROUND_TASK_SETTLE_MS = 3_000;

const compactTicketSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  externalUrl: z.string().nullable(),
  project: z.string(),
  kind: z.enum(["feature", "review", "ask", "clean"]),
  column: z.string(),
  stage: z.string().nullable(),
  error: z.string().nullable(),
  dependsOn: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const projectResultSchema = z.object({
  projects: z.array(z.object({
    key: z.string(),
    label: z.string(),
    baseBranch: z.string(),
    defaultAutoMerge: z.boolean(),
    defaultAddScreenshots: z.boolean(),
  })),
  dryRun: z.boolean(),
});

const ticketPageSchema = z.object({
  tickets: z.array(compactTicketSchema),
  total: z.number(),
  nextOffset: z.number().nullable(),
  dryRun: z.boolean(),
});

const createResultSchema = z.object({
  created: z.boolean(),
  ticket: compactTicketSchema,
  dryRun: z.boolean(),
});

const startResultSchema = z.object({
  status: z.enum(["queued", "already_started"]),
  ticket: compactTicketSchema,
  dryRun: z.boolean(),
});

const analyzeResultSchema = z.object({
  started: z.number(),
  startedIds: z.array(z.string()),
  rejected: z.array(z.object({
    id: z.string(),
    reason: z.enum(["not_found", "busy"]),
  })),
  dryRun: z.boolean(),
});

const updateResultSchema = z.object({
  ticket: ticketSchema.pick({
    id: true,
    title: true,
    description: true,
    externalUrl: true,
    project: true,
    column: true,
    stage: true,
    prdEnabled: true,
    prDraft: true,
    autoMerge: true,
    stealth: true,
    directPush: true,
    addScreenshots: true,
    verifyFeature: true,
    argusMultiLoop: true,
    baseBranch: true,
    dependsOn: true,
    model: true,
    effort: true,
    implementerModel: true,
    implementerEffort: true,
    orchestrator: true,
    implementer: true,
    codexModel: true,
    codexEffort: true,
    codexFast: true,
    codexImplementerModel: true,
    codexImplementerEffort: true,
    codexImplementerFast: true,
    feasibilityEngine: true,
    feasibilityContext: true,
    triageStatus: true,
    updatedAt: true,
  }),
  dryRun: z.boolean(),
});

const UPDATE_TICKET_FIELDS = [
  "addScreenshots",
  "argusMultiLoop",
  "autoMerge",
  "baseBranch",
  "codexEffort",
  "codexFast",
  "codexImplementerEffort",
  "codexImplementerFast",
  "codexImplementerModel",
  "codexModel",
  "dependsOn",
  "description",
  "directPush",
  "effort",
  "externalUrl",
  "feasibilityContext",
  "feasibilityEngine",
  "implementer",
  "implementerEffort",
  "implementerModel",
  "model",
  "orchestrator",
  "prDraft",
  "prdEnabled",
  "project",
  "stealth",
  "ticketId",
  "title",
  "verifyFeature",
] as const;

const errorResultSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

const structuredContentResultSchema = z.object({
  structuredContent: z.record(z.string(), z.unknown()),
});

const textContentResultSchema = z.object({
  content: z.array(z.object({
    type: z.string(),
    text: z.string().optional(),
  })),
});

/** Env keys the desktop app exports; a stray one here would boot this test server on the live data. */
const ISOLATED_ENV_KEYS = ["KANBAN_DB", "KANBAN_CONFIG", "KANBAN_SETUP", "KANBAN_DRY_RUN"] as const;

let dataRoot = "";
const savedEnv = new Map<string, string | undefined>();
let runningServer: RunningServer | null = null;
let client: Client | null = null;
let transport: StreamableHTTPClientTransport | null = null;
let baseUrl = "";

function structuredContent(result: unknown) {
  return structuredContentResultSchema.parse(result).structuredContent;
}

function textContent(result: unknown) {
  const parsed = textContentResultSchema.parse(result);
  const content = parsed.content.find((item) => item.type === "text");
  if (content?.text === undefined) throw new Error("réponse MCP texte manquante");
  return JSON.parse(content.text);
}

async function nextTicketEvent(
  socket: WebSocket,
  matches: (ticket: z.infer<typeof ticketSchema>) => boolean,
): Promise<z.infer<typeof ticketSchema>> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("notification WebSocket ticket absente")), EVENT_TIMEOUT_MS);
    socket.addEventListener("message", (event) => {
      const parsed = wsClientEventSchema.safeParse(JSON.parse(String(event.data)));
      if (!parsed.success || parsed.data.type !== "ticket" || !matches(parsed.data.ticket)) return;
      clearTimeout(timeout);
      resolve(parsed.data.ticket);
    });
  });
}

async function waitForSocketOpen(socket: WebSocket): Promise<void> {
  if (socket.readyState === WebSocket.OPEN) return;
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener("open", () => resolve(), { once: true });
    socket.addEventListener("error", () => reject(new Error("connexion WebSocket impossible")), { once: true });
  });
}

beforeAll(async () => {
  // createSystemAdapter / startServer read these at call time, so neutralising them here is enough:
  // an agent shell that inherited the desktop env must not make this boot touch the live database.
  for (const key of ISOLATED_ENV_KEYS) {
    savedEnv.set(key, process.env[key]);
    delete process.env[key];
  }
  process.env.KANBAN_DRY_RUN = "1";
  dataRoot = await mkdtemp(join(tmpdir(), "kanban-mcp-e2e-"));
  await writeFile(join(dataRoot, "config.json"), JSON.stringify({
    projects: {
      [PROJECT_KEY]: {
        label: "MCP E2E",
        repoPath: join(dataRoot, "fixture-project"),
        baseBranch: "main",
        defaultAutoMerge: true,
        defaultAddScreenshots: true,
        commitTimeoutMs: 1_000,
      },
      [OTHER_PROJECT_KEY]: {
        label: "MCP E2E Other",
        repoPath: join(dataRoot, "fixture-project-other"),
        baseBranch: "main",
        defaultAutoMerge: false,
        defaultAddScreenshots: false,
        commitTimeoutMs: 1_000,
      },
    },
  }));
  runningServer = await startServer({ dataRoot, port: 0, mcpToken: MCP_TOKEN });
  baseUrl = `http://127.0.0.1:${runningServer.port}`;
  client = new Client({ name: "atelier-e2e", version: "1.0.0" });
  transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`), {
    requestInit: { headers: { authorization: `Bearer ${MCP_TOKEN}` } },
  });
  await client.connect(transport);
});

afterAll(async () => {
  await transport?.close();
  await runningServer?.teardownSessions();
  await runningServer?.stop();
  if (dataRoot !== "") await rm(dataRoot, { recursive: true, force: true });
  for (const [key, value] of savedEnv) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test("an official MCP client lists, creates idempotently, starts, and updates REST and WebSocket clients", async () => {
  if (client === null) throw new Error("client MCP non initialisé");

  const tools = await client.listTools();
  expect(tools.tools.map((tool) => tool.name).sort()).toEqual([
    "analyze_tickets",
    "create_todo_ticket",
    "list_projects",
    "list_tickets",
    "start_ticket",
    "update_ticket",
  ]);

  const updateTool = tools.tools.find((tool) => tool.name === "update_ticket");
  const updateInputSchema = z.object({
    additionalProperties: z.literal(false),
    properties: z.record(z.string(), z.unknown()),
  }).parse(updateTool?.inputSchema);
  expect(Object.keys(updateInputSchema.properties).sort()).toEqual([...UPDATE_TICKET_FIELDS]);

  const projects = projectResultSchema.parse(structuredContent(await client.callTool({ name: "list_projects" })));
  expect(projects.dryRun).toBe(true);
  expect(projects.projects.find((project) => project.key === PROJECT_KEY)).toMatchObject({
    key: PROJECT_KEY,
    defaultAutoMerge: true,
    defaultAddScreenshots: true,
  });

  const socket = new WebSocket(`${baseUrl.replace("http", "ws")}/ws`);
  await waitForSocketOpen(socket);
  try {
    const createCall = {
      name: "create_todo_ticket",
      arguments: {
        project: PROJECT_KEY,
        title: "Carte créée par MCP",
        description: "Valide le chemin MCP public.",
        requestId: REQUEST_ID,
      },
    };
    const createNotificationPromise = nextTicketEvent(socket, (ticket) => ticket.title === createCall.arguments.title);
    const created = createResultSchema.parse(structuredContent(await client.callTool(createCall)));
    expect(created.created).toBe(true);
    expect(created.dryRun).toBe(true);
    expect(created.ticket).toMatchObject({ project: PROJECT_KEY, column: "todo", stage: null });

    const createNotification = await createNotificationPromise;
    expect(createNotification.column).toBe("todo");

    const replayed = createResultSchema.parse(structuredContent(await client.callTool(createCall)));
    expect(replayed).toMatchObject({ created: false, ticket: { id: created.ticket.id } });

    const conflict = await client.callTool({
      ...createCall,
      arguments: { ...createCall.arguments, title: "Charge différente" },
    });
    expect(conflict.isError).toBe(true);
    expect(errorResultSchema.parse(textContent(conflict)).error.code).toBe("CONFLICT");

    const listed = ticketPageSchema.parse(structuredContent(await client.callTool({
      name: "list_tickets",
      arguments: { project: PROJECT_KEY, column: "todo", limit: 1 },
    })));
    expect(listed).toMatchObject({ total: 1, nextOffset: null, dryRun: true });
    expect(listed.tickets[0]?.id).toBe(created.ticket.id);

    const startNotificationPromise = nextTicketEvent(socket, (ticket) => (
      ticket.id === created.ticket.id && ticket.column === "implementing"
    ));
    const started = startResultSchema.parse(structuredContent(await client.callTool({
      name: "start_ticket",
      arguments: { ticketId: created.ticket.id },
    })));
    expect(started).toMatchObject({ status: "queued", dryRun: true, ticket: { column: "implementing" } });
    expect((await startNotificationPromise).column).toBe("implementing");

    const duplicateStart = startResultSchema.parse(structuredContent(await client.callTool({
      name: "start_ticket",
      arguments: { ticketId: created.ticket.id },
    })));
    expect(duplicateStart.status).toBe("already_started");

    const restResponse = await fetch(`${baseUrl}/api/tickets`);
    expect(restResponse.status).toBe(200);
    const restTickets = z.array(ticketSchema).parse(await restResponse.json());
    expect(restTickets).toHaveLength(1);
    expect(restTickets[0]).toMatchObject({ id: created.ticket.id, column: "implementing" });
  } finally {
    socket.close();
  }
});

test("analyze_tickets launches feasibility with the ticket engine without starting implementation", async () => {
  if (client === null) throw new Error("client MCP non initialisé");

  const created = createResultSchema.parse(structuredContent(await client.callTool({
    name: "create_todo_ticket",
    arguments: {
      project: PROJECT_KEY,
      title: "Carte à analyser",
      requestId: "analyze-ticket",
      feasibilityEngine: "luna",
    },
  })));
  const analyzed = analyzeResultSchema.parse(structuredContent(await client.callTool({
    name: "analyze_tickets",
    arguments: { ids: [created.ticket.id, created.ticket.id] },
  })));
  expect(analyzed).toEqual({
    started: 2,
    startedIds: [created.ticket.id, created.ticket.id],
    rejected: [],
    dryRun: true,
  });

  const persisted = z.array(ticketSchema).parse(await (await fetch(`${baseUrl}/api/tickets`)).json())
    .find((ticket) => ticket.id === created.ticket.id);
  expect(persisted).toMatchObject({
    feasibilityEngine: "luna",
    triageStatus: "done",
    triageVerdict: "needs_info",
    column: "todo",
    stage: null,
    slotId: null,
    sessionId: null,
    branch: null,
  });
});

test("analyze_tickets reports unknown and busy IDs and preserves existing non-TODO behavior", async () => {
  if (client === null) throw new Error("client MCP non initialisé");

  const busyTicket = createResultSchema.parse(structuredContent(await client.callTool({
    name: "create_todo_ticket",
    arguments: {
      project: PROJECT_KEY,
      title: "Carte occupée pour analyse",
      requestId: "analyze-busy-ticket",
    },
  })));
  await client.callTool({
    name: "start_ticket",
    arguments: { ticketId: busyTicket.ticket.id },
  });

  const rejected = analyzeResultSchema.parse(structuredContent(await client.callTool({
    name: "analyze_tickets",
    arguments: { ids: ["ticket-absent", busyTicket.ticket.id] },
  })));
  expect(rejected).toEqual({
    started: 0,
    startedIds: [],
    rejected: [
      { id: "ticket-absent", reason: "not_found" },
      { id: busyTicket.ticket.id, reason: "busy" },
    ],
    dryRun: true,
  });

  const nonTodoTicket = createResultSchema.parse(structuredContent(await client.callTool({
    name: "create_todo_ticket",
    arguments: {
      project: PROJECT_KEY,
      title: "Carte non TODO à analyser",
      requestId: "analyze-non-todo-ticket",
    },
  })));
  const moveResponse = await fetch(`${baseUrl}/api/tickets/${nonTodoTicket.ticket.id}/move`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ column: "done" }),
  });
  expect(moveResponse.status).toBe(200);

  const nonTodoResult = analyzeResultSchema.parse(structuredContent(await client.callTool({
    name: "analyze_tickets",
    arguments: { ids: [nonTodoTicket.ticket.id] },
  })));
  expect(nonTodoResult).toMatchObject({
    started: 1,
    startedIds: [nonTodoTicket.ticket.id],
    rejected: [],
    dryRun: true,
  });
  const nonTodoPersisted = z.array(ticketSchema)
    .parse(await (await fetch(`${baseUrl}/api/tickets`)).json())
    .find((ticket) => ticket.id === nonTodoTicket.ticket.id);
  expect(nonTodoPersisted).toMatchObject({ column: "done" });
});

test("analyze_tickets validates its strict ID list", async () => {
  if (client === null) throw new Error("client MCP non initialisé");

  const invalidArguments = [
    { ids: [] },
    { ids: [""] },
    { ids: [42] },
    { ids: ["ticket"], project: PROJECT_KEY },
  ];
  for (const argumentsValue of invalidArguments) {
    const result = await client.callTool({ name: "analyze_tickets", arguments: argumentsValue });
    expect(result.isError).toBe(true);
    expect(errorResultSchema.parse(textContent(result)).error.code).toBe("INVALID_INPUT");
  }
});

test("update_ticket applies every option partially, broadcasts it, and preserves it on start", async () => {
  if (client === null) throw new Error("client MCP non initialisé");

  const parent = createResultSchema.parse(structuredContent(await client.callTool({
    name: "create_todo_ticket",
    arguments: {
      project: OTHER_PROJECT_KEY,
      title: "Parent de la carte modifiée",
      requestId: "update-parent",
    },
  })));
  const created = createResultSchema.parse(structuredContent(await client.callTool({
    name: "create_todo_ticket",
    arguments: {
      project: PROJECT_KEY,
      title: "Titre initial à conserver",
      description: "Description initiale",
      externalUrl: "https://example.com/initial",
      requestId: "update-target",
      codexFast: true,
      codexImplementerFast: true,
    },
  })));
  const beforeUpdate = ticketPageSchema.parse(structuredContent(await client.callTool({
    name: "list_tickets",
    arguments: {},
  })));

  const partial = updateResultSchema.parse(structuredContent(await client.callTool({
    name: "update_ticket",
    arguments: {
      ticketId: created.ticket.id,
      model: null,
      externalUrl: null,
      codexFast: false,
      codexImplementerFast: null,
      verifyFeature: true,
    },
  })));
  expect(partial).toMatchObject({
    dryRun: true,
    ticket: {
      id: created.ticket.id,
      title: "Titre initial à conserver",
      description: "Description initiale",
      project: PROJECT_KEY,
      externalUrl: null,
      model: null,
      codexFast: false,
      codexImplementerFast: null,
      verifyFeature: true,
      column: "todo",
      stage: null,
      triageStatus: "none",
    },
  });

  const socket = new WebSocket(`${baseUrl.replace("http", "ws")}/ws`);
  await waitForSocketOpen(socket);
  try {
    const updateNotification = nextTicketEvent(socket, (ticket) => (
      ticket.id === created.ticket.id && ticket.project === OTHER_PROJECT_KEY
    ));
    const updated = updateResultSchema.parse(structuredContent(await client.callTool({
      name: "update_ticket",
      arguments: {
        ticketId: created.ticket.id,
        title: "",
        description: "# Nouvelle description complète",
        externalUrl: "",
        project: OTHER_PROJECT_KEY,
        prdEnabled: true,
        prDraft: false,
        autoMerge: true,
        stealth: true,
        directPush: true,
        addScreenshots: true,
        verifyFeature: false,
        argusMultiLoop: true,
        baseBranch: "staging",
        dependsOn: parent.ticket.id,
        model: "fable",
        effort: "max",
        implementerModel: "sonnet",
        implementerEffort: "xhigh",
        orchestrator: "claude",
        implementer: "composer",
        codexModel: "gpt-5.6-luna",
        codexEffort: "high",
        codexFast: true,
        codexImplementerModel: "gpt-5.6-terra",
        codexImplementerEffort: "low",
        codexImplementerFast: false,
        feasibilityEngine: "sonnet",
        feasibilityContext: true,
      },
    })));
    expect(updated.ticket).toMatchObject({
      id: created.ticket.id,
      title: "Nouvelle description complète",
      description: "# Nouvelle description complète",
      externalUrl: null,
      project: OTHER_PROJECT_KEY,
      prdEnabled: true,
      prDraft: false,
      autoMerge: false,
      stealth: false,
      directPush: true,
      addScreenshots: true,
      verifyFeature: false,
      argusMultiLoop: true,
      baseBranch: "staging",
      dependsOn: parent.ticket.id,
      model: "fable",
      effort: "max",
      implementerModel: "sonnet",
      implementerEffort: "xhigh",
      orchestrator: "claude",
      implementer: "composer",
      codexModel: "gpt-5.6-luna",
      codexEffort: "high",
      codexFast: true,
      codexImplementerModel: "gpt-5.6-terra",
      codexImplementerEffort: "low",
      codexImplementerFast: false,
      feasibilityEngine: "sonnet",
      feasibilityContext: true,
      column: "todo",
      stage: null,
      triageStatus: "none",
    });
    expect(await updateNotification).toMatchObject({
      id: created.ticket.id,
      project: OTHER_PROJECT_KEY,
      directPush: true,
      autoMerge: false,
    });
  } finally {
    socket.close();
  }

  const afterUpdate = ticketPageSchema.parse(structuredContent(await client.callTool({
    name: "list_tickets",
    arguments: {},
  })));
  expect(afterUpdate.total).toBe(beforeUpdate.total);

  await client.callTool({
    name: "update_ticket",
    arguments: { ticketId: created.ticket.id, dependsOn: null },
  });
  const started = startResultSchema.parse(structuredContent(await client.callTool({
    name: "start_ticket",
    arguments: { ticketId: created.ticket.id },
  })));
  expect(started).toMatchObject({ status: "queued", ticket: { id: created.ticket.id } });

  const persisted = z.array(ticketSchema).parse(await (await fetch(`${baseUrl}/api/tickets`)).json())
    .find((ticket) => ticket.id === created.ticket.id);
  expect(persisted).toMatchObject({
    column: "implementing",
    project: OTHER_PROJECT_KEY,
    dependsOn: null,
    directPush: true,
    verifyFeature: false,
    model: "fable",
    implementer: "composer",
    codexImplementerFast: false,
    feasibilityContext: true,
  });
});

test("update_ticket rejects invalid, processing, and non-TODO mutations", async () => {
  if (client === null) throw new Error("client MCP non initialisé");

  const target = createResultSchema.parse(structuredContent(await client.callTool({
    name: "create_todo_ticket",
    arguments: {
      project: PROJECT_KEY,
      title: "Cible des refus update",
      requestId: "update-rejections-target",
    },
  })));
  const otherProjectParent = createResultSchema.parse(structuredContent(await client.callTool({
    name: "create_todo_ticket",
    arguments: {
      project: OTHER_PROJECT_KEY,
      title: "Parent incompatible update",
      requestId: "update-rejections-parent",
    },
  })));
  const invalidPatches = [
    { ticketId: target.ticket.id, unknown: true },
    { ticketId: target.ticket.id },
    { ticketId: target.ticket.id, model: "unknown" },
    { ticketId: target.ticket.id, baseBranch: "bad branch" },
    { ticketId: target.ticket.id, orchestrator: "codex", implementer: "claude" },
    { ticketId: target.ticket.id, dependsOn: "missing-ticket" },
    { ticketId: target.ticket.id, dependsOn: target.ticket.id },
    { ticketId: target.ticket.id, dependsOn: otherProjectParent.ticket.id },
  ];
  for (const patch of invalidPatches) {
    const result = await client.callTool({ name: "update_ticket", arguments: patch });
    expect(result.isError).toBe(true);
    expect(errorResultSchema.parse(textContent(result)).error.code).toBe("INVALID_INPUT");
  }

  const missing = await client.callTool({
    name: "update_ticket",
    arguments: { ticketId: "missing-ticket", title: "Absent" },
  });
  expect(errorResultSchema.parse(textContent(missing)).error.code).toBe("NOT_FOUND");

  const analyzing = createResultSchema.parse(structuredContent(await client.callTool({
    name: "create_todo_ticket",
    arguments: {
      project: PROJECT_KEY,
      title: "Analyse en cours update",
      requestId: "update-analyzing-target",
    },
  })));
  const fixtureDatabase = new Database(join(dataRoot, "kanban.db"));
  fixtureDatabase.run(
    "UPDATE tickets SET triage_status = 'running' WHERE id = ?",
    [analyzing.ticket.id],
  );
  fixtureDatabase.close();
  const analyzingResult = await client.callTool({
    name: "update_ticket",
    arguments: { ticketId: analyzing.ticket.id, title: "Refusé" },
  });
  expect(errorResultSchema.parse(textContent(analyzingResult)).error.code).toBe("CONFLICT");

  const busy = createResultSchema.parse(structuredContent(await client.callTool({
    name: "create_todo_ticket",
    arguments: {
      project: PROJECT_KEY,
      title: "Traitement en cours update",
      requestId: "update-busy-target",
    },
  })));
  await client.callTool({ name: "start_ticket", arguments: { ticketId: busy.ticket.id } });
  const busyResult = await client.callTool({
    name: "update_ticket",
    arguments: { ticketId: busy.ticket.id, title: "Refusé" },
  });
  expect(errorResultSchema.parse(textContent(busyResult)).error.code).toBe("CONFLICT");

  const nonTodo = createResultSchema.parse(structuredContent(await client.callTool({
    name: "create_todo_ticket",
    arguments: {
      project: PROJECT_KEY,
      title: "Carte finie update",
      requestId: "update-non-todo-target",
    },
  })));
  const moved = await fetch(`${baseUrl}/api/tickets/${nonTodo.ticket.id}/move`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ column: "done" }),
  });
  expect(moved.status).toBe(200);
  const nonTodoResult = await client.callTool({
    name: "update_ticket",
    arguments: { ticketId: nonTodo.ticket.id, title: "Refusé" },
  });
  expect(errorResultSchema.parse(textContent(nonTodoResult)).error.code).toBe("CONFLICT");
});

test("create_todo_ticket persists every explicit creation option and retains them when started", async () => {
  if (client === null) throw new Error("client MCP non initialisé");

  const parentResult = createResultSchema.parse(structuredContent(await client.callTool({
    name: "create_todo_ticket",
    arguments: {
      project: PROJECT_KEY,
      title: "Parent pour idempotence",
      requestId: "all-options-parent",
    },
  })));
  const explicitOptions = {
    project: PROJECT_KEY,
    title: "Carte avec toutes les options",
    description: "Vérifie la persistance de chaque option exposée par MCP.",
    externalUrl: "https://example.com/tickets/complete",
    requestId: "all-options-ticket",
    prdEnabled: true,
    prDraft: false,
    autoMerge: true,
    stealth: true,
    directPush: true,
    addScreenshots: true,
    verifyFeature: true,
    argusMultiLoop: true,
    baseBranch: "develop",
    dependsOn: null,
    model: "sonnet",
    effort: "xhigh",
    implementerModel: "haiku",
    implementerEffort: "high",
    orchestrator: "claude",
    implementer: "codex",
    codexModel: "gpt-6-astra",
    codexEffort: "ultra",
    codexFast: true,
    codexImplementerModel: "gpt-5.6-sol",
    codexImplementerEffort: "medium",
    codexImplementerFast: false,
    feasibilityEngine: "luna",
  };
  const created = createResultSchema.parse(structuredContent(await client.callTool({
    name: "create_todo_ticket",
    arguments: explicitOptions,
  })));
  expect(created).toMatchObject({ created: true, ticket: { column: "todo", dependsOn: null } });

  const restTickets = z.array(ticketSchema).parse(await (await fetch(`${baseUrl}/api/tickets`)).json());
  const persisted = restTickets.find((ticket) => ticket.id === created.ticket.id);
  expect(persisted).toMatchObject({
    prdEnabled: true,
    prDraft: false,
    autoMerge: false,
    stealth: false,
    directPush: true,
    addScreenshots: true,
    verifyFeature: true,
    argusMultiLoop: true,
    baseBranch: "develop",
    dependsOn: null,
    model: "sonnet",
    effort: "xhigh",
    implementerModel: "haiku",
    implementerEffort: "high",
    orchestrator: "claude",
    implementer: "codex",
    codexModel: "gpt-6-astra",
    codexEffort: "ultra",
    codexFast: true,
    codexImplementerModel: "gpt-5.6-sol",
    codexImplementerEffort: "medium",
    codexImplementerFast: false,
    feasibilityEngine: "luna",
  });

  const changedValues: Record<string, unknown> = {
    project: OTHER_PROJECT_KEY,
    title: "Titre différent",
    description: "Description différente",
    externalUrl: null,
    prdEnabled: false,
    prDraft: true,
    autoMerge: false,
    stealth: false,
    directPush: false,
    addScreenshots: false,
    verifyFeature: false,
    argusMultiLoop: false,
    baseBranch: null,
    dependsOn: parentResult.ticket.id,
    model: "opus",
    effort: "low",
    implementerModel: "fable",
    implementerEffort: "medium",
    orchestrator: "codex",
    implementer: "composer",
    codexModel: "gpt-5.6-terra",
    codexEffort: "low",
    codexFast: false,
    codexImplementerModel: null,
    codexImplementerEffort: null,
    codexImplementerFast: null,
    feasibilityEngine: "sonnet",
  };
  for (const [field, changedValue] of Object.entries(changedValues)) {
    const conflict = await client.callTool({
      name: "create_todo_ticket",
      arguments: { ...explicitOptions, [field]: changedValue },
    });
    expect(errorResultSchema.parse(textContent(conflict)).error.code).toBe("CONFLICT");
  }

  const started = startResultSchema.parse(structuredContent(await client.callTool({
    name: "start_ticket",
    arguments: { ticketId: created.ticket.id },
  })));
  expect(started.status).toBe("queued");

  const replayedAfterStart = createResultSchema.parse(structuredContent(await client.callTool({
    name: "create_todo_ticket",
    arguments: explicitOptions,
  })));
  expect(replayedAfterStart).toMatchObject({ created: false, ticket: { id: created.ticket.id } });

  const afterStart = z.array(ticketSchema).parse(await (await fetch(`${baseUrl}/api/tickets`)).json())
    .find((ticket) => ticket.id === created.ticket.id);
  expect(afterStart).toMatchObject({
    column: "implementing",
    verifyFeature: true,
    orchestrator: "claude",
    implementer: "codex",
    codexImplementerFast: false,
  });
});

test("create_todo_ticket preserves legacy defaults and rejects invalid option combinations", async () => {
  if (client === null) throw new Error("client MCP non initialisé");

  const defaults = createResultSchema.parse(structuredContent(await client.callTool({
    name: "create_todo_ticket",
    arguments: {
      project: PROJECT_KEY,
      title: "Carte avec valeurs par défaut",
      description: "Payload historique minimal.",
      externalUrl: null,
      requestId: "legacy-default-options",
    },
  })));
  const defaultTicket = z.array(ticketSchema).parse(await (await fetch(`${baseUrl}/api/tickets`)).json())
    .find((ticket) => ticket.id === defaults.ticket.id);
  expect(defaultTicket).toMatchObject({
    prdEnabled: false,
    prDraft: true,
    autoMerge: true,
    addScreenshots: false,
    verifyFeature: false,
    argusMultiLoop: false,
    stealth: false,
    directPush: false,
    baseBranch: null,
    dependsOn: null,
    model: null,
    effort: null,
    implementerModel: null,
    implementerEffort: null,
    orchestrator: "claude",
    implementer: "claude",
    codexImplementerModel: null,
    codexImplementerEffort: null,
    codexImplementerFast: null,
    feasibilityEngine: null,
  });

  const invalidArguments = [
    { requestId: "unknown-option", start: true },
    { requestId: "invalid-branch", baseBranch: "bad branch" },
    { requestId: "invalid-model", model: "unknown" },
    { requestId: "invalid-pair", orchestrator: "codex", implementer: "claude" },
    { requestId: "missing-dependency", dependsOn: "missing-ticket" },
  ];
  for (const invalid of invalidArguments) {
    const result = await client.callTool({
      name: "create_todo_ticket",
      arguments: {
        project: PROJECT_KEY,
        title: "Carte invalide",
        ...invalid,
      },
    });
    expect(result.isError).toBe(true);
    expect(errorResultSchema.parse(textContent(result)).error.code).toBe("INVALID_INPUT");
  }

  const otherProjectParent = createResultSchema.parse(structuredContent(await client.callTool({
    name: "create_todo_ticket",
    arguments: {
      project: OTHER_PROJECT_KEY,
      title: "Parent autre projet",
      requestId: "other-project-parent",
    },
  })));
  const crossProjectDependency = await client.callTool({
    name: "create_todo_ticket",
    arguments: {
      project: PROJECT_KEY,
      title: "Dépendance croisée",
      dependsOn: otherProjectParent.ticket.id,
      requestId: "cross-project-dependency",
    },
  });
  expect(errorResultSchema.parse(textContent(crossProjectDependency)).error.code).toBe("INVALID_INPUT");
});

test("list_tickets includes ask and clean cards created by the existing REST workflows", async () => {
  if (client === null) throw new Error("client MCP non initialisé");

  const askResponse = await fetch(`${baseUrl}/api/asks`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ project: PROJECT_KEY, description: "Question E2E MCP" }),
  });
  expect(askResponse.status).toBe(200);
  const cleanResponse = await fetch(`${baseUrl}/api/cleaners`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      project: PROJECT_KEY,
      prs: [{
        number: 42,
        title: "PR factice",
        url: "https://github.com/example/repo/pull/42",
        headBranch: "feature/e2e",
        baseBranch: "main",
        isDraft: false,
        reviewStatus: "none",
        updatedAt: "2026-09-13T00:00:00.000Z",
        author: "e2e",
        additions: 1,
        deletions: 0,
      }],
    }),
  });
  expect(cleanResponse.status).toBe(200);

  const listed = ticketPageSchema.parse(structuredContent(await client.callTool({
    name: "list_tickets",
    arguments: { project: PROJECT_KEY, limit: 100 },
  })));
  expect(listed.tickets.map((ticket) => ticket.kind)).toContain("ask");
  expect(listed.tickets.map((ticket) => ticket.kind)).toContain("clean");
});

test("the public MCP endpoint rejects invalid access and stays absent when disabled", async () => {
  const unauthorized = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer wrong-token" },
    body: "{}",
  });
  expect(unauthorized.status).toBe(401);

  const foreignOrigin = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${MCP_TOKEN}`,
      origin: "https://example.com",
    },
    body: "{}",
  });
  expect(foreignOrigin.status).toBe(403);

  const foreignHost = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${MCP_TOKEN}`,
      host: "example.com",
    },
    body: "{}",
  });
  expect(foreignHost.status).toBe(403);

  await Bun.sleep(BACKGROUND_TASK_SETTLE_MS);
  const disabledRoot = await mkdtemp(join(tmpdir(), "kanban-mcp-disabled-"));
  const disabledServer = await startServer({ dataRoot: disabledRoot, port: 0, mcpToken: null });
  try {
    const response = await fetch(`http://127.0.0.1:${disabledServer.port}/mcp`, { method: "POST" });
    expect(response.status).toBe(404);
  } finally {
    await disabledServer.stop();
    await rm(disabledRoot, { recursive: true, force: true });
  }
});

test("rotating the token immediately rejects the old token and accepts the new token", async () => {
  if (runningServer === null || client === null) throw new Error("serveur MCP non initialisé");

  let activeToken = MCP_TOKEN;
  let copiedToken = "";
  await writeFile(join(dataRoot, "mcp-token"), `${MCP_TOKEN}\n`, { mode: 0o600 });
  const controller = createMcpSettingsController({
    dataRoot,
    endpointUrl: `${baseUrl}/mcp`,
    tokenSource: "managed",
    getToken: () => activeToken,
    updateToken: (token) => {
      activeToken = token;
      runningServer?.updateMcpToken(token);
    },
    writeClipboard: (token) => {
      copiedToken = token;
    },
    assertTrustedCaller: () => undefined,
  });

  expect(controller.copyMcpToken()).toEqual({ copied: true });
  expect(copiedToken).toBe(MCP_TOKEN);
  controller.regenerateMcpToken();
  expect(activeToken).toHaveLength(64);
  expect(activeToken).not.toBe(MCP_TOKEN);
  expect((await readFile(join(dataRoot, "mcp-token"), "utf8")).trim()).toBe(activeToken);

  await expect(client.listTools()).rejects.toThrow();

  const rotatedClient = new Client({ name: "atelier-rotated-e2e", version: "1.0.0" });
  const rotatedTransport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`), {
    requestInit: { headers: { authorization: `Bearer ${activeToken}` } },
  });
  try {
    await rotatedClient.connect(rotatedTransport);
    const tools = await rotatedClient.listTools();
    expect(tools.tools.map((tool) => tool.name)).toContain("list_tickets");
  } finally {
    await rotatedTransport.close();
  }
});

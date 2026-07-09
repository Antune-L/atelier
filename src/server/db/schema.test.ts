import { Database } from "bun:sqlite";
import { afterEach, describe, expect, test } from "bun:test";

import { ORCHESTRATOR_BACKFILL_META_KEY } from "../../shared/constants.ts";
import { removeDbFiles, tmpDbPath } from "../testing/tmpDb.ts";

import { createDatabase } from "./schema.ts";

const createdPaths: string[] = [];

/** Reserve a fresh, disposable DB path (cleaned in afterEach along with its WAL sidecars). */
function reserveDbPath(): string {
  const path = tmpDbPath();
  createdPaths.push(path);
  return path;
}

afterEach(() => {
  for (const path of createdPaths.splice(0)) removeDbFiles(path);
});

/**
 * A raw legacy DB that predates the `orchestrator` column: minimal `tickets`/`profiles` tables (no
 * orchestrator) plus a `meta` table. createDatabase's `CREATE TABLE IF NOT EXISTS` leaves these in
 * place, so `migrate()` and `backfillOrchestrator()` run against genuinely legacy shapes.
 */
function createLegacyDb(path: string): void {
  const db = new Database(path, { create: true });
  db.exec(`
    CREATE TABLE tickets (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      project TEXT NOT NULL,
      implementer TEXT NOT NULL DEFAULT 'claude',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      model TEXT NOT NULL,
      effort TEXT NOT NULL,
      implementer TEXT NOT NULL DEFAULT 'claude',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `);
  const now = Date.now();
  const insertTicket = db.prepare(
    "INSERT INTO tickets (id, title, project, implementer, created_at, updated_at) VALUES (?, ?, 'p', ?, ?, ?)",
  );
  insertTicket.run("t-codex", "codex ticket", "codex", now, now);
  insertTicket.run("t-claude", "claude ticket", "claude", now, now);
  insertTicket.run("t-composer", "composer ticket", "composer", now, now);
  const insertProfile = db.prepare(
    "INSERT INTO profiles (id, name, model, effort, implementer, created_at, updated_at) VALUES (?, ?, 'opus', 'medium', ?, ?, ?)",
  );
  insertProfile.run("p-codex", "Prof Codex", "codex", now, now);
  insertProfile.run("p-claude", "Prof Claude", "claude", now, now);
  db.close();
}

/** True when `table` carries a column named `column` (checked via PRAGMA table_info). */
function hasColumn(db: Database, table: string, column: string): boolean {
  return db
    .query(`PRAGMA table_info(${table})`)
    .all()
    .some((row) => row !== null && typeof row === "object" && "name" in row && row.name === column);
}

/** Read the orchestrator value of a single tickets/profiles row by id. */
function orchestratorOf(db: Database, table: "tickets" | "profiles", id: string): string {
  const row = db.query(`SELECT orchestrator FROM ${table} WHERE id = ?`).get(id);
  if (row !== null && typeof row === "object" && "orchestrator" in row && typeof row.orchestrator === "string") {
    return row.orchestrator;
  }
  throw new Error(`no orchestrator row for ${table}.${id}`);
}

describe("orchestrator migration + backfill", () => {
  test("adds the orchestrator column and backfills implementer=codex → orchestrator=codex", () => {
    const path = reserveDbPath();
    createLegacyDb(path);

    const db = createDatabase(path);

    expect(hasColumn(db, "tickets", "orchestrator")).toBe(true);
    expect(hasColumn(db, "profiles", "orchestrator")).toBe(true);

    // Backfill: only the codex implementers become codex orchestrators; claude/composer stay claude.
    expect(orchestratorOf(db, "tickets", "t-codex")).toBe("codex");
    expect(orchestratorOf(db, "tickets", "t-claude")).toBe("claude");
    expect(orchestratorOf(db, "tickets", "t-composer")).toBe("claude");
    expect(orchestratorOf(db, "profiles", "p-codex")).toBe("codex");
    expect(orchestratorOf(db, "profiles", "p-claude")).toBe("claude");

    // The one-shot flag is set so the backfill never runs again.
    const flag = db.query("SELECT value FROM meta WHERE key = ?").get(ORCHESTRATOR_BACKFILL_META_KEY);
    expect(flag).not.toBeNull();

    db.close();
  });

  test("is one-shot: a later claude-orchestrated codex-implementer row is NOT rewritten", () => {
    const path = reserveDbPath();
    createLegacyDb(path);

    // First open runs (and flags) the backfill: t-codex becomes orchestrator=codex.
    const first = createDatabase(path);
    expect(orchestratorOf(first, "tickets", "t-codex")).toBe("codex");
    first.close();

    // Simulate a future PR2 cross-provider pair: claude orchestrator + codex implementer.
    const raw = new Database(path);
    raw.exec("UPDATE tickets SET orchestrator = 'claude' WHERE id = 't-codex'");
    raw.close();

    // Reopening must NOT re-run the backfill (flag already set), so the row keeps orchestrator=claude.
    const second = createDatabase(path);
    expect(orchestratorOf(second, "tickets", "t-codex")).toBe("claude");
    second.close();
  });
});

describe("fresh database seeding", () => {
  test("seeds default profiles with a coherent orchestrator per preset", () => {
    const path = reserveDbPath();
    const db = createDatabase(path);

    const rows = db.query("SELECT name, orchestrator FROM profiles").all();
    const byName = new Map<string, string>();
    for (const row of rows) {
      if (row !== null && typeof row === "object" && "name" in row && "orchestrator" in row) {
        byName.set(String(row.name), String(row.orchestrator));
      }
    }

    expect(byName.get("Codex")).toBe("codex");
    expect(byName.get("Basique")).toBe("claude");

    db.close();
  });
});

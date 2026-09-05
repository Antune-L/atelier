import { Database } from "bun:sqlite";
import { afterEach, describe, expect, test } from "bun:test";

import { ORCHESTRATOR_BACKFILL_META_KEY } from "../../shared/constants.ts";
import { removeDbFiles, tmpDbPath } from "../testing/tmpDb.ts";

import { assertCodexDowngradeSafe, CODEX_CATALOG_MIGRATED_META_KEY, CODEX_CATALOG_SNAPSHOT_SUFFIX, createDatabase, migrateCodexCatalog } from "./schema.ts";

const createdPaths: string[] = [];

/** Reserve a fresh, disposable DB path (cleaned in afterEach along with its WAL sidecars). */
function reserveDbPath(): string {
  const path = tmpDbPath();
  createdPaths.push(path);
  return path;
}

afterEach(() => {
  for (const path of createdPaths.splice(0)) {
    removeDbFiles(path);
    removeDbFiles(`${path}${CODEX_CATALOG_SNAPSHOT_SUFFIX}`);
  }
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
  test("adds nullable Codex implementer and delegate snapshot columns without backfilling legacy rows", () => {
    const path = reserveDbPath();
    createLegacyDb(path);
    const db = createDatabase(path);
    for (const column of ["codex_implementer_model", "codex_implementer_effort", "codex_implementer_fast"]) {
      expect(hasColumn(db, "tickets", column)).toBe(true);
      expect(hasColumn(db, "profiles", column)).toBe(true);
    }
    for (const column of ["delegate_provider", "delegate_effective_model", "delegate_effective_effort", "delegate_codex_fast"]) {
      expect(hasColumn(db, "execution_runs", column)).toBe(true);
    }
    expect(db.query("SELECT codex_implementer_model, codex_implementer_effort, codex_implementer_fast FROM tickets WHERE id = 't-codex'").get()).toEqual({
      codex_implementer_model: null,
      codex_implementer_effort: null,
      codex_implementer_fast: null,
    });
    db.close();
  });

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

describe("Codex catalog migration", () => {
  test("snapshots then normalizes retired settings with an idempotent audit trail", () => {
    const path = reserveDbPath();
    const initial = createDatabase(path);
    initial.query("UPDATE profiles SET codex_model = 'gpt-5.5'").run();
    initial.query("INSERT OR REPLACE INTO meta (key, value) VALUES ('codex_model', 'gpt-5.4')").run();
    initial.query("DELETE FROM meta WHERE key = ?").run(CODEX_CATALOG_MIGRATED_META_KEY);
    initial.close();

    const migrated = createDatabase(path);
    const models = migrated.query("SELECT DISTINCT codex_model FROM profiles").all();
    expect(models).toEqual([{ codex_model: "gpt-5.6-terra" }]);
    const setting = migrated.query("SELECT value FROM meta WHERE key = 'codex_model'").get();
    expect(setting).toEqual({ value: "gpt-5.6-terra" });
    const firstAuditCount = migrated.query("SELECT COUNT(*) AS n FROM configuration_migrations").get();
    expect(firstAuditCount).toEqual({ n: 6 });
    migrated.close();

    const snapshot = new Database(`${path}${CODEX_CATALOG_SNAPSHOT_SUFFIX}`, { readonly: true });
    expect(snapshot.query("SELECT DISTINCT codex_model FROM profiles").all()).toEqual([{ codex_model: "gpt-5.5" }]);
    snapshot.close();

    const reopened = createDatabase(path);
    expect(reopened.query("SELECT COUNT(*) AS n FROM configuration_migrations").get()).toEqual(firstAuditCount);
    reopened.close();
  });

  test("downgrades future settings without changing business data or effective execution history", () => {
    const path = reserveDbPath();
    const db = createDatabase(path);
    const now = Date.now();
    db.query(
      "INSERT INTO tickets (id, title, project, codex_model, created_at, updated_at) VALUES ('t-new', 'Astra', 'p', 'gpt-6-astra', ?, ?)",
    ).run(now, now);
    db.query(
      "INSERT INTO comments (id, ticket_id, author, body, answered, created_at) VALUES ('c-new', 't-new', 'user', 'garder', 0, ?)",
    ).run(now);
    db.query(
      `INSERT INTO execution_runs
        (id, owner_type, owner_id, generation_id, session_id, role, orchestrator, effective_model, effective_effort, usage_by_model, status, started_at, finished_at)
       VALUES ('r-new', 'ticket', 't-new', 'g-new', 's-new', 'orchestrator', 'codex', 'gpt-6-astra', 'ultra', ?, 'completed', ?, ?)`,
    ).run(JSON.stringify({ "gpt-6-astra": { inputTokens: 1, outputTokens: 2, cacheReadTokens: 0, cacheCreationTokens: 0, costUsd: null } }), now, now + 1);

    assertCodexDowngradeSafe(db);
    migrateCodexCatalog(db, "downgrade");

    expect(db.query("SELECT codex_model FROM tickets WHERE id = 't-new'").get()).toEqual({ codex_model: "gpt-5.6-terra" });
    expect(db.query("SELECT body FROM comments WHERE id = 'c-new'").get()).toEqual({ body: "garder" });
    expect(db.query("SELECT effective_model, usage_by_model FROM execution_runs WHERE id = 'r-new'").get()).toEqual({
      effective_model: "gpt-6-astra",
      usage_by_model: JSON.stringify({ "gpt-6-astra": { inputTokens: 1, outputTokens: 2, cacheReadTokens: 0, cacheCreationTokens: 0, costUsd: null } }),
    });
    expect(db.query("SELECT previous_value FROM configuration_migrations WHERE direction = 'downgrade' AND scope = 'tickets' AND record_id = 't-new'").get()).toEqual({ previous_value: "gpt-6-astra" });
    db.close();
  });

  test("refuses downgrade while an execution is running", () => {
    const path = reserveDbPath();
    const db = createDatabase(path);
    db.query(
      `INSERT INTO execution_runs
        (id, owner_type, owner_id, generation_id, role, orchestrator, status, started_at)
       VALUES ('r-running', 'action', 'a', 'g-running', 'prd', 'codex', 'running', 1)`,
    ).run();
    expect(() => assertCodexDowngradeSafe(db)).toThrow("downgrade refusé");
    db.close();
  });

  test("normalizes retired settings written by the old version after a downgrade", () => {
    const path = reserveDbPath();
    const db = createDatabase(path);
    migrateCodexCatalog(db, "downgrade");
    db.query("INSERT OR REPLACE INTO meta (key, value) VALUES ('codex_model', 'gpt-5.5')").run();
    db.query("UPDATE profiles SET codex_model = 'gpt-5.5'").run();
    db.close();

    const upgraded = createDatabase(path);
    expect(upgraded.query("SELECT value FROM meta WHERE key = 'codex_model'").get()).toEqual({ value: "gpt-5.6-terra" });
    expect(upgraded.query("SELECT DISTINCT codex_model FROM profiles").all()).toEqual([{ codex_model: "gpt-5.6-terra" }]);
    const audit = upgraded.query("SELECT COUNT(*) AS n FROM configuration_migrations WHERE direction = 'upgrade'").get();
    expect(audit).toEqual({ n: 6 });
    migrateCodexCatalog(upgraded, "upgrade");
    expect(upgraded.query("SELECT COUNT(*) AS n FROM configuration_migrations WHERE direction = 'upgrade'").get()).toEqual(audit);
    upgraded.close();
  });
});

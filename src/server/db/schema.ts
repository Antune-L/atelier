import { Database } from "bun:sqlite";
import { nanoid } from "nanoid";

import { DEFAULT_PROFILES, SLOT_COUNT } from "../../shared/constants.ts";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  external_url TEXT,
  project TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'feature',
  review_depth TEXT,
  pr_number INTEGER,
  pr_head_branch TEXT,
  post_comments INTEGER NOT NULL DEFAULT 1,
  fix_comments INTEGER NOT NULL DEFAULT 0,
  prd_enabled INTEGER NOT NULL DEFAULT 0,
  pr_draft INTEGER NOT NULL DEFAULT 1,
  auto_merge INTEGER NOT NULL DEFAULT 0,
  add_screenshots INTEGER NOT NULL DEFAULT 0,
  verify_feature INTEGER NOT NULL DEFAULT 0,
  argus_multi_loop INTEGER NOT NULL DEFAULT 0,
  research_plan INTEGER NOT NULL DEFAULT 0,
  stealth INTEGER NOT NULL DEFAULT 0,
  direct_push INTEGER NOT NULL DEFAULT 0,
  base_branch TEXT,
  depends_on TEXT,
  prd_markdown TEXT,
  agent_summary TEXT,
  column_name TEXT NOT NULL DEFAULT 'todo',
  stage TEXT,
  model TEXT,
  effort TEXT,
  implementer_model TEXT,
  implementer_effort TEXT,
  implementer TEXT NOT NULL DEFAULT 'claude',
  review_rounds INTEGER NOT NULL DEFAULT 0,
  nudge_count INTEGER NOT NULL DEFAULT 0,
  session_id TEXT,
  slot_id INTEGER,
  branch TEXT,
  pr_url TEXT,
  resolving_conflicts INTEGER NOT NULL DEFAULT 0,
  testing INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  archived INTEGER NOT NULL DEFAULT 0,
  watchdog_flagged INTEGER NOT NULL DEFAULT 0,
  last_progress_at INTEGER NOT NULL DEFAULT 0,
  triage_status TEXT NOT NULL DEFAULT 'none',
  triage_verdict TEXT,
  triage_report TEXT,
  feasibility_context INTEGER NOT NULL DEFAULT 1,
  session_usage TEXT,
  finished_at INTEGER,
  implementing_started_at INTEGER,
  implementation_started_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(id),
  author TEXT NOT NULL,
  body TEXT NOT NULL,
  question_id TEXT,
  answered INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id TEXT,
  type TEXT NOT NULL,
  payload TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS slots (
  id INTEGER PRIMARY KEY,
  ticket_id TEXT REFERENCES tickets(id),
  repo_path TEXT,
  tmux_session TEXT,
  status TEXT NOT NULL DEFAULT 'free'
);

CREATE TABLE IF NOT EXISTS worktree_sessions (
  slot_id INTEGER PRIMARY KEY REFERENCES slots(id),
  project TEXT NOT NULL,
  branch TEXT NOT NULL,
  base_branch TEXT NOT NULL,
  session_name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  model TEXT NOT NULL,
  effort TEXT NOT NULL,
  implementer_model TEXT NOT NULL DEFAULT 'opus',
  implementer_effort TEXT NOT NULL DEFAULT 'low',
  implementer TEXT NOT NULL DEFAULT 'claude',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_ticket ON comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_events_ticket ON events(ticket_id);
`;

// Leftover columns in older DBs (tags, is_ui, figma_url) are harmless: row
// parsing ignores unknown keys and inserts never reference them.
/** Columns added after the original schema; applied idempotently to existing DBs. */
const TICKET_MIGRATIONS: { column: string; ddl: string }[] = [
  { column: "triage_status", ddl: "ALTER TABLE tickets ADD COLUMN triage_status TEXT NOT NULL DEFAULT 'none'" },
  { column: "triage_verdict", ddl: "ALTER TABLE tickets ADD COLUMN triage_verdict TEXT" },
  { column: "triage_report", ddl: "ALTER TABLE tickets ADD COLUMN triage_report TEXT" },
  { column: "finished_at", ddl: "ALTER TABLE tickets ADD COLUMN finished_at INTEGER" },
  { column: "implementing_started_at", ddl: "ALTER TABLE tickets ADD COLUMN implementing_started_at INTEGER" },
  { column: "implementation_started_at", ddl: "ALTER TABLE tickets ADD COLUMN implementation_started_at INTEGER" },
  { column: "model", ddl: "ALTER TABLE tickets ADD COLUMN model TEXT" },
  { column: "effort", ddl: "ALTER TABLE tickets ADD COLUMN effort TEXT" },
  { column: "implementer_model", ddl: "ALTER TABLE tickets ADD COLUMN implementer_model TEXT" },
  { column: "implementer_effort", ddl: "ALTER TABLE tickets ADD COLUMN implementer_effort TEXT" },
  { column: "implementer", ddl: "ALTER TABLE tickets ADD COLUMN implementer TEXT NOT NULL DEFAULT 'claude'" },
  { column: "pr_draft", ddl: "ALTER TABLE tickets ADD COLUMN pr_draft INTEGER NOT NULL DEFAULT 1" },
  { column: "auto_merge", ddl: "ALTER TABLE tickets ADD COLUMN auto_merge INTEGER NOT NULL DEFAULT 0" },
  { column: "add_screenshots", ddl: "ALTER TABLE tickets ADD COLUMN add_screenshots INTEGER NOT NULL DEFAULT 0" },
  { column: "verify_feature", ddl: "ALTER TABLE tickets ADD COLUMN verify_feature INTEGER NOT NULL DEFAULT 0" },
  { column: "argus_multi_loop", ddl: "ALTER TABLE tickets ADD COLUMN argus_multi_loop INTEGER NOT NULL DEFAULT 0" },
  { column: "research_plan", ddl: "ALTER TABLE tickets ADD COLUMN research_plan INTEGER NOT NULL DEFAULT 0" },
  { column: "stealth", ddl: "ALTER TABLE tickets ADD COLUMN stealth INTEGER NOT NULL DEFAULT 0" },
  { column: "direct_push", ddl: "ALTER TABLE tickets ADD COLUMN direct_push INTEGER NOT NULL DEFAULT 0" },
  { column: "kind", ddl: "ALTER TABLE tickets ADD COLUMN kind TEXT NOT NULL DEFAULT 'feature'" },
  { column: "review_depth", ddl: "ALTER TABLE tickets ADD COLUMN review_depth TEXT" },
  { column: "pr_number", ddl: "ALTER TABLE tickets ADD COLUMN pr_number INTEGER" },
  { column: "pr_head_branch", ddl: "ALTER TABLE tickets ADD COLUMN pr_head_branch TEXT" },
  { column: "post_comments", ddl: "ALTER TABLE tickets ADD COLUMN post_comments INTEGER NOT NULL DEFAULT 1" },
  { column: "fix_comments", ddl: "ALTER TABLE tickets ADD COLUMN fix_comments INTEGER NOT NULL DEFAULT 0" },
  { column: "base_branch", ddl: "ALTER TABLE tickets ADD COLUMN base_branch TEXT" },
  { column: "resolving_conflicts", ddl: "ALTER TABLE tickets ADD COLUMN resolving_conflicts INTEGER NOT NULL DEFAULT 0" },
  { column: "feasibility_context", ddl: "ALTER TABLE tickets ADD COLUMN feasibility_context INTEGER NOT NULL DEFAULT 1" },
  { column: "testing", ddl: "ALTER TABLE tickets ADD COLUMN testing INTEGER NOT NULL DEFAULT 0" },
  { column: "agent_summary", ddl: "ALTER TABLE tickets ADD COLUMN agent_summary TEXT" },
  { column: "session_usage", ddl: "ALTER TABLE tickets ADD COLUMN session_usage TEXT" },
  { column: "depends_on", ddl: "ALTER TABLE tickets ADD COLUMN depends_on TEXT" },
  { column: "external_url", ddl: "ALTER TABLE tickets ADD COLUMN external_url TEXT" },
];

/**
 * Columns added to the profiles table after its original schema. A NOT NULL column added to a
 * non-empty table requires a DEFAULT (SQLite refuses it otherwise), so both carry one.
 */
const PROFILE_MIGRATIONS: { column: string; ddl: string }[] = [
  { column: "implementer_model", ddl: "ALTER TABLE profiles ADD COLUMN implementer_model TEXT NOT NULL DEFAULT 'opus'" },
  { column: "implementer_effort", ddl: "ALTER TABLE profiles ADD COLUMN implementer_effort TEXT NOT NULL DEFAULT 'low'" },
];

export function createDatabase(path: string): Database {
  const db = new Database(path, { create: true });
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA_SQL);
  migrate(db, "tickets", TICKET_MIGRATIONS);
  migrate(db, "profiles", PROFILE_MIGRATIONS);
  seedSlots(db);
  seedProfiles(db);
  return db;
}

/** Adds new columns to a pre-existing table (no-op on fresh DBs). */
function migrate(db: Database, table: string, migrations: { column: string; ddl: string }[]): void {
  const existing = new Set(
    db
      .query(`PRAGMA table_info(${table})`)
      .all()
      .map((row) => (row && typeof row === "object" && "name" in row ? String(row.name) : "")),
  );
  for (const { column, ddl } of migrations) {
    if (!existing.has(column)) db.exec(ddl);
  }
}

function seedSlots(db: Database): void {
  const insert = db.prepare("INSERT OR IGNORE INTO slots (id, status) VALUES (?, 'free')");
  for (let id = 1; id <= SLOT_COUNT; id += 1) {
    insert.run(id);
  }
}

/** Seed the built-in implementation profiles once (no-op when the table already holds any). */
function seedProfiles(db: Database): void {
  const row = db.query("SELECT COUNT(*) AS n FROM profiles").get();
  const count = row && typeof row === "object" && "n" in row && typeof row.n === "number" ? row.n : 0;
  if (count > 0) return;
  const now = Date.now();
  const insert = db.prepare(
    "INSERT INTO profiles (id, name, model, effort, implementer_model, implementer_effort, implementer, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  DEFAULT_PROFILES.forEach((profile, index) => {
    insert.run(
      nanoid(10),
      profile.name,
      profile.model,
      profile.effort,
      profile.implementerModel,
      profile.implementerEffort,
      profile.implementer,
      index,
      now,
      now,
    );
  });
}

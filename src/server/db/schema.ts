import { Database } from "bun:sqlite";

import { SLOT_COUNT } from "../../shared/constants.ts";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  project TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'feature',
  review_depth TEXT,
  pr_number INTEGER,
  pr_head_branch TEXT,
  post_comments INTEGER NOT NULL DEFAULT 1,
  prd_enabled INTEGER NOT NULL DEFAULT 0,
  pr_draft INTEGER NOT NULL DEFAULT 1,
  auto_merge INTEGER NOT NULL DEFAULT 0,
  prd_markdown TEXT,
  column_name TEXT NOT NULL DEFAULT 'todo',
  stage TEXT,
  model TEXT,
  effort TEXT,
  implementer TEXT NOT NULL DEFAULT 'claude',
  review_rounds INTEGER NOT NULL DEFAULT 0,
  nudge_count INTEGER NOT NULL DEFAULT 0,
  session_id TEXT,
  slot_id INTEGER,
  branch TEXT,
  pr_url TEXT,
  error TEXT,
  archived INTEGER NOT NULL DEFAULT 0,
  watchdog_flagged INTEGER NOT NULL DEFAULT 0,
  last_progress_at INTEGER NOT NULL DEFAULT 0,
  triage_status TEXT NOT NULL DEFAULT 'none',
  triage_verdict TEXT,
  triage_report TEXT,
  finished_at INTEGER,
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

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
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
  { column: "model", ddl: "ALTER TABLE tickets ADD COLUMN model TEXT" },
  { column: "effort", ddl: "ALTER TABLE tickets ADD COLUMN effort TEXT" },
  { column: "implementer", ddl: "ALTER TABLE tickets ADD COLUMN implementer TEXT NOT NULL DEFAULT 'claude'" },
  { column: "pr_draft", ddl: "ALTER TABLE tickets ADD COLUMN pr_draft INTEGER NOT NULL DEFAULT 1" },
  { column: "auto_merge", ddl: "ALTER TABLE tickets ADD COLUMN auto_merge INTEGER NOT NULL DEFAULT 0" },
  { column: "kind", ddl: "ALTER TABLE tickets ADD COLUMN kind TEXT NOT NULL DEFAULT 'feature'" },
  { column: "review_depth", ddl: "ALTER TABLE tickets ADD COLUMN review_depth TEXT" },
  { column: "pr_number", ddl: "ALTER TABLE tickets ADD COLUMN pr_number INTEGER" },
  { column: "pr_head_branch", ddl: "ALTER TABLE tickets ADD COLUMN pr_head_branch TEXT" },
  { column: "post_comments", ddl: "ALTER TABLE tickets ADD COLUMN post_comments INTEGER NOT NULL DEFAULT 1" },
];

export function createDatabase(path: string): Database {
  const db = new Database(path, { create: true });
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA_SQL);
  migrate(db);
  seedSlots(db);
  return db;
}

/** Adds new columns to a pre-existing tickets table (no-op on fresh DBs). */
function migrate(db: Database): void {
  const existing = new Set(
    db
      .query("PRAGMA table_info(tickets)")
      .all()
      .map((row) => (row && typeof row === "object" && "name" in row ? String(row.name) : "")),
  );
  for (const { column, ddl } of TICKET_MIGRATIONS) {
    if (!existing.has(column)) db.exec(ddl);
  }
}

function seedSlots(db: Database): void {
  const insert = db.prepare("INSERT OR IGNORE INTO slots (id, status) VALUES (?, 'free')");
  for (let id = 1; id <= SLOT_COUNT; id += 1) {
    insert.run(id);
  }
}

import { Database } from "bun:sqlite";
import { existsSync } from "node:fs";
import { nanoid } from "nanoid";

import { CODEX_MODELS, CODEX_PROFILE_SEEDED_META_KEY, CODEX_SEED_PROFILE, DEFAULT_CODEX_MODEL, DEFAULT_PROFILES, ORCHESTRATOR_BACKFILL_META_KEY, SLOT_COUNT, type ProfileConfig } from "../../shared/constants.ts";

export const CODEX_CATALOG_MIGRATION_ID = "codex-catalog-v4";
export const CODEX_CATALOG_MIGRATED_META_KEY = "codex_catalog_v4_migrated";
export const CODEX_CATALOG_SNAPSHOT_SUFFIX = ".pre-codex-catalog-v4.sqlite";
export const CODEX_DOWNGRADE_TARGET = "c513f9493271d0780be7861648d4789e4cdcfe4a";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  external_url TEXT,
  project TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'feature',
  review_depth TEXT,
  feasibility_engine TEXT,
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
  child_order INTEGER,
  prd_markdown TEXT,
  agent_summary TEXT,
  column_name TEXT NOT NULL DEFAULT 'todo',
  stage TEXT,
  model TEXT,
  effort TEXT,
  implementer_model TEXT,
  implementer_effort TEXT,
  codex_model TEXT,
  codex_effort TEXT,
  codex_fast INTEGER NOT NULL DEFAULT 0,
  codex_implementer_model TEXT,
  codex_implementer_effort TEXT,
  codex_implementer_fast INTEGER,
  implementer TEXT NOT NULL DEFAULT 'claude',
  orchestrator TEXT NOT NULL DEFAULT 'claude',
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
  reformulate_status TEXT NOT NULL DEFAULT 'none',
  reformulation TEXT,
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
  orchestrator TEXT NOT NULL DEFAULT 'claude',
  codex_model TEXT NOT NULL DEFAULT 'gpt-5.6-terra',
  codex_effort TEXT NOT NULL DEFAULT 'medium',
  codex_fast INTEGER NOT NULL DEFAULT 0,
  codex_implementer_model TEXT,
  codex_implementer_effort TEXT,
  codex_implementer_fast INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  repo_path TEXT NOT NULL,
  base_branch TEXT NOT NULL,
  commit_timeout_ms INTEGER NOT NULL,
  default_auto_merge INTEGER NOT NULL DEFAULT 0,
  default_add_screenshots INTEGER NOT NULL DEFAULT 0,
  color TEXT,
  instructions TEXT,
  worktree_script TEXT,
  run_script TEXT,
  worktree_teardown_script TEXT,
  scripts_typecheck TEXT,
  scripts_lint TEXT,
  scripts_test TEXT,
  worktree_ports TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS automations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  interval_minutes INTEGER,
  model TEXT NOT NULL,
  effort TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS automation_runs (
  id TEXT PRIMARY KEY,
  automation_id TEXT NOT NULL REFERENCES automations(id),
  status TEXT NOT NULL,
  result TEXT,
  started_at INTEGER NOT NULL,
  finished_at INTEGER
);

CREATE TABLE IF NOT EXISTS execution_runs (
  id TEXT PRIMARY KEY,
  owner_type TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  generation_id TEXT NOT NULL UNIQUE,
  session_id TEXT,
  role TEXT NOT NULL,
  orchestrator TEXT NOT NULL,
  effective_model TEXT,
  effective_effort TEXT,
  delegate_provider TEXT,
  delegate_effective_model TEXT,
  delegate_effective_effort TEXT,
  delegate_codex_fast INTEGER,
  codex_fast INTEGER NOT NULL DEFAULT 0,
  configured_service_tier TEXT,
  usage_by_model TEXT,
  status TEXT NOT NULL,
  error TEXT,
  started_at INTEGER NOT NULL,
  finished_at INTEGER
);

CREATE TABLE IF NOT EXISTS agent_messages (
  id TEXT PRIMARY KEY,
  owner_type TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  generation_id TEXT NOT NULL,
  session_id TEXT,
  channel TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL,
  turn_id TEXT,
  created_at INTEGER NOT NULL,
  received_at INTEGER,
  accepted_at INTEGER,
  rejected_at INTEGER,
  error TEXT
);

CREATE TABLE IF NOT EXISTS review_passes (
  ticket_id TEXT PRIMARY KEY REFERENCES tickets(id),
  pass_id TEXT NOT NULL UNIQUE,
  code_fingerprint TEXT NOT NULL,
  review_depth TEXT NOT NULL,
  requires_approval INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS review_approvals (
  ticket_id TEXT NOT NULL REFERENCES tickets(id),
  pass_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  approved INTEGER NOT NULL,
  verdict TEXT,
  summary TEXT NOT NULL DEFAULT '',
  findings_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'completed',
  verification_status TEXT NOT NULL DEFAULT 'not_needed',
  error TEXT,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (ticket_id, pass_id, kind),
  FOREIGN KEY (ticket_id) REFERENCES review_passes(ticket_id)
);

CREATE TABLE IF NOT EXISTS configuration_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  migration_id TEXT NOT NULL,
  direction TEXT NOT NULL,
  scope TEXT NOT NULL,
  record_id TEXT NOT NULL,
  field TEXT NOT NULL,
  previous_value TEXT NOT NULL,
  current_value TEXT NOT NULL,
  migrated_at INTEGER NOT NULL,
  UNIQUE(migration_id, direction, scope, record_id, field, previous_value)
);

CREATE INDEX IF NOT EXISTS idx_comments_ticket ON comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_events_ticket ON events(ticket_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_automation ON automation_runs(automation_id);
CREATE INDEX IF NOT EXISTS idx_execution_runs_owner ON execution_runs(owner_type, owner_id, started_at);
CREATE INDEX IF NOT EXISTS idx_execution_runs_session ON execution_runs(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_pending ON agent_messages(owner_type, owner_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_messages_generation ON agent_messages(generation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_review_approvals_pass ON review_approvals(ticket_id, pass_id);
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
  { column: "orchestrator", ddl: "ALTER TABLE tickets ADD COLUMN orchestrator TEXT NOT NULL DEFAULT 'claude'" },
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
  { column: "reformulate_status", ddl: "ALTER TABLE tickets ADD COLUMN reformulate_status TEXT NOT NULL DEFAULT 'none'" },
  { column: "reformulation", ddl: "ALTER TABLE tickets ADD COLUMN reformulation TEXT" },
  { column: "child_order", ddl: "ALTER TABLE tickets ADD COLUMN child_order INTEGER" },
  { column: "codex_model", ddl: "ALTER TABLE tickets ADD COLUMN codex_model TEXT" },
  { column: "codex_effort", ddl: "ALTER TABLE tickets ADD COLUMN codex_effort TEXT" },
  { column: "codex_fast", ddl: "ALTER TABLE tickets ADD COLUMN codex_fast INTEGER NOT NULL DEFAULT 0" },
  { column: "codex_implementer_model", ddl: "ALTER TABLE tickets ADD COLUMN codex_implementer_model TEXT" },
  { column: "codex_implementer_effort", ddl: "ALTER TABLE tickets ADD COLUMN codex_implementer_effort TEXT" },
  { column: "codex_implementer_fast", ddl: "ALTER TABLE tickets ADD COLUMN codex_implementer_fast INTEGER" },
  { column: "feasibility_engine", ddl: "ALTER TABLE tickets ADD COLUMN feasibility_engine TEXT" },
];

/**
 * Columns added to the profiles table after its original schema. A NOT NULL column added to a
 * non-empty table requires a DEFAULT (SQLite refuses it otherwise), so both carry one.
 */
const PROFILE_MIGRATIONS: { column: string; ddl: string }[] = [
  { column: "implementer_model", ddl: "ALTER TABLE profiles ADD COLUMN implementer_model TEXT NOT NULL DEFAULT 'opus'" },
  { column: "implementer_effort", ddl: "ALTER TABLE profiles ADD COLUMN implementer_effort TEXT NOT NULL DEFAULT 'low'" },
  { column: "orchestrator", ddl: "ALTER TABLE profiles ADD COLUMN orchestrator TEXT NOT NULL DEFAULT 'claude'" },
  { column: "codex_model", ddl: "ALTER TABLE profiles ADD COLUMN codex_model TEXT NOT NULL DEFAULT 'gpt-5.6-terra'" },
  { column: "codex_effort", ddl: "ALTER TABLE profiles ADD COLUMN codex_effort TEXT NOT NULL DEFAULT 'medium'" },
  { column: "codex_fast", ddl: "ALTER TABLE profiles ADD COLUMN codex_fast INTEGER NOT NULL DEFAULT 0" },
  { column: "codex_implementer_model", ddl: "ALTER TABLE profiles ADD COLUMN codex_implementer_model TEXT" },
  { column: "codex_implementer_effort", ddl: "ALTER TABLE profiles ADD COLUMN codex_implementer_effort TEXT" },
  { column: "codex_implementer_fast", ddl: "ALTER TABLE profiles ADD COLUMN codex_implementer_fast INTEGER" },
];

const EXECUTION_MIGRATIONS: { column: string; ddl: string }[] = [
  { column: "codex_fast", ddl: "ALTER TABLE execution_runs ADD COLUMN codex_fast INTEGER NOT NULL DEFAULT 0" },
  { column: "configured_service_tier", ddl: "ALTER TABLE execution_runs ADD COLUMN configured_service_tier TEXT" },
  { column: "delegate_provider", ddl: "ALTER TABLE execution_runs ADD COLUMN delegate_provider TEXT" },
  { column: "delegate_effective_model", ddl: "ALTER TABLE execution_runs ADD COLUMN delegate_effective_model TEXT" },
  { column: "delegate_effective_effort", ddl: "ALTER TABLE execution_runs ADD COLUMN delegate_effective_effort TEXT" },
  { column: "delegate_codex_fast", ddl: "ALTER TABLE execution_runs ADD COLUMN delegate_codex_fast INTEGER" },
];

const REVIEW_RESULT_MIGRATIONS: { column: string; ddl: string }[] = [
  { column: "verdict", ddl: "ALTER TABLE review_approvals ADD COLUMN verdict TEXT" },
  { column: "summary", ddl: "ALTER TABLE review_approvals ADD COLUMN summary TEXT NOT NULL DEFAULT ''" },
  { column: "findings_json", ddl: "ALTER TABLE review_approvals ADD COLUMN findings_json TEXT NOT NULL DEFAULT '[]'" },
  { column: "status", ddl: "ALTER TABLE review_approvals ADD COLUMN status TEXT NOT NULL DEFAULT 'completed'" },
  { column: "verification_status", ddl: "ALTER TABLE review_approvals ADD COLUMN verification_status TEXT NOT NULL DEFAULT 'not_needed'" },
  { column: "error", ddl: "ALTER TABLE review_approvals ADD COLUMN error TEXT" },
];

const REVIEW_PASS_MIGRATIONS: { column: string; ddl: string }[] = [
  { column: "requires_approval", ddl: "ALTER TABLE review_passes ADD COLUMN requires_approval INTEGER NOT NULL DEFAULT 1" },
];

export function createDatabase(path: string): Database {
  snapshotBeforeCodexCatalogMigration(path);
  const db = new Database(path, { create: true });
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA_SQL);
  const reviewPassPolicyExisted = hasColumn(db, "review_passes", "requires_approval");
  migrate(db, "tickets", TICKET_MIGRATIONS);
  migrate(db, "profiles", PROFILE_MIGRATIONS);
  migrate(db, "execution_runs", EXECUTION_MIGRATIONS);
  migrate(db, "review_passes", REVIEW_PASS_MIGRATIONS);
  migrate(db, "review_approvals", REVIEW_RESULT_MIGRATIONS);
  if (!reviewPassPolicyExisted) {
    db.exec(`UPDATE review_passes SET requires_approval = 0
      WHERE ticket_id IN (
        SELECT id FROM tickets WHERE kind = 'review' AND (fix_comments = 0 OR pr_head_branch IS NULL)
      )`);
  }
  migrateCodexCatalog(db, "upgrade");
  backfillOrchestrator(db);
  seedSlots(db);
  seedProfiles(db);
  seedCodexProfile(db);
  return db;
}

/** Create a transactionally consistent SQLite snapshot before the first catalog-v4 mutation. */
function snapshotBeforeCodexCatalogMigration(path: string): void {
  if (path === ":memory:" || !existsSync(path)) return;
  const snapshotPath = `${path}${CODEX_CATALOG_SNAPSHOT_SUFFIX}`;
  if (existsSync(snapshotPath)) return;
  const source = new Database(path, { readonly: true });
  try {
    const metaExists = source
      .query("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name = 'meta'")
      .get();
    const hasMeta = metaExists !== null && typeof metaExists === "object" && "n" in metaExists && metaExists.n === 1;
    if (hasMeta) {
      const migrated = source.query("SELECT value FROM meta WHERE key = ?").get(CODEX_CATALOG_MIGRATED_META_KEY);
      if (migrated) return;
    }
    source.query("VACUUM INTO ?").run(snapshotPath);
  } finally {
    source.close();
  }
}

function recordConfigurationMigration(
  db: Database,
  direction: "upgrade" | "downgrade",
  scope: "meta" | "profiles" | "tickets",
  recordId: string,
  previousValue: string,
  currentValue: string,
): void {
  db.query(
    `INSERT OR IGNORE INTO configuration_migrations
      (migration_id, direction, scope, record_id, field, previous_value, current_value, migrated_at)
     VALUES (?, ?, ?, ?, 'codex_model', ?, ?, ?)`,
  ).run(CODEX_CATALOG_MIGRATION_ID, direction, scope, recordId, previousValue, currentValue, Date.now());
}

/** Normalize retired model choices for future launches while retaining their original ids in audit rows. */
export function migrateCodexCatalog(db: Database, direction: "upgrade" | "downgrade"): void {
  if (direction === "upgrade") {
    const flag = db.query("SELECT value FROM meta WHERE key = ?").get(CODEX_CATALOG_MIGRATED_META_KEY);
    if (flag) return;
  }
  const allowedModels = direction === "upgrade" ? new Set<string>(CODEX_MODELS) : new Set<string>([DEFAULT_CODEX_MODEL]);
  const transaction = db.transaction(() => {
    const meta = db.query("SELECT value FROM meta WHERE key = 'codex_model'").get();
    if (meta && typeof meta === "object" && "value" in meta && typeof meta.value === "string" && !allowedModels.has(meta.value)) {
      recordConfigurationMigration(db, direction, "meta", "codex_model", meta.value, DEFAULT_CODEX_MODEL);
      db.query("UPDATE meta SET value = ? WHERE key = 'codex_model'").run(DEFAULT_CODEX_MODEL);
    }
    const migrateTable = (scope: "profiles" | "tickets"): void => {
      const rows = db.query(`SELECT id, codex_model FROM ${scope} WHERE codex_model IS NOT NULL`).all();
      for (const row of rows) {
        if (!row || typeof row !== "object" || !("id" in row) || !("codex_model" in row)) continue;
        if (typeof row.id !== "string" || typeof row.codex_model !== "string" || allowedModels.has(row.codex_model)) continue;
        recordConfigurationMigration(db, direction, scope, row.id, row.codex_model, DEFAULT_CODEX_MODEL);
        db.query(`UPDATE ${scope} SET codex_model = ? WHERE id = ?`).run(DEFAULT_CODEX_MODEL, row.id);
      }
    };
    migrateTable("profiles");
    migrateTable("tickets");
    if (direction === "upgrade") {
      db.query("INSERT OR REPLACE INTO meta (key, value) VALUES (?, '1')").run(CODEX_CATALOG_MIGRATED_META_KEY);
    } else {
      db.query("DELETE FROM meta WHERE key = ?").run(CODEX_CATALOG_MIGRATED_META_KEY);
    }
  });
  transaction();
}

function countRows(db: Database, sql: string): number {
  const row = db.query(sql).get();
  return row && typeof row === "object" && "n" in row && typeof row.n === "number" ? row.n : 0;
}

/** A downgrade cannot reinterpret a live run; callers must stop it before applying conversions. */
export function assertCodexDowngradeSafe(db: Database): void {
  const runningExecutions = countRows(db, "SELECT COUNT(*) AS n FROM execution_runs WHERE status = 'running'");
  const activeTickets = countRows(
    db,
    `SELECT COUNT(*) AS n FROM tickets
     WHERE slot_id IS NOT NULL AND stage IN ('queued', 'planning', 'awaiting_answers', 'implementing', 'reviewing', 'fixing', 'testing', 'opening_pr')`,
  );
  if (runningExecutions > 0 || activeTickets > 0) {
    throw new Error(
      `downgrade refusé : ${runningExecutions} exécution(s) et ${activeTickets} ticket(s) encore actifs`,
    );
  }
}

/**
 * One-shot backfill of the orchestrator column on DBs that predate it: a legacy `implementer = 'codex'`
 * ticket/profile meant "the whole session runs on Codex", which is now carried by `orchestrator`.
 * Meta-flagged so it runs EXACTLY once (see seedCodexProfile's read/write pattern): PR2 legalizes the
 * cross-provider pair (claude orchestrator + codex implementer), and re-running this would silently
 * rewrite such a row back to a codex orchestrator.
 */
function backfillOrchestrator(db: Database): void {
  const flagged = db.query("SELECT value FROM meta WHERE key = ?").get(ORCHESTRATOR_BACKFILL_META_KEY);
  if (flagged) return;
  db.exec("UPDATE tickets SET orchestrator = 'codex' WHERE implementer = 'codex'");
  db.exec("UPDATE profiles SET orchestrator = 'codex' WHERE implementer = 'codex'");
  // Flag LAST: a failed UPDATE must leave the backfill retryable on the next boot.
  db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, '1')").run(ORCHESTRATOR_BACKFILL_META_KEY);
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

function hasColumn(db: Database, table: string, column: string): boolean {
  return db
    .query(`PRAGMA table_info(${table})`)
    .all()
    .some((row) => row !== null && typeof row === "object" && "name" in row && row.name === column);
}

function seedSlots(db: Database): void {
  const insert = db.prepare("INSERT OR IGNORE INTO slots (id, status) VALUES (?, 'free')");
  for (let id = 1; id <= SLOT_COUNT; id += 1) {
    insert.run(id);
  }
}

function insertProfile(db: Database, profile: ProfileConfig, sortOrder: number, now: number): void {
  db.prepare(
    "INSERT INTO profiles (id, name, model, effort, implementer_model, implementer_effort, implementer, orchestrator, codex_model, codex_effort, codex_fast, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(
    nanoid(10),
    profile.name,
    profile.model,
    profile.effort,
    profile.implementerModel,
    profile.implementerEffort,
    profile.implementer,
    profile.orchestrator,
    profile.codexModel,
    profile.codexEffort,
    profile.codexFast ? 1 : 0,
    sortOrder,
    now,
    now,
  );
}

/** Seed the built-in implementation profiles once (no-op when the table already holds any). */
function seedProfiles(db: Database): void {
  const row = db.query("SELECT COUNT(*) AS n FROM profiles").get();
  const count = row && typeof row === "object" && "n" in row && typeof row.n === "number" ? row.n : 0;
  if (count > 0) return;
  const now = Date.now();
  DEFAULT_PROFILES.forEach((profile, index) => insertProfile(db, profile, index, now));
}

/**
 * One-shot seed of the built-in Codex preset into DBs that predate it (seedProfiles only runs on an
 * empty table). Meta-flagged so deleting the profile later doesn't resurrect it on next boot.
 */
function seedCodexProfile(db: Database): void {
  const flagged = db.query("SELECT value FROM meta WHERE key = ?").get(CODEX_PROFILE_SEEDED_META_KEY);
  if (flagged) return;
  db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, '1')").run(CODEX_PROFILE_SEEDED_META_KEY);
  const existing = db.query("SELECT COUNT(*) AS n FROM profiles WHERE implementer = 'codex'").get();
  const count = existing && typeof existing === "object" && "n" in existing && typeof existing.n === "number" ? existing.n : 0;
  if (count > 0) return;
  const maxRow = db.query("SELECT COALESCE(MAX(sort_order), -1) AS m FROM profiles").get();
  const maxOrder = maxRow && typeof maxRow === "object" && "m" in maxRow && typeof maxRow.m === "number" ? maxRow.m : -1;
  insertProfile(db, CODEX_SEED_PROFILE, maxOrder + 1, Date.now());
}

import type { Database } from "bun:sqlite";
import { nanoid } from "nanoid";

import {
  AUTO_MERGE_RESOLVE_EVENT,
  AUTO_RECLAIM_EVENT,
  CLEANER_EFFORT,
  CLEANER_MODEL,
  COMMIT_LANGUAGE_META_KEY,
  CREATED_EVENT,
  DEFAULT_COMMIT_LANGUAGE,
  DEFAULT_TRIAGE_LANGUAGE,
  IMPLEMENT_EFFORT_META_KEY,
  IMPLEMENT_MODEL_META_KEY,
  TRIAGE_EFFORT_META_KEY,
  TRIAGE_LANGUAGE_META_KEY,
  TRIAGE_MODEL_META_KEY,
} from "../../shared/constants.ts";
import type { AgentEffort, AgentModel, Column, CommentAuthor, Implementer, ReviewDepth, Stage } from "../../shared/constants.ts";
import { agentEffortSchema, agentModelSchema, commitLanguageSchema } from "../../shared/schemas.ts";
import type { AppSettings, Comment, Profile, ReformulateStatus, SessionUsage, Slot, Ticket, TriageStatus, TriageVerdict, UpdateAppSettingsInput, WorktreeSession } from "../../shared/schemas.ts";
import { computeWorktreeAddresses } from "../agents/worktreeAddresses.ts";
import { DEFAULT_MODELS, applyAppSettingsToModels } from "../config.ts";
import type { ProjectConfig, ProjectKey } from "../config.ts";

import { mapCommentRow, mapProfileRow, mapProjectRow, mapSlotRow, mapTicketRow, mapWorktreeSessionRow } from "./rows.ts";

export type SlotStatus = Slot["status"];

/** Attach the runtime-derived clickable addresses to a persisted worktree session row. */
function enrichWorktreeSession(session: WorktreeSession): WorktreeSession {
  return { ...session, addresses: computeWorktreeAddresses(session.slotId, session.project) };
}

export interface NewTicket {
  title: string;
  description: string;
  externalUrl: string | null;
  project: ProjectKey;
  prdEnabled: boolean;
  prDraft: boolean;
  autoMerge: boolean;
  addScreenshots: boolean;
  verifyFeature: boolean;
  argusMultiLoop: boolean;
  stealth: boolean;
  directPush: boolean;
  // Deep parallel-research planning is no longer settable via the UI: persisted false (column kept to avoid a destructive migration).
  researchPlan?: boolean;
  baseBranch: string | null;
  dependsOn: string | null;
  childOrder?: number | null;
  model: AgentModel | null;
  effort: AgentEffort | null;
  implementerModel: AgentModel | null;
  implementerEffort: AgentEffort | null;
  implementer: Implementer;
}

export interface NewProfile {
  name: string;
  model: AgentModel;
  effort: AgentEffort;
  implementerModel: AgentModel;
  implementerEffort: AgentEffort;
  implementer: Implementer;
}

export interface ProfilePatch {
  name?: string;
  model?: AgentModel;
  effort?: AgentEffort;
  implementerModel?: AgentModel;
  implementerEffort?: AgentEffort;
  implementer?: Implementer;
  sortOrder?: number;
}

export interface NewProject {
  label: string;
  repoPath: string;
  baseBranch: string;
  commitTimeoutMs: number;
  defaultAutoMerge: boolean;
  defaultAddScreenshots: boolean;
  color?: string;
  instructions?: string;
  worktreeScript?: string;
  runScript?: string;
  worktreeTeardownScript?: string;
  scripts?: { typecheck?: string; lint?: string; test?: string };
  worktreePorts?: { label: string; base: number }[];
}

export interface ProjectPatch {
  label?: string;
  repoPath?: string;
  baseBranch?: string;
  commitTimeoutMs?: number;
  defaultAutoMerge?: boolean;
  defaultAddScreenshots?: boolean;
  color?: string | null;
  instructions?: string | null;
  worktreeScript?: string | null;
  runScript?: string | null;
  worktreeTeardownScript?: string | null;
  scripts?: { typecheck?: string; lint?: string; test?: string } | null;
  worktreePorts?: { label: string; base: number }[] | null;
  sortOrder?: number;
}

export interface NewReview {
  title: string;
  description: string;
  project: ProjectKey;
  prNumber: number;
  prHeadBranch: string;
  prUrl: string;
  reviewDepth: ReviewDepth;
  postComments: boolean;
  fixComments: boolean;
  baseBranch?: string | null;
}

export interface NewClean {
  title: string;
  description: string;
  project: ProjectKey;
  prNumber: number;
  prHeadBranch: string;
  prUrl: string;
}

export interface NewAsk {
  title: string;
  description: string;
  project: ProjectKey;
  model: AgentModel | null;
  effort: AgentEffort | null;
}

export interface TicketPatch {
  title?: string;
  description?: string;
  externalUrl?: string | null;
  prdEnabled?: boolean;
  prDraft?: boolean;
  autoMerge?: boolean;
  addScreenshots?: boolean;
  verifyFeature?: boolean;
  argusMultiLoop?: boolean;
  researchPlan?: boolean;
  stealth?: boolean;
  directPush?: boolean;
  project?: string;
  baseBranch?: string | null;
  dependsOn?: string | null;
  childOrder?: number | null;
  prdMarkdown?: string | null;
  agentSummary?: string | null;
  column?: Column;
  stage?: Stage | null;
  model?: AgentModel | null;
  effort?: AgentEffort | null;
  implementerModel?: AgentModel | null;
  implementerEffort?: AgentEffort | null;
  implementer?: Implementer;
  reviewRounds?: number;
  nudgeCount?: number;
  sessionId?: string | null;
  slotId?: number | null;
  branch?: string | null;
  prUrl?: string | null;
  resolvingConflicts?: boolean;
  testing?: boolean;
  error?: string | null;
  archived?: boolean;
  watchdogFlagged?: boolean;
  lastProgressAt?: number;
  triageStatus?: TriageStatus;
  triageVerdict?: TriageVerdict | null;
  triageReport?: string | null;
  reformulateStatus?: ReformulateStatus;
  reformulation?: string | null;
  feasibilityContext?: boolean;
  sessionUsage?: SessionUsage;
  finishedAt?: number | null;
}

const COLUMN_TO_DB = "column_name";

/** Values SQLite accepts as positional bindings in our UPDATE statements. */
type SqlBindValue = string | number | null;

/**
 * Accumulates `column = ?` assignments for a dynamic UPDATE so each builder method only declares
 * which columns changed. Emits `UPDATE <table> SET ... WHERE id = ?` with the patched values
 * followed by the row id. Kept type-safe (no casts): every binding is a SqlBindValue.
 */
class SqlUpdateBuilder {
  private readonly fields: string[] = [];
  private readonly values: SqlBindValue[] = [];

  set(column: string, value: SqlBindValue): void {
    this.fields.push(`${column} = ?`);
    this.values.push(value);
  }

  run(db: Database, table: string, id: SqlBindValue): void {
    this.runWhere(db, table, "id", id);
  }

  runWhere(db: Database, table: string, whereColumn: string, whereValue: SqlBindValue): void {
    db.query(`UPDATE ${table} SET ${this.fields.join(", ")} WHERE ${whereColumn} = ?`).run(...this.values, whereValue);
  }
}

/** Thrown when a project still has tickets referencing it; routes map it to HTTP 409. */
export class ProjectInUseError extends Error {
  readonly conflict = true;

  constructor(public readonly projectKey: string, public readonly ticketCount: number) {
    super(`projet « ${projectKey} » référencé par ${ticketCount} ticket(s) : impossible de le supprimer`);
    this.name = "ProjectInUseError";
  }
}

export class Store {
  constructor(private readonly db: Database) {}

  /** Run `fn` inside a single SQLite transaction: commit on return, roll back if it throws. */
  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  /** Run a `SELECT … AS n` aggregate and return the numeric scalar (0 when absent). */
  private scalar(sql: string, ...params: (string | number)[]): number {
    const row = this.db.query(sql).get(...params);
    if (row && typeof row === "object" && "n" in row && typeof row.n === "number") return row.n;
    return 0;
  }

  private pendingQuestions(ticketId: string): number {
    return this.scalar(
      "SELECT COUNT(*) AS n FROM comments WHERE ticket_id = ? AND author = 'agent' AND question_id IS NOT NULL AND answered = 0",
      ticketId,
    );
  }

  getTicket(id: string): Ticket | null {
    const raw = this.db.query("SELECT * FROM tickets WHERE id = ?").get(id);
    if (!raw) return null;
    return mapTicketRow(raw, this.pendingQuestions(id));
  }

  listTickets(includeArchived: boolean): Ticket[] {
    const sql = includeArchived
      ? "SELECT * FROM tickets ORDER BY created_at ASC"
      : "SELECT * FROM tickets WHERE archived = 0 ORDER BY created_at ASC";
    const rows = this.db.query(sql).all();
    return rows.map((raw) => {
      const ticket = mapTicketRow(raw, 0);
      return { ...ticket, pendingQuestions: this.pendingQuestions(ticket.id) };
    });
  }

  /** Non-archived tickets that declare `parentId` as their dependency (children in the PR stack). */
  listDependents(parentId: string): Ticket[] {
    const rows = this.db.query("SELECT * FROM tickets WHERE depends_on = ? AND archived = 0").all(parentId);
    return rows.map((raw) => {
      const ticket = mapTicketRow(raw, 0);
      return { ...ticket, pendingQuestions: this.pendingQuestions(ticket.id) };
    });
  }

  /**
   * Shared tail of every create* method: fetch the just-inserted row, fail loudly if it
   * vanished, log the "created" event, and return the validated ticket. `method` names the
   * caller so the thrown message stays specific.
   */
  private finalizeCreate(id: string, method: string, eventPayload: unknown): Ticket {
    const ticket = this.getTicket(id);
    if (!ticket) throw new Error(`${method}: ticket vanished after insert`);
    this.logEvent(id, CREATED_EVENT, eventPayload);
    return ticket;
  }

  createTicket(input: NewTicket): Ticket {
    const id = nanoid(10);
    const now = Date.now();
    this.db
      .query(
        `INSERT INTO tickets (id, title, description, external_url, project, prd_enabled, pr_draft, auto_merge, add_screenshots, verify_feature, argus_multi_loop, research_plan, stealth, direct_push, base_branch, depends_on, child_order, model, effort, implementer_model, implementer_effort, implementer, feasibility_context, column_name, stage, created_at, updated_at, last_progress_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'todo', NULL, ?, ?, ?)`,
      )
      .run(
        id,
        input.title,
        input.description,
        input.externalUrl,
        input.project,
        input.prdEnabled ? 1 : 0,
        input.prDraft ? 1 : 0,
        input.autoMerge ? 1 : 0,
        input.addScreenshots ? 1 : 0,
        input.verifyFeature ? 1 : 0,
        input.argusMultiLoop ? 1 : 0,
        (input.researchPlan ?? false) ? 1 : 0,
        input.stealth ? 1 : 0,
        input.directPush ? 1 : 0,
        input.baseBranch,
        input.dependsOn,
        input.childOrder ?? null,
        input.model,
        input.effort,
        input.implementerModel,
        input.implementerEffort,
        input.implementer,
        now,
        now,
        now,
      );
    return this.finalizeCreate(id, "createTicket", { title: input.title });
  }

  /** Create a review ticket: straight into "À implémenter", carrying the target PR + argus knobs. */
  createReview(input: NewReview): Ticket {
    const id = nanoid(10);
    const now = Date.now();
    this.db
      .query(
        `INSERT INTO tickets (id, title, description, project, kind, review_depth, pr_number, pr_head_branch, base_branch, post_comments, fix_comments, pr_url, column_name, stage, implementing_started_at, created_at, updated_at, last_progress_at)
         VALUES (?, ?, ?, ?, 'review', ?, ?, ?, ?, ?, ?, ?, 'implementing', 'queued', ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.title,
        input.description,
        input.project,
        input.reviewDepth,
        input.prNumber,
        input.prHeadBranch,
        input.baseBranch ?? null,
        input.postComments ? 1 : 0,
        input.fixComments ? 1 : 0,
        input.prUrl,
        now,
        now,
        now,
        now,
      );
    return this.finalizeCreate(id, "createReview", { title: input.title, kind: "review", prNumber: input.prNumber });
  }

  /** Create a clean ticket: straight into "À implémenter", carrying the target PR and pinned to Opus/low. */
  createClean(input: NewClean): Ticket {
    const id = nanoid(10);
    const now = Date.now();
    this.db
      .query(
        `INSERT INTO tickets (id, title, description, project, kind, model, effort, pr_number, pr_head_branch, pr_url, column_name, stage, implementing_started_at, created_at, updated_at, last_progress_at)
         VALUES (?, ?, ?, ?, 'clean', ?, ?, ?, ?, ?, 'implementing', 'queued', ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.title,
        input.description,
        input.project,
        CLEANER_MODEL,
        CLEANER_EFFORT,
        input.prNumber,
        input.prHeadBranch,
        input.prUrl,
        now,
        now,
        now,
        now,
      );
    return this.finalizeCreate(id, "createClean", { title: input.title, kind: "clean", prNumber: input.prNumber });
  }

  /** Create an ask ticket: straight into "À implémenter", carrying the chosen model/effort. */
  createAsk(input: NewAsk): Ticket {
    const id = nanoid(10);
    const now = Date.now();
    this.db
      .query(
        `INSERT INTO tickets (id, title, description, project, kind, model, effort, column_name, stage, implementing_started_at, created_at, updated_at, last_progress_at)
         VALUES (?, ?, ?, ?, 'ask', ?, ?, 'implementing', 'queued', ?, ?, ?, ?)`,
      )
      .run(id, input.title, input.description, input.project, input.model, input.effort, now, now, now, now);
    return this.finalizeCreate(id, "createAsk", { title: input.title, kind: "ask" });
  }

  updateTicket(id: string, patch: TicketPatch): Ticket {
    const builder = new SqlUpdateBuilder();
    const set = builder.set.bind(builder);

    if (patch.title !== undefined) set("title", patch.title);
    if (patch.description !== undefined) set("description", patch.description);
    if (patch.externalUrl !== undefined) set("external_url", patch.externalUrl);
    if (patch.prdEnabled !== undefined) set("prd_enabled", patch.prdEnabled ? 1 : 0);
    if (patch.prDraft !== undefined) set("pr_draft", patch.prDraft ? 1 : 0);
    if (patch.autoMerge !== undefined) set("auto_merge", patch.autoMerge ? 1 : 0);
    if (patch.addScreenshots !== undefined) set("add_screenshots", patch.addScreenshots ? 1 : 0);
    if (patch.verifyFeature !== undefined) set("verify_feature", patch.verifyFeature ? 1 : 0);
    if (patch.argusMultiLoop !== undefined) set("argus_multi_loop", patch.argusMultiLoop ? 1 : 0);
    if (patch.researchPlan !== undefined) set("research_plan", patch.researchPlan ? 1 : 0);
    if (patch.stealth !== undefined) set("stealth", patch.stealth ? 1 : 0);
    if (patch.directPush !== undefined) set("direct_push", patch.directPush ? 1 : 0);
    if (patch.project !== undefined) set("project", patch.project);
    if (patch.baseBranch !== undefined) set("base_branch", patch.baseBranch);
    if (patch.dependsOn !== undefined) set("depends_on", patch.dependsOn);
    if (patch.childOrder !== undefined) set("child_order", patch.childOrder);
    if (patch.prdMarkdown !== undefined) set("prd_markdown", patch.prdMarkdown);
    if (patch.agentSummary !== undefined) set("agent_summary", patch.agentSummary);
    if (patch.column !== undefined) {
      set(COLUMN_TO_DB, patch.column);
      // Stamp the entry into "À implémenter" (re-stamped on each re-entry) so the card's
      // elapsed timer counts from when work started, not from ticket creation.
      if (patch.column === "implementing" && this.getTicket(id)?.column !== "implementing") {
        set("implementing_started_at", Date.now());
      }
    }
    if (patch.stage !== undefined) {
      set("stage", patch.stage);
      // Stamp the real work-start once: the first time the agent enters the `implementing`
      // stage (not the column entry, which happens at queue time). Drives the accurate
      // "implémenté en" badge. Never re-stamped, so re-entries keep the original start.
      if (patch.stage === "implementing" && this.getTicket(id)?.implementationStartedAt == null) {
        set("implementation_started_at", Date.now());
      }
    }
    if (patch.model !== undefined) set("model", patch.model);
    if (patch.effort !== undefined) set("effort", patch.effort);
    if (patch.implementerModel !== undefined) set("implementer_model", patch.implementerModel);
    if (patch.implementerEffort !== undefined) set("implementer_effort", patch.implementerEffort);
    if (patch.implementer !== undefined) set("implementer", patch.implementer);
    if (patch.reviewRounds !== undefined) set("review_rounds", patch.reviewRounds);
    if (patch.nudgeCount !== undefined) set("nudge_count", patch.nudgeCount);
    if (patch.sessionId !== undefined) set("session_id", patch.sessionId);
    if (patch.slotId !== undefined) set("slot_id", patch.slotId);
    if (patch.branch !== undefined) set("branch", patch.branch);
    if (patch.prUrl !== undefined) set("pr_url", patch.prUrl);
    if (patch.resolvingConflicts !== undefined) set("resolving_conflicts", patch.resolvingConflicts ? 1 : 0);
    if (patch.testing !== undefined) set("testing", patch.testing ? 1 : 0);
    if (patch.error !== undefined) set("error", patch.error);
    if (patch.archived !== undefined) set("archived", patch.archived ? 1 : 0);
    if (patch.watchdogFlagged !== undefined) set("watchdog_flagged", patch.watchdogFlagged ? 1 : 0);
    if (patch.lastProgressAt !== undefined) set("last_progress_at", patch.lastProgressAt);
    if (patch.triageStatus !== undefined) set("triage_status", patch.triageStatus);
    if (patch.triageVerdict !== undefined) set("triage_verdict", patch.triageVerdict);
    if (patch.triageReport !== undefined) set("triage_report", patch.triageReport);
    if (patch.reformulateStatus !== undefined) set("reformulate_status", patch.reformulateStatus);
    if (patch.reformulation !== undefined) set("reformulation", patch.reformulation);
    if (patch.feasibilityContext !== undefined) set("feasibility_context", patch.feasibilityContext ? 1 : 0);
    if (patch.sessionUsage !== undefined) set("session_usage", JSON.stringify(patch.sessionUsage));
    if (patch.finishedAt !== undefined) set("finished_at", patch.finishedAt);

    set("updated_at", Date.now());
    builder.run(this.db, "tickets", id);

    const ticket = this.getTicket(id);
    if (!ticket) throw new Error(`updateTicket: ticket ${id} not found`);
    return ticket;
  }

  /** Raw nudge counter (not exposed in Ticket type). */
  getNudgeCount(id: string): number {
    return this.scalar("SELECT nudge_count AS n FROM tickets WHERE id = ?", id);
  }

  /**
   * Count of auto-reclaim relaunches for this ticket. Event-based on purpose: only the
   * auto-reclaim paths log AUTO_RECLAIM_EVENT, so manual retries/relaunches never inflate it.
   */
  getReclaimCount(id: string): number {
    return this.scalar("SELECT COUNT(*) AS n FROM events WHERE ticket_id = ? AND type = ?", id, AUTO_RECLAIM_EVENT);
  }

  /**
   * Count of auto-triggered merge-conflict resolution sessions for this ticket. Event-based like
   * getReclaimCount: only the auto-resolve path logs AUTO_MERGE_RESOLVE_EVENT, so a user's manual
   * resolve-conflicts trigger never inflates it and never consumes the auto-resolution budget.
   */
  getAutoMergeResolveCount(id: string): number {
    return this.scalar("SELECT COUNT(*) AS n FROM events WHERE ticket_id = ? AND type = ?", id, AUTO_MERGE_RESOLVE_EVENT);
  }

  getLastProgressAt(id: string): number {
    return this.scalar("SELECT last_progress_at AS n FROM tickets WHERE id = ?", id);
  }

  // ---- Comments ----

  addComment(ticketId: string, author: CommentAuthor, body: string, questionId: string | null): Comment {
    const id = nanoid(10);
    const now = Date.now();
    this.db
      .query("INSERT INTO comments (id, ticket_id, author, body, question_id, answered, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)")
      .run(id, ticketId, author, body, questionId, now);
    const raw = this.db.query("SELECT * FROM comments WHERE id = ?").get(id);
    return mapCommentRow(raw);
  }

  markQuestionAnswered(questionId: string): void {
    this.db.query("UPDATE comments SET answered = 1 WHERE question_id = ? AND author = 'agent'").run(questionId);
  }

  listComments(ticketId: string): Comment[] {
    const rows = this.db.query("SELECT * FROM comments WHERE ticket_id = ? ORDER BY created_at ASC").all(ticketId);
    return rows.map(mapCommentRow);
  }

  /** Hard-delete a ticket and its dependent rows (comments + events). */
  deleteTicket(ticketId: string): void {
    const tx = this.db.transaction(() => {
      this.db.query("DELETE FROM comments WHERE ticket_id = ?").run(ticketId);
      this.db.query("DELETE FROM events WHERE ticket_id = ?").run(ticketId);
      this.db.query("DELETE FROM tickets WHERE id = ?").run(ticketId);
    });
    tx();
  }

  // ---- Profiles (implementation-agent presets) ----

  listProfiles(): Profile[] {
    const rows = this.db.query("SELECT * FROM profiles ORDER BY sort_order ASC, created_at ASC").all();
    return rows.map(mapProfileRow);
  }

  getProfile(id: string): Profile | null {
    const raw = this.db.query("SELECT * FROM profiles WHERE id = ?").get(id);
    return raw ? mapProfileRow(raw) : null;
  }

  createProfile(input: NewProfile): Profile {
    const id = nanoid(10);
    const now = Date.now();
    const nextOrder = this.scalar("SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM profiles");
    this.db
      .query(
        "INSERT INTO profiles (id, name, model, effort, implementer_model, implementer_effort, implementer, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        id,
        input.name,
        input.model,
        input.effort,
        input.implementerModel,
        input.implementerEffort,
        input.implementer,
        nextOrder,
        now,
        now,
      );
    const profile = this.getProfile(id);
    if (!profile) throw new Error("createProfile: profil introuvable après insertion");
    return profile;
  }

  updateProfile(id: string, patch: ProfilePatch): Profile {
    const builder = new SqlUpdateBuilder();
    if (patch.name !== undefined) builder.set("name", patch.name);
    if (patch.model !== undefined) builder.set("model", patch.model);
    if (patch.effort !== undefined) builder.set("effort", patch.effort);
    if (patch.implementerModel !== undefined) builder.set("implementer_model", patch.implementerModel);
    if (patch.implementerEffort !== undefined) builder.set("implementer_effort", patch.implementerEffort);
    if (patch.implementer !== undefined) builder.set("implementer", patch.implementer);
    if (patch.sortOrder !== undefined) builder.set("sort_order", patch.sortOrder);
    builder.set("updated_at", Date.now());
    builder.run(this.db, "profiles", id);
    const profile = this.getProfile(id);
    if (!profile) throw new Error(`updateProfile: profil ${id} introuvable`);
    return profile;
  }

  deleteProfile(id: string): void {
    this.db.query("DELETE FROM profiles WHERE id = ?").run(id);
  }

  // ---- Projects ----

  listProjects(): ProjectConfig[] {
    const rows = this.db.query("SELECT * FROM projects ORDER BY sort_order ASC, created_at ASC").all();
    return rows.map(mapProjectRow);
  }

  listProjectKeys(): string[] {
    const rows = this.db.query("SELECT key FROM projects ORDER BY sort_order ASC, created_at ASC").all();
    const keys: string[] = [];
    for (const row of rows) {
      if (row && typeof row === "object" && "key" in row && typeof row.key === "string") keys.push(row.key);
    }
    return keys;
  }

  getProjectRow(key: string): ProjectConfig | undefined {
    const raw = this.db.query("SELECT * FROM projects WHERE key = ?").get(key);
    return raw ? mapProjectRow(raw) : undefined;
  }

  createProject(key: string, data: NewProject): ProjectConfig {
    const now = Date.now();
    const nextOrder = this.scalar("SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM projects");
    this.db
      .query(
        `INSERT INTO projects (key, label, repo_path, base_branch, commit_timeout_ms, default_auto_merge, default_add_screenshots, color, instructions, worktree_script, run_script, worktree_teardown_script, scripts_typecheck, scripts_lint, scripts_test, worktree_ports, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        key,
        data.label,
        data.repoPath,
        data.baseBranch,
        data.commitTimeoutMs,
        data.defaultAutoMerge ? 1 : 0,
        data.defaultAddScreenshots ? 1 : 0,
        data.color ?? null,
        data.instructions ?? null,
        data.worktreeScript ?? null,
        data.runScript ?? null,
        data.worktreeTeardownScript ?? null,
        data.scripts?.typecheck ?? null,
        data.scripts?.lint ?? null,
        data.scripts?.test ?? null,
        data.worktreePorts ? JSON.stringify(data.worktreePorts) : null,
        nextOrder,
        now,
        now,
      );
    const project = this.getProjectRow(key);
    if (!project) throw new Error(`createProject: projet ${key} introuvable après insertion`);
    return project;
  }

  updateProject(key: string, patch: ProjectPatch): ProjectConfig {
    const builder = new SqlUpdateBuilder();
    if (patch.label !== undefined) builder.set("label", patch.label);
    if (patch.repoPath !== undefined) builder.set("repo_path", patch.repoPath);
    if (patch.baseBranch !== undefined) builder.set("base_branch", patch.baseBranch);
    if (patch.commitTimeoutMs !== undefined) builder.set("commit_timeout_ms", patch.commitTimeoutMs);
    if (patch.defaultAutoMerge !== undefined) builder.set("default_auto_merge", patch.defaultAutoMerge ? 1 : 0);
    if (patch.defaultAddScreenshots !== undefined) builder.set("default_add_screenshots", patch.defaultAddScreenshots ? 1 : 0);
    if (patch.color !== undefined) builder.set("color", patch.color);
    if (patch.instructions !== undefined) builder.set("instructions", patch.instructions);
    if (patch.worktreeScript !== undefined) builder.set("worktree_script", patch.worktreeScript);
    if (patch.runScript !== undefined) builder.set("run_script", patch.runScript);
    if (patch.worktreeTeardownScript !== undefined) builder.set("worktree_teardown_script", patch.worktreeTeardownScript);
    if (patch.scripts !== undefined) {
      builder.set("scripts_typecheck", patch.scripts === null ? null : patch.scripts.typecheck ?? null);
      builder.set("scripts_lint", patch.scripts === null ? null : patch.scripts.lint ?? null);
      builder.set("scripts_test", patch.scripts === null ? null : patch.scripts.test ?? null);
    }
    if (patch.worktreePorts !== undefined) {
      builder.set("worktree_ports", patch.worktreePorts === null ? null : JSON.stringify(patch.worktreePorts));
    }
    if (patch.sortOrder !== undefined) builder.set("sort_order", patch.sortOrder);
    builder.set("updated_at", Date.now());
    builder.runWhere(this.db, "projects", "key", key);
    const project = this.getProjectRow(key);
    if (!project) throw new Error(`updateProject: projet ${key} introuvable`);
    return project;
  }

  deleteProject(key: string): void {
    const count = this.scalar("SELECT COUNT(*) AS n FROM tickets WHERE project = ?", key);
    if (count > 0) throw new ProjectInUseError(key, count);
    this.db.query("DELETE FROM projects WHERE key = ?").run(key);
  }

  // ---- Slots ----

  listSlots(): Slot[] {
    const rows = this.db.query("SELECT * FROM slots ORDER BY id ASC").all();
    return rows.map(mapSlotRow);
  }

  getSlot(id: number): Slot | null {
    const raw = this.db.query("SELECT * FROM slots WHERE id = ?").get(id);
    return raw ? mapSlotRow(raw) : null;
  }

  findFreeSlot(): Slot | null {
    const raw = this.db.query("SELECT * FROM slots WHERE status = 'free' ORDER BY id ASC LIMIT 1").get();
    return raw ? mapSlotRow(raw) : null;
  }

  updateSlot(
    id: number,
    patch: { ticketId?: string | null; repoPath?: string | null; tmuxSession?: string | null; status?: SlotStatus },
  ): Slot {
    const builder = new SqlUpdateBuilder();
    if (patch.ticketId !== undefined) builder.set("ticket_id", patch.ticketId);
    if (patch.repoPath !== undefined) builder.set("repo_path", patch.repoPath);
    if (patch.tmuxSession !== undefined) builder.set("tmux_session", patch.tmuxSession);
    if (patch.status !== undefined) builder.set("status", patch.status);
    builder.run(this.db, "slots", id);
    const slot = this.getSlot(id);
    if (!slot) throw new Error(`updateSlot: slot ${id} not found`);
    return slot;
  }

  // ---- Worktree sessions (standalone, ticket-less runnable worktrees) ----

  listWorktreeSessions(): WorktreeSession[] {
    const rows = this.db.query("SELECT * FROM worktree_sessions ORDER BY created_at ASC").all();
    return rows.map(mapWorktreeSessionRow).map(enrichWorktreeSession);
  }

  getWorktreeSession(slotId: number): WorktreeSession | null {
    const raw = this.db.query("SELECT * FROM worktree_sessions WHERE slot_id = ?").get(slotId);
    return raw ? enrichWorktreeSession(mapWorktreeSessionRow(raw)) : null;
  }

  insertWorktreeSession(s: Omit<WorktreeSession, "addresses">): void {
    this.db
      .prepare(
        "INSERT OR REPLACE INTO worktree_sessions (slot_id, project, branch, base_branch, session_name, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(s.slotId, s.project, s.branch, s.baseBranch, s.sessionName, s.createdAt);
  }

  deleteWorktreeSession(slotId: number): void {
    this.db.prepare("DELETE FROM worktree_sessions WHERE slot_id = ?").run(slotId);
  }

  // ---- Events (audit log) ----

  logEvent(ticketId: string | null, type: string, payload: unknown): void {
    this.db
      .query("INSERT INTO events (ticket_id, type, payload, created_at) VALUES (?, ?, ?, ?)")
      .run(ticketId, type, JSON.stringify(payload ?? null), Date.now());
  }

  /**
   * Count of trailing `type` events for this ticket — i.e. how many of the most recent events are
   * `type`, stopping at the first event of any other type. A tight retry loop (failure after failure
   * with no progress event between) accumulates; an agent making real progress between attempts
   * resets the run, so this isolates a genuinely stuck session from a transient retry.
   */
  countTrailingEvents(ticketId: string, type: string, limit: number): number {
    const rows = this.db
      .query("SELECT type FROM events WHERE ticket_id = ? ORDER BY id DESC LIMIT ?")
      .all(ticketId, limit);
    let n = 0;
    for (const row of rows) {
      if (!row || typeof row !== "object" || !("type" in row) || row.type !== type) break;
      n += 1;
    }
    return n;
  }

  /** Most recent event type among `types` for this ticket (null if none). */
  lastEventType(ticketId: string, types: string[]): string | null {
    const placeholders = types.map(() => "?").join(", ");
    const row = this.db
      .query(`SELECT type FROM events WHERE ticket_id = ? AND type IN (${placeholders}) ORDER BY id DESC LIMIT 1`)
      .get(ticketId, ...types);
    if (row && typeof row === "object" && "type" in row && typeof row.type === "string") return row.type;
    return null;
  }

  // ---- App settings (global, stored in the `meta` table) ----

  getAppSettings(): AppSettings {
    const stored = this.getMeta(COMMIT_LANGUAGE_META_KEY);
    const parsed = commitLanguageSchema.safeParse(stored);
    const storedTriage = this.getMeta(TRIAGE_LANGUAGE_META_KEY);
    const parsedTriage = commitLanguageSchema.safeParse(storedTriage);
    const storedImplementModel = this.getMeta(IMPLEMENT_MODEL_META_KEY);
    const parsedImplementModel = agentModelSchema.safeParse(storedImplementModel);
    const storedTriageModel = this.getMeta(TRIAGE_MODEL_META_KEY);
    const parsedTriageModel = agentModelSchema.safeParse(storedTriageModel);
    const storedImplementEffort = this.getMeta(IMPLEMENT_EFFORT_META_KEY);
    const parsedImplementEffort = agentEffortSchema.safeParse(storedImplementEffort);
    const storedTriageEffort = this.getMeta(TRIAGE_EFFORT_META_KEY);
    const parsedTriageEffort = agentEffortSchema.safeParse(storedTriageEffort);
    return {
      commitLanguage: parsed.success ? parsed.data : DEFAULT_COMMIT_LANGUAGE,
      triageLanguage: parsedTriage.success ? parsedTriage.data : DEFAULT_TRIAGE_LANGUAGE,
      implementModel: parsedImplementModel.success ? parsedImplementModel.data : DEFAULT_MODELS.implement,
      triageModel: parsedTriageModel.success ? parsedTriageModel.data : DEFAULT_MODELS.triage,
      implementEffort: parsedImplementEffort.success ? parsedImplementEffort.data : DEFAULT_MODELS.implementEffort,
      triageEffort: parsedTriageEffort.success ? parsedTriageEffort.data : DEFAULT_MODELS.triageEffort,
    };
  }

  updateAppSettings(patch: UpdateAppSettingsInput): AppSettings {
    if (patch.commitLanguage !== undefined) this.setMeta(COMMIT_LANGUAGE_META_KEY, patch.commitLanguage);
    if (patch.triageLanguage !== undefined) this.setMeta(TRIAGE_LANGUAGE_META_KEY, patch.triageLanguage);
    if (patch.implementModel !== undefined) this.setMeta(IMPLEMENT_MODEL_META_KEY, patch.implementModel);
    if (patch.triageModel !== undefined) this.setMeta(TRIAGE_MODEL_META_KEY, patch.triageModel);
    if (patch.implementEffort !== undefined) this.setMeta(IMPLEMENT_EFFORT_META_KEY, patch.implementEffort);
    if (patch.triageEffort !== undefined) this.setMeta(TRIAGE_EFFORT_META_KEY, patch.triageEffort);
    const settings = this.getAppSettings();
    applyAppSettingsToModels(settings);
    return settings;
  }

  // ---- Meta (first-boot flag) ----

  getMeta(key: string): string | null {
    const row = this.db.query("SELECT value FROM meta WHERE key = ?").get(key);
    if (row && typeof row === "object" && "value" in row && typeof row.value === "string") return row.value;
    return null;
  }

  setMeta(key: string, value: string): void {
    this.db.query("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").run(key, value);
  }
}

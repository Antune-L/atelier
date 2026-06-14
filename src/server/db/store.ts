import type { Database } from "bun:sqlite";
import { nanoid } from "nanoid";

import { AUTO_RECLAIM_EVENT } from "../../shared/constants.ts";
import type { AgentEffort, AgentModel, Column, CommentAuthor, Implementer, ReviewDepth, Stage } from "../../shared/constants.ts";
import type { Comment, Profile, Slot, Ticket, TriageStatus, TriageVerdict } from "../../shared/schemas.ts";
import type { ProjectKey } from "../config.ts";

import { mapCommentRow, mapProfileRow, mapSlotRow, mapTicketRow } from "./rows.ts";

export type SlotStatus = Slot["status"];

export interface NewTicket {
  title: string;
  description: string;
  project: ProjectKey;
  prdEnabled: boolean;
  prDraft: boolean;
  autoMerge: boolean;
  baseBranch: string | null;
  model: AgentModel | null;
  effort: AgentEffort | null;
  implementer: Implementer;
}

export interface NewProfile {
  name: string;
  model: AgentModel;
  effort: AgentEffort;
  implementer: Implementer;
}

export interface ProfilePatch {
  name?: string;
  model?: AgentModel;
  effort?: AgentEffort;
  implementer?: Implementer;
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
}

export interface TicketPatch {
  title?: string;
  description?: string;
  prdEnabled?: boolean;
  prDraft?: boolean;
  autoMerge?: boolean;
  baseBranch?: string | null;
  prdMarkdown?: string | null;
  column?: Column;
  stage?: Stage | null;
  model?: AgentModel | null;
  effort?: AgentEffort | null;
  implementer?: Implementer;
  reviewRounds?: number;
  nudgeCount?: number;
  sessionId?: string | null;
  slotId?: number | null;
  branch?: string | null;
  prUrl?: string | null;
  error?: string | null;
  archived?: boolean;
  watchdogFlagged?: boolean;
  lastProgressAt?: number;
  triageStatus?: TriageStatus;
  triageVerdict?: TriageVerdict | null;
  triageReport?: string | null;
  finishedAt?: number | null;
}

const COLUMN_TO_DB = "column_name";

export class Store {
  constructor(private readonly db: Database) {}

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

  createTicket(input: NewTicket): Ticket {
    const id = nanoid(10);
    const now = Date.now();
    this.db
      .query(
        `INSERT INTO tickets (id, title, description, project, prd_enabled, pr_draft, auto_merge, base_branch, model, effort, implementer, column_name, stage, created_at, updated_at, last_progress_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'todo', NULL, ?, ?, ?)`,
      )
      .run(
        id,
        input.title,
        input.description,
        input.project,
        input.prdEnabled ? 1 : 0,
        input.prDraft ? 1 : 0,
        input.autoMerge ? 1 : 0,
        input.baseBranch,
        input.model,
        input.effort,
        input.implementer,
        now,
        now,
        now,
      );
    const ticket = this.getTicket(id);
    if (!ticket) throw new Error("createTicket: ticket vanished after insert");
    this.logEvent(id, "created", { title: input.title });
    return ticket;
  }

  /** Create a review ticket: straight into "À implémenter", carrying the target PR + argus knobs. */
  createReview(input: NewReview): Ticket {
    const id = nanoid(10);
    const now = Date.now();
    this.db
      .query(
        `INSERT INTO tickets (id, title, description, project, kind, review_depth, pr_number, pr_head_branch, post_comments, pr_url, column_name, stage, implementing_started_at, created_at, updated_at, last_progress_at)
         VALUES (?, ?, ?, ?, 'review', ?, ?, ?, ?, ?, 'implementing', 'queued', ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.title,
        input.description,
        input.project,
        input.reviewDepth,
        input.prNumber,
        input.prHeadBranch,
        input.postComments ? 1 : 0,
        input.prUrl,
        now,
        now,
        now,
        now,
      );
    const ticket = this.getTicket(id);
    if (!ticket) throw new Error("createReview: ticket vanished after insert");
    this.logEvent(id, "created", { title: input.title, kind: "review", prNumber: input.prNumber });
    return ticket;
  }

  updateTicket(id: string, patch: TicketPatch): Ticket {
    const fields: string[] = [];
    const values: (string | number | null)[] = [];
    const set = (col: string, value: string | number | null): void => {
      fields.push(`${col} = ?`);
      values.push(value);
    };

    if (patch.title !== undefined) set("title", patch.title);
    if (patch.description !== undefined) set("description", patch.description);
    if (patch.prdEnabled !== undefined) set("prd_enabled", patch.prdEnabled ? 1 : 0);
    if (patch.prDraft !== undefined) set("pr_draft", patch.prDraft ? 1 : 0);
    if (patch.autoMerge !== undefined) set("auto_merge", patch.autoMerge ? 1 : 0);
    if (patch.baseBranch !== undefined) set("base_branch", patch.baseBranch);
    if (patch.prdMarkdown !== undefined) set("prd_markdown", patch.prdMarkdown);
    if (patch.column !== undefined) {
      set(COLUMN_TO_DB, patch.column);
      // Stamp the entry into "À implémenter" (re-stamped on each re-entry) so the card's
      // elapsed timer counts from when work started, not from ticket creation.
      if (patch.column === "implementing" && this.getTicket(id)?.column !== "implementing") {
        set("implementing_started_at", Date.now());
      }
    }
    if (patch.stage !== undefined) set("stage", patch.stage);
    if (patch.model !== undefined) set("model", patch.model);
    if (patch.effort !== undefined) set("effort", patch.effort);
    if (patch.implementer !== undefined) set("implementer", patch.implementer);
    if (patch.reviewRounds !== undefined) set("review_rounds", patch.reviewRounds);
    if (patch.nudgeCount !== undefined) set("nudge_count", patch.nudgeCount);
    if (patch.sessionId !== undefined) set("session_id", patch.sessionId);
    if (patch.slotId !== undefined) set("slot_id", patch.slotId);
    if (patch.branch !== undefined) set("branch", patch.branch);
    if (patch.prUrl !== undefined) set("pr_url", patch.prUrl);
    if (patch.error !== undefined) set("error", patch.error);
    if (patch.archived !== undefined) set("archived", patch.archived ? 1 : 0);
    if (patch.watchdogFlagged !== undefined) set("watchdog_flagged", patch.watchdogFlagged ? 1 : 0);
    if (patch.lastProgressAt !== undefined) set("last_progress_at", patch.lastProgressAt);
    if (patch.triageStatus !== undefined) set("triage_status", patch.triageStatus);
    if (patch.triageVerdict !== undefined) set("triage_verdict", patch.triageVerdict);
    if (patch.triageReport !== undefined) set("triage_report", patch.triageReport);
    if (patch.finishedAt !== undefined) set("finished_at", patch.finishedAt);

    set("updated_at", Date.now());
    this.db.query(`UPDATE tickets SET ${fields.join(", ")} WHERE id = ?`).run(...values, id);

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
        "INSERT INTO profiles (id, name, model, effort, implementer, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .run(id, input.name, input.model, input.effort, input.implementer, nextOrder, now, now);
    const profile = this.getProfile(id);
    if (!profile) throw new Error("createProfile: profil introuvable après insertion");
    return profile;
  }

  updateProfile(id: string, patch: ProfilePatch): Profile {
    const fields: string[] = [];
    const values: (string | number)[] = [];
    const set = (col: string, value: string | number): void => {
      fields.push(`${col} = ?`);
      values.push(value);
    };
    if (patch.name !== undefined) set("name", patch.name);
    if (patch.model !== undefined) set("model", patch.model);
    if (patch.effort !== undefined) set("effort", patch.effort);
    if (patch.implementer !== undefined) set("implementer", patch.implementer);
    if (patch.sortOrder !== undefined) set("sort_order", patch.sortOrder);
    set("updated_at", Date.now());
    this.db.query(`UPDATE profiles SET ${fields.join(", ")} WHERE id = ?`).run(...values, id);
    const profile = this.getProfile(id);
    if (!profile) throw new Error(`updateProfile: profil ${id} introuvable`);
    return profile;
  }

  deleteProfile(id: string): void {
    this.db.query("DELETE FROM profiles WHERE id = ?").run(id);
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
    const fields: string[] = [];
    const values: (string | number | null)[] = [];
    if (patch.ticketId !== undefined) {
      fields.push("ticket_id = ?");
      values.push(patch.ticketId);
    }
    if (patch.repoPath !== undefined) {
      fields.push("repo_path = ?");
      values.push(patch.repoPath);
    }
    if (patch.tmuxSession !== undefined) {
      fields.push("tmux_session = ?");
      values.push(patch.tmuxSession);
    }
    if (patch.status !== undefined) {
      fields.push("status = ?");
      values.push(patch.status);
    }
    this.db.query(`UPDATE slots SET ${fields.join(", ")} WHERE id = ?`).run(...values, id);
    const slot = this.getSlot(id);
    if (!slot) throw new Error(`updateSlot: slot ${id} not found`);
    return slot;
  }

  // ---- Events (audit log) ----

  logEvent(ticketId: string | null, type: string, payload: unknown): void {
    this.db
      .query("INSERT INTO events (ticket_id, type, payload, created_at) VALUES (?, ?, ?, ?)")
      .run(ticketId, type, JSON.stringify(payload ?? null), Date.now());
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

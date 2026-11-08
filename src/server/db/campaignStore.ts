import type { Database } from "bun:sqlite";
import { nanoid } from "nanoid";
import { z } from "zod";

import {
  CAMPAIGN_CARD_STATES,
  CAMPAIGN_EVENTS_PAGE_SIZE,
  CAMPAIGN_OPERATION_STATUSES,
  CAMPAIGN_STATUSES,
  EXECUTING_CAMPAIGN_STATUSES,
  campaignPlanSchema,
  campaignRepairSchema,
  campaignReportSchema,
  campaignRuntimeSchema,
  campaignSkillFingerprintSchema,
} from "../../shared/campaign.ts";
import type {
  Campaign,
  CampaignCard,
  CampaignCardState,
  CampaignEvent,
  CampaignOperation,
  CampaignOperationStatus,
  CampaignPlan,
  CampaignRepair,
  CampaignReport,
  CampaignRuntime,
  CampaignSkillFingerprint,
  CampaignStatus,
  CampaignVersion,
} from "../../shared/campaign.ts";
import { safeJsonParse } from "../system/boundedCommand.ts";

const CAMPAIGN_ID_LENGTH = 10;

type ColumnValue = string | number | null;

function parseJson(raw: string | null): unknown {
  return raw === null ? null : safeJsonParse(raw);
}

function setClause(columns: Record<string, ColumnValue | undefined>, now: number): { sql: string; values: ColumnValue[] } {
  const assigned: Record<string, ColumnValue | undefined> = { ...columns, updated_at: now };
  const entries = Object.entries(assigned).filter((entry): entry is [string, ColumnValue] => entry[1] !== undefined);
  return { sql: entries.map(([column]) => `${column} = ?`).join(", "), values: entries.map(([, value]) => value) };
}

const campaignRowSchema = z.object({
  id: z.string(),
  project: z.string(),
  title: z.string(),
  status: z.enum(CAMPAIGN_STATUSES),
  current_version: z.number().int(),
  approved_version: z.number().int().nullable(),
  approved_at: z.number().nullable(),
  mother_branch: z.string().nullable(),
  base_branch: z.string().nullable(),
  final_ticket_id: z.string().nullable(),
  runtime_json: z.string(),
  report_json: z.string().nullable(),
  created_at: z.number(),
  updated_at: z.number(),
});

const versionRowSchema = z.object({
  campaign_id: z.string(),
  version: z.number().int(),
  plan_json: z.string(),
  reason: z.string(),
  skills_json: z.string().nullable(),
  created_at: z.number(),
});

const cardRowSchema = z.object({
  campaign_id: z.string(),
  card_id: z.string(),
  ticket_id: z.string().nullable(),
  state: z.enum(CAMPAIGN_CARD_STATES),
  plan_version: z.number().int(),
  pr_url: z.string().nullable(),
  merge_sha: z.string().nullable(),
  tokens_used: z.number().int(),
  repairs_json: z.string(),
  blocked_reason: z.string().nullable(),
  updated_at: z.number(),
});

const operationRowSchema = z.object({
  id: z.string(),
  campaign_id: z.string(),
  kind: z.string(),
  status: z.enum(CAMPAIGN_OPERATION_STATUSES),
  payload_json: z.string(),
  result_json: z.string().nullable(),
  created_at: z.number(),
  updated_at: z.number(),
});

const eventRowSchema = z.object({
  seq: z.number().int(),
  campaign_id: z.string(),
  type: z.string(),
  payload_json: z.string(),
  created_at: z.number(),
});

const commandRowSchema = z.object({
  request_id: z.string(),
  command: z.string(),
  campaign_id: z.string().nullable(),
  result_json: z.string(),
});

function mapCampaign(raw: unknown): Campaign {
  const row = campaignRowSchema.parse(raw);
  const report = campaignReportSchema.safeParse(parseJson(row.report_json));
  return {
    id: row.id,
    project: row.project,
    title: row.title,
    status: row.status,
    currentVersion: row.current_version,
    approvedVersion: row.approved_version,
    approvedAt: row.approved_at,
    motherBranch: row.mother_branch,
    baseBranch: row.base_branch,
    finalTicketId: row.final_ticket_id,
    runtime: campaignRuntimeSchema.parse(parseJson(row.runtime_json) ?? {}),
    report: report.success ? report.data : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapVersion(raw: unknown): CampaignVersion {
  const row = versionRowSchema.parse(raw);
  const skills = z.array(campaignSkillFingerprintSchema).nullable().safeParse(parseJson(row.skills_json));
  return {
    campaignId: row.campaign_id,
    version: row.version,
    plan: campaignPlanSchema.parse(parseJson(row.plan_json)),
    reason: row.reason,
    skills: skills.success ? skills.data : null,
    createdAt: row.created_at,
  };
}

function mapCard(raw: unknown): CampaignCard {
  const row = cardRowSchema.parse(raw);
  return {
    campaignId: row.campaign_id,
    cardId: row.card_id,
    ticketId: row.ticket_id,
    state: row.state,
    planVersion: row.plan_version,
    prUrl: row.pr_url,
    mergeSha: row.merge_sha,
    tokensUsed: row.tokens_used,
    repairs: z.array(campaignRepairSchema).catch([]).parse(parseJson(row.repairs_json)),
    blockedReason: row.blocked_reason,
    updatedAt: row.updated_at,
  };
}

function mapOperation(raw: unknown): CampaignOperation {
  const row = operationRowSchema.parse(raw);
  return {
    id: row.id,
    campaignId: row.campaign_id,
    kind: row.kind,
    status: row.status,
    payload: parseJson(row.payload_json),
    result: parseJson(row.result_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEvent(raw: unknown): CampaignEvent {
  const row = eventRowSchema.parse(raw);
  return { seq: row.seq, campaignId: row.campaign_id, type: row.type, payload: parseJson(row.payload_json), createdAt: row.created_at };
}

export interface CampaignPatch {
  status?: CampaignStatus;
  approvedVersion?: number;
  approvedAt?: number;
  motherBranch?: string;
  baseBranch?: string;
  finalTicketId?: string | null;
  runtime?: CampaignRuntime;
  report?: CampaignReport | null;
}

export interface CampaignCardPatch {
  ticketId?: string | null;
  state?: CampaignCardState;
  planVersion?: number;
  prUrl?: string | null;
  mergeSha?: string | null;
  tokensUsed?: number;
  repairs?: CampaignRepair[];
  blockedReason?: string | null;
}

export interface StoredCommand {
  requestId: string;
  command: string;
  campaignId: string | null;
  result: unknown;
}

/** Durable campaign state: versions, cards, operation journal, event log and idempotent commands. */
export class CampaignStore {
  constructor(
    private readonly db: Database,
    private readonly transaction: <T>(fn: () => T) => T,
  ) {}

  create(project: string, title: string, now = Date.now()): Campaign {
    const id = nanoid(CAMPAIGN_ID_LENGTH);
    this.db.query("INSERT INTO campaigns (id, project, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(id, project, title, now, now);
    return this.require(id);
  }

  get(id: string): Campaign | null {
    const raw = this.db.query("SELECT * FROM campaigns WHERE id = ?").get(id);
    return raw === null ? null : mapCampaign(raw);
  }

  require(id: string): Campaign {
    const campaign = this.get(id);
    if (!campaign) throw new Error(`campaign ${id} not found`);
    return campaign;
  }

  list(project?: string): Campaign[] {
    const rows = project === undefined
      ? this.db.query("SELECT * FROM campaigns ORDER BY created_at ASC").all()
      : this.db.query("SELECT * FROM campaigns WHERE project = ? ORDER BY created_at ASC").all(project);
    return rows.map(mapCampaign);
  }

  listExecuting(): Campaign[] {
    const placeholders = EXECUTING_CAMPAIGN_STATUSES.map(() => "?").join(", ");
    return this.db.query(`SELECT * FROM campaigns WHERE status IN (${placeholders}) ORDER BY approved_at ASC`).all(...EXECUTING_CAMPAIGN_STATUSES).map(mapCampaign);
  }

  listQueued(): Campaign[] {
    return this.db.query("SELECT * FROM campaigns WHERE status = 'queued' ORDER BY approved_at ASC").all().map(mapCampaign);
  }

  update(id: string, patch: CampaignPatch, now = Date.now()): Campaign {
    const runtimeJson = patch.runtime === undefined ? undefined : JSON.stringify(campaignRuntimeSchema.parse(patch.runtime));
    let reportJson: string | null | undefined = undefined;
    if (patch.report !== undefined) reportJson = patch.report === null ? null : JSON.stringify(campaignReportSchema.parse(patch.report));
    const { sql, values } = setClause({
      status: patch.status,
      approved_version: patch.approvedVersion,
      approved_at: patch.approvedAt,
      mother_branch: patch.motherBranch,
      base_branch: patch.baseBranch,
      final_ticket_id: patch.finalTicketId,
      runtime_json: runtimeJson,
      report_json: reportJson,
    }, now);
    this.db.query(`UPDATE campaigns SET ${sql} WHERE id = ?`).run(...values, id);
    return this.require(id);
  }

  addVersion(campaignId: string, plan: CampaignPlan, reason: string, now = Date.now()): CampaignVersion {
    return this.transaction(() => {
      const campaign = this.require(campaignId);
      const version = campaign.currentVersion + 1;
      this.db
        .query("INSERT INTO campaign_versions (campaign_id, version, plan_json, reason, created_at) VALUES (?, ?, ?, ?, ?)")
        .run(campaignId, version, JSON.stringify(plan), reason, now);
      this.db.query("UPDATE campaigns SET current_version = ?, title = ?, updated_at = ? WHERE id = ?").run(version, plan.title, now, campaignId);
      return this.requireVersion(campaignId, version);
    });
  }

  setVersionSkills(campaignId: string, version: number, skills: CampaignSkillFingerprint[]): void {
    this.db.query("UPDATE campaign_versions SET skills_json = ? WHERE campaign_id = ? AND version = ?").run(JSON.stringify(skills), campaignId, version);
  }

  getVersion(campaignId: string, version: number): CampaignVersion | null {
    const raw = this.db.query("SELECT * FROM campaign_versions WHERE campaign_id = ? AND version = ?").get(campaignId, version);
    return raw === null ? null : mapVersion(raw);
  }

  requireVersion(campaignId: string, version: number): CampaignVersion {
    const record = this.getVersion(campaignId, version);
    if (!record) throw new Error(`campaign ${campaignId} version ${version} not found`);
    return record;
  }

  listVersions(campaignId: string): CampaignVersion[] {
    return this.db.query("SELECT * FROM campaign_versions WHERE campaign_id = ? ORDER BY version ASC").all(campaignId).map(mapVersion);
  }

  upsertCard(campaignId: string, cardId: string, planVersion: number, now = Date.now()): CampaignCard {
    this.db
      .query(`INSERT INTO campaign_cards (campaign_id, card_id, plan_version, updated_at) VALUES (?, ?, ?, ?)
        ON CONFLICT(campaign_id, card_id) DO NOTHING`)
      .run(campaignId, cardId, planVersion, now);
    return this.requireCard(campaignId, cardId);
  }

  getCard(campaignId: string, cardId: string): CampaignCard | null {
    const raw = this.db.query("SELECT * FROM campaign_cards WHERE campaign_id = ? AND card_id = ?").get(campaignId, cardId);
    return raw === null ? null : mapCard(raw);
  }

  requireCard(campaignId: string, cardId: string): CampaignCard {
    const card = this.getCard(campaignId, cardId);
    if (!card) throw new Error(`campaign ${campaignId} card ${cardId} not found`);
    return card;
  }

  getCardByTicket(ticketId: string): CampaignCard | null {
    const raw = this.db.query("SELECT * FROM campaign_cards WHERE ticket_id = ?").get(ticketId);
    return raw === null ? null : mapCard(raw);
  }

  findByFinalTicket(ticketId: string): Campaign | null {
    const raw = this.db.query("SELECT * FROM campaigns WHERE final_ticket_id = ?").get(ticketId);
    return raw === null ? null : mapCampaign(raw);
  }

  listCards(campaignId: string): CampaignCard[] {
    return this.db.query("SELECT * FROM campaign_cards WHERE campaign_id = ? ORDER BY rowid ASC").all(campaignId).map(mapCard);
  }

  updateCard(campaignId: string, cardId: string, patch: CampaignCardPatch, now = Date.now()): CampaignCard {
    const { sql, values } = setClause({
      ticket_id: patch.ticketId,
      state: patch.state,
      plan_version: patch.planVersion,
      pr_url: patch.prUrl,
      merge_sha: patch.mergeSha,
      tokens_used: patch.tokensUsed,
      repairs_json: patch.repairs === undefined ? undefined : JSON.stringify(patch.repairs),
      blocked_reason: patch.blockedReason,
    }, now);
    this.db.query(`UPDATE campaign_cards SET ${sql} WHERE campaign_id = ? AND card_id = ?`).run(...values, campaignId, cardId);
    return this.requireCard(campaignId, cardId);
  }

  /** Journal an operation before emitting it; returns the existing entry when the id was already recorded. */
  beginOperation(campaignId: string, id: string, kind: string, payload: unknown, now = Date.now()): { operation: CampaignOperation; created: boolean } {
    return this.transaction(() => {
      const existing = this.getOperation(id);
      if (existing) return { operation: existing, created: false };
      this.db
        .query("INSERT INTO campaign_operations (id, campaign_id, kind, payload_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
        .run(id, campaignId, kind, JSON.stringify(payload ?? {}), now, now);
      const operation = this.getOperation(id);
      if (!operation) throw new Error(`campaign operation ${id} was not recorded`);
      return { operation, created: true };
    });
  }

  completeOperation(id: string, status: Exclude<CampaignOperationStatus, "intent">, result: unknown, now = Date.now()): CampaignOperation {
    this.db.query("UPDATE campaign_operations SET status = ?, result_json = ?, updated_at = ? WHERE id = ?").run(status, JSON.stringify(result ?? null), now, id);
    const operation = this.getOperation(id);
    if (!operation) throw new Error(`campaign operation ${id} not found`);
    return operation;
  }

  getOperation(id: string): CampaignOperation | null {
    const raw = this.db.query("SELECT * FROM campaign_operations WHERE id = ?").get(id);
    return raw === null ? null : mapOperation(raw);
  }

  listOperations(campaignId: string, status?: CampaignOperationStatus): CampaignOperation[] {
    const rows = status === undefined
      ? this.db.query("SELECT * FROM campaign_operations WHERE campaign_id = ? ORDER BY created_at ASC, rowid ASC").all(campaignId)
      : this.db.query("SELECT * FROM campaign_operations WHERE campaign_id = ? AND status = ? ORDER BY created_at ASC, rowid ASC").all(campaignId, status);
    return rows.map(mapOperation);
  }

  appendEvent(campaignId: string, type: string, payload: unknown = {}, now = Date.now()): CampaignEvent {
    const result = this.db
      .query("INSERT INTO campaign_events (campaign_id, type, payload_json, created_at) VALUES (?, ?, ?, ?) RETURNING *")
      .get(campaignId, type, JSON.stringify(payload ?? {}), now);
    return mapEvent(result);
  }

  listEvents(campaignId: string, afterSeq = 0, limit = CAMPAIGN_EVENTS_PAGE_SIZE): CampaignEvent[] {
    return this.db
      .query("SELECT * FROM campaign_events WHERE campaign_id = ? AND seq > ? ORDER BY seq ASC LIMIT ?")
      .all(campaignId, afterSeq, limit)
      .map(mapEvent);
  }

  getCommand(requestId: string): StoredCommand | null {
    const raw = this.db.query("SELECT request_id, command, campaign_id, result_json FROM campaign_commands WHERE request_id = ?").get(requestId);
    if (raw === null) return null;
    const row = commandRowSchema.parse(raw);
    return { requestId: row.request_id, command: row.command, campaignId: row.campaign_id, result: parseJson(row.result_json) };
  }

  saveCommand(requestId: string, command: string, campaignId: string | null, result: unknown, now = Date.now()): void {
    this.db
      .query("INSERT OR IGNORE INTO campaign_commands (request_id, command, campaign_id, result_json, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(requestId, command, campaignId, JSON.stringify(result), now);
  }

  runInTransaction<T>(fn: () => T): T {
    return this.transaction(fn);
  }
}

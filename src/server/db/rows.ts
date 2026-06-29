import { z } from "zod";

import type { Comment, Profile, Slot, Ticket, WorktreeSession } from "../../shared/schemas.ts";
import {
  agentEffortSchema,
  agentModelSchema,
  columnSchema,
  implementerSchema,
  kindSchema,
  reformulateStatusSchema,
  reviewDepthSchema,
  sessionUsageSchema,
  stageSchema,
  triageStatusSchema,
  triageVerdictSchema,
} from "../../shared/schemas.ts";
import type { ProjectConfig } from "../config.ts";
import { isProjectKey } from "../config.ts";

/**
 * SQLite returns `unknown`-shaped rows. We validate them with zod (no casting)
 * so the DB boundary is type-safe like every other input boundary.
 */

const ticketRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  external_url: z.string().nullable(),
  project: z.string(),
  kind: z.string(),
  review_depth: z.string().nullable(),
  pr_number: z.number().nullable(),
  pr_head_branch: z.string().nullable(),
  post_comments: z.number(),
  fix_comments: z.number(),
  prd_enabled: z.number(),
  pr_draft: z.number(),
  auto_merge: z.number(),
  add_screenshots: z.number(),
  verify_feature: z.number(),
  argus_multi_loop: z.number(),
  research_plan: z.number(),
  stealth: z.number(),
  direct_push: z.number(),
  base_branch: z.string().nullable(),
  depends_on: z.string().nullable(),
  prd_markdown: z.string().nullable(),
  agent_summary: z.string().nullable(),
  column_name: z.string(),
  stage: z.string().nullable(),
  model: z.string().nullable(),
  effort: z.string().nullable(),
  implementer_model: z.string().nullable(),
  implementer_effort: z.string().nullable(),
  implementer: z.string(),
  review_rounds: z.number(),
  nudge_count: z.number(),
  session_id: z.string().nullable(),
  slot_id: z.number().nullable(),
  branch: z.string().nullable(),
  pr_url: z.string().nullable(),
  resolving_conflicts: z.number(),
  testing: z.number(),
  error: z.string().nullable(),
  archived: z.number(),
  watchdog_flagged: z.number(),
  last_progress_at: z.number(),
  triage_status: z.string(),
  triage_verdict: z.string().nullable(),
  triage_report: z.string().nullable(),
  reformulate_status: z.string(),
  reformulation: z.string().nullable(),
  feasibility_context: z.number(),
  session_usage: z.string().nullable(),
  finished_at: z.number().nullable(),
  implementing_started_at: z.number().nullable(),
  implementation_started_at: z.number().nullable(),
  created_at: z.number(),
  updated_at: z.number(),
});
export type TicketRow = z.infer<typeof ticketRowSchema>;

const commentRowSchema = z.object({
  id: z.string(),
  ticket_id: z.string(),
  author: z.string(),
  body: z.string(),
  question_id: z.string().nullable(),
  answered: z.number(),
  created_at: z.number(),
});
export type CommentRow = z.infer<typeof commentRowSchema>;

const profileRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  model: z.string(),
  effort: z.string(),
  implementer_model: z.string(),
  implementer_effort: z.string(),
  implementer: z.string(),
  sort_order: z.number(),
  created_at: z.number(),
  updated_at: z.number(),
});
export type ProfileRow = z.infer<typeof profileRowSchema>;

const projectRowSchema = z.object({
  key: z.string(),
  label: z.string(),
  repo_path: z.string(),
  base_branch: z.string(),
  commit_timeout_ms: z.number(),
  default_auto_merge: z.number(),
  default_add_screenshots: z.number(),
  color: z.string().nullable(),
  instructions: z.string().nullable(),
  worktree_script: z.string().nullable(),
  run_script: z.string().nullable(),
  worktree_teardown_script: z.string().nullable(),
  scripts_typecheck: z.string().nullable(),
  scripts_lint: z.string().nullable(),
  scripts_test: z.string().nullable(),
  worktree_ports: z.string().nullable(),
  sort_order: z.number(),
  created_at: z.number(),
  updated_at: z.number(),
});
export type ProjectRow = z.infer<typeof projectRowSchema>;

const worktreePortsSchema = z.array(z.object({ label: z.string().min(1), base: z.number().int().positive() }));

const slotRowSchema = z.object({
  id: z.number(),
  ticket_id: z.string().nullable(),
  repo_path: z.string().nullable(),
  tmux_session: z.string().nullable(),
  status: z.string(),
});
export type SlotRow = z.infer<typeof slotRowSchema>;

const worktreeSessionRowSchema = z.object({
  slot_id: z.number(),
  project: z.string(),
  branch: z.string(),
  base_branch: z.string(),
  session_name: z.string(),
  created_at: z.number(),
});
export type WorktreeSessionRow = z.infer<typeof worktreeSessionRowSchema>;

const ticketColumnSchema = columnSchema;
const ticketStageSchema = stageSchema.nullable();
const projectSchema = z.string().refine(isProjectKey, { message: "projet inconnu" });
const slotStatusSchema = z.enum(["free", "busy", "stalled", "interrupted", "failed"]);

/** Parse the JSON session_usage column; malformed or absent → empty (no usage recorded yet). */
function parseSessionUsage(raw: string | null): Ticket["sessionUsage"] {
  if (raw === null) return {};
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return {};
  }
  const parsed = sessionUsageSchema.safeParse(json);
  return parsed.success ? parsed.data : {};
}

export function mapTicketRow(raw: unknown, pendingQuestions: number): Ticket {
  const row = ticketRowSchema.parse(raw);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    externalUrl: row.external_url,
    project: projectSchema.parse(row.project),
    kind: kindSchema.parse(row.kind),
    reviewDepth: row.review_depth === null ? null : reviewDepthSchema.parse(row.review_depth),
    prNumber: row.pr_number,
    prHeadBranch: row.pr_head_branch,
    postComments: row.post_comments === 1,
    fixComments: row.fix_comments === 1,
    prdEnabled: row.prd_enabled === 1,
    prDraft: row.pr_draft === 1,
    autoMerge: row.auto_merge === 1,
    addScreenshots: row.add_screenshots === 1,
    verifyFeature: row.verify_feature === 1,
    argusMultiLoop: row.argus_multi_loop === 1,
    researchPlan: row.research_plan === 1,
    stealth: row.stealth === 1,
    directPush: row.direct_push === 1,
    baseBranch: row.base_branch,
    dependsOn: row.depends_on,
    prdMarkdown: row.prd_markdown,
    agentSummary: row.agent_summary,
    column: ticketColumnSchema.parse(row.column_name),
    stage: ticketStageSchema.parse(row.stage),
    model: row.model === null ? null : agentModelSchema.parse(row.model),
    effort: row.effort === null ? null : agentEffortSchema.parse(row.effort),
    implementerModel: row.implementer_model === null ? null : agentModelSchema.parse(row.implementer_model),
    implementerEffort: row.implementer_effort === null ? null : agentEffortSchema.parse(row.implementer_effort),
    implementer: implementerSchema.parse(row.implementer),
    reviewRounds: row.review_rounds,
    sessionId: row.session_id,
    slotId: row.slot_id,
    branch: row.branch,
    prUrl: row.pr_url,
    resolvingConflicts: row.resolving_conflicts === 1,
    testing: row.testing === 1,
    error: row.error,
    archived: row.archived === 1,
    watchdogFlagged: row.watchdog_flagged === 1,
    pendingQuestions,
    triageStatus: triageStatusSchema.parse(row.triage_status),
    triageVerdict: row.triage_verdict === null ? null : triageVerdictSchema.parse(row.triage_verdict),
    triageReport: row.triage_report,
    reformulateStatus: reformulateStatusSchema.parse(row.reformulate_status),
    reformulation: row.reformulation,
    feasibilityContext: row.feasibility_context === 1,
    sessionUsage: parseSessionUsage(row.session_usage),
    finishedAt: row.finished_at,
    implementingStartedAt: row.implementing_started_at,
    implementationStartedAt: row.implementation_started_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCommentRow(raw: unknown): Comment {
  const row = commentRowSchema.parse(raw);
  const authorSchema = z.enum(["user", "agent", "system"]);
  return {
    id: row.id,
    ticketId: row.ticket_id,
    author: authorSchema.parse(row.author),
    body: row.body,
    questionId: row.question_id,
    answered: row.answered === 1,
    createdAt: row.created_at,
  };
}

export function mapProfileRow(raw: unknown): Profile {
  const row = profileRowSchema.parse(raw);
  return {
    id: row.id,
    name: row.name,
    model: agentModelSchema.parse(row.model),
    effort: agentEffortSchema.parse(row.effort),
    implementerModel: agentModelSchema.parse(row.implementer_model),
    implementerEffort: agentEffortSchema.parse(row.implementer_effort),
    implementer: implementerSchema.parse(row.implementer),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Parse the JSON worktree_ports column; null/malformed/invalid → undefined. */
function parseWorktreePorts(raw: string | null): ProjectConfig["worktreePorts"] {
  if (raw === null) return undefined;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return undefined;
  }
  const parsed = worktreePortsSchema.safeParse(json);
  return parsed.success ? parsed.data : undefined;
}

/** Rebuild the optional scripts overrides from the three flat columns; all null → undefined. */
function buildScripts(row: ProjectRow): ProjectConfig["scripts"] {
  if (row.scripts_typecheck === null && row.scripts_lint === null && row.scripts_test === null) return undefined;
  const scripts: NonNullable<ProjectConfig["scripts"]> = {};
  if (row.scripts_typecheck !== null) scripts.typecheck = row.scripts_typecheck;
  if (row.scripts_lint !== null) scripts.lint = row.scripts_lint;
  if (row.scripts_test !== null) scripts.test = row.scripts_test;
  return scripts;
}

export function mapProjectRow(raw: unknown): ProjectConfig {
  const row = projectRowSchema.parse(raw);
  const project: ProjectConfig = {
    label: row.label,
    repoPath: row.repo_path,
    baseBranch: row.base_branch,
    defaultAutoMerge: row.default_auto_merge === 1,
    defaultAddScreenshots: row.default_add_screenshots === 1,
    commitTimeoutMs: row.commit_timeout_ms,
  };
  const scripts = buildScripts(row);
  if (scripts !== undefined) project.scripts = scripts;
  if (row.worktree_script !== null) project.worktreeScript = row.worktree_script;
  if (row.run_script !== null) project.runScript = row.run_script;
  if (row.worktree_teardown_script !== null) project.worktreeTeardownScript = row.worktree_teardown_script;
  if (row.instructions !== null) project.instructions = row.instructions;
  if (row.color !== null) project.color = row.color;
  const worktreePorts = parseWorktreePorts(row.worktree_ports);
  if (worktreePorts !== undefined) project.worktreePorts = worktreePorts;
  return project;
}

export function mapSlotRow(raw: unknown): Slot {
  const row = slotRowSchema.parse(raw);
  return {
    id: row.id,
    ticketId: row.ticket_id,
    repoPath: row.repo_path,
    tmuxSession: row.tmux_session,
    status: slotStatusSchema.parse(row.status),
  };
}

export function mapWorktreeSessionRow(raw: unknown): WorktreeSession {
  const row = worktreeSessionRowSchema.parse(raw);
  return {
    slotId: row.slot_id,
    project: projectSchema.parse(row.project),
    branch: row.branch,
    baseBranch: row.base_branch,
    sessionName: row.session_name,
    createdAt: row.created_at,
    addresses: [],
  };
}

import { z } from "zod";

import {
  AUDIT_BOOTSTRAP_HOURS,
  AUDIT_CRITICAL_RECHECK_SESSIONS,
  AUDIT_LENSES,
  AUDIT_MAX_CHUNK_CHARS,
  AUDIT_MAX_CHUNKS_PER_RUN,
  AUDIT_MAX_EVIDENCE_CHARS,
  AUDIT_MAX_PARALLEL_SESSIONS,
  AUDIT_MAX_UNIT_DIFF_CHARS,
  AUDIT_SECOND_VERIFIER_SESSIONS,
  AUDIT_SESSIONS_PER_CHUNK,
  auditAgentFindingSchema,
  auditAnalysisOutputSchema,
  auditVerificationOutputSchema,
  stripHtmlComments,
} from "../../../shared/audit.ts";
import type {
  AuditAgentFinding,
  AuditAnalysisOutput,
  AuditChunkCoverage,
  AuditCitationCheck,
  AuditFinding,
  AuditLens,
  AuditProvider,
  AuditReviewState,
  AuditRunProgress,
  AuditSeverity,
  AuditVerdictRecord,
  AuditVerificationOutput,
} from "../../../shared/audit.ts";
import { getErrorMessage } from "../../../shared/errors.ts";
import type { ProjectConfig } from "../../config.ts";
import type { Store } from "../../db/store.ts";
import type { AgentTurnUsage } from "../../system/agentSession.ts";
import type { AuditRange, AuditRangeChunk } from "../../system/auditRange.ts";
import { redactSecrets } from "../../system/secretRedaction.ts";
import type { SystemAdapter } from "../../system/types.ts";

import { mergeAgentUsageByModel } from "../sessionHub.ts";

import { checkAuditCitation, citationPassed, relativeAuditPath } from "./citations.ts";
import { dedupeAuditCandidates, lowerSeverity, screenKnownFindings } from "./dedupe.ts";
import { dryRunPipelineResult, dryRunReviewVerdict } from "./dryRunFixtures.ts";
import { auditFingerprint } from "./fingerprint.ts";
import { analystPrompt, auditPromptNonce, REVIEW_FINDING_PROMPT_ID, reviewPrompt, verifierPrompt } from "./prompts.ts";
import type { AuditPromptContext } from "./prompts.ts";
import { runAuditSession } from "./session.ts";
import type { AuditSessionRelease, AuditSessionResult } from "./session.ts";

export interface AuditExecution {
  provider: AuditProvider;
  model: string;
  effort: string | null;
  serviceTier?: "default" | "fast";
}

export interface AuditEngineDeps {
  system: SystemAdapter;
  store: Pick<Store, "startExecution" | "finalizeExecution">;
  now(): number;
  acquireSession(signal: AbortSignal): Promise<AuditSessionRelease | null>;
}

export interface AuditKnownFinding {
  id: string;
  fingerprint: string;
  file: string;
  symbol: string;
  title: string;
}

export interface AuditPipelineInput {
  runId: string;
  project: ProjectConfig;
  branch: string;
  cwd: string;
  baseSha: string | null;
  execution: AuditExecution;
  knownFindings: AuditKnownFinding[];
  openFindings: AuditKnownFinding[];
  includeWarnings: boolean;
  sessionBudget: number;
  onProgress(progress: AuditRunProgress): void;
  signal: AbortSignal;
}

export interface AuditPipelineCandidate {
  finding: AuditAgentFinding;
  lens: AuditLens;
  chunkIndex: number;
  fingerprint: string;
  citation: AuditCitationCheck;
  reviewState: AuditReviewState;
  verdicts: AuditVerdictRecord[];
  duplicateOf: string | null;
}

export interface AuditPipelineResult {
  status: "completed" | "partial" | "no_changes" | "rewritten" | "failed";
  baseSha: string | null;
  tipSha: string | null;
  coveredSha: string | null;
  commitCount: number;
  deferredCommitCount: number;
  coverage: AuditChunkCoverage[];
  candidates: AuditPipelineCandidate[];
  analystSessions: number;
  verifierSessions: number;
  filteredWarningCount: number;
  usageByModel: Record<string, AgentTurnUsage>;
  costUsd: number | null;
  error: string | null;
}

export interface AuditReviewInput {
  runId: string;
  finding: AuditFinding;
  project: ProjectConfig;
  cwd: string;
  revision: string;
  execution: AuditExecution;
  mode: "recheck" | "arbiter";
  signal: AbortSignal;
}

type VerifierRole = Extract<AuditVerdictRecord["role"], "verifier" | "second_verifier">;

interface WorkingCandidate {
  id: string;
  finding: AuditAgentFinding;
  lens: AuditLens;
  chunkIndex: number;
  fingerprint: string;
  citation: AuditCitationCheck;
  citationPassed: boolean;
  duplicateOf: string | null;
  verdicts: AuditVerdictRecord[];
}

interface AnalystRun {
  chunk: AuditRangeChunk;
  lens: AuditLens;
  result: AuditSessionResult<AuditAnalysisOutput>;
}

interface VerifierBatch {
  role: VerifierRole;
  label: string;
  candidates: WorkingCandidate[];
  chunks: AuditRangeChunk[];
}

const ANALYSIS_JSON_SCHEMA = z.toJSONSchema(auditAnalysisOutputSchema, { target: "draft-07" });
const VERIFICATION_JSON_SCHEMA = z.toJSONSchema(auditVerificationOutputSchema, { target: "draft-07" });
const CANDIDATE_ID_PREFIX = "c";
const PULL_REQUEST_PATH = "pull";
const GITHUB_PROVIDER = "github";
const SECOND_VERIFIER_LABEL = "second-verifier";
const VERIFIER_LABEL_PREFIX = "verifier-";
const EXECUTION_ROLES = {
  analyst: "audit_analyst",
  verifier: "audit_verifier",
  second_verifier: "audit_second_verifier",
  recheck: "audit_recheck",
  arbiter: "audit_arbiter",
} as const;
const INTERRUPTED_ERROR = "Audit interrompu avant la fin.";
const BUDGET_ERROR = "Budget de sessions insuffisant pour analyser un lot de commits.";
const UNVERIFIED_ERROR = "Vérification adversariale incomplète : l'audit reprendra au premier lot non vérifié.";
const EMPTY_REASON = "(raison vide)";

async function runPool<T>(tasks: ReadonlyArray<() => Promise<T>>, limit: number, signal: AbortSignal): Promise<Array<T | null>> {
  const results: Array<T | null> = tasks.map(() => null);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (!signal.aborted) {
      const index = next;
      next += 1;
      const task = tasks[index];
      if (task === undefined) return;
      results[index] = await task();
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

function costOf(usageByModel: Record<string, AgentTurnUsage>): number | null {
  const costs = Object.values(usageByModel).flatMap((usage) => usage.costUsd === null ? [] : [usage.costUsd]);
  return costs.length === 0 ? null : costs.reduce((sum, cost) => sum + cost, 0);
}

function cleanText(value: string): string {
  return redactSecrets(stripHtmlComments(value));
}

function sanitizeFinding(finding: AuditAgentFinding): AuditAgentFinding | null {
  const parsed = auditAgentFindingSchema.safeParse({
    ...finding,
    title: cleanText(finding.title),
    file: stripHtmlComments(finding.file),
    symbol: cleanText(finding.symbol),
    scenario: cleanText(finding.scenario),
    expected: cleanText(finding.expected),
    expectedSource: cleanText(finding.expectedSource),
    impact: cleanText(finding.impact),
    evidence: cleanText(finding.evidence).slice(0, AUDIT_MAX_EVIDENCE_CHARS),
    introducedBy: cleanText(finding.introducedBy),
    suggestedFix: finding.suggestedFix === null ? null : cleanText(finding.suggestedFix),
  });
  return parsed.success ? parsed.data : null;
}

function isEmptyChunk(chunk: AuditRangeChunk): boolean {
  return chunk.diff.trim().length === 0;
}

function verifierLabel(chunk: AuditRangeChunk): string {
  return `${VERIFIER_LABEL_PREFIX}${chunk.index}`;
}

async function readPrBodies(system: SystemAdapter, project: ProjectConfig, range: AuditRange, chunks: readonly AuditRangeChunk[], signal: AbortSignal): Promise<Map<number, string | null>> {
  const bodies = new Map<number, string | null>();
  const repositoryUrl = range.githubRepositoryUrl;
  if (project.vcsProvider !== GITHUB_PROVIDER || repositoryUrl === null) return bodies;
  const numbers = [...new Set(chunks.flatMap((chunk) => chunk.commits.flatMap((commit) => commit.prNumber === null ? [] : [commit.prNumber])))];
  const results = await runPool(numbers.map((number) => async () => {
    try {
      return await system.readPrBody(project.repoPath, `${repositoryUrl}/${PULL_REQUEST_PATH}/${number}`, GITHUB_PROVIDER);
    } catch {
      return null;
    }
  }), AUDIT_MAX_PARALLEL_SESSIONS, signal);
  numbers.forEach((number, index) => bodies.set(number, results[index] ?? null));
  return bodies;
}

export function emptyAuditResult(status: AuditPipelineResult["status"], baseSha: string | null, tipSha: string | null, coveredSha: string | null, error: string | null = null): AuditPipelineResult {
  return {
    status,
    baseSha,
    tipSha,
    coveredSha,
    commitCount: 0,
    deferredCommitCount: 0,
    coverage: [],
    candidates: [],
    analystSessions: 0,
    verifierSessions: 0,
    filteredWarningCount: 0,
    usageByModel: {},
    costUsd: null,
    error,
  };
}

function chunkCoverage(chunk: AuditRangeChunk, runs: readonly AnalystRun[]): AuditChunkCoverage {
  const outputs = runs.flatMap((run) => run.result.output === null ? [] : [run.result.output]);
  const changed = new Set(chunk.files);
  const read = new Set(outputs.flatMap((output) => output.coverage.read).filter((path) => changed.has(path)));
  const skipped = new Map<string, string>(chunk.skipped.map((entry) => [entry.path, entry.reason]));
  for (const output of outputs) {
    const ownRead = new Set(output.coverage.read);
    for (const entry of output.coverage.skipped) {
      const globs = entry.path.split(",").map((pattern) => new Bun.Glob(pattern.trim()));
      for (const path of chunk.files) {
        if (skipped.has(path) || (read.has(path) && !ownRead.has(path))) continue;
        if (globs.some((glob) => glob.match(path))) skipped.set(path, entry.reason);
      }
    }
  }
  let status: AuditChunkCoverage["status"] = "complete";
  if (isEmptyChunk(chunk)) status = chunk.skipped.length > 0 ? "partial" : "complete";
  else if (outputs.length < AUDIT_LENSES.length) status = "failed";
  else if (skipped.size > 0) status = "partial";
  return {
    index: chunk.index,
    baseSha: chunk.baseSha,
    headSha: chunk.headSha,
    commitCount: chunk.commits.length,
    status,
    filesRead: read.size,
    skipped: [...skipped].map(([path, reason]) => ({ path, reason })),
  };
}

function coveredHead(chunks: readonly AuditRangeChunk[], settled: ReadonlySet<AuditRangeChunk>): string | null {
  let covered: string | null = null;
  for (const chunk of chunks) {
    if (!settled.has(chunk)) break;
    covered = chunk.part === null || chunk.part.index === chunk.part.total - 1 ? chunk.headSha : chunk.baseSha;
  }
  return covered;
}

function commitShas(chunks: readonly AuditRangeChunk[]): Set<string> {
  return new Set(chunks.flatMap((chunk) => chunk.commits.map((commit) => commit.sha)));
}

function chunkVerified(chunk: AuditRangeChunk, candidates: readonly WorkingCandidate[], returned: ReadonlySet<string>): boolean {
  const members = candidates.filter((candidate) => candidate.citationPassed && candidate.chunkIndex === chunk.index);
  if (members.length === 0) return true;
  if (!returned.has(verifierLabel(chunk))) return false;
  return members.every((candidate) => candidate.finding.severity !== "critical") || returned.has(SECOND_VERIFIER_LABEL);
}

function admitChunks(chunks: readonly AuditRangeChunk[], sessionBudget: number): AuditRangeChunk[] {
  let left = sessionBudget - AUDIT_SECOND_VERIFIER_SESSIONS;
  const admitted: AuditRangeChunk[] = [];
  for (const chunk of chunks) {
    const cost = isEmptyChunk(chunk) ? 0 : AUDIT_SESSIONS_PER_CHUNK;
    if (cost > 0 && cost > left) break;
    left -= cost;
    admitted.push(chunk);
  }
  return admitted;
}

async function buildCandidates(cwd: string, runs: readonly AnalystRun[]): Promise<WorkingCandidate[]> {
  const raw = runs.flatMap((run) => (run.result.output?.findings ?? []).map((finding) => ({ run, finding })));
  const built = await Promise.all(raw.map(async ({ run, finding }, index): Promise<WorkingCandidate | null> => {
    const located = { ...finding, file: relativeAuditPath(cwd, finding.file) };
    const sanitized = sanitizeFinding(located);
    if (sanitized === null) return null;
    const citation = await checkAuditCitation(cwd, located);
    return {
      id: `${CANDIDATE_ID_PREFIX}${index + 1}`,
      finding: sanitized,
      lens: run.lens,
      chunkIndex: run.chunk.index,
      fingerprint: auditFingerprint(sanitized),
      citation,
      citationPassed: citationPassed(citation),
      duplicateOf: null,
      verdicts: [],
    };
  }));
  return built.flatMap((candidate) => candidate === null ? [] : [candidate]);
}

function verdictRecord(execution: AuditExecution, role: AuditVerdictRecord["role"], verdict: AuditVerificationOutput["verdicts"][number], severity: AuditSeverity, revision: string, at: number): AuditVerdictRecord {
  return {
    role,
    provider: execution.provider,
    model: execution.model,
    verdict: verdict.verdict,
    severity: lowerSeverity(severity, verdict.severity),
    reason: cleanText(verdict.reason).trim() || EMPTY_REASON,
    revision,
    at,
  };
}

function expectedRoles(candidate: WorkingCandidate): VerifierRole[] {
  return candidate.finding.severity === "critical" ? ["verifier", "second_verifier"] : ["verifier"];
}

function reviewStateOf(candidate: WorkingCandidate): AuditReviewState {
  if (!candidate.citationPassed) return "rejected";
  const roles = new Set(candidate.verdicts.map((verdict) => verdict.role));
  if (expectedRoles(candidate).some((role) => !roles.has(role))) return "unverified";
  const confirmed = candidate.verdicts.filter((verdict) => verdict.verdict === "confirmed").length;
  if (confirmed === candidate.verdicts.length) return "confirmed";
  return confirmed === 0 ? "rejected" : "contested";
}

function finalSeverity(candidate: WorkingCandidate): AuditSeverity {
  return candidate.verdicts
    .filter((verdict) => verdict.verdict === "confirmed")
    .reduce((severity, verdict) => lowerSeverity(severity, verdict.severity), candidate.finding.severity);
}

function planVerifierBatches(candidates: readonly WorkingCandidate[], chunks: readonly AuditRangeChunk[], sessionsLeft: number): VerifierBatch[] {
  const verifiable = candidates.filter((candidate) => candidate.citationPassed);
  const batches = chunks.flatMap((chunk): VerifierBatch[] => {
    const members = verifiable.filter((candidate) => candidate.chunkIndex === chunk.index);
    return members.length === 0 ? [] : [{ role: "verifier", label: verifierLabel(chunk), candidates: members, chunks: [chunk] }];
  });
  const critical = verifiable.filter((candidate) => candidate.finding.severity === "critical");
  if (critical.length > 0) {
    const involved = new Set(critical.map((candidate) => candidate.chunkIndex));
    batches.push({ role: "second_verifier", label: SECOND_VERIFIER_LABEL, candidates: critical, chunks: chunks.filter((chunk) => involved.has(chunk.index)) });
  }
  return batches.slice(0, Math.max(0, sessionsLeft));
}

export async function runAuditPipeline(deps: AuditEngineDeps, input: AuditPipelineInput): Promise<AuditPipelineResult> {
  const { cwd, execution, signal } = input;
  input.onProgress({ phase: "preparing", done: 0, total: 0 });
  let range: AuditRange;
  try {
    range = await deps.system.collectAuditRange({
      cwd,
      baseSha: input.baseSha,
      bootstrapHours: AUDIT_BOOTSTRAP_HOURS,
      maxChunkChars: AUDIT_MAX_CHUNK_CHARS,
      maxChunks: AUDIT_MAX_CHUNKS_PER_RUN,
      maxUnitDiffChars: AUDIT_MAX_UNIT_DIFF_CHARS,
    });
  } catch (error) {
    return emptyAuditResult("failed", input.baseSha, null, null, getErrorMessage(error));
  }
  if (range.status === "rewritten") return emptyAuditResult("rewritten", range.baseSha, range.tipSha, null);
  const firstSubstantive = range.chunks.find((chunk) => !isEmptyChunk(chunk));
  if (range.status === "no_changes" || (firstSubstantive === undefined && range.deferredCommitCount === 0)) {
    return emptyAuditResult("no_changes", range.baseSha, range.tipSha, range.tipSha);
  }
  if (deps.system.dryRun && firstSubstantive !== undefined) {
    const simulated = dryRunPipelineResult(range, firstSubstantive, execution, deps.now());
    const screened = screenKnownFindings(simulated.candidates, input.knownFindings, input.includeWarnings);
    return { ...simulated, candidates: screened, filteredWarningCount: simulated.candidates.length - screened.length };
  }

  const admitted = admitChunks(range.chunks, input.sessionBudget);
  const analysed = admitted.filter((chunk) => !isEmptyChunk(chunk));
  const prBodies = await readPrBodies(deps.system, input.project, range, analysed, signal);
  const context: AuditPromptContext = { provider: execution.provider, worktree: cwd, nonce: auditPromptNonce(), prBodies };
  let usageByModel: Record<string, AgentTurnUsage> = {};

  const analysisTasks = analysed.flatMap((chunk) => AUDIT_LENSES.map((lens) => ({ chunk, lens })));
  let analysedCount = 0;
  input.onProgress({ phase: "analyzing", done: 0, total: analysisTasks.length });
  const analyses = await runPool(analysisTasks.map(({ chunk, lens }) => async (): Promise<AnalystRun> => {
    const result = await runAuditSession(deps, {
      runId: input.runId,
      label: `analyst-${chunk.index}-${lens}`,
      executionRole: EXECUTION_ROLES.analyst,
      cwd,
      execution,
      prompt: analystPrompt(context, lens, chunk, input.openFindings),
      schema: auditAnalysisOutputSchema,
      jsonSchema: ANALYSIS_JSON_SCHEMA,
      signal,
    });
    usageByModel = mergeAgentUsageByModel(usageByModel, result.usageByModel);
    analysedCount += 1;
    input.onProgress({ phase: "analyzing", done: analysedCount, total: analysisTasks.length });
    return { chunk, lens, result };
  }), AUDIT_MAX_PARALLEL_SESSIONS, signal);
  const runs = analyses.flatMap((run) => run === null ? [] : [run]);
  const attempted = admitted.filter((chunk) => isEmptyChunk(chunk) || runs.some((run) => run.chunk === chunk));
  const coverage = attempted.map((chunk) => chunkCoverage(chunk, runs.filter((run) => run.chunk === chunk)));

  input.onProgress({ phase: "checking", done: 0, total: runs.length });
  const deduped = dedupeAuditCandidates(await buildCandidates(cwd, runs));
  const candidates = screenKnownFindings(deduped, input.knownFindings, input.includeWarnings);

  const analysedChunks = attempted.filter((chunk) => !isEmptyChunk(chunk));
  const batches = signal.aborted ? [] : planVerifierBatches(candidates, analysedChunks, input.sessionBudget - runs.length);
  const returned = new Set<string>();
  let verified = 0;
  input.onProgress({ phase: "verifying", done: 0, total: batches.length });
  const verifications = await runPool(batches.map((batch) => async (): Promise<VerifierBatch> => {
    const result = await runAuditSession(deps, {
      runId: input.runId,
      label: batch.label,
      executionRole: EXECUTION_ROLES[batch.role],
      cwd,
      execution,
      prompt: verifierPrompt(context, batch.candidates, batch.chunks, batch.role === "second_verifier"),
      schema: auditVerificationOutputSchema,
      jsonSchema: VERIFICATION_JSON_SCHEMA,
      signal,
    });
    usageByModel = mergeAgentUsageByModel(usageByModel, result.usageByModel);
    if (result.output !== null) returned.add(batch.label);
    for (const candidate of batch.candidates) {
      const verdict = result.output?.verdicts.find((entry) => entry.id === candidate.id);
      if (verdict) candidate.verdicts.push(verdictRecord(execution, batch.role, verdict, candidate.finding.severity, range.tipSha, deps.now()));
    }
    verified += 1;
    input.onProgress({ phase: "verifying", done: verified, total: batches.length });
    return batch;
  }), AUDIT_MAX_PARALLEL_SESSIONS, signal);

  const failedIndexes = new Set(coverage.filter((entry) => entry.status === "failed").map((entry) => entry.index));
  const settled = new Set(attempted.filter((chunk) => !failedIndexes.has(chunk.index) && chunkVerified(chunk, candidates, returned)));
  const unverifiedCount = attempted.filter((chunk) => !failedIndexes.has(chunk.index) && !settled.has(chunk)).length;
  const attemptedCommits = commitShas(attempted);
  const deferredCommitCount = range.deferredCommitCount + [...commitShas(range.chunks)].filter((sha) => !attemptedCommits.has(sha)).length;
  const firstError = runs.find((run) => run.result.error !== null)?.result.error ?? null;
  const reported = candidates.filter((candidate) => input.includeWarnings || finalSeverity(candidate) === "critical");
  let status: AuditPipelineResult["status"] = "completed";
  let error: string | null = null;
  if (signal.aborted) {
    status = "partial";
    error = INTERRUPTED_ERROR;
  } else if (analysedChunks.length > 0 && failedIndexes.size === analysedChunks.length) {
    status = "failed";
    error = firstError;
  } else if (analysisTasks.length === 0 && admitted.length < range.chunks.length) {
    status = "partial";
    error = BUDGET_ERROR;
  } else if (failedIndexes.size > 0) {
    status = "partial";
    error = firstError;
  } else if (unverifiedCount > 0) {
    status = "partial";
    error = UNVERIFIED_ERROR;
  } else if (deferredCommitCount > 0) {
    status = "partial";
  }

  return {
    status,
    baseSha: range.baseSha,
    tipSha: range.tipSha,
    coveredSha: coveredHead(range.chunks, settled),
    commitCount: attemptedCommits.size,
    deferredCommitCount,
    coverage,
    candidates: reported.map((candidate) => ({
      finding: { ...candidate.finding, severity: finalSeverity(candidate) },
      lens: candidate.lens,
      chunkIndex: candidate.chunkIndex,
      fingerprint: candidate.fingerprint,
      citation: candidate.citation,
      reviewState: reviewStateOf(candidate),
      verdicts: candidate.verdicts,
      duplicateOf: candidate.duplicateOf,
    })),
    analystSessions: runs.length,
    verifierSessions: verifications.filter((batch) => batch !== null).length,
    filteredWarningCount: deduped.length - reported.length,
    usageByModel,
    costUsd: costOf(usageByModel),
    error,
  };
}

export function auditReviewSessionCount(finding: Pick<AuditFinding, "severity">, mode: AuditReviewInput["mode"]): number {
  return mode === "recheck" && finding.severity === "critical" ? AUDIT_CRITICAL_RECHECK_SESSIONS : 1;
}

export async function reviewAuditFinding(deps: AuditEngineDeps, input: AuditReviewInput): Promise<AuditVerdictRecord[]> {
  const { finding, execution, mode, revision } = input;
  const sessions = auditReviewSessionCount(finding, mode);
  if (deps.system.dryRun) return Array.from({ length: sessions }, () => dryRunReviewVerdict(finding, execution, mode, revision, deps.now()));
  const records: AuditVerdictRecord[] = [];
  let lastError: string | null = null;
  for (let index = 0; index < sessions && !input.signal.aborted; index += 1) {
    const result = await runAuditSession(deps, {
      runId: input.runId,
      label: `${mode}-${finding.id}-${index + 1}`,
      executionRole: EXECUTION_ROLES[mode],
      cwd: input.cwd,
      execution,
      prompt: reviewPrompt(execution.provider, input.cwd, auditPromptNonce(), finding, revision, mode),
      schema: auditVerificationOutputSchema,
      jsonSchema: VERIFICATION_JSON_SCHEMA,
      signal: input.signal,
    });
    const verdicts = result.output?.verdicts ?? [];
    const verdict = verdicts.find((entry) => entry.id === REVIEW_FINDING_PROMPT_ID) ?? (verdicts.length === 1 ? verdicts[0] : undefined);
    if (verdict === undefined) lastError = result.error ?? "aucun verdict renvoyé";
    else records.push(verdictRecord(execution, mode, verdict, finding.severity, revision, deps.now()));
  }
  if (records.length === 0) throw new Error(`Revue du constat impossible : ${lastError ?? "aucun verdict renvoyé"}`);
  return records;
}

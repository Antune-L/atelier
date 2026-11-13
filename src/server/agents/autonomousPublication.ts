import type { AutonomousState } from "../../shared/autonomous.ts";
import type { CommitLanguage } from "../../shared/constants.ts";
import type { ReviewFinding } from "../../shared/protocol.ts";
import type { TicketQuality } from "../../shared/quality.ts";
import type { Ticket } from "../../shared/schemas.ts";
import type { Store } from "../db/store.ts";
import { redactSecrets } from "../system/secretRedaction.ts";
import { PR_DESCRIPTION_TEMPLATES, renderReviewLevelLine } from "../system/vcs/prDescription.ts";

import { requiredReviewKinds } from "./reviewPass.ts";

const SECTION_TITLE = "## Autonomous partial delivery";
const PARTIAL_INTRO = "This draft preserves partial work. Acceptance is incomplete; merging is not authorized.";
export const PARTIAL_REVIEW_LEVEL = "high";
export const PARTIAL_REVIEW_REASONS: Record<CommitLanguage, string> = {
  fr: "Livraison partielle : l'acceptation est incomplète et la fusion n'est pas autorisée.",
  en: "Partial delivery: acceptance is incomplete and merging is not authorized.",
};

export interface PartialPublicationLayout {
  language: CommitLanguage;
  includeSummary: boolean;
}
const OUTPUT_EXCERPT_LIMIT = 4000;
const TECHNICAL_CHECKS = ["typecheck", "lint", "test"] satisfies Array<"typecheck" | "lint" | "test">;
const SHORT_SHA_LENGTH = 7;
const BLOCKING_SEVERITIES: ReviewFinding["severity"][] = ["critical", "major"];
const BLOCKING_VERIFICATIONS: ReviewFinding["verificationStatus"][] = ["confirmed", "not_needed"];

function outputExcerpt(output: string): string {
  const redacted = redactSecrets(output);
  if (redacted.length <= OUTPUT_EXCERPT_LIMIT) return redacted;
  const failures = redacted.split("\n").filter((line) => /fail|error|assertion|expect\(/i.test(line)).join("\n");
  if (failures) return failures.slice(0, OUTPUT_EXCERPT_LIMIT);
  return redacted.slice(-OUTPUT_EXCERPT_LIMIT);
}

export function partialPublicationMarkers(ticketId: string) {
  return { start: `<!-- kanban-partial:${ticketId}:start -->`, end: `<!-- kanban-partial:${ticketId}:end -->` };
}

function shortSha(revision: string): string {
  return revision.slice(0, SHORT_SHA_LENGTH);
}

function criterionStatus(quality: TicketQuality, state: AutonomousState, criterionId: string, revision: string): string {
  const currentRuns = quality.runs.filter((run) => run.revision === revision && !run.simulated);
  const evidence = quality.evidence.filter((entry) => entry.criterionId === criterionId && currentRuns.some((run) => run.id === entry.runId)).at(-1);
  if (!evidence) return "not verified";
  const run = currentRuns.find((entry) => entry.id === evidence.runId);
  const accepted = run?.status === "passed" && run.evidenceAccepted && run.criteriaSnapshotId === state.functionalSnapshotId
    && state.functionalSnapshotId !== null && evidence.kind === "behavior" && evidence.authority === "agent";
  if (evidence.status === "failed") return `failed: ${evidence.summary}`;
  if (evidence.status === "passed" && accepted) return "passed";
  return "not verified";
}

function checkStatus(quality: TicketQuality, check: string, configured: string | undefined, revision: string): string {
  const evidence = quality.evidence.filter((entry) => {
    const run = quality.runs.find((candidate) => candidate.id === entry.runId);
    return entry.kind === "command" && !run?.simulated && run?.revision === revision && entry.command?.toLowerCase().includes((configured ?? check).toLowerCase());
  }).at(-1);
  if (!evidence) return `${check} not run`;
  if (evidence.status === "passed") return `${check} passed`;
  return `${check} ${evidence.status} (exit ${evidence.exitCode ?? "unknown"})`;
}

export function partialPublicationSection(store: Store, ticket: Ticket, state: AutonomousState, revision: string, reason: string, layout: PartialPublicationLayout): string {
  const execution = state.execution;
  if (!execution) throw new Error("Bounded autonomous execution is required for partial publication.");
  const quality = store.getTicketQuality(ticket.id);
  const template = PR_DESCRIPTION_TEMPLATES[layout.language];
  const review = store.getReviewPass(ticket.id);
  const reviewCurrent = review?.reviewedCommitSha === revision;
  const plan = store.getImplementationPlan(ticket.id);
  const lots = plan?.lots ?? store.listImplementationLotStates(ticket.id);
  const project = store.getProjectRow(ticket.project);
  const intro = `**${PARTIAL_INTRO}** Candidate \`${shortSha(revision)}\`. Stopped because: ${reason}`;
  const unfinishedLots = lots.filter((lot) => lot.status !== "completed");
  const changes = unfinishedLots.length === 0
    ? `All ${lots.length} implementation lot(s) completed.`
    : unfinishedLots.map((lot) => `- ${lot.label}: ${lot.status}, not confirmed integrated.`).join("\n");
  const lines = layout.includeSummary
    ? [renderReviewLevelLine(layout.language, PARTIAL_REVIEW_LEVEL, PARTIAL_REVIEW_REASONS[layout.language]), "", template.context, "", intro, "", template.changes, "", changes, "", template.vigilance]
    : [SECTION_TITLE, "", intro, "", changes];
  const blocking = requiredReviewKinds(ticket.reviewDepth ?? "full").flatMap((kind) => (review?.results[kind]?.findings ?? [])
    .filter((finding) => BLOCKING_SEVERITIES.includes(finding.severity) && BLOCKING_VERIFICATIONS.includes(finding.verificationStatus))
    .map((finding) => `- ${finding.severity} (${kind}${reviewCurrent ? "" : ", older commit"}): ${finding.summary}${finding.path ? ` \`${finding.path}${finding.line === null ? "" : `:${finding.line}`}\`` : ""}`));
  if (blocking.length > 0) lines.push("", "### Blocking findings", "", ...blocking);
  lines.push("", "### Still to verify", "");
  lines.push(`- Technical checks on this commit: ${TECHNICAL_CHECKS.map((check) => checkStatus(quality, check, project?.scripts?.[check], revision)).join(", ")}.`);
  if (!state.plan) lines.push("- Acceptance: no autonomous acceptance plan was frozen.");
  for (const criterion of state.plan?.criteria ?? []) lines.push(`- ${criterion.id}: ${criterionStatus(quality, state, criterion.id, revision)}.`);
  lines.push(`- Independent review: ${reviewCurrent ? "done on this commit" : "last run on an older commit; the latest changes are unreviewed"}.`);
  const details = [
    `Starts ${execution.starts.length}/${execution.maxStarts}, corrections ${state.corrections}/${execution.maxCorrections}, environment retries ${state.environmentRetries}/${execution.maxEnvironmentRetries}, publication attempts ${execution.publicationAttempts}/${execution.maxPublicationAttempts}.`,
    `Work deadline ${new Date(execution.deadlineAt).toISOString()}. The ticket worktree and implementation lots are retained for explicit recovery.`,
    "",
    ...lots.map((lot) => `- Lot ${lot.label}: ${lot.status}.`),
    ...(plan?.recovery?.archives ?? []).map((archive) => `- Preserved lot ${archive.label}: ${archive.archivePath}; journal: ${archive.journalPath ?? "none recorded"}.`),
    ...quality.runs.map((run) => `- Run ${run.kind} ${run.id} (${shortSha(run.revision)}): ${run.simulated ? "simulated " : ""}${run.status}.${run.error ? ` ${run.error}` : ""}`),
  ];
  for (const evidence of quality.evidence) {
    const run = quality.runs.find((candidate) => candidate.id === evidence.runId);
    if (evidence.kind !== "command" || run?.revision !== revision || evidence.status === "passed") continue;
    details.push("", `\`${evidence.command ?? "command"}\` ${evidence.status}, exit ${evidence.exitCode ?? "unknown"}:`, "", "```", outputExcerpt(evidence.output), "```");
  }
  for (const kind of requiredReviewKinds(ticket.reviewDepth ?? "full")) {
    const result = review?.results[kind];
    details.push(`- Review ${kind}: ${result ? `${result.status}${result.verdict ? `, ${result.verdict}` : ""}` : "not run"}.`);
  }
  lines.push("", "<details><summary>Run details</summary>", "", ...details, "", "</details>");
  const markers = partialPublicationMarkers(ticket.id);
  return `${markers.start}\n${redactSecrets(lines.join("\n"))}\n${markers.end}`;
}

export function withPartialPublication(body: string, ticketId: string, section: string): string {
  const markers = partialPublicationMarkers(ticketId);
  const start = body.indexOf(markers.start);
  const end = body.indexOf(markers.end);
  if (start < 0 && end < 0) return `${body}${body.length > 0 ? "\n\n" : ""}${section}`;
  if (start < 0 || end < start || body.indexOf(markers.start, start + markers.start.length) >= 0 || body.indexOf(markers.end, end + markers.end.length) >= 0) {
    throw new Error("The existing partial publication section is ambiguous; human text was preserved.");
  }
  return `${body.slice(0, start)}${section}${body.slice(end + markers.end.length)}`;
}

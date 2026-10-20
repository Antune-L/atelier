import type { AutonomousState } from "../../shared/autonomous.ts";
import type { CommitLanguage } from "../../shared/constants.ts";
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

export function partialPublicationSection(store: Store, ticket: Ticket, state: AutonomousState, revision: string, reason: string, layout: PartialPublicationLayout): string {
  const execution = state.execution;
  if (!execution) throw new Error("Bounded autonomous execution is required for partial publication.");
  const quality = store.getTicketQuality(ticket.id);
  const template = PR_DESCRIPTION_TEMPLATES[layout.language];
  const contextLines = [PARTIAL_INTRO, "",
    `Candidate commit: ${revision}`, `Reason: ${reason}`, "",
    `Starts: ${execution.starts.length}/${execution.maxStarts}. Corrections: ${state.corrections}/${execution.maxCorrections}. Environment retries: ${state.environmentRetries}/${execution.maxEnvironmentRetries}.`,
    `Work deadline: ${new Date(execution.deadlineAt).toISOString()}. Publication attempts: ${execution.publicationAttempts}/${execution.maxPublicationAttempts}.`,
    `Finalization deadline: ${new Date(execution.finalizationDeadlineAt ?? execution.deadlineAt).toISOString()}.`];
  const retainedLines = ["The ticket worktree and implementation lots are retained for explicit recovery."];
  const plan = store.getImplementationPlan(ticket.id);
  const lots = plan?.lots ?? store.listImplementationLotStates(ticket.id);
  for (const lot of lots) retainedLines.push(`- ${lot.label}: ${lot.status}.${lot.status === "completed" ? "" : " This lot is not confirmed integrated and covered."}`);
  for (const archive of plan?.recovery?.archives ?? []) retainedLines.push(`- Preserved lot ${archive.label}: ${archive.archivePath}; journal: ${archive.journalPath ?? "none recorded"}.`);
  if (lots.length === 0) retainedLines.push("- No implementation lot is recorded.");
  const lines = layout.includeSummary
    ? [renderReviewLevelLine(layout.language, PARTIAL_REVIEW_LEVEL, PARTIAL_REVIEW_REASONS[layout.language]), "", template.context, "", ...contextLines, "", template.changes, "", ...retainedLines, "", template.vigilance]
    : [SECTION_TITLE, "", ...contextLines, "", template.vigilance];
  lines.push("", "### Verification reservations", "");
  if (!state.plan) lines.push("- No autonomous acceptance plan was frozen; acceptance remains unexecuted.");
  for (const criterion of state.plan?.criteria ?? []) {
    const currentRuns = quality.runs.filter((run) => run.revision === revision && !run.simulated);
    const evidence = quality.evidence.filter((entry) => entry.criterionId === criterion.id && currentRuns.some((run) => run.id === entry.runId)).at(-1);
    let status = "unexecuted";
    if (evidence) {
      const run = currentRuns.find((entry) => entry.id === evidence.runId);
      const accepted = run?.status === "passed" && run.evidenceAccepted && run.criteriaSnapshotId === state.functionalSnapshotId
        && state.functionalSnapshotId !== null && evidence.kind === "behavior" && evidence.authority === "agent";
      status = evidence.status;
      if (evidence.status === "passed" && !accepted) status = "inconclusive; criterion acceptance evidence is missing or unaccepted";
    }
    else if (quality.evidence.some((entry) => entry.criterionId === criterion.id)) status = "historical evidence only; missing for this candidate";
    lines.push(`- ${criterion.id}: ${status}. ${evidence?.summary ?? criterion.expected}`);
  }
  if (!quality.runs.some((run) => run.revision === revision && ["checks", "full", "combined"].includes(run.kind))) lines.push("- Local checks: unexecuted for this candidate; matching persisted evidence is missing.");
  if (!quality.runs.some((run) => run.revision === revision && ["behavior", "functional", "combined"].includes(run.kind))) lines.push("- Browser verification: unexecuted for this candidate; matching persisted evidence is missing.");
  for (const run of quality.runs) {
    let status: string = run.status;
    if (run.revision !== revision) status = `historical ${run.status}; missing for this candidate`;
    else if (run.simulated) status = `simulated ${run.status}; real evidence missing`;
    else if (run.status === "queued") status = "unexecuted";
    else if (run.status === "running" || run.status === "interrupted" || run.status === "cancelled") status = "inconclusive";
    else if (run.status === "passed" && !run.evidenceAccepted) status = "inconclusive; acceptance evidence was not accepted";
    lines.push(`- ${run.kind} (${run.id}, ${run.revision}): ${status}.${run.error ? ` ${run.error}` : ""}`);
  }
  lines.push("", "### Technical check evidence", "");
  const commands = quality.evidence.filter((entry) => entry.kind === "command");
  const project = store.getProjectRow(ticket.project);
  for (const check of TECHNICAL_CHECKS) {
    const configured = project?.scripts?.[check];
    const evidence = commands.filter((entry) => {
      const run = quality.runs.find((candidate) => candidate.id === entry.runId);
      return run?.revision === revision && entry.command?.toLowerCase().includes((configured ?? check).toLowerCase());
    }).at(-1);
    if (!evidence) lines.push(`- ${check}: unexecuted for this candidate; persisted command evidence is missing.${configured ? ` Configured command: ${configured}.` : ""}`);
  }
  for (const evidence of commands) {
    const run = quality.runs.find((candidate) => candidate.id === evidence.runId);
    let status: string = evidence.status;
    if (!run || run.revision !== revision) status = `historical ${status}; missing for this candidate`;
    else if (run.simulated) status = `simulated ${status}; real evidence missing`;
    else if (evidence.status === "passed" && (run.status !== "passed" || !run.technicalEvidenceAccepted || evidence.authority !== "server")) status = "inconclusive; technical evidence is unaccepted";
    lines.push(`- ${evidence.command ?? "Command unavailable"}: ${status}; exit code ${evidence.exitCode ?? "unknown"}; timeout ${evidence.timedOut}. ${evidence.summary}`);
    const output = outputExcerpt(evidence.output);
    if (output) lines.push("", ...output.split("\n").map((line) => `> ${line}`), "");
    else lines.push("  Output evidence is missing.");
  }
  lines.push("", "### Independent review reservations", "");
  const review = store.getReviewPass(ticket.id);
  for (const kind of requiredReviewKinds(ticket.reviewDepth ?? "full")) {
    const result = review?.results[kind];
    let status = "unexecuted; no persisted result";
    if (result) {
      if (review?.reviewedCommitSha !== revision) status = `historical ${result.status}; missing for this candidate`;
      else if (result.status === "failed" || result.verificationStatus === "failed") status = "failed";
      else if (result.status !== "completed" || result.verificationStatus === "pending") status = "inconclusive";
      else if (result.verdict === "approve") status = "approved";
      else status = "changes requested";
    }
    lines.push(`- ${kind}: ${status}.${result?.summary ? ` ${result.summary}` : ""}${result?.error ? ` ${result.error}` : ""}`);
    for (const finding of result?.findings ?? []) lines.push(`  - ${finding.severity}: ${finding.summary} Verification: ${finding.verificationStatus}. ${finding.evidence}${finding.path ? ` Location: ${finding.path}${finding.line === null ? "" : `:${finding.line}`}.` : ""}`);
  }
  if (!review || review.reviewedCommitSha !== revision) lines.push("- Current candidate changes have not been independently reviewed at this exact commit. Existing unreviewed-change sections in the PR body are preserved.");
  if (!layout.includeSummary) lines.push("", "### Retained implementation work", "", ...retainedLines);
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

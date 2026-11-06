import type { CommitLanguage, UserDismissalKind } from "../../shared/constants.ts";
import type { Ticket } from "../../shared/schemas.ts";
import { reviewFindingSeveritySchema } from "../../shared/protocol.ts";
import type { PublishReviewArgs, ReviewFinding, ReviewKind } from "../../shared/protocol.ts";

import { REVIEW_PUBLICATION_DISCARDED_EVENT, REVIEW_PUBLICATION_FROZEN_EVENT, USER_DECISION_ACTIONS } from "../db/reviewDecisions.ts";
import type { ReviewPassDecisions, ReviewPublicationIntent, UserDecisionAction, UserDismissal } from "../db/reviewDecisions.ts";
import type { ReviewPass, Store } from "../db/store.ts";
import { getProject, isProjectKey, projectVcsProvider } from "../config.ts";
import type { KeyedMutex } from "../mutex.ts";
import { renderCollapsedDetails } from "../system/reviewMarkdown.ts";
import { REVIEW_PUBLICATION_STATE_BY_EVENT } from "../system/types.ts";
import type { ReviewPublicationEvent, SystemAdapter } from "../system/types.ts";

import { clusterFindings, isSelfRefuting, qualifiedFindingId, type FindingRenderStyle } from "./reviewFindings.ts";
import { applyUserDismissals, completedDimensionFindings, effectiveReviewResult, passDimensionFindings, requiredReviewKinds, reviewPassMarker } from "./reviewPass.ts";
import type { DismissedFinding, EffectiveReviewResult } from "./reviewPass.ts";
import { authorizeUserDecision, recordUserDecision, refuseUserDecision } from "./userDecisions.ts";
import type { AuthorizedUserDecision, UserDecisionRequest } from "./userDecisions.ts";
import { slotPath } from "./slotManager.ts";

type GateRequirement = "approved" | "completed";

export interface ReviewPublisherDeps {
  store: Store;
  system: SystemAdapter;
  repoMutex: KeyedMutex;
  currentEpoch: (ticketId: string) => number;
  reviewGate: (ticketId: string, slotId: number, requirement: GateRequirement, correlationId: string) => Promise<{ ok: true } | { ok: false; reason: string }>;
  reviewerOptions: (ticket: Ticket) => FindingRenderStyle;
}
const USER_DISMISSAL_LABELS_FR: Record<UserDismissalKind, string> = { false_positive: "faux positif", accepted_risk: "risque accepté" };
const CORRUPT_REVIEW_DECISIONS_REFUSAL = "Publication refusée : les décisions ou la publication persistées de cette passe sont illisibles : lance une nouvelle passe complète (toutes les dimensions, sans rerun) pour les remplacer.";

function latestResultTime(reviewPass: ReviewPass): number {
  return Math.max(0, ...requiredReviewKinds(reviewPass.reviewDepth).map((kind) => reviewPass.results[kind]?.createdAt ?? 0));
}

function findingLocation(finding: ReviewFinding): string {
  if (finding.path === null) return "(contexte)";
  return finding.line === null ? finding.path : `${finding.path}:${finding.line}`;
}

export function renderReviewDecisionState(reviewPass: ReviewPass, kinds: ReviewKind[]): string {
  const { published, dismissed } = applyUserDismissals(reviewPass, completedDimensionFindings(reviewPass, kinds));
  const groups = clusterFindings(published).map((cluster, index) => {
    const first = cluster[0]?.finding;
    const detail = first === undefined ? "" : ` — ${findingLocation(first)} — ${first.summary}`;
    return `- groupe ${index + 1} : ${cluster.map(qualifiedFindingId).join(", ")}${detail}`;
  });
  const lines: string[] = [];
  if (groups.length > 0) {
    lines.push("Findings publiables, identifiants qualifiés (kind:id) par groupe de déduplication (un groupe = un commentaire publié ; écarter un id n'écarte que ce finding source) :", ...groups);
  }
  for (const entry of dismissed) {
    lines.push(`Écarté par l'utilisateur : ${entry.id} (${USER_DISMISSAL_LABELS_FR[entry.dismissal.category]} — ${entry.dismissal.reason}).`);
  }
  const { note, verdict, skipPublication } = reviewPass.decisions;
  if (note !== null) lines.push(`Note jointe par l'utilisateur : ${note.text}`);
  if (verdict !== null) lines.push(`Verdict choisi par l'utilisateur : ${verdict.value}.`);
  if (skipPublication !== null) lines.push(`Clôture sans publication décidée par l'utilisateur : ${skipPublication.reason}. Appelle done(pr_url, skipPublication).`);
  const rerunning = kinds.filter((kind) => reviewPass.results[kind]?.archived === true);
  if (rerunning.length > 0) lines.push(`Relance utilisateur en cours (résultat précédent archivé) : ${rerunning.join(", ")}.`);
  if (reviewPass.publicationIntent !== null) {
    const state = reviewPass.publishedReviewId === null ? "incertaine : rappelle publish_review({ passId }) pour la rejouer à l'identique" : "confirmée";
    lines.push(`Publication figée (${reviewPass.publicationIntent.event}) : ${state}. Aucune nouvelle décision ni relance n'est possible sur cette passe.`);
  }
  if (reviewPass.userStateCorrupt) lines.push("Décisions ou publication persistées illisibles : publication, relance et clôture sans publication sont bloquées ; une nouvelle passe complète les remplace.");
  return lines.join("\n");
}

const NO_REVIEW_PASS_TARGET = "aucune passe";

function publicationDecisionAction(args: PublishReviewArgs): UserDecisionAction | null {
  if (args.dismiss !== undefined) return USER_DECISION_ACTIONS.dismissFinding;
  if (args.note !== undefined) return USER_DECISION_ACTIONS.attachNote;
  if (args.verdict !== undefined) return USER_DECISION_ACTIONS.chooseVerdict;
  return null;
}

/**
 * Inline comment body: GitHub already renders the `path:line` anchor, so it is not repeated here.
 * A provider whose threads do not show it (Azure DevOps) prepends it in its own client.
 */
function renderFinding(finding: ReviewFinding, humanTone: boolean): string {
  if (!humanTone) return `**${finding.severity.toUpperCase()}** — ${finding.summary}\n\n${finding.evidence}`;
  return finding.evidence ? `${finding.summary}\n\n${finding.evidence}` : finding.summary;
}

function renderCollapsedFinding(finding: ReviewFinding, humanTone: boolean): string {
  const location = finding.path ? `${finding.path}${finding.line ? `:${finding.line}` : ""}` : null;
  const prefix = [humanTone ? null : finding.severity.toUpperCase(), location].filter((part) => part !== null);
  const title = [...prefix, finding.summary].join(" — ");
  return renderCollapsedDetails(title, finding.evidence);
}

export interface ReviewReportLabels {
  headings: Record<ReviewPublicationEvent, string>;
  noFindings: string;
  outsideDiffHeading: string;
  keptLine: (count: number, countSummary: string) => string;
  noteHeading: string;
  dismissedHeading: string;
  dismissedBy: Record<UserDismissalKind, string>;
  closedUnpublished: (reason: string) => string;
}

const REVIEW_REPORT_LABELS_EN: ReviewReportLabels = {
  headings: {
    REQUEST_CHANGES: "Review complete — changes recommended",
    COMMENT: "Review complete — comments",
    APPROVE: "Review complete — no changes recommended",
  },
  noFindings: "no findings",
  outsideDiffHeading: "## Findings without a diff anchor",
  keptLine: (count, countSummary) => `${count} finding(s) kept: ${countSummary}.`,
  noteHeading: "## Note from the reviewer",
  dismissedHeading: "## Findings dismissed by the user",
  dismissedBy: { false_positive: "dismissed by the user: false positive", accepted_risk: "dismissed by the user: accepted risk" },
  closedUnpublished: (reason) => `Closed without publication (user decision): ${reason}`,
};

export const REVIEW_REPORT_LABELS_FR: ReviewReportLabels = {
  headings: {
    REQUEST_CHANGES: "Revue terminée — modifications recommandées",
    COMMENT: "Revue terminée — commentaires",
    APPROVE: "Revue terminée — aucune modification recommandée",
  },
  noFindings: "aucun finding",
  outsideDiffHeading: "## Findings hors du diff",
  keptLine: (count, countSummary) => `${count} finding(s) retenu(s) : ${countSummary}.`,
  noteHeading: "## Note du relecteur",
  dismissedHeading: "## Findings écartés par l'utilisateur",
  dismissedBy: { false_positive: "écarté par l'utilisateur : faux positif", accepted_risk: "écarté par l'utilisateur : risque accepté" },
  closedUnpublished: (reason) => `Revue clôturée sans publication (décision de l'utilisateur) : ${reason}`,
};

function renderDismissedFinding(entry: DismissedFinding, labels: ReviewReportLabels): string {
  const { finding, dismissal } = entry;
  return `- ${finding.summary} (${findingLocation(finding)}) — ${labels.dismissedBy[dismissal.category]} — ${dismissal.reason}`;
}

function hasUserDecisions(reviewPass: ReviewPass): boolean {
  const { dismissals, note, verdict, skipPublication } = reviewPass.decisions;
  return dismissals.length > 0 || note !== null || verdict !== null || skipPublication !== null;
}

function reportHeadingEvent(effective: EffectiveReviewResult, eventHeading: boolean): ReviewPublicationEvent {
  if (eventHeading) return effective.event;
  return effective.findings.length > 0 ? "REQUEST_CHANGES" : "APPROVE";
}

function renderEffectiveReviewReport(effective: EffectiveReviewResult, labels: ReviewReportLabels, style: FindingRenderStyle, eventHeading: boolean): string {
  const { findings, dismissed, note } = effective;
  const counts = reviewFindingSeveritySchema.options.flatMap((severity) => {
    const count = findings.filter((finding) => finding.severity === severity).length;
    return count > 0 ? [`${count} ${severity}`] : [];
  });
  const countSummary = counts.length > 0 ? counts.join(", ") : labels.noFindings;
  const outsideDiffFindings = findings.filter((finding) => finding.path === null || finding.line === null);
  const details = outsideDiffFindings.length === 0
    ? ""
    : `${labels.outsideDiffHeading}\n\n${outsideDiffFindings.map((finding) => renderCollapsedFinding(finding, style.humanTone)).join("\n\n")}`;
  const dismissedSection = dismissed.length === 0
    ? ""
    : `${labels.dismissedHeading}\n\n${dismissed.map((entry) => renderDismissedFinding(entry, labels)).join("\n")}`;
  const sections = [
    `**${labels.headings[reportHeadingEvent(effective, eventHeading)]}**`,
    effective.skipPublicationReason === null ? "" : labels.closedUnpublished(effective.skipPublicationReason),
    note === null ? "" : `${labels.noteHeading}\n\n${note}`,
    style.humanTone ? "" : labels.keptLine(findings.length, countSummary),
    details,
    dismissedSection,
  ];
  return sections.filter((section) => section !== "").join("\n\n");
}

export const REVIEW_REPORT_LABELS: Record<CommitLanguage, ReviewReportLabels> = {
  en: REVIEW_REPORT_LABELS_EN,
  fr: REVIEW_REPORT_LABELS_FR,
};

export function renderPassReport(
  store: Store,
  ticketId: string,
  labels: ReviewReportLabels,
  style: FindingRenderStyle,
): string | null {
  const reviewPass = store.getReviewPass(ticketId);
  const effective = effectiveReviewResult(reviewPass, style);
  if (reviewPass === null || effective === null) return null;
  const eventHeading = store.getTicket(ticketId)?.kind === "review" || hasUserDecisions(reviewPass);
  return renderEffectiveReviewReport(effective, labels, style, eventHeading);
}

export class ReviewPublisher {
  constructor(private readonly deps: ReviewPublisherDeps) {}

  async publish(
    ticket: Ticket,
    slotId: number,
    args: PublishReviewArgs,
    correlationId: string,
    epoch: number,
  ): Promise<{ ok: boolean; result: string }> {
    if (ticket.kind !== "review" || !ticket.postComments || ticket.prUrl === null) {
      return { ok: false, result: "publish_review est réservé aux tickets review dont la publication sur la PR est activée." };
    }
    const prUrl = ticket.prUrl;
    const { passId } = args;
    const reviewPass = this.deps.store.getReviewPass(ticket.id);
    if (!reviewPass || reviewPass.passId !== passId) {
      return {
        ok: false,
        result: "Cette passe n'est plus courante. Lance une nouvelle passe complète avec delegate_review.",
      };
    }
    if (reviewPass.userStateCorrupt) return { ok: false, result: CORRUPT_REVIEW_DECISIONS_REFUSAL };
    if (reviewPass.decisions.skipPublication !== null) {
      return { ok: false, result: "Publication refusée : l'utilisateur a décidé de clôturer cette revue sans publication. Appelle done(pr_url, skipPublication)." };
    }
    const decisionRefusal = this.publicationDecisionReplayRefusal(reviewPass, args);
    if (decisionRefusal !== null) return decisionRefusal;
    const requirement = reviewPass.requiresApproval ? "approved" : "completed";
    const gate = await this.deps.reviewGate(ticket.id, slotId, requirement, correlationId);
    if (!gate.ok) return { ok: false, result: `Publication refusée : ${gate.reason}` };
    if (!isProjectKey(ticket.project)) return { ok: false, result: "Publication refusée : projet inconnu." };
    return this.deps.repoMutex.run(getProject(ticket.project).repoPath, () =>
      this.publishReviewUnderRepoLock(ticket, slotId, prUrl, args, epoch));
  }

  private publicationDecisionReplayRefusal(reviewPass: ReviewPass, args: PublishReviewArgs): { ok: false; result: string } | null {
    const action = publicationDecisionAction(args);
    if (reviewPass.publicationIntent === null || args.messageId === undefined || action === null) return null;
    const recorded = [
      ...reviewPass.decisions.dismissals.map((dismissal) => dismissal.messageId),
      reviewPass.decisions.note?.messageId,
      reviewPass.decisions.verdict?.messageId,
    ];
    if (recorded.includes(args.messageId)) return null;
    return refuseUserDecision(this.deps.store, {
      ticketId: reviewPass.ticketId,
      messageId: args.messageId,
      action,
      target: reviewPass.passId,
    }, "une publication de cette passe a déjà été tentée ; son contenu est figé. Rappelle publish_review({ passId }) sans décision pour la rejouer à l'identique");
  }

  private validatePublicationDecisions(
    reviewPass: ReviewPass,
    args: PublishReviewArgs & { messageId: string },
  ): { ok: true; decisions: ReviewPassDecisions; applied: Array<AuthorizedUserDecision & { outcome: string }> } | { ok: false; result: string } {
    const { ticketId, passId } = reviewPass;
    const messageId = args.messageId;
    const applied: Array<AuthorizedUserDecision & { outcome: string }> = [];
    const authorize = (request: UserDecisionRequest, outcome: string): { ok: false; result: string } | null => {
      const check = authorizeUserDecision(this.deps.store, request);
      if (!check.ok) return refuseUserDecision(this.deps.store, request, check.reason);
      applied.push({ request, comment: check.comment, outcome });
      return null;
    };
    const entries = passDimensionFindings(reviewPass) ?? [];
    const { published } = applyUserDismissals(reviewPass, entries);
    const dismissals: UserDismissal[] = [...reviewPass.decisions.dismissals];
    const requested = new Set<string>();
    for (const dismissal of args.dismiss ?? []) {
      for (const findingId of dismissal.findingIds) {
        const target = { ticketId, messageId, action: USER_DECISION_ACTIONS.dismissFinding, target: findingId };
        const matches = published.filter((entry) => qualifiedFindingId(entry) === findingId);
        const source = matches[0];
        if (requested.has(findingId)) return refuseUserDecision(this.deps.store, target, `${findingId} est listé plusieurs fois`);
        if (matches.length !== 1 || source === undefined || source.kind === null) {
          const reason = matches.length > 1
            ? `l'identifiant ${findingId} désigne plusieurs findings sources : impossible d'en écarter exactement un`
            : `aucun finding publiable ${findingId} dans la passe courante : relis read_review_results pour les identifiants qualifiés kind:id`;
          return refuseUserDecision(this.deps.store, target, reason);
        }
        requested.add(findingId);
        const result = reviewPass.results[source.kind];
        if (result === undefined) return refuseUserDecision(this.deps.store, target, `dimension ${source.kind} sans résultat`);
        const refusal = authorize({ ...target, notBefore: result.createdAt, interpretation: { category: dismissal.kind, reason: dismissal.reason, resultRevision: result.revision } }, "finding écarté");
        if (refusal !== null) return refusal;
        dismissals.push({
          kind: source.kind,
          findingId: source.finding.id,
          resultRevision: result.revision,
          reason: dismissal.reason,
          category: dismissal.kind,
          messageId,
          decidedAt: Date.now(),
        });
      }
    }
    const notBefore = latestResultTime(reviewPass);
    const passTarget = { ticketId, messageId, target: passId, notBefore };
    if (args.note !== undefined) {
      const refusal = authorize({ ...passTarget, action: USER_DECISION_ACTIONS.attachNote, interpretation: { note: args.note } }, "note jointe");
      if (refusal !== null) return refusal;
    }
    const decisions: ReviewPassDecisions = {
      ...reviewPass.decisions,
      revision: reviewPass.decisions.revision + 1,
      dismissals,
      note: args.note === undefined ? reviewPass.decisions.note : { text: args.note, messageId },
      verdict: args.verdict === undefined ? reviewPass.decisions.verdict : { value: args.verdict, messageId },
    };
    if (args.verdict !== undefined) {
      const verdictTarget = { ...passTarget, action: USER_DECISION_ACTIONS.chooseVerdict, interpretation: { verdict: args.verdict } };
      const remaining = effectiveReviewResult({ ...reviewPass, decisions })?.findings.length ?? 0;
      if (args.verdict === "approve" && remaining > 0) {
        return refuseUserDecision(this.deps.store, verdictTarget, `approve impossible : ${remaining} finding(s) resteraient publiés ; écarte-les explicitement ou choisis comment`);
      }
      const refusal = authorize(verdictTarget, `verdict ${args.verdict}`);
      if (refusal !== null) return refusal;
    }
    return { ok: true, decisions, applied };
  }

  private async publishReviewUnderRepoLock(
    ticket: Ticket,
    slotId: number,
    prUrl: string,
    args: PublishReviewArgs,
    epoch: number,
  ): Promise<{ ok: boolean; result: string }> {
    const { passId } = args;
    const slot = this.deps.store.getSlot(slotId);
    if (this.deps.currentEpoch(ticket.id) !== epoch || slot?.ticketId !== ticket.id) {
      return { ok: false, result: "Publication annulée : le slot de review a été libéré." };
    }
    const currentPass = this.deps.store.getReviewPass(ticket.id);
    if (!currentPass || currentPass.passId !== passId) {
      return { ok: false, result: "Publication annulée : une nouvelle passe a remplacé celle-ci." };
    }
    const frozen = currentPass.publicationIntent ?? this.freezePublication(ticket, currentPass, args);
    if ("result" in frozen) return frozen;
    const intent = frozen;
    const provider = projectVcsProvider(ticket.project);
    const entries = passDimensionFindings(currentPass) ?? [];
    const refutedCount = entries.filter((entry) =>
      entry.finding.verificationStatus !== "rejected" && isSelfRefuting(entry.finding)).length;
    const published = await this.deps.system.publishReview(slotPath(slotId), prUrl, {
      expectedCommitSha: intent.commitSha,
      marker: intent.marker,
      body: intent.body,
      comments: intent.comments,
      event: intent.event,
    }, provider);
    const publicationPayload = {
      passId,
      reviewId: published.reviewId,
      commitSha: intent.commitSha,
      event: intent.event,
      expectedState: intent.expectedState,
      actualState: published.actualState ?? null,
      decisionsRevision: intent.decisionsRevision,
      dismissedFindingIds: intent.dismissedFindingIds,
      result: published,
      warnings: published.ok && published.reason !== "" ? [published.reason] : [],
    };
    if (!published.ok || published.reviewId === null) {
      this.deps.store.logEvent(ticket.id, "review_publication_failed", {
        ...publicationPayload,
        error: published.reason,
      });
      if (published.notPosted === true && this.deps.store.discardReviewPublication(ticket.id, passId)) {
        this.deps.store.logEvent(ticket.id, REVIEW_PUBLICATION_DISCARDED_EVENT, { passId, reason: published.reason });
        return { ok: false, result: `Publication refusée avant tout envoi : ${published.reason}. Rien n'a été publié et le contenu figé est abandonné : si la PR a avancé, lance une nouvelle passe complète ; sinon corrige la cause puis rappelle publish_review({ passId }) sans décision, les décisions déjà enregistrées restent appliquées.` };
      }
      return { ok: false, result: `Publication refusée : ${published.reason}. Le contenu reste figé : rappelle publish_review({ passId }) pour la rejouer à l'identique.` };
    }
    if (!this.deps.store.recordReviewPublication({
      ticketId: ticket.id,
      passId,
      reviewId: published.reviewId,
      commitSha: intent.commitSha,
    })) {
      const result = "La review a été publiée, mais son accusé n'a pas pu être persisté. Rappelle publish_review pour le récupérer.";
      this.deps.store.logEvent(ticket.id, "review_publication_failed", {
        ...publicationPayload,
        error: result,
      });
      return { ok: false, result };
    }
    this.deps.store.logEvent(ticket.id, "review_published", publicationPayload);
    const refutedNote = refutedCount === 0 ? "" : ` (${refutedCount} finding(s) auto-réfuté(s) ignoré(s))`;
    const dismissedNote = intent.dismissedFindingIds.length === 0 ? "" : ` ${intent.dismissedFindingIds.length} finding(s) écarté(s) par l'utilisateur.`;
    const degradedNote = published.reason === "" ? "" : ` Note : ${published.reason}.`;
    return {
      ok: true,
      result: `Review publiée sur le commit ${intent.commitSha}${refutedNote}.${dismissedNote}${degradedNote} Appelle maintenant done().`,
    };
  }

  private freezePublication(ticket: Ticket, currentPass: ReviewPass, args: PublishReviewArgs): ReviewPublicationIntent | { ok: false; result: string } {
    const reviewedCommitSha = currentPass.reviewedCommitSha;
    if (reviewedCommitSha === null) {
      return {
        ok: false,
        result: "Cette ancienne passe n'a pas de SHA revu vérifiable. Lance une nouvelle passe complète avant publication.",
      };
    }
    const { messageId } = args;
    const decides = publicationDecisionAction(args) !== null;
    const validated = messageId === undefined || !decides ? null : this.validatePublicationDecisions(currentPass, { ...args, messageId });
    if (validated !== null && !validated.ok) return validated;
    const decidedPass = validated === null ? currentPass : { ...currentPass, decisions: validated.decisions };
    const options = this.deps.reviewerOptions(ticket);
    const effective = effectiveReviewResult(decidedPass, options);
    if (effective === null) return { ok: false, result: "Publication refusée : résultats de review incomplets." };
    const report = renderEffectiveReviewReport(effective, REVIEW_REPORT_LABELS[options.language], options, true);
    const hasUserContent = effective.note !== null || effective.dismissed.length > 0;
    const provider = projectVcsProvider(ticket.project);
    const intent: ReviewPublicationIntent = {
      passId: currentPass.passId,
      commitSha: reviewedCommitSha,
      marker: reviewPassMarker(currentPass.passId),
      body: provider === "azureDevops" && effective.event === "APPROVE" && !hasUserContent ? "" : report,
      comments: effective.findings.flatMap((finding) => {
        if (finding.path === null || finding.line === null) return [];
        return [{ path: finding.path, line: finding.line, body: renderFinding(finding, options.humanTone) }];
      }),
      event: effective.event,
      expectedState: REVIEW_PUBLICATION_STATE_BY_EVENT[effective.event],
      findings: effective.findings,
      dismissedFindingIds: effective.dismissed.map((entry) => entry.id),
      decisionsRevision: decidedPass.decisions.revision,
      note: effective.note,
      startedAt: Date.now(),
    };
    const frozen = this.deps.store.transaction(() => {
      if (!this.deps.store.bindReviewPassCommit(ticket.id, currentPass.passId, reviewedCommitSha)) return false;
      if (validated !== null && !this.deps.store.saveReviewDecisions(ticket.id, currentPass.passId, currentPass.decisions.revision, validated.decisions)) return false;
      if (!this.deps.store.freezeReviewPublication(ticket.id, intent)) return false;
      for (const { request, comment, outcome } of validated?.applied ?? []) recordUserDecision(this.deps.store, request, comment, outcome);
      return true;
    });
    if (!frozen) return { ok: false, result: "Publication annulée : la passe courante a changé. Relis read_review_results puis rappelle publish_review." };
    this.deps.store.logEvent(ticket.id, REVIEW_PUBLICATION_FROZEN_EVENT, { passId: intent.passId, event: intent.event, decisionsRevision: intent.decisionsRevision, dismissedFindingIds: intent.dismissedFindingIds });
    return intent;
  }

  async recordSkipPublication(ticket: Ticket, slotId: number, messageId: string, reason: string, correlationId: string): Promise<{ ok: boolean; result: string }> {
    const reviewPass = this.deps.store.getReviewPass(ticket.id);
    const request = { ticketId: ticket.id, messageId, action: USER_DECISION_ACTIONS.skipPublication, target: reviewPass?.passId ?? NO_REVIEW_PASS_TARGET };
    if (!ticket.postComments) return refuseUserDecision(this.deps.store, request, "cette revue n'est pas configurée pour publier : appelle done(pr_url) sans skipPublication");
    if (!reviewPass) return refuseUserDecision(this.deps.store, request, "aucune passe de review enregistrée");
    if (reviewPass.userStateCorrupt) return refuseUserDecision(this.deps.store, request, "décisions ou publication persistées illisibles");
    if (reviewPass.publicationIntent !== null || reviewPass.publishedReviewId !== null) {
      return refuseUserDecision(this.deps.store, request, "une publication de cette passe a déjà été tentée ou faite : la clôture sans publication n'est plus possible");
    }
    const recorded = reviewPass.decisions.skipPublication;
    if (recorded !== null) {
      if (recorded.messageId === messageId) return { ok: true, result: "Clôture sans publication déjà enregistrée." };
      return refuseUserDecision(this.deps.store, request, "une clôture sans publication est déjà enregistrée pour un autre message");
    }
    const gate = await this.deps.reviewGate(ticket.id, slotId, reviewPass.requiresApproval ? "approved" : "completed", correlationId);
    if (!gate.ok) return refuseUserDecision(this.deps.store, request, gate.reason);
    const authorizedRequest: UserDecisionRequest = { ...request, notBefore: latestResultTime(reviewPass), interpretation: { reason } };
    const check = authorizeUserDecision(this.deps.store, authorizedRequest);
    if (!check.ok) return refuseUserDecision(this.deps.store, request, check.reason);
    const decisions: ReviewPassDecisions = {
      ...reviewPass.decisions,
      revision: reviewPass.decisions.revision + 1,
      skipPublication: { reason, messageId, decidedAt: Date.now() },
    };
    const saved = this.deps.store.transaction(() => {
      if (!this.deps.store.saveReviewDecisions(ticket.id, reviewPass.passId, reviewPass.decisions.revision, decisions)) return false;
      recordUserDecision(this.deps.store, authorizedRequest, check.comment, "clôture sans publication enregistrée");
      return true;
    });
    if (!saved) return refuseUserDecision(this.deps.store, request, "la passe a changé ou une publication a démarré entre-temps");
    return { ok: true, result: "Clôture sans publication enregistrée." };
  }
}

import { getErrorMessage } from "../shared/errors.ts";
import type { VcsProvider } from "../shared/constants.ts";
import type { CreateReviewInput, OpenPr, Ticket } from "../shared/schemas.ts";

import type { SlotManager } from "./agents/slotManager.ts";
import { getProject } from "./config.ts";
import type { NewReview, Store } from "./db/store.ts";
import type { ClientHub } from "./hub.ts";
import { createLogger } from "./logger.ts";

export const REVIEW_COUNT_TTL_MS = 5 * 60 * 1000;

const log = createLogger("review-tickets");

export type ReviewOptions = Omit<CreateReviewInput, "prs">;

export type ProjectPrLister = (key: string, refresh: boolean) => Promise<OpenPr[]>;

interface ProjectPrListerDeps {
  store: Pick<Store, "reviewCompletionVersion">;
  listOpenPrs(repoPath: string, provider: VcsProvider): Promise<OpenPr[]>;
}

export function createProjectPrLister(deps: ProjectPrListerDeps): ProjectPrLister {
  const cache = new Map<string, { identity: string; prs: OpenPr[]; checkedAt: number }>();
  const pendingByKey = new Map<string, { identity: string; result: Promise<OpenPr[]>; refreshResult?: Promise<OpenPr[]> }>();

  function list(key: string, refresh: boolean): Promise<OpenPr[]> {
    const { repoPath, vcsProvider } = getProject(key);
    const identity = JSON.stringify([repoPath, vcsProvider, deps.store.reviewCompletionVersion()]);
    const pending = pendingByKey.get(key);
    if (pending?.identity === identity) {
      if (!refresh) return pending.result;
      if (!pending.refreshResult) {
        const reload = () => list(key, true);
        pending.refreshResult = pending.result.then(reload, reload);
      }
      return pending.refreshResult;
    }
    const cached = cache.get(key);
    if (!refresh && cached?.identity === identity && Date.now() - cached.checkedAt < REVIEW_COUNT_TTL_MS) {
      return Promise.resolve(cached.prs);
    }
    const result = deps.listOpenPrs(repoPath, vcsProvider).then((prs) => {
      if (pendingByKey.get(key)?.result === result) {
        cache.set(key, { identity, prs, checkedAt: Date.now() });
      }
      return prs;
    }).finally(() => {
      if (pendingByKey.get(key)?.result === result) pendingByKey.delete(key);
    });
    pendingByKey.set(key, { identity, result });
    return result;
  }

  return list;
}

/** Shared bullet list describing the target PR of a review/clean card. */
export function prSummaryLines(pr: OpenPr): string[] {
  const lines = [
    `- **Titre** : ${pr.title}`,
    `- **Branche** : \`${pr.headBranch}\``,
    `- **Auteur** : ${pr.author}`,
  ];
  // Azure DevOps exposes no diff stat on a PR; omit the bullet rather than print zeros.
  if (pr.additions !== null && pr.deletions !== null) {
    lines.push(`- **Diff** : +${pr.additions} / -${pr.deletions}`);
  }
  return lines;
}

/** Markdown body shown on a review card, summarizing the target PR. */
function reviewDescription(pr: OpenPr): string {
  return [`Revue autonome (argus) de [PR #${pr.number}](${pr.url})`, "", ...prSummaryLines(pr)].join("\n");
}

export function reviewTicketInput(input: ReviewOptions, pr: OpenPr, language: NewReview["reviewLanguage"]): NewReview {
  return {
    title: `Review PR #${pr.number} — ${pr.title}`,
    description: reviewDescription(pr),
    project: input.project,
    prNumber: pr.number,
    prHeadBranch: pr.headBranch,
    prUrl: pr.url,
    baseBranch: input.baseBranch ?? pr.baseBranch,
    reviewDepth: input.depth,
    postComments: input.postComments,
    fixComments: input.fixComments,
    reviewLanguage: input.language ?? language,
    humanTone: input.humanTone,
    model: input.model,
    effort: input.effort,
    orchestrator: input.orchestrator,
    codexModel: input.codexModel,
    codexEffort: input.codexEffort,
    codexFast: input.codexFast,
  };
}

export function prReservedByQualityIteration(store: Pick<Store, "listActiveQualityIterations">, project: string, prUrls: readonly string[]): boolean {
  return store.listActiveQualityIterations().some((iteration) => iteration.project === project && iteration.prUrl !== null && prUrls.includes(iteration.prUrl));
}

interface ReviewLaunchDeps {
  store: Pick<Store, "createReview" | "getAppSettings">;
  hub: Pick<ClientHub, "pushTicket">;
  slots: Pick<SlotManager, "startTicket">;
}

export function launchReview(deps: ReviewLaunchDeps, input: ReviewOptions, pr: OpenPr): Ticket {
  const ticket = deps.store.createReview(reviewTicketInput(input, pr, deps.store.getAppSettings().commitLanguage));
  deps.hub.pushTicket(ticket);
  void deps.slots.startTicket(ticket.id).catch((error: unknown) => {
    log.error("démarrage de la review échoué", { ticketId: ticket.id, error: getErrorMessage(error) });
  });
  return ticket;
}

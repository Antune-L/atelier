import { z } from "zod";

import { USER_DISMISSAL_KINDS, USER_REVIEW_VERDICTS } from "../../shared/constants.ts";
import { reviewFindingSchema, reviewKindSchema } from "../../shared/protocol.ts";

export const USER_DECISION_APPLIED_EVENT = "user_decision_applied";
export const USER_DECISION_REFUSED_EVENT = "user_decision_refused";
export const REVIEW_PUBLICATION_FROZEN_EVENT = "review_publication_frozen";
export const REVIEW_PUBLICATION_DISCARDED_EVENT = "review_publication_discarded";
export const REVIEW_DELEGATED_EVENT = "review_delegated";
export const REVIEW_RERUN_DELEGATED_EVENT = "review_rerun_delegated";
export const REVIEW_RERUN_RESTORED_EVENT = "review_rerun_restored";

export const USER_DECISION_ACTIONS = {
  rerunReview: "rerun_review",
  dismissFinding: "dismiss_finding",
  attachNote: "attach_note",
  chooseVerdict: "choose_verdict",
  skipPublication: "skip_publication",
} as const;
export type UserDecisionAction = (typeof USER_DECISION_ACTIONS)[keyof typeof USER_DECISION_ACTIONS];

export const userDismissalSchema = z.object({
  kind: reviewKindSchema,
  findingId: z.string().min(1),
  resultRevision: z.string().min(1),
  reason: z.string().min(1),
  category: z.enum(USER_DISMISSAL_KINDS),
  messageId: z.string().min(1),
  decidedAt: z.number().int(),
});
export type UserDismissal = z.infer<typeof userDismissalSchema>;

const userDecisionTextSchema = z.object({
  text: z.string().min(1),
  messageId: z.string().min(1),
});

export const reviewPassDecisionsSchema = z.object({
  revision: z.number().int().nonnegative(),
  dismissals: z.array(userDismissalSchema),
  note: userDecisionTextSchema.nullable(),
  verdict: z.object({ value: z.enum(USER_REVIEW_VERDICTS), messageId: z.string().min(1) }).nullable(),
  skipPublication: z.object({ reason: z.string().min(1), messageId: z.string().min(1), decidedAt: z.number().int() }).nullable(),
});
export type ReviewPassDecisions = z.infer<typeof reviewPassDecisionsSchema>;

export const EMPTY_REVIEW_PASS_DECISIONS: ReviewPassDecisions = {
  revision: 0,
  dismissals: [],
  note: null,
  verdict: null,
  skipPublication: null,
};

const publicationEventSchema = z.enum(["APPROVE", "REQUEST_CHANGES", "COMMENT"]);
const publicationStateSchema = z.enum(["APPROVED", "CHANGES_REQUESTED", "COMMENTED"]);

export const reviewPublicationIntentSchema = z.object({
  passId: z.string().min(1),
  commitSha: z.string().min(1),
  marker: z.string().min(1),
  body: z.string(),
  comments: z.array(z.object({ path: z.string().min(1), line: z.number().int().positive(), body: z.string() })),
  event: publicationEventSchema,
  expectedState: publicationStateSchema,
  findings: z.array(reviewFindingSchema),
  dismissedFindingIds: z.array(z.string().min(1)),
  decisionsRevision: z.number().int().nonnegative(),
  note: z.string().nullable(),
  startedAt: z.number().int(),
});
export type ReviewPublicationIntent = z.infer<typeof reviewPublicationIntentSchema>;

export const archivedReviewResultSchema = z.object({
  verdict: z.enum(["approve", "revise"]).nullable(),
  summary: z.string(),
  findings: z.array(reviewFindingSchema),
  verificationStatus: z.enum(["not_needed", "pending", "verified", "failed"]),
  error: z.string().nullable(),
  createdAt: z.number().int(),
  revision: z.string().min(1),
});
export type ArchivedReviewResult = z.infer<typeof archivedReviewResultSchema>;

export function parseJsonColumn<T>(value: string | null, schema: z.ZodType<T>): T | null | undefined {
  if (value === null) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

import type { Ticket } from "../../shared/schemas.ts";
import { ticketSchema } from "../../shared/schemas.ts";

/** Project key the fixtures default to; contract tests register a matching project in the Store. */
export const FIXTURE_PROJECT_KEY = "test-proj";

/**
 * A complete, schema-valid ticket. Every builder under test reads a full Ticket, so the fixture is
 * parsed through `ticketSchema` (not hand-cast) to stay honest: an invalid override throws here.
 */
const BASE_TICKET: Ticket = {
  id: "t-fixture",
  title: "Fixture ticket",
  description: "Une description de fixture.",
  externalUrl: null,
  project: FIXTURE_PROJECT_KEY,
  kind: "feature",
  reviewDepth: null,
  prNumber: null,
  prHeadBranch: null,
  postComments: false,
  fixComments: false,
  prdEnabled: false,
  prDraft: true,
  autoMerge: false,
  stealth: false,
  directPush: false,
  addScreenshots: false,
  verifyFeature: false,
  argusMultiLoop: false,
  researchPlan: false,
  baseBranch: null,
  dependsOn: null,
  childOrder: null,
  prdMarkdown: null,
  agentSummary: null,
  column: "implementing",
  stage: null,
  model: null,
  effort: null,
  implementerModel: null,
  implementerEffort: null,
  codexModel: null,
  codexEffort: null,
  orchestrator: "claude",
  implementer: "claude",
  reviewRounds: 0,
  sessionId: null,
  slotId: null,
  branch: null,
  prUrl: null,
  resolvingConflicts: false,
  testing: false,
  error: null,
  archived: false,
  watchdogFlagged: false,
  pendingQuestions: 0,
  triageStatus: "none",
  triageVerdict: null,
  triageReport: null,
  reformulateStatus: "none",
  reformulation: null,
  feasibilityContext: true,
  finishedAt: null,
  implementingStartedAt: null,
  implementationStartedAt: null,
  sessionUsage: {},
  createdAt: 1,
  updatedAt: 1,
};

/** Build a valid Ticket from partial overrides (re-parsed so an invalid combination fails loudly). */
export function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return ticketSchema.parse({ ...BASE_TICKET, ...overrides });
}

import { createHash, randomUUID } from "node:crypto";

import type { AutonomousExecution, AutonomousState } from "../../shared/autonomous.ts";
import { getErrorMessage } from "../../shared/errors.ts";
import type { Ticket } from "../../shared/schemas.ts";
import type { ProjectConfig } from "../config.ts";
import type { Store } from "../db/store.ts";
import type { PrMutationOptions, SystemAdapter } from "../system/types.ts";

import { partialPublicationSection, withPartialPublication } from "./autonomousPublication.ts";

const RECONCILIATION_TIMEOUT_MS = 60_000;
const USER_CANCELLED = "user_cancelled";
const PARTIAL_PR_TITLE_PREFIX = "Partial: ";

type MutationKind = NonNullable<AutonomousState["hostMutation"]>["kind"];

export interface AutonomousPartialDeliveryDependencies {
  store: Store;
  system: SystemAdapter;
  onChange: (ticketId: string) => void;
  quiesce: (ticketId: string) => Promise<boolean>;
  hasWriters: (ticketId: string) => boolean;
  worktreePath: (slotId: number) => string;
  assertFrozen: (ticketId: string) => void;
}

interface PublicationContext {
  ticketId: string;
  slotId: number;
  cwd: string;
  branch: string;
  baseBranch: string;
  project: ProjectConfig;
  generation: number;
  identity: string;
  deadlineAt: number;
  expired: boolean;
  readOnly: boolean;
}

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export class AutonomousPartialDelivery {
  constructor(private readonly deps: AutonomousPartialDeliveryDependencies) {}

  async publish(ticketId: string, reason: string): Promise<void> {
    let pendingContext: PublicationContext | undefined;
    let attempted = false;
    try {
      const initial = this.ticket(ticketId);
      if (initial.autonomousState?.phase === "published_partial" && initial.autonomousState.execution?.publication.status === "confirmed" && initial.autonomousState.execution.publication.prUrl === initial.prUrl && initial.autonomousState.execution.publication.revision === initial.autonomousState.revision || initial.autonomousState?.deliveryConfirmation) return;
      this.deps.store.ensureAutonomousExecution(ticketId);
      this.deps.store.beginAutonomousFinalization(ticketId, reason);
      const context = this.context(ticketId, true);
      pendingContext = context;
      const execution = this.execution(ticketId);
      if (this.deps.store.getSlot(context.slotId)?.ticketId !== ticketId || this.ticket(ticketId).testing || this.ticket(ticketId).archived) throw new Error("Partial publication does not own the retained worktree.");
      this.deps.assertFrozen(ticketId);
      if (Date.now() >= context.deadlineAt) throw new Error("The partial publication reserve expired before writer closure.");
      if (execution.revocationReason === USER_CANCELLED || execution.userStopRequestedAt !== null) throw new Error("User cancellation does not authorize automatic partial publication.");
      if (execution.closure.status === "unknown") throw new Error("Writer closure is uncertain; the worktree and journals remain retained.");
      this.patchExecution(ticketId, { closure: { ...execution.closure, status: "requested", requestedAt: execution.closure.requestedAt ?? Date.now() } });
      let closed = false;
      try { closed = await this.bounded(context, () => this.deps.quiesce(ticketId)); } catch (error) {
        this.patchExecution(ticketId, { closure: { ...this.execution(ticketId).closure, status: "unknown" } });
        throw error;
      }
      if (!closed || this.deps.hasWriters(ticketId)) {
        this.patchExecution(ticketId, { closure: { ...this.execution(ticketId).closure, status: "unknown" } });
        throw new Error("Writer closure could not be confirmed; publication is blocked.");
      }
      this.patchExecution(ticketId, { closure: { ...this.execution(ticketId).closure, status: "confirmed", confirmedAt: Date.now() } });
      this.assertCurrent(context);
      if (this.state(ticketId).hostMutation) {
        await this.reconcileWithin(context);
        if (this.state(ticketId).hostMutation) throw new Error("An issued operation remains uncertain; no new effect is authorized.");
        if (this.execution(ticketId).publication.status === "confirmed") return;
      }
      this.deps.store.admitAutonomousPublication(ticketId);
      attempted = true;
      await this.verifyWorkspace(context);
      const snapshot = await this.bounded(context, () => this.deps.system.codeSnapshot(context.cwd));
      this.assertCurrent(context);
      const preparation = this.operation(context, "prepare_candidate", this.state(ticketId).revision ?? snapshot.fingerprint, snapshot.fingerprint);
      const prepared = await this.bounded(context, () => this.deps.system.prepareAutonomousCandidate(context.cwd, preparation));
      if (!prepared.ok || prepared.commitSha === null) throw new Error(prepared.reason || "Candidate preparation did not confirm a commit.");
      const candidateRevision = prepared.commitSha;
      this.assertCurrent(context);
      this.patch(ticketId, { revision: candidateRevision, hostMutation: null });
      this.patchExecution(ticketId, { publication: { ...this.execution(ticketId).publication, status: "candidate", revision: candidateRevision, bodyConfirmed: false, error: null } });
      await this.verifyWorkspace(context);
      const pushOptions = this.operation(context, "push_candidate", candidateRevision);
      const pushed = await this.bounded(context, () => this.deps.system.pushAutonomousCandidate(context.cwd, context.branch, pushOptions));
      if (!pushed.ok) throw new Error(pushed.reason);
      this.assertCurrent(context);
      this.patch(ticketId, { hostMutation: null });
      let prUrl = await this.findCandidate(context, candidateRevision);
      if (prUrl === null) {
        await this.verifyWorkspace(context);
        const createOptions = this.operation(context, "create_pr", candidateRevision);
        const created = await this.bounded(context, () => this.deps.system.createPr(context.cwd, context.baseBranch, {
          ...createOptions, draft: true, title: `${PARTIAL_PR_TITLE_PREFIX}${this.ticket(ticketId).title}`,
          body: this.section(ticketId, candidateRevision, reason), headBranch: context.branch, requireExistingBase: true,
        }, context.project.vcsProvider));
        if (!created.ok || !created.url) throw new Error(created.reason || "Pull request creation could not be confirmed.");
        this.deps.store.updateTicket(ticketId, { prUrl: created.url });
        this.patchExecution(ticketId, { publication: { ...this.execution(ticketId).publication, candidatePrUrl: created.url } });
        this.assertCurrent(context);
        await this.verifyCandidate(context, created.url, candidateRevision);
        this.patch(ticketId, { hostMutation: null });
        prUrl = created.url;
      }
      const candidatePrUrl = prUrl;
      this.deps.store.updateTicket(ticketId, { prUrl: candidatePrUrl });
      this.patchExecution(ticketId, { publication: { ...this.execution(ticketId).publication, candidatePrUrl: candidatePrUrl } });
      await this.verifyCandidate(context, candidatePrUrl, candidateRevision);
      const draftOptions = this.operation(context, "draft_pr", candidateRevision);
      const draft = await this.bounded(context, () => this.deps.system.convertPrToDraft(context.cwd, candidatePrUrl, context.project.vcsProvider, draftOptions));
      if (!draft.ok) throw new Error(draft.reason);
      this.assertCurrent(context);
      this.patch(ticketId, { hostMutation: null });
      await this.verifyCandidate(context, candidatePrUrl, candidateRevision);
      const body = await this.bounded(context, () => this.deps.system.readPrBody(context.cwd, candidatePrUrl, context.project.vcsProvider));
      if (body === null) throw new Error("The existing pull request body could not be read.");
      const expectedBody = withPartialPublication(body, ticketId, this.section(ticketId, candidateRevision, reason));
      const bodyOptions = this.operation(context, "update_pr_body", candidateRevision, digest(expectedBody));
      const updated = await this.bounded(context, () => this.deps.system.updatePrBody(context.cwd, candidatePrUrl, (current) => {
        if (current !== body) throw new Error("The pull request body changed before publication; human text was preserved.");
        return expectedBody;
      }, context.project.vcsProvider, bodyOptions));
      if (!updated.ok) throw new Error(updated.reason);
      this.assertCurrent(context);
      await this.confirmPublication(context, candidatePrUrl, candidateRevision, digest(expectedBody));
    } catch (error) {
      this.fail(ticketId, getErrorMessage(error));
      if (pendingContext && attempted && !pendingContext.expired) {
        try {
          this.assertCurrent(pendingContext);
          if (this.state(ticketId).hostMutation) await this.reconcileWithin(pendingContext);
          if (this.execution(ticketId).publication.status === "confirmed") return;
          const execution = this.execution(ticketId);
          if (!this.state(ticketId).hostMutation && execution.publicationAttempts < execution.maxPublicationAttempts) {
            pendingContext.expired = true;
            await this.publish(ticketId, reason);
            return;
          }
        } catch (reconciliationError) {
          this.fail(ticketId, getErrorMessage(reconciliationError));
        }
      }
      if (pendingContext) pendingContext.expired = true;
    }
  }

  async reconcile(ticketId: string): Promise<void> {
    const state = this.deps.store.getTicket(ticketId)?.autonomousState;
    if (!state?.execution || !state.hostMutation) return;
    try { await this.reconcileWithin(this.context(ticketId, false)); } catch (error) {
      this.fail(ticketId, getErrorMessage(error));
    }
  }

  private async reconcileWithin(context: PublicationContext): Promise<void> {
    this.assertCurrent(context);
    const mutation = this.state(context.ticketId).hostMutation;
    if (!mutation) return;
    await this.verifyWorkspace(context);
    const revision = await this.bounded(context, () => this.deps.system.captureValidationRevision({ repoPath: context.project.repoPath, sourcePath: context.cwd }));
    if (!revision.clean) throw new Error("The retained candidate is not clean enough for read-only reconciliation.");
    if (mutation.kind === "prepare_candidate") {
      const expectedFingerprint = mutation.operationId?.split(":").at(-1);
      const snapshot = await this.bounded(context, () => this.deps.system.codeSnapshot(context.cwd));
      if (!expectedFingerprint || snapshot.fingerprint !== expectedFingerprint) throw new Error("Candidate preparation remains uncertain; its original contents were not confirmed.");
      this.assertCurrent(context);
      this.patch(context.ticketId, { revision: revision.commitSha, hostMutation: null });
      this.patchExecution(context.ticketId, { publication: { ...this.execution(context.ticketId).publication, revision: revision.commitSha, status: "candidate", bodyConfirmed: false } });
      return;
    }
    if (revision.commitSha !== mutation.revision) throw new Error("The candidate commit changed after the issued operation.");
    if (mutation.kind === "push_candidate") {
      const remote = await this.bounded(context, () => this.deps.system.readAutonomousBranchHead(context.cwd, context.branch));
      if (!remote.ok || remote.commitSha !== revision.commitSha) throw new Error("The issued push remains uncertain; its exact remote commit was not confirmed.");
      this.assertCurrent(context);
      this.patch(context.ticketId, { hostMutation: null });
      return;
    }
    if (mutation.kind === "merge") throw new Error("A full-delivery merge cannot be reconciled by the partial publisher.");
    const prUrl = await this.findCandidate(context, revision.commitSha);
    if (!prUrl) throw new Error("The issued pull request operation remains uncertain; no unique matching open PR was found.");
    this.deps.store.updateTicket(context.ticketId, { prUrl });
    this.patchExecution(context.ticketId, { publication: { ...this.execution(context.ticketId).publication, candidatePrUrl: prUrl, revision: revision.commitSha, status: "candidate", bodyConfirmed: false } });
    if (mutation.kind === "create_pr") {
      this.patch(context.ticketId, { hostMutation: null });
      return;
    }
    if (mutation.kind === "draft_pr") {
      const prs = await this.bounded(context, () => this.deps.system.listOpenPrs(context.project.repoPath, context.project.vcsProvider));
      if (!prs.some((pr) => pr.url === prUrl && pr.isDraft)) throw new Error("The issued draft conversion remains uncertain.");
      this.assertCurrent(context);
      this.patch(context.ticketId, { hostMutation: null });
      return;
    }
    const expectedBodyDigest = mutation.operationId?.split(":").at(-1);
    if (!expectedBodyDigest) throw new Error("The issued description update lacks immutable readback evidence.");
    await this.confirmPublication(context, prUrl, revision.commitSha, expectedBodyDigest);
  }

  private async findCandidate(context: PublicationContext, revision: string): Promise<string | null> {
    const recorded = this.execution(context.ticketId).publication.candidatePrUrl ?? this.ticket(context.ticketId).prUrl;
    const prs = await this.bounded(context, () => this.deps.system.listOpenPrs(context.project.repoPath, context.project.vcsProvider));
    const matches = prs.filter((pr) => pr.headBranch === context.branch);
    if (matches.some((pr) => pr.baseBranch !== context.baseBranch)) throw new Error("An existing candidate pull request targets a different base branch; no duplicate will be created.");
    if (matches.length > 1) throw new Error("Multiple matching pull requests exist; publication identity is ambiguous.");
    const found = matches[0]?.url ?? recorded;
    if (!found) return null;
    if (recorded && matches[0] && recorded !== matches[0].url) throw new Error("The retained pull request identity conflicts with the current candidate.");
    await this.verifyCandidate(context, found, revision);
    return found;
  }

  private async confirmPublication(context: PublicationContext, prUrl: string, revision: string, expectedBodyDigest: string): Promise<void> {
    await this.verifyCandidate(context, prUrl, revision);
    const prs = await this.bounded(context, () => this.deps.system.listOpenPrs(context.project.repoPath, context.project.vcsProvider));
    const body = await this.bounded(context, () => this.deps.system.readPrBody(context.cwd, prUrl, context.project.vcsProvider));
    if (!prs.some((pr) => pr.url === prUrl && pr.isDraft) || body === null || digest(body) !== expectedBodyDigest) throw new Error("Partial publication draft and description readback did not confirm the candidate.");
    this.assertCurrent(context);
    const state = this.state(context.ticketId);
    const execution = this.execution(context.ticketId);
    const stopped = execution.userStopRequestedAt !== null;
    const ticket = this.ticket(context.ticketId);
    this.deps.store.updateTicket(context.ticketId, { column: stopped ? ticket.column : "to_review", stage: stopped ? ticket.stage : null, autoMerge: false, prUrl, error: stopped ? ticket.error : null,
      autonomousState: { ...state, phase: stopped ? state.phase : "published_partial", error: stopped ? state.error : null, hostMutation: null, revision,
        execution: { ...execution, publication: { status: "confirmed", candidatePrUrl: prUrl, prUrl, revision, bodyConfirmed: true, simulated: this.deps.system.dryRun, error: null } } },
    });
    this.deps.onChange(context.ticketId);
  }

  private async verifyWorkspace(context: PublicationContext): Promise<void> {
    this.assertCurrent(context);
    const result = await this.bounded(context, () => this.deps.system.verifyAutonomousWorkspace(context.cwd, context.project.repoPath, context.branch));
    if (!result.ok) throw new Error(result.reason);
    this.assertCurrent(context);
  }

  private async verifyCandidate(context: PublicationContext, prUrl: string, revision: string): Promise<void> {
    await this.verifyWorkspace(context);
    const result = await this.bounded(context, () => this.deps.system.verifyRecoveryCandidate({ repoPath: context.project.repoPath, slotPath: context.cwd, branch: context.branch, baseBranch: context.baseBranch, prUrl, commitSha: revision }, context.project.vcsProvider));
    if (!result.ok) throw new Error(result.reason);
    this.assertCurrent(context);
  }

  private operation(context: PublicationContext, kind: MutationKind, revision: string, proof?: string): PrMutationOptions {
    const operationId = `${randomUUID()}${proof ? `:${proof}` : ""}`;
    return { deadlineAt: context.deadlineAt, workspace: { repoPath: context.project.repoPath, branch: context.branch, commitSha: kind === "prepare_candidate" ? undefined : revision }, assertCurrent: () => {
      this.assertCurrent(context);
      const current = this.state(context.ticketId).hostMutation;
      if (current && current.operationId !== operationId) throw new Error("Another issued operation remains unresolved.");
      if (!current) this.patch(context.ticketId, { hostMutation: { kind, operationId, revision, startedAt: Date.now() } });
    } };
  }

  private context(ticketId: string, finalizing: boolean): PublicationContext {
    const ticket = this.ticket(ticketId);
    const execution = this.execution(ticketId);
    const project = this.deps.store.getProjectRow(ticket.project);
    if (!project || project.vcsProvider !== "github" || ticket.slotId === null || !ticket.branch) throw new Error("Partial publication requires an owned GitHub feature worktree.");
    const deadlineAt = finalizing ? execution.finalizationDeadlineAt : Date.now() + RECONCILIATION_TIMEOUT_MS;
    if (deadlineAt === null) throw new Error("Finalization must be durably admitted before publication.");
    return { ticketId, slotId: ticket.slotId, cwd: this.deps.worktreePath(ticket.slotId), branch: ticket.branch,
      baseBranch: ticket.baseBranch ?? project.baseBranch, project, generation: execution.generation,
      identity: this.identity(ticket, project), deadlineAt, expired: false, readOnly: !finalizing };
  }

  private identity(ticket: Ticket, project: ProjectConfig): string {
    return digest([ticket.project, ticket.title, ticket.description, ticket.prdMarkdown, ticket.branch, ticket.baseBranch, ticket.slotId,
      ticket.autonomousDelivery, ticket.autonomousMaxCorrections, ticket.autonomousTimeoutMinutes, ticket.autonomousMaxStarts, ticket.autonomousFinalizationMinutes, ticket.autonomousMaxPublicationAttempts,
      [project.repoPath, project.baseBranch, project.vcsProvider, project.githubAccount, project.scripts, project.validation],
      ticket.autonomousState?.plan, ticket.autonomousState?.sourceFingerprint, ticket.autonomousState?.configFingerprint, ticket.autonomousState?.planFingerprint]);
  }

  private assertCurrent(context: PublicationContext): void {
    const ticket = this.ticket(context.ticketId);
    const execution = this.execution(context.ticketId);
    const project = this.deps.store.getProjectRow(ticket.project);
    if (context.expired || Date.now() >= context.deadlineAt) throw new Error("The partial publication reserve expired; no further effect is authorized.");
    if (!project || this.identity(ticket, project) !== context.identity || execution.generation !== context.generation
      || this.deps.store.getSlot(context.slotId)?.ticketId !== ticket.id || execution.closure.status !== "confirmed"
      || this.deps.hasWriters(ticket.id) || !context.readOnly && (execution.revocationReason === USER_CANCELLED || execution.userStopRequestedAt !== null) || ticket.column === "abandoned" || ticket.testing || ticket.archived) {
      throw new Error("Partial publication ownership, writer closure or frozen configuration changed.");
    }
    this.deps.assertFrozen(ticket.id);
  }

  private bounded<T>(context: PublicationContext, operation: () => Promise<T>): Promise<T> {
    const remaining = context.deadlineAt - Date.now();
    if (remaining <= 0 || context.expired) { context.expired = true; return Promise.reject(new Error("The partial publication reserve expired.")); }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { context.expired = true; reject(new Error("The partial publication reserve expired while an operation was pending.")); }, remaining);
      Promise.resolve().then(operation).then((value) => { clearTimeout(timer); resolve(value); }, (error: unknown) => { clearTimeout(timer); reject(error); });
    });
  }

  private section(ticketId: string, revision: string, reason: string): string {
    return partialPublicationSection(this.deps.store, this.ticket(ticketId), this.state(ticketId), revision, reason);
  }

  private ticket(ticketId: string): Ticket {
    const ticket = this.deps.store.getTicket(ticketId);
    if (!ticket?.autonomous || ticket.kind !== "feature") throw new Error("A retained autonomous feature ticket is required.");
    return ticket;
  }

  private state(ticketId: string): AutonomousState {
    const state = this.ticket(ticketId).autonomousState;
    if (!state) throw new Error("The autonomous execution state is missing.");
    return state;
  }

  private execution(ticketId: string): AutonomousExecution {
    const execution = this.state(ticketId).execution;
    if (!execution) throw new Error("The bounded execution ledger is missing.");
    return execution;
  }

  private patch(ticketId: string, patch: Partial<AutonomousState>): void {
    this.deps.store.updateTicket(ticketId, { autonomousState: { ...this.state(ticketId), ...patch } });
    this.deps.onChange(ticketId);
  }

  private patchExecution(ticketId: string, patch: Partial<AutonomousExecution>): void {
    this.patch(ticketId, { execution: { ...this.execution(ticketId), ...patch } });
  }

  private fail(ticketId: string, error: string): void {
    const ticket = this.deps.store.getTicket(ticketId);
    const state = ticket?.autonomousState;
    if (!ticket || !state?.execution || state.execution.publication.status === "confirmed") return;
    this.deps.store.updateTicket(ticketId, { autoMerge: false, stage: "stalled", error,
      autonomousState: { ...state, phase: "publication_failed", error, execution: { ...state.execution,
        publication: { ...state.execution.publication, status: state.hostMutation ? "unknown" : "failed", error } } } });
    this.deps.onChange(ticketId);
  }
}

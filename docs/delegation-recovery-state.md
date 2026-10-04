# Delegation recovery implementation state

## Current state

- Date: 2026-10-04. Implementation and final combined-tree verification are complete. Delivery target: `main`. No live ticket mutation or application restart occurred.
- Source checkout: implementation began on `408c59f`; the recovery commit was then rebased without textual conflicts onto `928389b`, which arrived during the first push and adds browser-only functional validation. Both upstream validation changes are preserved. Pre-existing untracked reports and browser artifacts are outside this change.
- Incident: the browser-functional-validation ticket has an open PR but an exhausted failed backend lot and a blocked frontend lot. The orchestrator reports implementing both directly, following the fallback instruction. The implementation plan still prevents delivery.
- Initial identity-error cause: unverified. The saved journal identities match the current filesystem. The packaged application contains the same identity predicate as this checkout. Neither proves what was compared at the failure instant.
- Independent reviews: regression review and current-source review of the compatibility changes passed; simplification found no further changes. The independent system reviewer passed on the unchanged system layer.
- Final checks: typecheck and lint exited 0; the full suite passed 279 tests, 0 failed, 1,125 assertions across 38 files in 10.41 seconds (`/private/tmp/kanban-recovery-final-tests.log`); `git diff --check` passed. The web build passed after the `928389b` rebase and was reused because the late fixes changed backend code only; its large-chunk warning remains.
- Isolated verification: archive restoration after cleanup, missing/partial archive refusal, identity/conflict refusal, cancellation/restart integration replay, five ownership/simulation safety probes, and mocked GitHub/Azure candidate checks passed. Browser/API checks exercised both configured agent profiles, persistence after restart, stale generations, required reasons, history, manual-done refusal and inconclusive simulated assessment. These are not live-provider validation.
- Review findings resolved: authoritative ownership/generation checks after awaited operations; assessment/resumption after provisional reconciliation; interactive test-slot exclusion; recovery provenance retention; Azure fork/current-source checks; child HEAD in archive identity; retained-journal-only integration recovery; and no refund of historical code attempts during a failed resumed startup.
- Focused compatibility fixture: all six temporary overlap cases passed—missing PR blocked by the strict guard; full and functional settlement; PR/candidate drift retained the slot; cancellation and review-cycle reset preserved the guard; terminal correction resumed only with immutable source/criteria; and boot interruption during verification retained the slot.
- The running desktop application is not updated by a source push. Runtime validation requires an updated build and relaunch; live provider flows and recovery of the original ticket remain unverified operational work.

## Verified defects and existing limits

1. The contract permits direct implementation after delegated retry exhaustion, but the plan gate requires every lot to be completed. There is no supported transition recording that takeover. Sources: `src/server/agents/contract.ts`, `src/server/agents/sessionHub.ts`, `src/server/agents/delegationManager.ts`.
2. A delegation start is recorded before workspace preparation and child startup. These failures consume the same retry accounting as an actual implementation failure. Child execution and integration failure also settle into the same failed outcome. Sources: `src/server/agents/delegationManager.ts`, `src/server/db/store.ts`.
3. Moving a failed card to the done column does not perform delivery, register its PR, clear its failed stage or release its slot. Sources: `src/server/routes.ts`, `src/server/lifecycle.ts`.
4. Reviews are tied to a code fingerprint, but ordinary feature delivery checks do not prove that the supplied PR head matches the ticket revision. They also do not require all quality evidence to pass: incomplete quality can be recorded as reservations and disable automatic merge. Recovery must preserve that distinction. Sources: `src/server/agents/delegationManager.ts`, `src/server/agents/slotManager.ts`, `src/server/system/real.ts`, `src/server/system/vcs/github.ts`, `src/server/system/vcs/azureDevops.ts`.

## Implemented recovery invariants

### Record the failing phase and recover only that phase

Persist whether a failure happened during preparation, provider startup, child execution or integration. Keep infrastructure retries bounded separately from the child's code-correction allowance. An identity mismatch must stop with an actionable diagnostic rather than automatically repeat the same preparation. Classify older failures as unknown unless recorded evidence supports a phase.

If the child already produced a successful result, retain that result separately from integration status. A recoverable integration failure may retry integration using the same recorded scope, cycle and journal, without asking another child to redo the code. Existing identity, revision, conflict, scope and idempotency checks remain mandatory. An identity mismatch never authorizes replay onto a different parent, rewriting the saved identity or deleting the child's work.

### Make direct takeover an explicit, durable transition

Introduce one recovery operation for the remaining obligations of a plan, usable through the ticket recovery UI and the orchestrator's bounded recovery contract. It must record the initiating actor and reason; an ordinary status change or a statement in a comment is insufficient.

For the initial implementation, takeover covers all remaining lots together. This avoids concurrent ownership between the orchestrator and a still-scheduled dependent lot. Preserve successfully integrated lots, all failed attempts and their diagnostics. List every unresolved requirement, including blocked descendants, as part of the recovery request.

Before takeover, freeze scheduling for the plan, stop and drain delegated writers, reconcile any integration already in progress, and confirm ticket/slot ownership. Persist a recovery generation so late callbacks cannot update the recovered plan. Preserve unresolved child work and journals; never reset or discard them as a side effect of takeover.

Normal slot release also cleans up delegated workspaces, so preserving them only during takeover is insufficient. Before finalization can trigger cleanup, retain all unreconciled child changes and journals in a verified, recoverable local archive outside the slot cleanup scope, with a durable reference in the recovery record. Failed preservation must retain the slot and block cleanup. Restoration has been verified after deleting the original child: archives include the raw journal, full working files including ignored content, and an independently verified Git bundle. This intentionally includes installed dependencies, increasing local disk use; content and HEAD identities allow identical preservation requests to reuse an archive.

Record recovery as pending, distinct from successful delegated execution. The orchestrator may then finish the missing work, or submit the already-existing candidate for assessment. An existing PR is not required to begin takeover, because PR creation normally happens later in delivery.

### Validate the recovered candidate before completion

Capture a clean candidate revision and its code fingerprint. Reviewers must receive the original remaining lot requirements as well as the candidate diff; PR existence or changed filenames cannot establish that the blocked work was done. Reuse required technical checks and review infrastructure, while keeping requirement-coverage assessment separate from the delivery policy for quality reservations.

Factor review assessment from the current implementation-completion prerequisite so recovery can assess a candidate whose lots are unresolved. Only the recovery generation owning the frozen plan may bypass that prerequisite, and starting assessment must not reactivate pending lots. Distinguish unresolved or pending obligations from actual preparing, running, integrating or closing writers: the former must be assessable while the latter remain an absolute review/finalization blocker. Do not weaken the ordinary completion gate. Require affirmative coverage of every required remaining obligation, independently of the ordinary review-pass allowance; missing or inconclusive coverage blocks reconciliation even after that allowance is exhausted. Other review findings and quality reservations retain their existing delivery policy. Record the recovered lots as resolved only after assessment succeeds, with durable provenance identifying the candidate, obligations and assessment evidence. Do not manufacture successful child attempts.

At delivery, explicitly verify the configured repository, expected source and target branches, PR state and exact PR head against the candidate. Recheck plan generation, slot ownership, clean candidate and current review evidence before applying the resolution and normal finalization. Any changed candidate invalidates its assessment. A failure retains the slot and an actionable diagnostic.

Use the existing finalization path to register the PR, set the terminal stage and release the slot. Preserve existing review policy, quality reservations and automatic-merge restrictions. Persist enough progress to resume safely after a crash between plan reconciliation and final slot release, without duplicate delivery or loss of the candidate.

### Preserve recovery ownership across quality corrections

A quality correction on a ticket with held implementation recovery must not reset the recovery plan or its review provenance. Refuse to start a new correction while that recovery owns the slot, and make review-cycle reset reject any attempt to delete the held plan. If a correction settles during recovery, verify delivery through the same implementation recovery candidate guard using the ticket's original PR URL; if the PR, candidate or ownership has drifted, keep the slot and recovery artifacts for explicit recovery.

After a restart, resume an active correcting iteration in place with its recorded criteria snapshot and trigger (functional or full). If only a terminal interrupted or failed correction remains, create a continuation only when its source run still matches the frozen criteria and the original PR URL, branch and ticket requirements are unchanged; preserve the recorded trigger. Before spawning the provider, recheck ticket, slot, branch, project and recovery-generation ownership. If restart interrupted verification, record the iteration as interrupted and retain the slot for explicit resumption; do not report that verification resumed automatically. Block implementation-recovery mutations while quality verification is in progress.

For a feature ticket that owns a slot and has unresolved implementation obligations, reject a direct move to the done column and point to recovery. Enforce this in the backend as well as the UI. Do not change unrelated board movement semantics.

### Diagnose the original identity error without weakening its guard

At the failing assertion, capture expected and observed canonical paths, filesystem identities and revision where available, together with ticket, slot, lot, cycle, operation phase, journal phase, timestamp and backend build revision. Store the values actually used in the comparison, not a later replacement observation. Keep command contents and credentials out of diagnostics.

This instrumentation is necessary to diagnose the initial refusal. The proposal fixes the confirmed recovery dead end; it does not claim to have found or corrected an unexplained identity mismatch.

## Verification scenarios

- Preparation/startup failures do not consume code-correction attempts; infrastructure recovery remains bounded.
- A successful child followed by recoverable integration failure is integrated without another child run.
- Identity, revision, scope and conflicting-change checks still refuse unsafe integration.
- Recovery cannot omit a blocked requirement, adopt an unrelated PR, reuse stale reviews, run alongside a delegated writer, or complete after slot ownership changes.
- Dirty or changed candidates, wrong repository/branches/head, and incompatible PR state are rejected.
- Restart, concurrent recovery requests, late callbacks and a crash during finalization do not apply work twice, resurrect scheduling or leak a slot.
- Final slot cleanup cannot remove unreconciled child work before a verified recoverable archive is durably recorded; failed preservation leaves the slot available for recovery, and archive restoration remains possible after restart.
- Recovery assessment accepts unresolved obligations for inspection but refuses actual writers; review-budget exhaustion cannot certify an omitted required obligation.
- Existing failed history and quality reservations remain visible; recovery does not silently enable automatic merge.
- A quality correction cannot erase a held recovery plan; correction settlement verifies the original PR and assessed candidate, and drift keeps the slot held.
- Restart during correction preserves the active iteration's criteria and functional/full trigger; a terminal correction resumes only if its source, frozen criteria, original PR, branch and requirements still match. Restart during verification retains the slot as interrupted until explicit resumption, and recovery mutations are refused while verification is active.
- Exercise shared behavior with Claude and Codex, and PR identity checks with GitHub and Azure DevOps. Distinguish fixture checks from live-provider validation.

Relevant existing fixtures include `src/server/agents/delegationManager.test.ts`, `src/server/agents/slotManager.test.ts`, `src/server/db/store.execution.test.ts` and `src/server/routes.codex.test.ts`. No test files were added; existing checks and temporary isolated reproductions were used. Playwright MCP could not open its already-owned browser profile, so browser checks used a separate task-owned in-app browser tab. Temporary servers and that tab were closed after verification. Only Vite development hot-reload WebSocket errors were observed in the browser console, without application-source errors.

Real Claude/Codex recovery assessment and real GitHub/Azure delivery remain unverified. The original worktree-identity refusal also remains unexplained; its new diagnostics are intended to preserve the comparison values if it occurs again. Pushing source does not update the running packaged application or change the original failed card.

## Review history

- Initial independent Sol/high review: supported phase-specific recovery and explicit reconciliation. Required exact PR/candidate identity checks, explicit coverage of blocked obligations, durable recovery provenance, writer draining, stale-callback rejection and preservation of quality reservations. These requirements are incorporated above.
- Final proposal review: found that normal slot cleanup can delete the child work preserved during takeover. Added verified archival before cleanup, separation of unresolved obligations from active writers, and a mandatory obligation-coverage verdict independent of ordinary review-budget exhaustion.
- Implementation reviews: addressed Azure source identity, archive identity, async cancellation/ownership races, user test-slot protection, provisional-resolution recovery, simulation refusal, startup attempt accounting and integration-only retry. Final core/UI and system verdicts both passed.

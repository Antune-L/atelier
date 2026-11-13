# Local autonomous pilot

The **Devin (internal autonomous mode)** option reuses Claude or Codex on the machine running Kanban Agents. Coolify hosts the application preview. Remote implementation workers are outside this pilot.

The pilot is enabled by default on GitHub projects when `KANBAN_AUTONOMOUS_PILOT` is unset. Set `KANBAN_AUTONOMOUS_PILOT=0` in the backend environment to disable it; explicit `KANBAN_AUTONOMOUS_PILOT=1` also enables it. Other values leave it disabled. Availability is not evidence that a provider, repository or delivery outcome has been qualified. Ordinary cards and Azure DevOps workflows remain available independently.

## Card configuration

Create an independent feature card and explicitly choose **Create the PR without merging** or **Merge after successful checks**. The delivery choice is persisted separately from the ordinary `autoMerge` option, which is disabled for autonomous cards. Creation leaves the card in TODO unless launch is explicitly requested.

The default correction budget is one correction and the default execution deadline is 180 minutes. Both are visible and configurable before launch. Restart or retry preserves the original budget and deadline. The first pilot excludes split families, dependent cards, Composer, direct push and stealth delivery. Batch creation from PRDs and CSV does not enable this mode.

## Execution

1. The agent submits its initial plan through `submit_autonomous_plan`, including every required case, expected behavior, interaction type and whether unit tests exist. The backend checks prepared Coolify access and freezes acceptance and functional snapshots.
2. When unit tests exist, a successful `unit-tests` preparation lot precedes feature implementation. The agent delegates implementation in the retained worktree and obtains an approved independent review of the current candidate.
3. `validate_autonomous` checks the clean, pushed commit and starts independent local verification. Manual and autonomous quality validation share one global admission gate. The local run requires passing technical checks and no failed case. A case it cannot observe without a browser stays inconclusive and is deferred to the preview; a timeout or permission denial still blocks.
4. The backend creates a ticket-owned branch preview without opening a PR. The source commit and confirmed deployed commit must match. Every frozen functional case is checked on that preview.
5. Code failures can return to the same implementation session within the retained correction budget. Missing access, inconclusive observations, infrastructure errors, stale evidence and cleanup failures block delivery. A run left inconclusive by an environment blocker or a timeout is retried once per commit, outside the correction budget; missing test data and required authentication are not retried. A simulated run never supplies accepted delivery evidence.
6. Once both proofs accept the same commit, `deliver_autonomous` supplies the PR title and body. The server verifies the proof and host identity before creating or reconciling the PR. Agent sessions cannot publish or merge it themselves.
7. PR-only delivery verifies the PR and never requests a merge. Merge delivery verifies native policies and uses GitHub's synchronous merge endpoint with the expected source commit. A repository requiring a merge queue blocks this pilot instead of silently enqueueing work. Only a confirmed merge counts as merged.
8. The backend persists the confirmed host outcome, cleans the owned preview, then completes the card and releases its slot. Cleanup failure retains the confirmation and worktree for reconciliation without repeating delivery.

## Persistent implementation lots

One autonomous feature ticket can submit its existing persistent implementation plan after freezing the business plan. Independent scopes retain parallel implementation; consumers wait for their prerequisites. No campaign or additional orchestration engine is required.

Each autonomous lot receives a separate backend-triggered simplifier turn, including correction lots. The backend requires a completed, correlated inspection rather than a summary claiming simplification. It then serializes integration and configured technical controls for that ticket, captures the simplified source and assembled file identities, and persists command outcomes. A lot without accepted real controls cannot complete or unblock a consumer. The initial unit-test preparation can skip the behavioral test command because its new assertions may intentionally fail before implementation; the reason is retained, and available lint/type checks still apply.

Autonomous plan lots explicitly declare `validation: "functional"` when a user journey applies. The backend runs the repository's existing `test:e2e` or `e2e` script; its environment must already be isolated and authorized for the project. A missing suite blocks the lot. A technical-only lot requires `validation: "technical"` and a concrete `validationReason`. The independent source auditor checks these applicability declarations. This runner does not provision a preview for every lot; the final preview validation remains separate and mandatory. Real email testing still needs authorization.

Prerequisite evidence must match the current scoped files and project validation configuration before consumption. Interrupted or uncertain steps retain their work and block explicitly. Integration recovery reuses a successful integration journal and reruns checks, rather than applying the child changes twice. External changes that invalidate simplification need correction or explicit recovery; a restart does not invent replacement proof.

For autonomous persistent plans, final review requires independent approval of the current code even after the ordinary review budget is exhausted. Correct accepted objections through delegated lots and rerun relevant checks and reviews; preserve the reasoning for rejected objections in the next review context. Exhaustion retains the work instead of making incomplete review acceptable. Final whole-candidate checks supersede earlier assembly fingerprints after legitimate descendant changes, while every lot must retain its accepted quality step.

Original spec and mockup coverage is independently audited as described in [Autonomous original-source coverage](autonomous-source-coverage.md). Missing original sources, unapproved scope changes and unavailable validation prerequisites prevent a complete delivery claim.

## Campaign final card

An [autonomous campaign](campaigns.md) creates one autonomous card at finalization. It is linked to the campaign instead of using a dependency or split order, so the pilot accepts it. It adopts the existing campaign branch rather than creating its own, while its pull request targets the base branch: work base and pull request target are separate only for this card. Its delivery is always **Create the PR without merging**; a merge delivery is refused. Its preview is torn down after delivery like any autonomous card's. Ordinary campaign cards are not autonomous: they run the ordinary pipeline and the campaign merges them into its branch.

## Recovery and access

The plan, commit, run identifiers, preview ownership, delivery choice and host confirmation survive restart. Interrupted validation can be retried after its environment cleanup completes. A paused run keeps its session waiting; **Reprendre le parcours** in the Validation tab asks that session to call `validate_autonomous` again, so the review gate and pushed-commit checks still apply. It fails when the session is unreachable. A confirmed host outcome cannot be rolled back through abandonment or an agent failure while cleanup is pending.

Cancellation and deadline handling wait for an active delivery operation before changing or releasing its resources. An already-issued GitHub request cannot be undone. If its result is uncertain, a persisted operation marker retains the proof, preview and worktree until read-only reconciliation confirms the exact remote outcome; it prevents blind retries and further host mutations.

Disabling the pilot still permits retained uncertain or confirmed deliveries to regain their session for reconciliation and cleanup. It blocks new host requests, preview deployment and delegated implementation.

Prepared preview HTTP Basic credentials are injected by the server and redacted from persisted diagnostics and continuation prompts. Business login, MFA and CAPTCHA are not automatically bypassed; missing access remains a blocking prerequisite. Preview recipes, test accounts, seed data and external effects must be qualified for the target project before real evaluation. The recipe's optional `testData` field describes the seeded data and simulated behaviour: the planning agent must write only cases reachable with it, or add the missing seed data on its branch, and the browser validator receives it to locate seeded records. A case whose data are missing ends inconclusive and blocks delivery without consuming the correction budget. Real email testing requires separate authorization.

The shared tool contract and publishing guard cover Claude and Codex. Automated checks and dry-run browser observations do not qualify real providers, Coolify deployment or GitHub delivery. Those combinations still need controlled live validation despite the option being available by default.

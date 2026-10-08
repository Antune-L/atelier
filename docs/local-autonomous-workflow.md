# Local autonomous pilot

The **Devin (internal autonomous mode)** option reuses Claude or Codex on the machine running Kanban Agents. Coolify hosts the application preview. Remote implementation workers are outside this pilot.

The pilot is enabled by default on GitHub projects when `KANBAN_AUTONOMOUS_PILOT` is unset. Set `KANBAN_AUTONOMOUS_PILOT=0` in the backend environment to disable it; explicit `KANBAN_AUTONOMOUS_PILOT=1` also enables it. Other values leave it disabled. Availability is not evidence that a provider, repository or delivery outcome has been qualified. Ordinary cards and Azure DevOps workflows remain available independently.

## Card configuration

Create an independent feature card and explicitly choose **Create the PR without merging** or **Merge after successful checks**. The delivery choice is persisted separately from the ordinary `autoMerge` option, which is disabled for autonomous cards. Creation leaves the card in TODO unless launch is explicitly requested.

The default correction budget is one correction and the default execution deadline is sixty minutes. Both are visible and configurable before launch. Restart or retry preserves the original budget and deadline. The first pilot excludes split families, dependent cards, Composer, direct push and stealth delivery. Batch creation from PRDs and CSV does not enable this mode.

## Execution

1. The agent submits its initial plan through `submit_autonomous_plan`, including every required case, expected behavior, interaction type and whether unit tests exist. The backend checks prepared Coolify access and freezes acceptance and functional snapshots.
2. When unit tests exist, a successful `unit-tests` preparation lot precedes feature implementation. The agent delegates implementation in the retained worktree and obtains an approved independent review of the current candidate.
3. `validate_autonomous` checks the clean, pushed commit and starts independent local verification. Manual and autonomous quality validation share one global admission gate.
4. The backend creates a ticket-owned branch preview without opening a PR. The source commit and confirmed deployed commit must match. Every frozen functional case is checked on that preview.
5. Code failures can return to the same implementation session within the retained correction budget. Missing access, inconclusive observations, infrastructure errors, stale evidence and cleanup failures block delivery. A simulated run never supplies accepted delivery evidence.
6. Once both proofs accept the same commit, `deliver_autonomous` supplies the PR title and body. The server verifies the proof and host identity before creating or reconciling the PR. Agent sessions cannot publish or merge it themselves.
7. PR-only delivery verifies the PR and never requests a merge. Merge delivery verifies native policies and uses GitHub's synchronous merge endpoint with the expected source commit. A repository requiring a merge queue blocks this pilot instead of silently enqueueing work. Only a confirmed merge counts as merged.
8. The backend persists the confirmed host outcome, cleans the owned preview, then completes the card and releases its slot. Cleanup failure retains the confirmation and worktree for reconciliation without repeating delivery.

## Recovery and access

The plan, commit, run identifiers, preview ownership, delivery choice and host confirmation survive restart. Interrupted validation can be retried after its environment cleanup completes. A confirmed host outcome cannot be rolled back through abandonment or an agent failure while cleanup is pending.

Cancellation and deadline handling wait for an active delivery operation before changing or releasing its resources. An already-issued GitHub request cannot be undone. If its result is uncertain, a persisted operation marker retains the proof, preview and worktree until read-only reconciliation confirms the exact remote outcome; it prevents blind retries and further host mutations.

Disabling the pilot still permits retained uncertain or confirmed deliveries to regain their session for reconciliation and cleanup. It blocks new host requests, preview deployment and delegated implementation.

Prepared preview HTTP Basic credentials are injected by the server and redacted from persisted diagnostics and continuation prompts. Business login, MFA and CAPTCHA are not automatically bypassed; missing access remains a blocking prerequisite. Preview recipes, test accounts, seed data and external effects must be qualified for the target project before real evaluation. Real email testing requires separate authorization.

The shared tool contract and publishing guard cover Claude and Codex. Automated checks and dry-run browser observations do not qualify real providers, Coolify deployment or GitHub delivery. Those combinations still need controlled live validation despite the option being available by default.

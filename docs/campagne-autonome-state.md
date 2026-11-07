# Autonomous campaign — working state

## Current state

- PRD: `plans/20261107-campagne-autonome.prd.json` in the main checkout (`/Users/antoineliu/kanban-agents`, untracked: `plans/` is gitignored). Started from revision 10.
- Worktree: `/Users/antoineliu/.t3/worktrees/kanban-agents/feat-campagne-autonome`. Base: `origin/main` at `dd73e47` (it already ships 10 public MCP tools, not 8: `list_open_prs` and `create_review_ticket` landed before this work).
- Branch stack (each PR targets the branch below it):
  - `feat/campagne-t1-storage` (T1) → `main`
  - `feat/campagne-t2-plan-intake` (T2, plus simplify commit `d3509ec`) → T1
  - `feat/campagne-t9-adopt-mother` (T9) → T2
  - T3, T5, T6, T7, T10 stack above T9 in that order.
  - `feat/campagne-t4-memory-admission` (T4) → `main`, independent.
- Next action: finish T3 (campaign engine), then T5, T6, T7, T10 docs; T8 stops before any VPS action.

## Design decisions (verified against the code)

- No mother ticket. The campaign row owns the mother branch, so the split mother's `done` column can never trigger finalization and nothing new appears in statistics.
- Campaign cards are ordinary feature tickets with `dependsOn = null` and `baseBranch = <mother>`: `resolveBaseBranch` forks them from the mother and `resolvePrTargetBaseBranch` targets the mother. Multiple prerequisites live in the campaign plan; `dependsOn`, `isDependencyReady` and `prdMarkdown` stay single-parent and unchanged for ordinary cards.
- Cards are created with `autoMerge = false`. The campaign engine performs every merge into the mother through a journaled operation, after checking the campaign state (not paused, not finalizing), the PR target (the mother, never the base branch: NFR1) and a clean review (`skipMerge` false). Conflicts get one bounded resolution (`AUTO_MERGE_RESOLVE_MAX`).
- The final card is an autonomous (Devin) ticket with `baseBranch = main`, no `dependsOn`/`childOrder`, linked through `campaigns.final_ticket_id`. `resolveAdoptedWorkBranch` makes `launchInSlot` check out the existing mother branch instead of forking (T9).
- FR15: the VPS cannot call the Mac (the bridge is Mac-initiated only, `vpsBridge.ts`). `install_campaign_skill` therefore accepts the skill folder sent by the Orchestrator (its "Copier vers…" transfer from the other machine) or fetches skillzer at the pinned commit `8f3ccad6e73c4629c51c1ffed535009bf32eeac2` (verified with `git ls-tree`: contains `argus-review`, not `simplifier`).
- Implementer caps live in `src/shared/constants.ts` (not `src/server/constants.ts`).

## Verified findings

- No existing quota-refusal detection: Claude `rate_limit_event.status` is only rendered, Codex `describeCodexError` has no quota branch (`codexProvider.ts:274-292`). T5 must add detection.
- `SlotManager.pumpQueue` has no admission gate; campaign start gating goes through `CampaignSlotHooks.assertMayStart` in `startReadyTicket` and `retry`.
- Autonomous previews are always stopped at delivery (`autonomousWorkflow.finishDelivery`) and refused once `deliveryConfirmation` exists (`previewManager.ts:612-619`). T6 must add retention until the review time.
- The preview broker allows 3 active previews by default (`deploy/preview-broker/broker.ts:11`); there is no capacity API, so readiness counts non-cleaned previews plus reservations of other approved campaigns.

## Checks

- T1+T2: typecheck, lint pass; `bun test` 940 pass, 3 skip, 0 fail. Simplifier and regression-check: no regression (10 existing public MCP tools and the remote MCP list unchanged, schema additive).
- T4: typecheck, lint pass; `bun test` 925 pass after rebase on `dd73e47`. Simulated only (fake cgroup/disk readers); the real VPS cgroup read is unverified.

## Open questions

- T4: memory only restricts admission above the first 4 implementers (to keep today's behaviour without configuration). Keep that floor? (recommended: yes)
- T4: the free-disk threshold (2 GB, `KANBAN_MIN_FREE_DISK_MB`, `0` disables) is on by default. Keep it? (recommended: yes)

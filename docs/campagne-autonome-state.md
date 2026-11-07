# Autonomous campaign — working state

## Current state (2026-11-07)

- PRD: `plans/20261107-campagne-autonome.prd.json` in the main checkout (`/Users/antoineliu/kanban-agents`, untracked: `plans/` is gitignored). Now **revision 11**: FR14 attached to T2 and T3, FR15 to T2 (acceptance and boundaries added); `.prd.html` re-rendered. `.complet.html` (PRD + Orchestrator mockup) was not regenerated.
- Base: `origin/main` at `dd73e47` (it already ships 10 public MCP tools, not 8).
- Pull requests (all draft, none merged):

| Task | Branch | PR | Base |
| --- | --- | --- | --- |
| T1 storage | `feat/campagne-t1-storage` | #270 | `main` |
| T2 plan intake, FR14, FR15 | `feat/campagne-t2-plan-intake` | #271 | T1 |
| T9 adopt mother branch | `feat/campagne-t9-adopt-mother` | #273 | T2 |
| T3 engine | `feat/campagne-t3-engine` | #274 | T9 |
| T5 quota pause | `feat/campagne-t5-quota` | #275 | T3 |
| T6 finalization | `feat/campagne-t6-finalization` | #276 | T5 |
| T7 report, commands, FR10 | `feat/campagne-t7-report` | #277 | T6 |
| T10 VPS config and docs | `feat/campagne-t10-ops` | #278 | T7 |
| T4 memory admission | `feat/campagne-t4-memory-admission` | #272 | `main` |

- Every PR had a simplifier pass and a regression-check before opening; each review found and fixed real defects (listed in the PR bodies).
- Next action: wait for the user's decisions (merge order, VPS steps of T10, T8 real run); nothing on the VPS was touched.

## Design decisions (verified against the code)

- No mother ticket. The campaign row owns the mother branch, so the split mother's `done` column never triggers finalization and statistics are unchanged.
- Campaign cards are ordinary feature tickets with `dependsOn = null`, `baseBranch = <mother>` and `autoMerge = false`: they fork from and target the mother. Multiple prerequisites live in the campaign plan; `dependsOn`, `isDependencyReady` and `prdMarkdown` stay single-parent and unchanged.
- The engine performs every merge into the mother through a journaled operation (PR re-read first, target must be the mother, review clean), one bounded conflict resolution.
- The final card is an autonomous (Devin) ticket, `pr_only`, `baseBranch = main`, linked through `campaigns.final_ticket_id`; `resolveAdoptedWorkBranch` makes it check out the existing mother branch (T9). Its preview is kept until the review time.
- FR15: the VPS cannot call the Mac (bridge is Mac-initiated). `install_campaign_skill` accepts the folder sent by the Orchestrator, or fetches skillzer at `8f3ccad6e73c4629c51c1ffed535009bf32eeac2` (verified: `argus-review` present, `simplifier` absent).
- Implementer caps live in `src/shared/constants.ts`, not `src/server/constants.ts`.

## Verified findings

- Before this work nothing detected a quota refusal; T5 adds detection for a rejected Claude rate-limit window and for session errors naming a usage limit (narrow pattern on purpose).
- Autonomous previews were always stopped at delivery and forced to stop afterwards; T6 adds retention for the campaign final card only.
- The preview broker allows 3 active previews by default and has no capacity API.

## Checks (latest)

- Stack tip (T10): typecheck and lint pass; `bun test` 971 pass, 3 skip, 0 fail.
- T4: 925 pass, 3 skip, 0 fail.
- Everything above is simulated (fake system, fake GitHub, fake slots). No real provider, GitHub or Coolify run has been done.

## T8 — real qualification on the VPS (prepared, not started)

Preconditions, each needing the user's approval:
1. Merge order: T4 and the campaign stack into `main` (user decision; nothing is merged).
2. On the VPS: `sudo kanban-upgrade --sha <merged sha>`, then `sudo kanban-bootstrap --sha <sha> --with-previews --with-campaigns --restart` (installs `campaigns.conf`, restarts only when idle). Record the `Config` section it prints: MemoryMax, drop-ins, KANBAN_SLOTS, campaign settings, and the broker's `maxActivePreviews`.
3. A disposable GitHub test repository with a Dockerfile preview recipe, a protected `main`, a `campaign/**` ruleset without required approval or merge queue, and CI on pull requests to `campaign/**`.
4. Mac switched off; the Orchestrator talks to the VPS public MCP only.

Scenario matrix (simulated coverage today → real run expected):

| # | Scenario | Expected state | Simulated by |
| --- | --- | --- | --- |
| 1 | Plan A → B, C, D independent, Claude | 4 PRs to the mother, B after A merged, final PR to main (non-draft), verdict ready or partial | `campaignEngine.test.ts` |
| 2 | Same with Codex cards | same | none (provider-independent code, real run required) |
| 3 | Restart during a card session | session interrupted, card repaired as incident, no duplicate card/PR | engine restart tests |
| 4 | Stop the service during a merge | journaled merge confirmed on GitHub after restart, not repeated | restart test |
| 5 | Conflict between two cards | one bounded resolution, then card and descendants blocked, others continue | conflict test |
| 6 | Question the plan does not settle (e.g. a real email) | card blocked, question in the report, no notification | engine sync (no dedicated test) |
| 7 | Quota exhausted at night | `quota_paused`, sessions stopped, progressive resume when observed quota returns | quota tests |
| 8 | Budget exhausted | no new start, finalization with what is merged | quota/budget test |
| 9 | Two campaigns on one repository | the second waits in `queued` | engine test |
| 10 | Preview cleanup failure | reported with its error, captures kept | finalization test |
| 11 | Resume later with a new deadline and budget | extension recorded, cards restart | command tests |
| 12 | Ordinary cards meanwhile (GitHub and Azure) | unchanged behaviour | full suite only |

Also measure the memory footprint per session (cgroup `memory.current` while N implementers run) and set `KANBAN_IMPLEMENTER_MEMORY_MB` / `KANBAN_MEMORY_RESERVE_MB` from it. No scenario sends real email.

## Open questions

- T4: memory only restricts admission above the first 4 implementers (to keep today's behaviour without configuration). Keep that floor? (recommended: yes)
- T4: the free-disk threshold (2 GB default, `KANBAN_MIN_FREE_DISK_MB`, `0` disables) is on by default, so even the first lot waits on a nearly full disk. Keep it? (recommended: yes)
- T5: the quota-error pattern is narrow and unverified against real Codex/Claude messages; widen it from messages captured in T8. A Codex usage-limit error inside a delegated child lot is not detected.
- Plan-level `quotaPolicy.fallbackProvider` is stored but never applied (FR9 only forbids switching without consent).
- Reopening a reported campaign relies on autonomous delivery reusing the open final PR from the mother branch; unverified.

# Recommended UX implementation state

## Current state

- Branch: `feat/ux-simplification-recommended`, based on `73edcfad8d13faf14c9e6d25170c4dd5219145b2`.
- Implementation revision: `5599960ffc8ca130535543a5af77d1916f00c6db`.
- Draft delivery: [PR #221](https://github.com/Antune-L/atelier/pull/221), registered with the current T3 thread.
- Current checkout: `/Users/antoineliu/kanban-agents` on the PR branch. The original validation copy remains detached at the delivery commit; the VPS is unchanged.
- Approved scope: all 49 audited surfaces, option A except option B for the Atelier agent panel.
- User follow-up: ticket creation starts with the branch, dependency and delivery options expanded; the native disclosure remains collapsible.
- All implementation lots are integrated and independently reviewed. Delivery is a draft pull request; no merge or deployment is included.
- Backend scope is limited to optional, validated PRD conversion edits applied before ticket creation and feasibility. Database schema, migrations, deployment, authentication, provider lifecycle and capability-probe implementations are unchanged.

## Verification

- Full implementation checks passed at revision `5599960`: typecheck, lint, web build and `bun test`.
- After the options follow-up, typecheck, lint and web build passed again. Browser acceptance verified default expansion, collapse, preservation while typing, manual reopening, expansion on a new form and no horizontal overflow at 390 pixels. No API mutation was submitted; no new tests were added for this native attribute change.
- Tests: 560 passed, 3 skipped, 0 failed, 2,148 assertions across 69 files. Skips include the existing adversarial case and two VPS script checks requiring unavailable shellcheck.
- The base revision also passed the same checks. The web build retains the existing large-chunk warning.
- Independent regression and simplifier reviews passed with no P1/P2 finding. Independent visual review accepted eight representative stable states; a minor profile-column alignment difference remains nonblocking.
- All 49 surfaces were visited in a real browser against the production-built UI at `http://localhost:53817`, served by an isolated dry-run backend.
- Saved defaults, profile and project edits were verified after reload and restored. CSV selection created only the selected edited TODO. New-ticket creation remained passive. Atelier conversion preserved edited text, dependency order and TODO state.
- Ticket navigation, collapsed journal, long PRD fixed actions, simulated/current/stale/failed evidence, read-only session and delivery restrictions were checked. Reading a notification did not resolve its review.
- Synthetic routine creation, editing, activation confirmation, fake execution, pause and deletion passed. Worktree search inclusion/exclusion, empty state and relaunch cancellation passed without starting a process.
- Ten invalid PRD override requests returned HTTP 400 without writes. Valid reversed task input created root then dependent ticket with exact edited values.
- Settings and preview mobile captures showed no horizontal page overflow. Phone, light-theme, keyboard and scrolling checks are bounded acceptance evidence, not an exhaustive device matrix.

## Coverage

| Area | Audited surfaces | Acceptance |
| --- | ---: | --- |
| Daily views | 5 | Board, decisions, agents, populated worktree filtering, preview retention and menu guards |
| Projects | 8 | Summary/editors, persisted edits, inspection, GitHub selection, validation and preview dependencies |
| Global settings | 9 | Appearance, defaults, quality, providers, profiles, skills, accounts, MCP and Coolify |
| Ticket workspace | 9 | Four destinations, brief, PRD, controls, evidence, session and delivery |
| Atelier | 6 | Saved stage, brief-first creation, conversation, agent settings, PRD exports and editable card confirmation |
| Tool flows | 7 | Ticket, CSV, review, clean, question, worktree and preview forms |
| Observability | 5 | Shared statistics scope, notifications, routines, editing and selected history |
| Total | 49 | Recommended choices integrated |

## Validation limits

- Browser writes were confined to copied synthetic data. No real Claude/Codex execution, GitHub/Azure publication, terminal lifecycle, Coolify deployment or VPS action was performed.
- Native MCP configuration was reviewed statically and through existing native-capability tests; the browser displayed its web capability notice.
- Empty onboarding and no-usage statistics used valid read-only response interception. Actual populated project filtering was checked separately.
- Original fixtures lacked historical Atelier PRD revisions and unavailable automation output. Those branches were reviewed statically rather than represented as live browser proof.
- Unconfigured Coolify returned its existing HTTP 409 response; the UI preserved the explanatory error and disabled deployment.
- Local acceptance does not replace smoke checks on the hosted environment after a separately authorized deployment.

## Environment lessons

- A custom Vite port can disagree with the existing Host/Origin guard. The built UI served from the backend origin was used for production-topology acceptance; the guard was not weakened.
- A SQLite backup retained WAL journal mode without sidecars and failed the startup read-only snapshot. Only the isolated copy was repaired and integrity checked; the source data was unchanged.
- Dependencies were installed from the frozen lockfile in this worktree. Package manifests and lockfiles were unchanged.
- The built dry-run preview remains available at `http://localhost:53817` for review, using only `/private/tmp/kanban-ux-implementation/enriched-data`. Setup is disabled; the development frontend on port 53818 is no longer needed.
- The preview now runs from the current project checkout and its rebuilt UI; the data root remains isolated and dry-run remains enabled.

## Evidence

Local evidence lives in `/private/tmp/kanban-ux-implementation`: `browser-acceptance.json`, `api-acceptance.md`, the three independent review reports and `checks/final-*.log`.
Captures live in `/Users/antoineliu/kanban-agents/.playwright-mcp`.

## Next action

Review the draft pull request. VPS deployment remains outside this delivery.

## History

- 2026-10-13: Read-only UX recommendation and VPS contract audit completed; isolated worktree created.
- 2026-10-13: User confirmed implementation after the initial regression checkpoint; baseline checks passed.
- 2026-10-13: All recommended surfaces integrated; two PRD conversion findings corrected and verified.
- 2026-10-13: Final existing checks, independent reviews and bounded browser acceptance completed.
- 2026-10-13: Implementation committed, branch published and draft PR #221 linked to the thread.
- 2026-10-13: User selected the PR branch in the project checkout, then requested expanded creation options. The one-attribute follow-up passed simplifier, regression and focused browser checks.

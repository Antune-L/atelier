# Daily audit — working state

## Current state

- Shipped on `main` as `d8d1a0f` (2026-10-21), built in worktree `/Users/antoineliu/kanban-agents-audit` (branch `feat/daily-audit`).
- Analysis: `plans/athena/2026-10-21-helios-audit/` in the main checkout (`report.md`, `report-v2.md`, `mockups.html`). The v2 report and the user's follow-up decisions are authoritative.
- The three lots (engine, backend, UI) are integrated on the shared contract `src/shared/audit.ts`, and the first review's fixes are applied.
- 2026-10-22: configurable cadence on branch `feat/audit-cadence` (worktree `/Users/antoineliu/kanban-agents-cadence`), mockup `plans/athena/2026-10-22-audit-cadence/mockup.html` in the main checkout. See "Cadence" below.

## User decisions (2026-10-21)

- The app owns the audit method; no link to the user's `helios-daily-audit` skill, no "Règles d'analyse" option.
- Many sub-agents in the analysis, adversarial review before any finding is shown.
- GitHub projects only; Azure DevOps disabled with a message.
- No GitHub issue publishing; results stay in the app.
- Meant to run on the VPS cloud host, still available on the desktop app. Each instance has its own database: the project checkbox decides where the audit runs.
- Branch: the project's base branch by default, another branch selectable (one branch per project).

## Design summary

- Pipeline: chunk × 4 lenses analysts → deterministic citation check and dedupe → one fresh batched verifier per chunk, a second verifier for critical candidates → confirmed / contested / rejected / unverified. No automatic arbiter; "Arbitrer (agent)" runs one on demand.
- One provider per run, read-only `auditor` role, only when no card work runs, daily session limit, restartable runs.
- Cards: never auto-merge, no automatic feasibility pass, provenance via `audit_findings.ticket_id`, auto-launch only for confirmed critical findings outside the 7-day observation window (set on the first enable only, on every host; re-enabling keeps the original window), never for findings of the security lens (`security` and `privacy`) on a repository that is not known to be private.

### Cadence

- Settings: `intervalHours` (6 to 336, default 24), `anchorDate` (date of a slot, null = fixed default anchor), `dailyTime` (anchor time), `skipWeekends`. Presets in the UI: 12 h, every day, every 2 days, weekly, plus custom hours.
- Slot math lives in `src/shared/auditSchedule.ts`, shared by the scheduler and the settings UI preview. Multiples of 24 h step calendar days at the local wall time (stable across DST); other intervals are fixed durations from the anchor.
- Weekend slots (project time zone) are skipped, not postponed; the next audit resumes from the cursor. A cadence that only lands on weekends is rejected.
- Consumption: `audit_project_state.last_scheduled_at` stores the last consumed slot. Rows written before this change only have `last_scheduled_date`, read as that date at `dailyTime`. Only the latest missed slot is caught up.
- Enabling the audit or changing the cadence marks the currently due slot as consumed, so the change applies from the next slot instead of starting an immediate run.

### Cursor semantics

- `coveredSha` advances chunk by chunk, in order, and stops before the first chunk that is not fully settled. A chunk is settled when its four analysts returned output and, if it has citation-checked candidates, its verifier batch returned (plus the second verifier when it holds a critical candidate). An abort (stop, yield to card work, shutdown), a session failure or a budget cut before verification leaves the run `partial` with the cursor before that chunk, so the next run re-analyses it ("L'audit reprendra au même commit").
- A chunk whose diff is empty (only excluded generated or lock files) launches no session and counts as settled; when every chunk is empty the run is `no_changes`.
- `no_changes` advances the cursor to the tip outside simulation. Simulated runs never move the cursor.
- A unit (first-parent commit) diff is read with a hard cap (`AUDIT_MAX_UNIT_DIFF_CHARS`); a capped read marks the chunk `partial` with a skipped entry naming the commit.
- `setStart` checks that the commit exists in the repository (shared object store of the analysis worktree). Limit: it does not check that the commit is on the first-parent chain of the audited branch (no `rev-list` on the adapter, `TODO(ali)` in `auditManager.ts`); a non-ancestor is only caught at run time as `rewritten`.

### Known findings and masking

- Analysts only see open findings (no decision, review state `confirmed` or `contested`). Dismissed and rejected findings are not listed, so analysts re-report them.
- The backend matches every re-report against the whole project history (fingerprint, or same file + symbol + similar title). A re-report of a finding with an active decision stays masked unless the resurface rule applies (`already_fixed` always resurfaces; other decisions resurface when a different commit touches the same symbol); `counts.masked` counts these suppressed re-reports.
- Dedupe inside a run: same file and same line is a duplicate only with the same class or a title token Jaccard ≥ 0.5; within 25 lines, only with a similar title.

### Prompt injection hardening

- Every untrusted block (changed file names, commit messages, pull request descriptions, known findings, diff, verifier candidates, arbiter finding and previous verdicts) is wrapped in `<untrusted-data id="NONCE" kind="…">` … `</untrusted-data id="NONCE">`, with a random nonce per run (per session for recheck and arbiter). The prompts state that only these delimiters bound data; no backtick fence wraps untrusted content.
- HTML comments are stripped from commit bodies and pull request descriptions before inlining, and from every model-written finding field and verdict reason before storage. The card description puts model-written fields in a labelled data section, and `findAuditMarker` takes the last marker, which the app always writes on the last line.

### Caps

- At most `AUDIT_MAX_PARALLEL_SESSIONS` audit sessions at once across the running audit and on-demand rechecks/arbiters (one shared gate). A recheck or arbiter request that finds the gate full gets HTTP 409 "Trop d'agents d'audit en cours, réessayez dans un instant.".
- Daily budget (`AUDIT_DAILY_SESSION_LIMIT`) counts recorded audit sessions plus the sessions reserved by in-flight rechecks/arbiters. A queued run starts only when the remaining budget covers one chunk (`AUDIT_MIN_RUN_SESSIONS` = 4 analysts + verifier + second verifier); otherwise it stays `waiting` with `waitingReason: "budget"` (`"cards_running"` when card work blocks it), shown in the UI.
- A recheck of a critical finding runs two independent sessions and becomes `confirmed` only when both confirm (mixed results are `contested`, a single surviving confirmation stays `unverified`). An arbiter verdict on a contested finding is decisive.

## Open hypotheses and blockers

- Codex file reads under bubblewrap on the VPS are unproven.
- Real VPS capacity for parallel sessions is unmeasured.
- Live structured output of the audit schemas on Claude and Codex is untested.

## Next action

- Review fixes applied on 2026-10-21 (cursor, masking, injection hardening, caps); typecheck, lint and dry-run tests pass. Next: live validation of one Claude and one Codex audit run on a test repository.

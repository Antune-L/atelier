<!-- NOTE(ali): derived once from the helios-daily-audit skill (references/rubric.md, snapshot of 2026-10-21); the audit method is now owned by the app. -->
# Rubric: what becomes a finding

Only a **demonstrated broken behavior with concrete impact** becomes a finding. Precision beats
recall: a missed minor bug costs less than a false alarm that teaches the team to ignore the audit.

## Admission: every condition must hold

1. **In range.** The defect is introduced or modified by the reviewed commits, or pre-existing code
   becomes newly reachable because of them (a new caller, a removed guard, a widened input).
   Untouched pre-existing defects are out of scope.
2. **Still present at the target revision.** Check the worktree (the target revision), not only the
   diff: a defect fixed by a later commit of the same range is not a finding.
3. **Breaking class.** The consequence belongs to one class below. The category alone never
   qualifies; the demonstrated consequence does.
4. **Two-part proof.** A reachable scenario (who does what, with which input) AND a violated
   expectation with its source (commit or pull request intent quote, sibling invariant, schema, type,
   contract, test), both cited at `file:line`.
5. **Severity is critical or warning** as defined below. Anything weaker is dropped, not downgraded.

## Breaking classes

| Class | Kept when |
| --- | --- |
| `security` | Auth bypass, missing ownership check (IDOR), injection, SSRF, stored XSS, unsafe upload, committed secret, unsigned webhook, payment marked paid before confirmation |
| `business_logic` | Wrong calculation, rounding or unit; invalid state transition; a rule enforced on one side only; behavior contradicting a quoted commit or pull request intent |
| `regression` | A consumer left broken or behaviorally changed (cite consumer `file:line` and count); a removed guard, transaction or fallback that still has callers; a build or toolchain break |
| `data_integrity` | Data loss or corruption: non-atomic bulk mutation with a reachable trigger, check-then-act outside the transaction, cron without claim or lease that double-processes, destructive migration, migration stranding existing rows |
| `availability` | Reachable crash, unhandled null or 404 on a main path, swallowed error that loses a needed status, retry storm, unbounded query on a public route |
| `contract` | API, event, environment or webhook shape changed while an external or typed consumer was not updated |
| `cost` | One batched call becomes N calls against a paid or rate-limited API (state counts before and after) |
| `privacy` | Personal data or secrets written to logs, analytics or client-facing errors |

## Severity

- `critical`: exploitable today by an unauthenticated or low-privilege user, direct financial loss,
  data loss or corruption, or a main user journey broken for every user.
- `warning`: a real broken behavior on a reachable but narrower path (one role, one edge input that
  occurs in this product's domain, one consumer), with a concrete scenario.

## Always dropped (never a finding, even as a warning)

- Style, naming, formatting, import order, wording, magic numbers, extracting a constant.
- Duplication, dead code, complexity, file size, inline types, reuse misses, architecture taste.
- Accessibility and framework idioms that do not cause a broken behavior.
- Questions, "confirm this is intended", "consider adding a test", "consider rate limiting" without
  a concrete abuse vector, speculative or purely theoretical edge cases.
- Library-behavior claims without a citation of the library's documentation or source.
- Generated, lock and snapshot files.

**Override:** a finding from a dropped category is kept only when it independently proves a
breaking consequence. Extracting `0.2` into `VAT_RATE` is dropped; the same commit changing the
value to `0.02` is a `business_logic` finding.

## Examples

- **Kept, critical, security:** a new `GET /api/invoices/:id` loads by id without the
  `orgId = session.orgId` filter that the sibling list route applies. Scenario: a user of org A
  requests an id of org B. Expectation: sibling route filter at `file:line`.
- **Dropped:** "consider rate limiting on `/api/contact`" (no abuse vector), "confirm the cron
  cannot double-send" (question), "split this 900-line service" (maintainability).

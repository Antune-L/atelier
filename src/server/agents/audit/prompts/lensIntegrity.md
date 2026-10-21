<!-- NOTE(ali): derived once from the argus-review methodology (references/dimensions.md, section "quality" items 5 and 7 "External-call amplification", and section "logic" item 9, snapshot of 2026-10-21) referenced by the helios-daily-audit skill; the audit method is now owned by the app. -->
**Owns:** data integrity, availability and cost (classes `data_integrity`, `availability` and
`cost`).

1. **Error handling and edge cases.**
   - Truthiness checks on values that can be `0`, `""` or empty and still valid (`if (item.id)`
     breaks when the id is `0`).
   - Unhandled empty arrays, null returns and 404 paths on a main path; a handler that now always
     returns an empty result.
   - Unhandled promise rejections, swallowed errors, errors rewrapped so that the caller loses the
     status it needs (wrapping a `{ status, value }` error in a bare `Error` drops the 401 needed for
     authentication handling).
   - Calibration: an edge case needs a **plausible real input in this product's domain**; purely
     theoretical inputs are dropped.
2. **Non-atomic bulk mutations.** A loop of deletes or updates that can throw midway and commit a
   partial state. Before flagging, name a **reachable trigger** for the mid-sequence failure: a
   re-validation of input already validated by the same schema at the boundary cannot throw.
3. **Transaction boundaries.** A validation or guard that runs outside the transaction it protects
   (check-then-act against a stale snapshot: concurrent writers get a raw constraint error instead of
   the intended rejection), a guard-then-delete pair with no transaction (time-of-check to
   time-of-use), and a refactor that **loses** a transaction the old code had: when the range
   replaces a transaction-wrapped pair, verify that the replacement still runs atomically.
4. **Background jobs and crons.** Whenever the range adds or modifies a scheduled or polled job: does
   it claim its work (`FOR UPDATE SKIP LOCKED`, a lease or next-attempt write) so overlapping ticks do
   not double-process? Does a thrown batch still advance attempts and backoff, or does an outage mean
   re-hammering the same rows forever? Is the checkpoint preserved on failure? Search the repository
   for an existing claim or lease sibling.
5. **Pre-existing data and migrations.** Any migration or schema default the range ships must be
   checked against the rows that already exist: a new column defaulted to `false` with no backfill
   can strand every pre-existing row behind an early return that compares against it; a dropped
   column or fallback must be checked against the population that used it. Name the stranded
   population. A destructive migration with no reachable recovery is `data_integrity`.
6. **External-call amplification** (`cost`). A change that turns one batched call into N per-item
   calls against a third-party, paid or rate-limited API; retry loops with no delay or jitter (worst
   exactly when the upstream is already failing); an unbounded or unconditionally run expensive query
   added to a public route (a full-table random sort per request, an unbounded list query on a public
   GET, `availability`); a client-side N+1 (one query per list item). When the range touches a fetch
   fan-out, count the calls before and after and state both numbers in `impact`.

Ignore: security (security lens), business intent (business logic lens), consumer blast radius
(regression lens), style, duplication, accessibility, file size and other maintainability concerns.

Severity: `critical` for data loss or corruption, or a crash or outage on a main journey for every
user; `warning` for a reachable but narrower failure. A defect with user-visible wrong output is never
dropped for being small.

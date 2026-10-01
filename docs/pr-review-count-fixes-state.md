# PR review counting and publication correction state

## Scope and decisions

- A submitted GitHub comment review counts as reviewed. This is distinct from formal approval. Pending and dismissed reviews do not provide this evidence.
- GitHub list and count queries must use the same explicit repository and complete pagination. API failures and incomplete pages must not produce partial counts.
- Resolve SSH host aliases before calling the GitHub API while preserving enterprise hosts.
- Refresh subscribed PR counts after local review changes and periodically for external changes. A manual refresh during an existing request must still perform a fresh read.
- Ignore stale responses from a previously selected project.
- Azure approval publication must bind the intended vote to the author of the comment containing the completion marker, verify the returned reviewer identity and vote, and read the persisted vote. Retrying an existing completion marker must retry the vote without duplicating comments.
- Azure approval classification must respect required reviewers and the blocking minimum-approval evaluation.
- Persist intended and actual publication states and failure details using existing event storage.

## Progress

- Investigation completed with local source and read-only GitHub/Azure API evidence.
- Shared reviewed status, neutral UI badge and publication outcome/failure event payloads are implemented.
- GitHub and refresh corrections are implemented and passed consumer and simplification checks.
- Azure corrections are implemented. Read-only live validation confirmed the supported `7.1-preview` API version, completion-comment author identity, reviewer vote response and blocking minimum-approval evaluation. Policy reads use bounded batches.
- No new tests requested; use existing tests and targeted verification.
- Commit and push authorized after final verification. No deployment or external review publication requested.

## Verification

- Final integrated typecheck and lint passed after the Azure publisher-binding correction.
- Final existing suite passed: 279 tests, zero failures, 1125 assertions across 38 files. Initial sandbox-only socket denial was resolved by authorizing the same fixture run with localhost access.
- Browser checks passed in a temporary dry-run sandbox: reviewed badge, refreshed project count, a forced count read queued behind a default read, and delayed previous-project results ignored. No console errors remained.
- Read-only GitHub checks confirmed list/count parity on three configured repositories and functioning SSH alias resolution. No currently open comment-only PR was present in that sample.
- Final AST graph update completed without model calls.
- Azure read-only live checks passed. Publication writes were validated against the installed CLI implementation and local checks, but no real vote or comment was published.
- Final independent Azure regression audit found no remaining concrete defect. The CLI-compatible preview version is supported by the successful live policy read.

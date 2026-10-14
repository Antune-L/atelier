# Bounded autonomous recovery

The GitHub autonomous pilot can repair recoverable validation failures and publish partial work as a draft when it cannot finish within its allowance. A partial receipt never completes the ticket, merges its PR, reports full success, releases its retained worktree, or launches dependent tickets.

The default work allowance is three correction episodes, two unsuccessful repairs of one independently proved defect, two validation retries without code changes, and 180 minutes. A generic failed test check or incomplete output does not prove that two runs encountered the same defect. Concrete defects keep separate cumulative repair counters.

The additional 64-start limit is an adjustable experimental emergency cap. It counts durable admissions for physical sessions and quality runs separately, including preparation failures. It is not a progress score or a measured optimal value. Admissions happen before preparation and effects; commits, labels, restarts, and failed preparations do not refund them.

Each ticket records `autonomousMaxStarts`, `autonomousMaxCorrections`, `autonomousTimeoutMinutes`, `autonomousFinalizationMinutes`, and `autonomousMaxPublicationAttempts`. Existing stored limits are preserved. Legacy executions without the new execution ledger keep their previous workflow.

## Closing and partial publication

Automatic work revocation atomically starts a separate five-minute reserve with two logical publication attempts. The reserve includes waiting for issued operations, closing writers, candidate preparation, ordinary-hook commit, exact non-force push, draft creation or conversion, and description readback. Safe retries share the same deadline; uncertainty must be reconciled before another mutation.

Claude and Codex receive generation-bound native tool guards. Backend-owned child sessions share the parent allowance. Unmanaged native child spawning is disabled for these guarded executions. The parent, preparing children, reviewers, validators, services, and pending integrations must stop before candidate stabilization. Unknown closure is durable and blocks replacement writers, publication, integration, and deletion, including after restart.

The backend preserves direct and isolated child work and journals. The recovery dialog lists parent paths, retained child workspaces, and verified archives separately. Unknown identity or missing original files remain explicit; the inventory is read-only and does not create archives.

Publication binds the local repository, branch, frozen requirements and configuration, exact stable commit, and one PR identity. Every mutation has a durable operation marker. An uncertain create is reconciled with the existing PR; an ambiguous branch/base or changed candidate is refused. Existing PRs are converted to draft. A tagged description section preserves human text and records failed, missing, inconclusive, simulated, and historical evidence. Host readback is required before a partial receipt is confirmed.

An explicit user stop takes priority over an earlier failure or timeout and forbids automatic publication. Already-issued host operations remain recorded for read-only reconciliation.

## Explicit continuation

`POST /api/tickets/:id/autonomous-resume` accepts `action: resume`, `extend`, or `publish`. Resume uses the remaining finite allowance. Extend requires explicit positive `additionalStarts`, `additionalMinutes`, or `additionalCorrections`. Publish grants an explicit finite publication reserve after closure and host reconciliation. Consumed credits and original frozen requirements remain unchanged; a new generation invalidates old native guards and current publication acceptance without losing the historical PR identity.

The backend restores the retained slot and starts an admitted replacement session at an executable planning, validation, or delivery checkpoint. An unreachable or invalid checkpoint revokes work again instead of leaving an ownerless active state. It never refreshes all fingerprints to accept changed requirements.

`GET /api/tickets/:id/autonomous-workspaces` provides read-only recovery locations and verification status. Ordinary GitHub and Azure DevOps workflows remain supported; the autonomous pilot is deliberately GitHub-only.

## Qualification

The existing suite passed with 560 tests, three skips, and zero failures. Typecheck, lint, web build, diff checks, and independent simplifier/consumer reviews passed. The existing MCP field expectation was updated for the three added configurable limits; no automated test files were added.

Disposable simulated checks covered single-PR partial publication, uncertain creation reconciliation, priority cancellation, expired reserve, unknown closure, concurrent publication joining, and replacement-session admission on the same PR and slot. A populated local Git fixture verified retained child/archive identity and read-only inventory behavior, including rejected foreign paths and symlinks.

Browser checks used an isolated dry-run SQLite database and port 54173. They verified the partial warning, simulation labeling, retained path dialog, and explicit extension form. These checks are local product UI evidence, not live PR-host validation.

A real pinned Codex 0.160.0 session performed one harmless fixture read, rejected subsequent input after revocation, produced no later tools, and confirmed closure. Hook denial was separately exercised in a local policy subprocess. Claude initialization returned a successful turn with no tools and a not-logged-in message, so real Claude native-tool qualification remains unverified. No live GitHub/Azure mutation, Coolify deployment, or real ticket resume was performed for this implementation.

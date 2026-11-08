# Autonomous lot quality implementation

## Current summary

- Base and local `origin/main`: `a8e52cbf59292504c80b8e491fc41915185f9251` (2026-11-08). The linked T3 checkout was clean at entry. No new checkout, deployment or main merge.
- Scope: Atelier only. Reuse persistent implementation plans, provider sessions, execution records and quality validation. Orchestrator changes belong to the parent thread.
- Verified statically: lot dependency scheduling used only `completed`; autonomous guidance required one final simplification; final acceptance covered extracted criteria without an independent initial-source audit.
- Implemented: backend-owned per-lot simplification/check proof; independent source inventory and candidate coverage; final comparison with initial raster mockups; strict current-code reviews for autonomous persistent plans.
- Checks: existing full suite 983 passed, 3 skipped, 0 failed; typecheck and lint passed; web build passed. Final typecheck, lint, diff check, independent rechecks and isolated negative-case probes passed. No live Claude/Codex, Coolify, email or host delivery qualification performed.
- Qualification limits: per-lot functional suites must already exist and be isolated; PDF/SVG and authoritative external URLs require supported repository snapshots. Historical plans without original snapshots cannot silently acquire a reconstructed original reference.
- Next: review the local branch, then prepare a separately authorized real-provider pilot. No main merge, deployment or external delivery is authorized here.

## Review and evidence

Argus reviewed quality, conventions, regression and logic independently. Four objections were accepted: test-only preparation could block forever; autonomous manual takeover could produce incompatible proof; a single auditor could omit obligations from its own coverage list; title-only requirements were outside the attributable source categories. Corrections respectively record test-preparation applicability, refuse manual autonomous takeover before mutation while preserving delegated recovery, and split source inventory from coverage into distinct managed sessions with exact inventory identifiers, and include title attribution in both phases. Independent lot recheck found no remaining objection. Source recheck found the title omission, which was corrected and negatively qualified. The remaining semantic limit is explicit: model judgments cannot mechanically prove exhaustive interpretation of prose or images.

Simplifier was applied to the changed code only: shared proof predicates and review configuration guards were made explicit; no neighboring refactor was performed. Regression tracing covered the shared plan predicate through scheduling, Store, SlotManager, recovery UI and final review, plus the shared quality path and both provider image transports. Ordinary GitHub/Azure paths remain covered by existing fixture suites; real integrations are not qualified by these checks. The autonomous pilot remains subject to its existing host restrictions.

| Scenario | Evidence and limit |
| --- | --- |
| Missing controls cannot unlock a consumer | Shared proof predicate rejects absent/failed controls; scheduler and direct launch both require it. Isolated manager/SQLite/Fake qualification keeps the dependent pending with no child start. |
| Interrupted integration avoids double application | Existing delegation/workspace recovery suites pass; retained integration rechecks quality instead of recoding. An isolated retained-integration retry fixture runs twice with one integration call; fake rechecks cannot inherit real evidence authority. |
| Argus objection corrected and revalidated | This implementation's three findings were corrected; lot corrections were independently rechecked. Live autonomous provider correction not exercised. |
| Omitted source obligation prevents complete coverage | Temporary simulated two-session qualification rejects missing PRD, same-source omission, duplicate/changed inventory IDs and phantom criteria. |
| Changed code/source invalidates old proof | Full exact-revision gates, scoped prerequisite checks and existing mutation fixtures; temporary probe rejects changed original source. No live provider claim. |

Executed commands: `bun run typecheck`, `bun run lint`, `bun run build:web`, `bun test`, and `bun /tmp/qualify-autonomous-sources.ts`. The full suite required permission to open its isolated loopback MCP server; its sandbox-only attempt failed with `EPERM`, then all 13 MCP cases and the full suite passed with that permission. The three skipped cases are an opt-in adversarial agent test and two shellcheck-dependent VPS script checks. The web build emitted only its chunk-size advisory. Temporary probes are not committed tests: source inventory negatives pass; original-mockup attachment and screenshot rejection pass across simulated Claude/Codex seams; five manager/predicate/inspection cases pass with 32 assertions. These prove deterministic gate behavior with fixtures, not real provider performance. A final qualification caught and fixed simulation provenance reuse: a recheck always takes simulation status from its current adapter, never from a retained proof. Scoped simplifier inspection rejects discovery-only, unrelated and compound-command observations.

## History

- Read the supplied report and final adversarial review. Confirmed the current checkout includes newer campaign changes; no campaign integration is required for this work.
- The parent reports Orchestrateur delivery on main at `63b2139`, with existing autonomous selection and richer source/quality instructions. No Orchestrateur file was changed in this checkout.

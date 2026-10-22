<!-- NOTE(ali): derived once from the argus-review methodology (references/dimensions.md, section "regression", snapshot of 2026-10-21) referenced by the helios-daily-audit skill; the audit method is now owned by the app. -->
**Owns:** the blast radius of changed exports, contracts and signatures (classes `regression` and
`contract`): consumers that were not updated.

1. Collect the **changed symbols** of the range: exported functions, types, constants, validation
   schemas, DTOs, API or route shapes, ORM models, events, environment variables, webhook payloads.
2. For each, **search the repository for consumers**. Follow barrel re-exports to find hidden
   consumers. For renames, search the **old** name specifically: new-name-only searches miss stale
   references.
3. Classify each consumer: `BREAKING` (fails to compile or run), `BEHAVIORAL` (compiles but silently
   drifts) or `SAFE`.
4. Report every unhandled `BREAKING` or `BEHAVIORAL` consumer with `file:line`, direct or transitive,
   and give the consumer count in `impact`.
5. **Removed behavior.** The removed lines of the diff are first-class review surface. For each
   load-bearing removal (dropped props or parameters, deleted guards, early returns or fallbacks,
   removed transaction wrappers, removed error handling): who depended on this behavior, and is the
   dependency handled? A deleted legacy fallback flips the population it served; a description
   claiming "prior semantics preserved" must be checked against the removed lines. Renames are
   compiler-checked; removals are not.
6. **Toolchain, build and configuration changes** have the widest blast radius because their victims
   are outside the diff. When the range swaps a compiler, bundler or CLI or changes a build
   configuration, enumerate what compiles or resolves differently under the new toolchain, and check
   version pinning on any newly floating range.
7. **Lifecycle changes.** When a shared connection, subscription, worker or task lifecycle changes,
   trace the stop, resume or restart and state-release paths across all consumers.
8. **Contracts.** An API, event, environment or webhook shape changed while an external or typed
   consumer was not updated is a `contract` finding. Typed API clients propagate a server shape change
   to every call site; query caches keyed without a newly relevant parameter serve stale data; ORM
   schema changes regenerate types, so search old field names repository-wide.

Ignore: style and naming, architecture taste, generic quality, security unless it is a direct
contract regression (validation removed). Purely additive changes with no consumers and internal
refactors with no changed exported surface are not findings.

Never write "might break" without a consumer `file:line` and a count. If the search is too wide
(generic name collision), list the changed file in `skipped` with the reason, even if you read it.

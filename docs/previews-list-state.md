# Compact previews list state

## Current summary

- Base revision: `c93959a21bed919d4b2244e817bd0bb428b17d3c`.
- Environment: local working tree on macOS, Bun 1.3.14; UI browser validation uses a dry-run server owned by the parent task.
- Scope: `src/web/src/components/PreviewsView.tsx` and the optional ticket-opening callback in `src/web/src/components/BranchPreviewForm.tsx`.
- Implemented: compact semantic table, state filters, ten-row pagination, creation on demand through the existing Dialog, and details through the existing Sheet. Existing global project/search filters remain inputs to the view. Project and expiration information remain available on small screens.
- Existing guards for opening URLs, ticket navigation, stopping, cleanup retry, and standalone redeployment are retained. Polling and request-version checks are unchanged. Details follow the latest preview record independently of the list filter.
- Claude, Codex, GitHub, and Azure DevOps paths are unaffected because the change is confined to provider-independent UI composition; no backend, schema, or provider API is changed.
- Verified: typecheck and lint passed; production web build passed; existing test suite passed with 279 tests and 1,128 assertions. The initial sandbox run failed to listen on a local socket in the MCP integration test; the permitted rerun passed.
- Simplifier and regression review: no worthwhile simplification; the unchanged `PreviewsView` export remains consumed by `src/web/src/App.tsx`. The optional `BranchPreviewForm` callback preserves default behavior. No new tests were added.
- Browser evidence from the parent task: the real browser displayed 12 standalone fixture records, paginated as 1–10 and 11–12. The attention filter returned four records; global search narrowed the list to one. The details panel displayed an error, and the creation Dialog opened. Cleanup-incomplete details exposed the cleanup retry action; cleanup-complete standalone details exposed redeployment. These checks verified action visibility only, without issuing live mutations. Linked-ticket navigation callbacks were reviewed in code but were not validated in the browser because the fixture records are standalone. This is dry-run UI validation, not live Coolify deployment or live provider compatibility.
- Browser follow-up: the initial 390px capture exposed excessively truncated branch names. The mobile layout now wraps full branch names and stacks status below the branch, keeping actions on the right; the parent browser recheck passed at 390 × 844. The changed main content had matching client and scroll widths of 314px, with full branch names visible and states stacked beneath them. Desktop column layout is preserved.
- Observed limitations outside the changed preview view: the global application header overflowed at mobile width, and the browser console reported a refused Vite hot-reload connection. Their attribution to the base revision has not been verified. Infrastructure and the global header are outside this UI change.
- Blockers: none in the implemented preview surface. The global header overflow and hot-reload connection warning remain outside scope.
- Publication status: the user has authorized committing and pushing the reviewed change to `main`; publication is in progress in the parent task. No successful commit or push is recorded yet.
- Next action: commit the reviewed scope, push `main`, and record the resulting revision and publication evidence.

## Verified interaction detail

Opening an associated ticket from a modal must close the current preview overlay first. The creation Dialog sits above the ticket Sheet, so leaving it open would obscure a preparation ticket. Both preparation and detail navigation now close their current overlay before opening a ticket.

## History

- 2026-10-05: Replaced the always-visible creation form and capped preview cards with the authorized compact list, retaining real record fields and action semantics.

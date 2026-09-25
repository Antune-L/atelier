# Azure DevOps support — state file

Working notes for a multi-session task. Update at each step.

## Goal

Support Azure DevOps (Azure Repos) alongside GitHub, selectable per project (GitHub default).

## Decisions (validated by the owner, 2026-09-21)

- Tool: `az` + `azure-devops` extension. `azd` is the Azure Developer CLI and has no PR commands.
- Target is cloud only: `https://dev.azure.com/oppycx/Ignite/_git/Ignite`.
- Authentication is `az login` (Entra ID), no PAT stored by the app.
- Four lots, shipped separately:
  1. Per-project `vcsProvider` setting + "Test connection" button. **In progress**, branch `feat/azure-devops-provider-setting`.
  2. Extract the PR-related methods of `SystemAdapter` (`src/server/system/types.ts`) into a `VcsProvider` interface resolved per project; neutralise `OpenPr` (`src/shared/schemas.ts`, `src/web/src/lib/pr.ts`) and PR URL parsing (`src/web/src/lib/display.ts`).
  3. Azure PR lifecycle (list, create, view, state, merge), provider command table in `src/server/agents/contract.ts`, guard extension.
  4. Azure review publication (threads + reviewer vote) and clean flow. **Done** with `az devops invoke`, not
     `azure-devops-node-api`: `az account show` fails on this machine while the azure-devops extension is
     authenticated through its own cache, so no bearer token/PAT exists for an SDK client.

## Verified on this machine (az 2.90.0, azure-devops 1.0.8)

- `az repos pr list --org https://dev.azure.com/oppycx --project Ignite --repository Ignite --top 1 --detect false -o json` works, about 0.5 s warm.
- PR fields seen: `pullRequestId`, `status` (`active`), `isDraft`, `mergeStatus` (`succeeded`), `sourceRefName` / `targetRefName` (full `refs/heads/...`), `reviewers[].vote`, `lastMergeSourceCommit.commitId`.
- `az devops invoke` resource names: `pullRequestThreads`, `pullRequestThreadComments` (area `git`, max API version 7.2).
- Azure exposes only `refs/pull/<n>/merge`, not `refs/pull/<n>/head`. `real.ts` fetches `/head`, so the review worktree must fetch the source branch instead.
- Inline comments exist in the data model (read on PR 1857, thread 21861): `threadContext.filePath` (leading `/`), `rightFileStart` / `rightFileEnd` with `line` and `offset`, `pullRequestThreadContext.changeTrackingId` + `iterationContext`, `status: fixed`.
- Write path tested end to end on PR 2145 (thread 25986, since deleted) with `az devops invoke` and `az login` auth: `POST pullRequestThreads` with `threadContext` + `pullRequestThreadContext` creates an inline comment; `PATCH` with `{"status":"fixed"}` (string accepted) resolves it; `DELETE pullRequestThreadComments` on the only comment marks the whole thread `isDeleted`. `changeTrackingId` comes from `pullRequestIterationChanges` of the latest iteration (`pullRequestIterations`).
- `az devops invoke --route-parameters` takes space-separated `k=v` tokens: pass them as separate argv entries (an unsplit string yields a misleading "requires user authentication" error).
- Thread listings include `commentType: system` threads with no `status`: filter them out.
- Unknown repository: stderr `ERROR: TF401019: ...does not exist or you do not have permissions...`.

## Known blockers for lots 3 and 4

- `reviewApiEndpoint()` in `src/server/system/real.ts` looks for a `pull` URL segment; Azure uses `pullrequest`.
- `PR_STATE_MERGED = "MERGED"` in `src/server/system/real.ts`; Azure status is `active | completed | abandoned`.
- `src/server/system/reviewPublishingGuard.ts` only blocks `gh` writes. Extend it before allow-listing any `az` command in `src/server/agents/sessionConfig.ts`; never allow `Bash(az:*)`.
- No PR diff exists in `az` or the REST API: use `git diff origin/<target>...<source>`.
- `az repos pr create` has no `--fill`: title and description must be supplied.

## Progress

- Lot 1: implemented, uncommitted. Verified for real: Azure OK, unknown repo (`TF401019`), non-Azure remote, GitHub OK. Typecheck + lint clean. 3 pre-existing `fixture timeout` failures in `src/server/system/codexProvider.test.ts` reported by the implementing agent.
- 2026-09-21: owner asked for lots 2, 3, 4 to be implemented in sequence without further check-ins. No commits unless asked. No writes on oppycx PRs (the PR 2145 approval was one-off).
- Default chosen for the vote mapping (owner may override): APPROVE → 10, REQUEST_CHANGES → -5 (waiting for author), COMMENT → no vote. **Superseded by lot 4**: `az repos pr set-vote --vote` takes a name, not the numeric scale, so the mapping is `approve` / `wait-for-author` / no call.

- Lot 2: implemented, uncommitted. Behaviour-preserving refactor creating the provider seam.
  - New `src/server/system/vcs/`: `types.ts` (the `VcsClient` interface — named so because `VcsProvider`
    is already the string union), `github.ts`, `azureDevops.ts`, `fake.ts`, `connection.ts` (shared probe
    helpers) and `azureRemote.ts` (moved from `src/server/system/`).
  - **Cut chosen: keep the plain-git half in the adapter, delegate only the provider call.**
    `verifyDone`, `verifyReviewDone`, `prepareReviewWorktree`, `readReviewHead`, `publishReview`,
    `createPr` and `mergePr` keep their git checks (clean tree, pushed branch, temporary ref fetch,
    `git push origin --delete`) in `real.ts` and call the client for the PR half. Moving them wholesale
    would have duplicated all the git plumbing into the Azure client for no gain.
  - `runBoundedCommand` / `safeJsonParse` extracted to `src/server/system/boundedCommand.ts` (shared by
    the adapter and the clients, no copy).
  - Per-project resolution: the PR methods of `SystemAdapter` take a trailing `provider: VcsProvider`
    (or a `provider` field for the options-object ones). The resolver `vcs(provider)` is **private** to
    each adapter — exposing it on the interface would have added a public API nothing calls. The fake
    adapter returns `FakeVcsClient` whatever the provider, so the 7 `FakeSystemAdapter` subclasses keep
    working; only `delegationManager.test.ts`'s `publishReview` override needed the new parameter.
    Callers resolve it via the new `projectVcsProvider(key)` in `src/server/config.ts`.
  - Neutralised payloads: `OpenPr.reviewDecision` → `reviewStatus: "none" | "needs_review" | "approved" |
    "changes_requested"` (`PR_REVIEW_STATUSES` in `src/shared/constants.ts`), mapped in the GitHub client.
    `OpenPr` is never persisted (request payload only), so no DB back-compat was needed.
    PR state → `PR_STATES` (`open|merged|closed|unknown`) with `PR_STATE_LABELS` keeping the exact
    user-facing wording (`OPEN`/`MERGED`/`CLOSED`, empty → "inconnu").
  - PR URL parsing unified in `src/shared/prUrl.ts` (`parsePrUrl` / `prNumberFromUrl`), used by
    `display.ts` and by the GitHub client's `reviewApiEndpoint`. It parses through `new URL()`, so a
    non-URL string now yields null where the old web regex would still have matched `/pull/<n>` — every
    stored `prUrl` is an absolute provider URL, so this is theoretical.
  - The self-approval downgrade (422 → COMMENT) is now a GitHub-client behaviour inside `publishReview`
    and `verifyReviewPublication`, not a branch in the adapter.
  - Azure client: `testConnection` works; every other method returns the typed failure
    "opération non encore supportée pour Azure DevOps" (`listOpenPrs` throws, as its contract does).
  - Not touched (lot 3): `contract.ts`, `sessionConfig.ts`, `reviewPublishingGuard.ts`, the MCP tool
    descriptions, and the `échec gh pr list` / `échec gh pr view` wording of `routes.ts`.
  - `bun run typecheck` and `bun run lint` clean; `bun test` 241 pass / 3 fail (the known pre-existing
    `fixture timeout` tests in `src/server/system/codexProvider.test.ts`).

- Lot 3: implemented, uncommitted. An Azure project can now run a feature ticket end to end
  (list → create → done gate → merge) and a read-only review pass; publication and the clean flow stay lot 4.
  - `azureDevops.ts` implements `listOpenPrs`, `verifyPrExists`, `readPrHead`, `confirmPrHead`,
    `prHeadFetchRef`, `createPr`, `fetchPrSummary`, `mergePr` and `readPrState` as `az` argv spawns
    through `runBoundedCommand`, always `--org <url> --detect false -o json`. The repo triple comes
    from the parsed `origin` remote for repo-scoped calls and from the PR web URL for PR-scoped ones
    (`az repos pr show/update` take `--id` + `--org` only — verified in `--help`).
  - `OpenPr.url` is rebuilt as `https://dev.azure.com/{org}/{project}/_git/{repo}/pullrequest/{id}`:
    the payload's `url` field is the `_apis` REST endpoint, not a browsable link.
  - `OpenPr.additions`/`deletions` are now **nullable** (`src/shared/schemas.ts`): Azure exposes no
    diff stat. `PrSelectRow` hides the counters and the review/clean card descriptions omit the
    `- **Diff**` bullet instead of printing zeros.
  - `reviewStatus` from `reviewers[].vote`: any vote ≤ -1 → `changes_requested`, else any ≥ 1 →
    `approved`, else `needs_review` when reviewers exist and `none` otherwise.
  - `updatedAt` falls back to `creationDate` (NOTE in the client): no last-updated date exists on the
    PR payload; a real one would need the threads API (lot 4).
  - `prHeadFetchRef` became `async (cwd, prUrl, prNumber)`: Azure returns the PR's `sourceRefName`
    (only `refs/pull/<n>/merge` is published, never `/head`). The adapter's git half is unchanged and
    already rejects a mismatch against `lastMergeSourceCommit.commitId`.
  - **Merge strategy deviation**: `az repos pr update --help` offers no rebase flag — only `--squash`.
    `mergePr` un-drafts (`--draft false`) then completes with `--status completed --squash true`, the
    closest linear-history equivalent of the GitHub `--rebase` strategy. Documented in a NOTE in the
    client. The confirm-merged polling is now shared (`src/server/system/vcs/prMerge.ts`).
  - **No read-only current-user identity found**: `az account show` fails with
    `Please run 'az login' to setup account.` on this machine even though `az repos` works (the
    azure-devops extension has its own token cache), and `az devops user show` requires the very user
    id you are trying to discover. `az devops invoke --area connectionData|profile` is rejected with
    `--area is not present in current organization`. No lot-3 method needs the identity, so none was
    added; lot 4 (self-vote handling) has to solve it.
  - Agent-facing layer: new `src/server/agents/vcsCommands.ts` holds a per-provider command table
    (label, create-PR command + hint, banned create command, PR diff command, PR-feedback read hint,
    `canPublishReview`, clean commands). `contract.ts` and `sessionConfig.ts` interpolate the table;
    the French prose stays single-sourced and the GitHub rendering is byte-identical.
    Azure's PR diff is the provider-neutral `git diff origin/<base>...HEAD` (the review worktree is
    already on the PR head); `gh pr diff` stays for GitHub.
  - `az repos pr create` has no `--fill`, so the Azure contract hands the agent the explicit command
    with `<URL_ORG>/<PROJET>/<DEPOT>` placeholders plus a line telling it to read them from
    `git remote get-url origin` — the contract builders are synchronous and cannot spawn git.
  - Route-level early refusals (`src/server/routes.ts`): `POST /reviews` with `postComments` and
    `POST /cleaners` are rejected with a French 400 on a provider whose table says the flow is
    unavailable, instead of failing mid-run.
  - Guard first, allow-list second: `reviewPublishingGuard.ts` now also denies
    `az repos pr create|update|set-vote`, `az repos pr reviewer|work-item add|remove`,
    `az repos pr policy queue`, and `az devops invoke`/`az rest` with a write method
    (`--http-method`/`--method` POST|PUT|PATCH|DELETE, case-insensitive) or `--in-file`/`--body`.
    The POSIX ERE emitted for the Codex hook is generated from the same constant lists and was
    checked against the TS predicate on 16 commands with `grep -E`.
    `REVIEW_PUBLISHING_DENIAL_REASON` is now provider-neutral.
  - Allow-list (`sessionConfig.ts`): Azure projects only get `Bash(az repos pr create|show|list:*)`
    plus `Bash(git remote get-url:*)` (needed by the create-PR template). Never `Bash(az:*)`, never
    `az devops invoke`, never `az rest`. The allow-list is built per session, so the entries are added
    only when the project's provider is Azure; `buildImplementSessionConfig` now takes an explicit
    `vcsProvider` input rather than reaching into the project registry (which is closed in unit tests).
  - Wording: `done`/`publish_review` tool descriptions, the `échec gh pr list`/`échec gh pr view`
    route errors and the `Commentaires postés sur GitHub` UI label are provider-neutral; GitHub-asserted
    strings are unchanged.
  - **Not exercised (no write ever ran against oppycx)**: `createPr`, `mergePr` (un-draft + complete),
    and the Azure `prHeadFetchRef` fetch path. They are written from `--help` output and read-only
    `az repos pr list/show` payloads only.
  - `bun run typecheck` and `bun run lint` clean; `bun test` 241 pass / 3 fail (the known pre-existing
    `fixture timeout` tests in `src/server/system/codexProvider.test.ts`).

- Lot 4: implemented, uncommitted. Azure review publication and the clean flow are wired; both providers
  now run every flow, so the lot-3 route-level refusals are gone.
  - **Transport**: `az devops invoke` through `runBoundedCommand`, always
    `--org <url> --api-version 7.1 --detect false -o json`, with `--route-parameters` as SEPARATE argv
    tokens. `--detect` and `--api-version` are accepted by `invoke` (checked in `az devops invoke --help`).
    Request bodies go through a temp file + `--in-file`; the temp-file dance the GitHub client used for
    `gh api --input` was extracted to `withJsonRequestFile` in `src/server/system/boundedCommand.ts` and is
    now shared by both clients. The REST vocabulary (api version, area, resource names, HTTP verbs, settled
    thread statuses, the resolve body) lives in the new `src/server/system/vcs/azureRest.ts`, imported by
    the client AND by the agent command table so a resource name is spelled once.
  - **publishReview**: one general thread carries `body` + the outside-diff section
    + the pass marker; its thread id is the `published_review_id` the app persists. One inline thread per
    finding, `threadContext` (`/path`, `rightFileStart/End` line + offsets 1→2) plus
    `pullRequestThreadContext.changeTrackingId` looked up by path in the LATEST iteration's
    `pullRequestIterationChanges`, `iterationContext` = {1, latest}. A finding whose file is absent from
    those changes (or an unreadable iterations/changes read) is folded into the summary body through
    `renderOutsideDiffSection`, extracted from `github.ts` into `src/server/system/reviewMarkdown.ts` so the
    GitHub body stays byte-identical. Azure threads render no `path:line` header, so the inline body
    prepends the location in the Azure client only — `renderFinding` in `delegationManager.ts` is untouched.
  - **Idempotency scheme chosen** (simplest robust one): the summary thread is posted LAST and carries the
    bare pass marker. Each inline thread carries `<pass marker><!-- kanban-review-finding:<path>:<line> -->`,
    so a retry after a partial failure re-reads the threads once and skips every finding already on the PR.
    An inline marker CONTAINS the bare pass marker, so a bare substring test does NOT identify the summary
    thread: "publication completed" is proven by `isSummaryThread` only — a non-deleted, non-system thread
    whose first comment carries the pass marker AND no finding marker. `publishReview` short-circuits on
    that thread alone, so a retry after a partial publication still posts the summary and casts the vote.
    No identity lookup is needed anywhere (none is available: see lot 3).
  - **Vote**: `az repos pr set-vote --id N --vote <name> --org URL`. `--vote` takes a NAME, not the numeric
    scale — `approve | approve-with-suggestions | reject | reset | wait-for-author` (verified in `--help`),
    which supersedes the numeric default recorded above. APPROVE → `approve`, REQUEST_CHANGES →
    `wait-for-author`, COMMENT → no call. A failed vote never fails the publication: the client returns
    `ok: true` with the refusal as `reason`, and `delegationManager` appends it to the session's result —
    the same client-owned capability degradation as the GitHub 422 self-approval downgrade.
  - **verifyReviewPublication**: the SUMMARY thread (same `isSummaryThread` predicate) exists with the
    expected id, is not deleted nor a system thread, its `publishedDate` is at or after the gate cutoff,
    and `lastMergeSourceCommit.commitId` still equals the reviewed commit. The vote is deliberately NOT re-checked (NOTE in the client): it can be
    legitimately absent, so it is not proof of publication.
  - **Clean flow**: `vcsCommands.ts` gained `clean.cli` and `clean.minosSkill`. `minos-pr-feedback` is
    GitHub-only (GraphQL), so on Azure BOTH agent providers get the inline instructions and the skill is
    dropped from `skills` for the session (`sessionSkills`). Fetch = one `pullRequestThreads` GET with the
    filtering rules; resolve = `PATCH --in-file` with `{"status":"fixed"}`. The French prose in
    `contract.ts` stays single-sourced: only the command fragments and the one skill branch differ.
  - **Permissions**: `Bash(az devops invoke:*)` is added for Azure sessions of `kind === "clean"` ONLY
    (`bashAllowlist` now takes the ticket). Review sessions keep the lot-3 surface, and
    `reviewPublishingGuard` still denies every mutating `az` form there. The POSIX ERE mirror was
    re-checked against the TS predicate on 18 commands with real `grep -E`, including the new clean ones:
    the threads GET is allowed, the threads PATCH/POST and `az repos pr set-vote` are denied.
  - Removed as unreachable once both providers support everything: `canPublishReview`, the nullable
    `clean` table, `cleanFlowUnavailable`, `reviewPublicationUnavailable`, and the `POST /reviews` /
    `POST /cleaners` 400s in `routes.ts`.
  - **Not exercised (no write ever ran against oppycx)**: `publishReview` (thread POST, inline and
    summary), the reviewer vote (`az repos pr set-vote`), the clean flow's thread `PATCH`, and everything
    left unexercised by lot 3 (`createPr`, `mergePr`, the Azure `prHeadFetchRef` fetch). They are written
    from `--help` output, from the read-only GETs listed above, and from the one-off write session owner-
    approved on PR 2145 (thread 25986, since deleted).
  - Read-only `az` runs backing lot 4: `az repos pr set-vote --help` and `az devops invoke --help` (flags);
    `az repos pr show --id 2145` (`repository.id`, `repository.project.name`, `lastMergeSourceCommit`);
    `pullRequestThreads` GET (10 threads — `system` vs `text` comment types, `isDeleted`, `status: fixed`,
    `publishedDate`, `threadContext`/`pullRequestThreadContext` of the deleted 25986);
    `pullRequestIterations` GET (4 iterations, `sourceRefCommit.commitId` = the PR head);
    `pullRequestIterationChanges` GET on iteration 4 (51 `changeEntries` with `changeTrackingId`,
    `changeType`, `item.path`).
  - `bun run typecheck` and `bun run lint` clean; `bun test` 240 pass / 4 fail — the 3 known pre-existing
    `fixture timeout` tests in `src/server/system/codexProvider.test.ts` plus a flaky
    `codexRuntime.test.ts` case ("unsupported initialize method", a 50 ms request-timeout race) that
    passes on its own and on re-runs.

## Open questions

None outstanding. (The verdict → vote mapping is settled: see lot 4 above. `--vote` takes a name, not the
numeric scale.)
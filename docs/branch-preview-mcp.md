# Branch preview MCP

Three tools of the authenticated local public MCP endpoint deploy a remote branch as a Coolify preview, exactly like the board's **Create preview** button (`POST /api/projects/:key/previews`). They start no browser validation session and create no ticket; use the [external validation tools](external-browser-validation.md) when validation is needed. Schemas live in `src/shared/branchPreview.ts`; the deployment engine is the existing `PreviewManager` (`ensureBranch`, `findBranchPreview`, `stop`).

## `create_branch_preview`

Input `{projectKey, branch, requestId}`:

- `projectKey`: a key returned by `list_projects`.
- `branch`: an existing remote branch.
- `requestId`: a stable caller identifier (1-200 characters). Repeating it returns the preview of its first call instead of creating another one. Reusing it for another project or branch fails with `REQUEST_CONFLICT`.

Behaviour, serialized per project and branch with the board button:

1. An already known `requestId` returns its recorded preview.
2. The tool checks the configuration (see errors below) and reads the current remote SHA of the branch.
3. When an active standalone preview of the same project and branch exists (`desiredState: running`, not `failed` or `interrupted`, not owned by a ticket, an external validation or a qualification run), it is returned if it targets the current remote SHA. When the branch has moved, a replacement preview is launched on the new SHA and the stale one is stopped and cleaned up.
4. Otherwise a new preview is launched.

Deployment is asynchronous: the first response is usually `queued`. Poll `get_branch_preview` until `status` is `ready` (the URL serves `deployedSha`) or `failed`/`interrupted` (`error` holds the reason).

## `get_branch_preview`

Input: exactly one of `{previewId}` or `{requestId}`. Unknown identifiers, and previews owned by a ticket, return `{preview: null}`. The tool is read-only.

## `stop_branch_preview`

Input: exactly one of `{previewId}` or `{requestId}`, using the same schema as `get_branch_preview`. Unknown identifiers return `{preview: null}`. Only on-demand branch previews can be stopped: previews owned by a ticket, an external validation or a qualification run are refused with `NOT_BRANCH_PREVIEW` and a French `displayMessage`.

The tool delegates to the existing `PreviewManager.stop` cleanup path and returns `status: stopping` or `stopped`. Cleanup is asynchronous; poll `get_branch_preview` to follow it. Calling the tool again on an already stopped preview returns its state without error. MCP annotations are `destructiveHint: true` and `idempotentHint: true`.

## Output

All three tools return `{preview, dryRun}` where `preview` is `null` (get and stop only) or:

| Field | Meaning |
| --- | --- |
| `id` | Preview identifier, also shown in the board's previews view |
| `project`, `branch` | Target project key and branch |
| `status` | `queued`, `provisioning`, `building`, `deploying`, `ready`, `stopping`, `stopped`, `failed`, `interrupted` |
| `desiredState` | `running`, or `stopped` once deleted, expired or replaced |
| `url` | HTTPS preview URL, or `null` until Coolify assigns it |
| `requestedSha` | Remote branch commit pinned at launch |
| `deployedSha` | Commit Coolify confirmed as deployed, or `null` |
| `error` | Failure reason, or `null` |
| `cleanupStatus` | `pending`, `complete` or `failed` |
| `expiresAt`, `createdAt`, `updatedAt` | Epoch milliseconds |

## Errors

Errors are `{error: {code, message, displayMessage?}}` with `isError: true`. `message` is English like the rest of the public contract; branch preview errors also carry `displayMessage`, a French sentence meant to be shown as is to an end user (for example on a disabled button).

| Code | Cause |
| --- | --- |
| `INVALID_INPUT` | Input does not match the schema (no `displayMessage`) |
| `PROJECT_NOT_FOUND` | Unknown project key |
| `UNSUPPORTED_PROVIDER` | The project is not hosted on GitHub |
| `COOLIFY_NOT_CONFIGURED` | Coolify connection, server, project, HTTPS domain or preview authentication is missing |
| `PREVIEWS_DISABLED` | Previews are disabled for the project |
| `RECIPE_NOT_READY` | The branch has no ready preview recipe; `message` lists the diagnostics |
| `READINESS_CHECK_FAILED` | The branch recipe could not be inspected |
| `REQUEST_CONFLICT` | The `requestId` belongs to another project or branch |
| `NOT_BRANCH_PREVIEW` | The preview is not an on-demand branch preview (stop only) |
| `UNAVAILABLE` | The server was started without a preview manager |
| `PREVIEW_ERROR` | Any other launch or stop failure; `message` holds the redacted cause |

## Storage and verification boundaries

The `requestId` to preview mapping is stored in the SQLite `meta` table (`branch_preview_request:<requestId>`), so it survives restarts. Previews follow the existing lifetime, expiry and cleanup rules of [Coolify previews](coolify-previews.md); deleting a preview from the board does not forget its `requestId`.

Dry-run checks exercise the fake Coolify transport only. They do not prove a live Coolify deployment or GitHub access.

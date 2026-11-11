# Application version MCP contract

Frozen on 2026-11-08 for the Orchestrateur integration.

`get_application_version` accepts an empty object (`{}`) and returns exactly:

```json
{
  "installation": "desktop",
  "installed": "1.2.3",
  "available": null,
  "updatePageUrl": "https://github.com/Antune-L/atelier/releases/latest",
  "installedUnavailableReason": null,
  "targetUnavailableReason": "target_metadata_unavailable"
}
```

- `installation`: `desktop` or `source`.
- `installed`: desktop application version from Electrobun `Updater.getLocalInfo().version`, or full source commit captured at process startup. Never a Claude/Codex version, package placeholder, or MCP server identity.
- `available`: publisher-verified desktop manifest version when accessible through the existing update controller. On the cloud host (`KANBAN_HOST_ROLE=cloud`), the full commit SHA of public `main` when the root updater would accept it without a signed qualification, i.e. its locked Claude and Codex SDK versions equal the running ones. It is read from public GitHub metadata with the same five-minute cache as the update page; no Cloudflare Access assertion, updater socket or secret is used. A target that changes SDK versions is reported unavailable because no qualification publisher key is configured. Other source checkouts are not queried.
- `updatePageUrl`: known update page URL, otherwise null. It does not grant update authorization.
- `installedUnavailableReason`: null when installed is known; otherwise `installed_metadata_unavailable`.
- `targetUnavailableReason`: null when available is known; otherwise `target_metadata_unavailable` (desktop, or cloud source when GitHub is unreachable, the SDK versions change, or in dry-run), or `target_not_configured` (other source). `target_authorization_required` remains in the schema for older servers but is no longer returned.

All six keys are required. Nullable values are JSON null. Reasons are stable English codes. Installed and available are independent: available may equal installed, and no ordering or update command is implied. Clients must not compare source commit hashes as semantic versions.

The operation is read-only and uses the existing public `/mcp` loopback, Host/Origin and bearer-token guards. It adds no remote ingress, proxy, update permission, installation, restart, or provider operation. Responses retain the existing JSON text content and structuredContent envelope for old MCP clients. Existing tools and MCP initialization metadata remain unchanged.

## Implementation state

Implemented on `feat/application-version-mcp`, based on `9ca5e2c`. No deployment or infrastructure restart is included.

The source revision is captured once when `src/server/index.ts` loads, before server startup. `src/server/applicationVersion.ts` resolves the physical module root: `/opt/kanban/releases/<full commit>` supplies the revision without Git; other source checkouts use a bounded read-only Git HEAD lookup. Later MCP calls read only the captured value. The release path is supported by `deploy/vps/kanban-release.sh` (immutable root-owned release directory, Git metadata removed) and `deploy/vps/kanban.service` (entrypoint through `current`). Mutable development checkouts report their startup commit, not a digest of uncommitted files.

Desktop startup passes the existing Electrobun local version through `StartServerOptions`. Placeholder `0.0.0` is explicitly unavailable. The desktop controller's existing signed-manifest check supplies the available target without preparation or installation. Failed/private/inaccessible feeds return the stable unavailable code; no raw internal error reaches this public contract.

## Verification and boundaries

- `bun run typecheck` and `bun run lint`: passed.
- Existing MCP integration and VPS deployment-script suites: 27 passed, 2 skipped (ShellCheck unavailable). Existing desktop bootstrap/settings suites: 4 passed. Only the existing tool-list expectation was extended; no tests were added.
- Disposable dry-run HTTP smoke: successful tool call, exactly six output fields, identical JSON text and structured output, unexpected argument rejected, invalid bearer rejected. Desktop metadata/unavailable fallback and captured source revision surviving a symlink change were also checked.
- Simplifier: removed duplicated fallback response construction by reusing the reader. Regression review: public manager and server/desktop startup consumers agree; `remoteMcp/tools.ts` retains its separate registry. Existing initialization metadata and other tool contracts are unchanged.
- Claude and Codex use the same public MCP operation; no provider-specific integration, SDK selection, PR-host behavior, or provider version lookup changed. The MCP SDK client was exercised in dry-run; real Claude/Codex sessions were not launched.
- No live packaged Mac or VPS process was changed or queried. The physical VPS release path is statically qualified from the shipped service/release scripts; production startup behavior remains to be confirmed when this code is deployed separately. Source targets remain explicitly unavailable; no Cloudflare assertion is synthesized or reused from MCP authorization.

No unresolved contract questions. Next operational step, outside this change: separately authorized rollout and read-only verification on the installed Mac and VPS applications.

# Application updates from the VPS settings

The cloud board exposes **Settings > Serveur VPS > Mise à jour du VPS**. Desktop hosts return no updater status and display no control. The operator confirms that work is finished before submitting. The root updater selects the current `Antune-L/atelier` main commit and passes its full SHA to the existing upgrade script. No client-supplied command, SHA, repository, path or force option is accepted.

## Security boundary

The server and agents share the `kanban` user. A socket permission alone cannot distinguish them. The independent root updater therefore verifies the signed Cloudflare Access application JWT on **every** request: RS256 signature, issuer, application audience, exact configured email, expiry, issued-at and optional not-before. It fetches signing keys only from the configured team HTTPS endpoint with a five-minute cache. It never trusts a caller-supplied issuer or key URL. The [Cloudflare validation contract](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/) describes that token and key endpoint.

The backend forwards the `Cf-Access-Jwt-Assertion` header only to this fixed socket. It never returns or persists it. Public MCP and worker tools expose no updater operation. POST additionally requires an exact HTTPS same-origin Origin and a confirmation header; the existing request guard remains in force. A forged Origin alone is insufficient: the root service still requires the signed identity token. SSH-tunnel access without Access authentication cannot use this button; use the existing operator upgrade procedure instead. Dry-run uses the fake SystemAdapter and never contacts the updater.

This is a bearer-token boundary, not isolation between processes sharing a UID. An agent that steals a valid operator token, controls the trusted main branch, or compromises the backend can cross it. Access sessions should be short and the allowed-email policy must remain restricted. Do not log assertion headers or enable proxy request-header dumps. The updater introduces no sudo grant and does not change the application service hardening.

## Manual installation, by the operator only

No installation or VPS change is performed by this implementation. Use the reviewed-commit installation method in [vps-install.md](./vps-install.md), section A3. Do not install privileged files from `/opt/kanban/current` or any kanban-owned checkout. All parent directories and installed source/configuration must be root-owned and unwritable by `kanban`.

Install these reviewed artifacts independently of the application release:

| Source | Destination | Owner and mode |
| --- | --- | --- |
| `deploy/updater/updater.ts` | `/opt/kanban-updater/updater.ts` | root:root, 0644; directory 0755 |
| `deploy/updater/config.example.json` | `/etc/kanban-updater/config.json` | root:root, 0600; directory 0700 |
| `deploy/vps/kanban-updater.service` | `/etc/systemd/system/kanban-updater.service` | root:root, 0644 |

Replace all three configuration values with the existing Access team issuer, board application AUD tag, and the exact permitted user's email. Missing or invalid configuration fails startup. No secret signing key is needed. The updater uses the system Bun already installed at `/usr/local/bin/bun`, `/usr/bin/git`, and the root-owned `/usr/local/sbin/kanban-upgrade` and `/usr/local/sbin/kanban-release`. Those helpers must already be installed from reviewed source. The button never installs `/usr/local/bin/kanban-bridge`: after a button update that changes it, review it and run `sudo kanban-upgrade --sha <sha> --install-bridge`. No new package dependency is introduced.

Reload systemd and enable/start `kanban-updater.service` as the administrator. Its runtime directory is root:kanban 0750, with a root:kanban 0660 Unix socket; ownership and lifecycle follow the [systemd directory contract](https://freedesktop.org/software/systemd/man/latest/systemd.exec.html). Persistent state is in root-owned `/var/lib/kanban-updater/status.json`, inaccessible to the app. The updater is a separate service, with no PartOf/BindsTo dependency on kanban, so stopping the application does not kill it. It deliberately retains the root capabilities required by the existing upgrade helper: running the isolated build user, managing releases and controlling the kanban systemd unit. Never add the kanban user to sudoers or remove its NoNewPrivileges/ProtectSystem/ProtectHome restrictions.

Keep the existing tunnel's Access JWT validation enabled and verify that it forwards the assertion header to the board. Status requests require the same authentication as start requests. This installation does not alter cloudflared, units for the app or preview broker, or their hardening. Future releases do not update this root daemon, its configuration, unit or the upgrade helpers automatically: review and install each change separately.

## Execution and recovery

The updater retains `CAP_SETUID` through `AmbientCapabilities=CAP_SETUID`. On the observed systemd 259.5 VPS, the original unit started as root without that effective capability, and the upgrade failed at `runuser` before stopping the application. systemd's seccomp setup can drop this capability unless explicitly retained through the ambient set. Keep `NoNewPrivileges=yes` and the application service hardening enabled. The correction requires reinstalling the updater unit and reloading systemd; an ordinary application upgrade does not install it. Real verification of the corrected service remains required.

A synchronous in-process reservation rejects a second start before resolving main. The existing upgrade script also takes its root-owned flock, serializing UI and manual upgrades. State is atomically persisted before and during the run. The board polls every three seconds and reconnects after the application restart; no open browser connection owns the upgrade. Only bounded step descriptions are persisted; detailed stderr remains in the root service journal.

The helper builds before touching the running app and refuses active execution runs, quality runs, preview transitions or busy slots. A persistent Atelier session is exempt only when its conversation and session IDs and provider match, the conversation is idle, and its raw subagent state is a valid empty JSON array. Missing, mismatched or malformed state remains blocking for both Claude and Codex. **There is no admission drain.** Another automated or user action can start between the helper's final idle check and service stop. Do not start cards, validations, previews, audits or interactive shells during an upgrade; disable scheduling beforehand. This limitation applies equally to Claude and Codex and all PR hosts. There is no force override from the UI. Interactive shells and untracked processes are not proven idle by the helper's database query. A fully race-free drain remains future work; this implementation does not claim one.

Success means the helper returned zero after its existing health checks (or found the release already current). An active-work refusal returns exit code 75 and persists the retryable `refused` phase. The application was not stopped; the operator can confirm again and retry after work finishes, without resetting state. Failure includes a build failure, rollback or unhealthy rollback. The UI intentionally blocks another start after failure or updater interruption. An administrator must inspect the updater and application journals, current release link, database compatibility and backup before recovery. After resolving the cause, stop the updater, archive/remove only its status file, then start it again to return to idle. Never reset state or restart the updater while a build or cutover is running. A daemon restart during an active run records `interrupted` and does not silently retry.

Rollback restores **code only**, never the database schema. Exit code 2 means rollback health also failed. Preserve the pre-upgrade database backup and follow the existing manual recovery procedure. Health is application availability, not real Claude/Codex workflow qualification.

## Installing this correction

An ordinary application update does not replace root-owned helpers. Install the reviewed `deploy/vps/kanban-upgrade.sh`, `deploy/updater/updater.ts` and `deploy/vps/kanban-updater.service` using the existing administrator procedure, preserving `/etc/kanban-updater/config.json`. Update the application to the matching revision as well: older boards do not recognize the `refused` phase. An older helper still returns exit code 1 for active work; the new daemon deliberately treats that ambiguous result as a failure.

Old persisted `failed` states are not automatically reclassified: exit code 1 can also indicate a real failure. For the observed pre-cutover active-work refusals, inspect the journal first, stop the idle updater, archive its failed status, reload the corrected unit, and start the updater again. Do not archive or reset state during a running update. Subsequent active-work refusals remain retryable through the UI.

## Verification boundary

Local typecheck, lint and existing regression suites cover compilation and shared app behavior. Root systemd lifecycle, live Access authentication, real build/cutover, reconnect behavior across a real restart and database rollback recovery require operator validation on the VPS. No deployment, SSH write, restart or real provider run is authorized by this change.

# Setting up the Mac ↔ VPS link

This guide sets up both directions of the link between the Mac board (desktop app) and the VPS board:
- the Mac board opens from any device at `https://<mac-host>`, behind a remotely managed Cloudflare Tunnel and an owner-only Access application;
- the Mac reaches the VPS through the SSH bridge (`ssh <alias> /usr/local/bin/kanban-bridge <op>`, see [vps-remote-access.md](./vps-remote-access.md#mac-bridge-socket)).

Three actors share the work:
1. **An agent with the Cloudflare MCP** creates the Cloudflare resources ([section 2](#2-cloudflare-resources-agent-with-the-cloudflare-mcp)). No Cloudflare API token is stored anywhere.
2. **You** copy the tunnel token once and run the setup script ([sections 3 and 4](#3-store-the-tunnel-token-you)).
3. **`scripts/setup-mac-vps-link.ts`** installs and checks the Mac side and checks the VPS side. It is idempotent: a second run changes nothing.

It automates [mac-remote-access.md](./mac-remote-access.md) with a remotely managed tunnel (its configuration lives at Cloudflare, so the agent can write it without a file on the Mac). The threat model, the Access policy rules and the acceptance checks of that guide still apply and are not repeated here.

Placeholders are those of [mac-remote-access.md](./mac-remote-access.md#what-protects-what): `<domain>`, `<team>`, `<email>`, `<mac-host>`, `<mac-aud>`, `<kanban-host>`, `<tunnel-id>`, plus `<alias>` the `~/.ssh/config` alias of the VPS. None of them belongs in the repository.

## 1. Prerequisites

- The VPS runs Kanban as in [vps-install.md](./vps-install.md) and its board is published as in [vps-remote-access.md](./vps-remote-access.md) steps 1 to 6: Zero Trust team `<team>`, Google as the only login method, MFA methods allowed.
- `<alias>` is in `~/.ssh/config` with a key that works without a prompt: `ssh -o BatchMode=yes <alias> true` succeeds from a terminal on the Mac. The SSH user is in the `kanban` group on the VPS.
- The VPS release and the bridge program match the Mac (protocol 2): on the VPS, `sudo kanban-upgrade --sha <sha>` with the reviewed commit installs both ([vps-install.md](./vps-install.md#a3-install-the-root-scripts-and-a-release)).
- On the Mac: Homebrew, and the desktop app open (the script talks to its local API on `127.0.0.1:52817`).

## 2. Cloudflare resources (agent with the Cloudflare MCP)

Rules for the agent:
- Before each write, look the endpoint up with the MCP `search` tool and check the field names against the spec. Do not invent a field; if one below is not in the spec, stop and report it.
- **Never return a secret from `execute`.** Code that creates the tunnel must return only its `id` and `name`: the create response also carries `token` and `credentials_file`. Never call the tunnel token endpoint.
- Create the Access application before the DNS record: a hostname routed to the tunnel without an Access application is open to the internet.
- Do not edit or reuse the VPS board application, its policy or the `kanban-vps` tunnel.

Steps, with `{account_id}` the account of `<domain>`:

1. **Read the context.**
   - Zone: `GET /zones?name=<domain>`, keep `id` as `{zone_id}`.
   - Team: `GET /accounts/{account_id}/access/organizations`; `auth_domain` is `<team>.cloudflareaccess.com`, so `<team>` is its first label.
   - Google login method: `GET /accounts/{account_id}/access/identity_providers`, keep the `id` of the Google provider.
2. **Access application.** `POST /accounts/{account_id}/access/apps` with `type: "self_hosted"`, a `name`, `domain: "<mac-host>"` (no path), `session_duration` as short as the owner accepts (shorter than the 24 hours of the VPS board, for example `"1h"`), `allowed_idps: ["<google-idp-id>"]`, `auto_redirect_to_identity: true`, and one policy `{ name, decision: "allow", include: [{ email: { email: "<email>" } }], require: [{ login_method: { id: "<google-idp-id>" } }] }`. No other policy, no Bypass or Service Auth. Return `id` and `aud`; `aud` is `<mac-aud>`.
   The VPS guide also overrides the global MFA settings on the policy to require MFA ([vps-remote-access.md](./vps-remote-access.md#5-access-policy-and-application)). Set it through the API only if `search` shows the field; otherwise ask the owner to turn it on in the dashboard (**Access controls > Applications > `<mac-host>` > Policies**) before step 5.
3. **Tunnel.** `POST /accounts/{account_id}/cfd_tunnel` with `name: "kanban-mac"` and `config_src: "cloudflare"`. Return only `id` (`<tunnel-id>`) and `name`.
4. **Tunnel configuration.** `PUT /accounts/{account_id}/cfd_tunnel/{tunnel_id}/configurations` with:

   ```json
   {
     "config": {
       "ingress": [
         {
           "hostname": "<mac-host>",
           "service": "http://127.0.0.1:52817",
           "originRequest": { "access": { "required": true, "teamName": "<team>", "audTag": ["<mac-aud>"] } }
         },
         { "service": "http_status:404" }
       ]
     }
   }
   ```

   This is the remote equivalent of the `config.yml` of [mac-remote-access.md](./mac-remote-access.md#4-configuration-file): `cloudflared` rejects a request without a valid Access token for `<mac-aud>`. Set no `httpHostHeader`: the board must receive `Host: <mac-host>`. Read it back with `GET` on the same path and return only `config`.
5. **DNS record.** `POST /zones/{zone_id}/dns_records` with `type: "CNAME"`, `name: "<mac-host>"`, `content: "<tunnel-id>.cfargotunnel.com"`, `proxied: true`.
6. **Hand-off.** Report to the owner: `<mac-host>`, the tunnel name `kanban-mac`, `<tunnel-id>`, the application id, and whether the MFA override still has to be set by hand. Not the token.

## 3. Store the tunnel token (you)

In the dashboard, open **Networking > Tunnels > kanban-mac** and its connector install instructions. As on the VPS ([vps-remote-access.md](./vps-remote-access.md#8-create-the-tunnel-and-keep-its-token)), **do not run the displayed `cloudflared service install <token>`**: copy the command of **Or, run tunnel (manual)** and keep only the token, the part starting with `eyJ`. Then pipe it to the script from the clipboard, and clear the clipboard:

```bash
pbpaste | bun scripts/setup-mac-vps-link.ts --token-stdin
pbcopy < /dev/null
```

The script checks that it is a tunnel token, then stores it in `~/Library/Application Support/kanban-agents/cloudflared-tunnel.token` (mode 0600; `--token-file <path>` for another place). It never prints it.

Why not `cloudflared service install <token>`: the token would sit on a command line, readable by any local user with `ps`, at least while the installer runs (and in the service definition with older `cloudflared` versions). The script writes its own launch agent `com.kanban-agents.cloudflared` instead, which runs `cloudflared tunnel --metrics 127.0.0.1:20249 run --token-file <file>` (needs `cloudflared` 2025.4.0 or newer). Like the official one, a launch agent only runs while you are logged in, which is also when the desktop app runs.

## 4. Run the setup script (you)

From the repository root on the Mac:

```bash
bun scripts/setup-mac-vps-link.ts --other-board-url https://<kanban-host> --ssh-alias <alias> --public-hostname <mac-host> --board-name Mac
```

It runs every step, fixes what it can and prints a checklist (`ok`, `fixed`, `MISSING`, `FAILED`, `skipped`, `warning`). Exit code 0 means everything is in place, 1 that something is missing or failing, 64 a bad option.

| Section | Check | Fix applied by the script |
|---|---|---|
| Mac | `cloudflared` installed, version 2025.4.0 or newer | `brew install cloudflared` (only when Homebrew is there) |
| Mac | tunnel token file: regular file, yours, mode 0600, holds a tunnel token | `chmod 600` |
| Mac | launch agent `~/Library/LaunchAgents/com.kanban-agents.cloudflared.plist` up to date and loaded | writes it, then `launchctl bootstrap` (after `bootout` when it changed) |
| Mac | tunnel connected: `http://127.0.0.1:20249/ready` reports ready connections | none; logs in `~/Library/Logs/kanban-agents-cloudflared.log` |
| Kanban | `otherBoardUrl`, `sshHostAlias`, `publicHostname`, `boardName` | `PATCH /api/settings` with the differing fields only |
| Kanban | the running app accepts `Host: <mac-host>` on `/health` | none: quit and reopen the app after a hostname change |
| Repo | `deploy/vps/kanban-bridge` version and operations match `src/shared/vpsBridge.ts` | none |
| VPS | non-interactive SSH (`BatchMode=yes`, the options of the bridge), SSH user in `kanban` | none |
| VPS | `/health` through `/run/kanban/ui.sock` answers 200 | none |
| VPS | `/usr/local/bin/kanban-bridge program-version` equals the Mac protocol | none: `sudo kanban-upgrade --sha <sha>` on the VPS |
| VPS | the `version` bridge operation answers the Mac protocol through `bridge.sock` | none |
| Final | an unauthenticated `https://<mac-host>/` is refused: a redirect to `*.cloudflareaccess.com`, or 401/403 | none |

Settings left out keep their current value, so a later run needs no flags. The script calls the local API like any local client: a loopback `Host` and no `Origin`, which Kanban's guard accepts.

Check only, without any change:

```bash
bun scripts/setup-mac-vps-link.ts --check
```

A warning about `com.cloudflare.cloudflared` means the connector of [mac-remote-access.md](./mac-remote-access.md#5-run-the-connector) is installed too. Keep a single connector for `<mac-host>`: remove the old one (`cloudflared service --help` lists the uninstall subcommand), then delete its tunnel in the dashboard.

## 5. What stays manual

- **C0, SSH from the Finder-launched app.** The script runs from a terminal, which has your shell environment and SSH agent; the desktop app launched from the Finder does not. Quit the app, open it from the Finder, then in the Mac board open the creation form, set **Board cible** to **VPS** and create a card. It must work. Repeat after a Mac restart and after a sleep. On failure, the form names the cause (authentication, host key, unreachable, version).
- **The positive Access path.** On the phone, sign in at `https://<mac-host>` and run the checklist of [mac-remote-access.md](./mac-remote-access.md#phone-checklist).
- **The `cloudflared` refusal test in isolation** of [mac-remote-access.md](./mac-remote-access.md#cloudflared-refusals-tested-in-isolation). With a remotely managed tunnel, the temporary rule is a second ingress entry added by the agent (step 4 of section 2) with a temporary hostname and its DNS record, both removed afterwards; restarting the connector is not needed.

## Rotate or remove

- **Rotate the token**: on the tunnel overview, **Refresh token > Rotate token**, then pipe the new token as in section 3 and run `launchctl kickstart -k gui/$(id -u)/com.kanban-agents.cloudflared` so the connector reads it.
- **Remove**: `launchctl bootout gui/$(id -u)/com.kanban-agents.cloudflared`, delete the launch agent file and the token file, have the agent delete the DNS record, the tunnel and the Access application, empty **Nom public de ce Mac** in **Réglages > Liaison des boards**, then restart the app.

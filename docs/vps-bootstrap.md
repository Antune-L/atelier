# Setting up a VPS in one flow

This guide takes a fresh Ubuntu 24.04 x86_64 VPS to the full setup: Coolify, Kanban (Phase A), the board behind Cloudflare Access, the remote MCP, Phase B previews, and the link with the Mac board. It also checks an existing VPS without changing it.

Three scripts share the work:
- **`kanban-bootstrap`** (`deploy/vps/kanban-bootstrap.sh`), run as root on the VPS. It installs every root file from the reviewed commit named with `--sha`, never from a release tree. `--check` changes nothing and lists what is missing.
- **`scripts/setup-cloudflare.ts`**, run on the Mac. It audits the Cloudflare side and, with `--apply`, creates what is missing. It never changes or deletes an existing resource: drift is reported and fixed by you in the dashboard.
- **`scripts/setup-mac-vps-link.ts`**, run on the Mac ([mac-vps-link-setup.md](./mac-vps-link-setup.md)).

All three print a checklist (`ok`, `fixed`, `MISSING`, `FAILED`, `skipped`, `warning`) and exit with 0 when everything is in place, 1 when something is missing or failing, 64 on a bad option. A second run changes nothing. [vps-install.md](./vps-install.md), [vps-remote-access.md](./vps-remote-access.md) and [mac-vps-link-setup.md](./mac-vps-link-setup.md) stay the reference for what each step does and why.

Placeholders: `<alias>` the `~/.ssh/config` alias of the VPS, `<email>` the only allowed Google account, `<domain>` the Cloudflare zone, `<kanban-host>`, `<mcp-host>` and `<mac-host>` the three public hostnames, `<mcp-port>` the local port of the remote MCP, `<team>` the Zero Trust team, `<preview-domain>` the base of the preview hostnames, `<account-id>` the Cloudflare account id.

## What is accepted

- **Coolify keeps its own login** (user and password, no Google, no enforced second factor). Its dashboard gives root on the host, and its login page is public on its domain; agents can also reach it, because `kanban.service` does not block the VPS public address. Cloudflare Access cannot sit in front of it: the preview broker calls the Coolify API with a token and refuses redirects (`deploy/preview-broker/broker.ts`).
- **The Coolify installer is third-party code** fetched from `cdn.coollabs.io`, outside the reviewed-commit rule. `kanban-bootstrap` prints its sha256 before running it. Rerunning it upgrades Coolify.
- **Previews use a DNS-only wildcard** with one certificate per preview. Preview hostnames appear in public certificate logs; each preview keeps its basic authentication.

## 1. Install the bootstrap from the reviewed commit (VPS)

Keep an admin review clone in your account, pick the reviewed commit, then install the script from it:

```bash
git clone https://github.com/Antune-L/atelier.git ~/kanban-admin
git -C ~/kanban-admin fetch && git -C ~/kanban-admin log --oneline origin/main
sha=<full-commit-sha>
git -C ~/kanban-admin show "$sha:deploy/vps/kanban-bootstrap.sh" | sudo "$(command -v gnuinstall || command -v install)" -m 0755 -o root -g root /dev/stdin /usr/local/sbin/kanban-bootstrap
sudo kanban-bootstrap --sha "$sha" --check
```

Later runs reinstall `kanban-bootstrap`, `kanban-release`, `kanban-upgrade`, `kanban-bridge` and the units from the commit you name, when they differ.

## 2. Coolify and Kanban (VPS)

```bash
sudo kanban-bootstrap --sha "$sha" --coolify-admin-email <email>
```

On a host without Coolify, this generates the Coolify admin password in `/root/coolify-admin.env` (root, 0600) and runs the official installer with it, so the registration page is never open. On a host with Coolify, the installer is never run. Then it installs Phase A: packages, the AppArmor profile, Bun, the `kanban` and `kanban-build` users, directories, `/etc/kanban/kanban.env`, the root scripts, `kanban.service`, the first release, and adds your admin account to the `kanban` group (log out and back in).

By hand, then rerun the same command until it only reports these steps:
1. **Coolify**: sign in with the generated credentials, set its HTTPS domain, move the password to your password manager, then `sudo rm /root/coolify-admin.env`. In **Settings > Advanced**, enable the API and set its IP allowlist (the VPS public address and the gateway of the `coolify` Docker network, see [vps-install.md](./vps-install.md#b2-units)). Create the API token (`read`, `write`, `deploy`), the GitHub App or deploy key, and the server, project and environment of the previews.
2. **Logins for the `kanban` user**: GitHub, Codex, Claude, skills and the project clone, as in [vps-install.md A4](./vps-install.md#a4-logins-for-the-kanban-user).
3. **Board**: add the project and turn **Validation qualité sur ce poste** off ([vps-install.md A6](./vps-install.md#a6-open-the-board-from-the-mac)).

## 3. Cloudflare (from the Mac)

**Account-wide steps, by hand**, because they affect every application of the account: the Google OAuth client and the Google login method with One-time PIN removed, the MFA methods, and the App Launcher ([vps-remote-access.md](./vps-remote-access.md) steps 1 to 4 and 6). The script checks them.

**API token.** In the dashboard, create an API token limited to the account and the zone, with a short expiry and **Client IP Address Filtering** set to the Mac's address. Permissions:
- Account: `Access: Apps and Policies Write`, `Access: Organizations, Identity Providers, and Groups Read`, `Cloudflare Tunnel Write`.
- Zone: `Zone Read`, `DNS Write`, `Bot Management Read`.

Keep it out of files and shell history, and revoke it after the setup:

```bash
read -rs CLOUDFLARE_API_TOKEN && export CLOUDFLARE_API_TOKEN
bun scripts/setup-cloudflare.ts --account-id <account-id> --zone <domain> --email <email> --board-host <kanban-host> --mcp-host <mcp-host> --mcp-port <mcp-port> --mac-host <mac-host> --preview-domain <preview-domain>
```

This first run only audits. Add `--apply` to create what is missing, in this order: one reusable owner policy (allow `<email>`, require the Google login method, MFA with an authenticator app or biometrics), an Access application per hostname with that policy (the MCP one with Managed OAuth, localhost and loopback clients), the tunnels `kanban-vps` (board and MCP) and `kanban-mac`, their routes with Access token validation, and last the proxied DNS records. A route is only written when its application is valid, and a DNS record only when its route validates the token. An existing policy with the same rules is reused. The audit prints the AUD tag of each application; the MCP one is `<mcp-aud>`.

The audit also reports a proxied `*.<preview-domain>` record (previews need DNS only, pointing at the VPS) and Bot Fight Mode, which applies to the whole zone and can block the MCP clients.

## 4. Connector and remote MCP (VPS)

The tunnel token goes straight from the API to the VPS, never to a terminal or a command line:

```bash
bun scripts/setup-cloudflare.ts tunnel-token --account-id <account-id> --tunnel kanban-vps | ssh <alias> 'umask 077 && cat > ~/kanban-tunnel.token'
ssh -t <alias> 'sudo kanban-bootstrap --sha <sha> --board-host <kanban-host> --tunnel-token-file ~/kanban-tunnel.token --mcp-host <mcp-host> --mcp-port <mcp-port> --access-team-domain <team>.cloudflareaccess.com --mcp-aud <mcp-aud>'
```

The single quotes make `~` the home of your VPS account. The token file is read, stored in `/etc/cloudflared/kanban.token` (user `cloudflared`, 0600) and deleted. When `sudo` needs no password, `| ssh <alias> sudo kanban-bootstrap ... --tunnel-token-stdin` does the same in one step. The run also installs `cloudflared` and its unit, sets `DEV_HOST` and the four `KANBAN_REMOTE_MCP_*` lines. A changed `kanban.env` needs a restart, which stops running cards: when no card runs, rerun with `--restart`. Then follow the [activation sequence](./vps-install.md#m4-activation-sequence) of the remote MCP with only a test project allowed.

## 5. Previews (VPS)

```bash
sudo kanban-bootstrap --sha "$sha" --with-previews
```

It installs the `kanban-preview` user, the broker files, its units and the `kanban.service` drop-in, Chrome and the Playwright MCP cache. The first run installs the example `/etc/kanban-preview/config.json`: fill it with `sudo nano /etc/kanban-preview/config.json` ([vps-install.md B1](./vps-install.md#b1-broker-user-files-and-configuration)), or pipe a ready file with `--broker-config-stdin`. Once the Coolify dashboard works on its domain, close its direct ports:

```bash
sudo kanban-bootstrap --sha "$sha" --with-previews --coolify-lock-ports
```

This writes `/data/coolify/source/docker-compose.custom.yml` (ports 8000, 6001 and 6002 on `127.0.0.1` only) and reruns the Coolify installer to apply it. Check afterwards that the dashboard, its live updates and its terminal still work on the domain.

By hand: the Coolify settings of the VPS board and the previews of the project ([vps-install.md B3](./vps-install.md#b3-preview-settings-on-the-vps-board)), then the quality owner switch, Mac off first, VPS on second, with no validation running ([B4](./vps-install.md#b4-make-the-vps-the-quality-owner)).

## 6. Mac board and link (Mac)

```bash
bun scripts/setup-cloudflare.ts tunnel-token --account-id <account-id> --tunnel kanban-mac | bun scripts/setup-mac-vps-link.ts --token-stdin
bun scripts/setup-mac-vps-link.ts --other-board-url https://<kanban-host> --ssh-alias <alias> --public-hostname <mac-host> --board-name Mac --access-team <team> --allow-projects <keys> --remote-profile <profile-id>
```

The second command also fills the VPS board link to `https://<mac-host>` when it is empty; `--vps-allow-projects` and `--vps-remote-profile` set the projects and profile of the VPS remote MCP. Then connect the MCP clients ([vps-remote-access.md MCP 5](./vps-remote-access.md#mcp-5-connect-the-mac-clients)).

## 7. What stays manual

- The Google OAuth client, the account-wide Access settings, and the first MFA enrollment on the App Launcher.
- The Coolify token, its source and its resources; the logins of the `kanban` user; `claude mcp login` and `codex mcp login` on the Mac.
- Reviewing the commit before each `--sha`, and the Coolify installer it runs.
- The qualifications: [vps-install.md A7, B6 and M7](./vps-install.md#m7-qualification-checklist), the phone checklist and C0 of [mac-vps-link-setup.md](./mac-vps-link-setup.md#5-what-stays-manual).

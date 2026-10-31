# VPS one-flow setup — state

Analysis: `plans/athena/2026-10-31-vps-full-setup/report.md` in the main checkout (git-ignored).

## Current summary

- Branch `feat/vps-bootstrap` from `main` at `a80790d` (PR #267, `--install-bridge`).
- Owner decisions (2026-10-31): Coolify keeps its own user and password (no Google, no enforced 2FA); first fresh VPS is Ubuntu 24.04 x86_64; Cloudflare automation is audit first, create-only, account-wide settings stay manual.
- Delivered:
  - `deploy/vps/kanban-bootstrap.sh`: root setup and `--check` from a reviewed `--sha` (scratch bare repo, like `kanban-upgrade`'s bridge fetch): Coolify (official installer with `ROOT_*` from `/root/coolify-admin.env`), Phase A, cloudflared + token (stdin or file, deleted after read), `DEV_HOST`, the four `KANBAN_REMOTE_MCP_*`, Phase B files and units, Chrome (pinned playwright) and the Playwright MCP cache, `--coolify-lock-ports` (custom compose + installer rerun). Restarts kanban only with `--restart`.
  - `scripts/setup-cloudflare.ts`: audit and `--apply` create-only (owner policy reused when one conforms, Access apps incl. MCP Managed OAuth, tunnels `kanban-vps` / `kanban-mac`, routes with `access.required`, DNS last), `tunnel-token` to a pipe only.
  - `scripts/lib/setupReport.ts`: reporter, `run`, `parseTunnelToken`, shared by both Mac scripts.
  - `scripts/setup-mac-vps-link.ts`: VPS health probe with `Host: localhost`, strict Access check (redirect to `/cdn-cgi/access/login`, optional `--access-team`), VPS public host check, Mac `--allow-projects` / `--remote-profile`, VPS settings over SSH (`otherBoardUrl` filled when empty, `--vps-allow-projects`, `--vps-remote-profile`).
  - `kanban-upgrade.sh`: `--install-bridge` fails when the bridge cannot be read.
  - Docs: `docs/vps-bootstrap.md`; `vps-install.md` (pointer, bridge wording, `:427` provenance fix); `vps-remote-access.md` (MCP policy attached from the start, `/etc/cloudflared` root:cloudflared 0750); `mac-vps-link-setup.md`.
- Verified:
  - `kanban-bootstrap.sh` in an `ubuntu:24.04` arm64 container (no systemd): check, apply, recheck idempotent; usage errors 64; tunnel token stdin/file paths. Not run: systemd units, `kanban-release`, Coolify installer, Chrome (x86_64 only), cloudflared connection.
  - `setup-cloudflare.ts`: request bodies checked against the Cloudflare OpenAPI spec; response shapes checked with read-only GETs on the owner's account (2026-10-31). Never run with a real token.
  - `setup-mac-vps-link.ts`: help and usage only; not run against the live app or VPS.
- Live finding (read-only, 2026-10-31): on tunnel `kanban-vps`, the `<mcp-host>` route has no `originRequest.access` (cloudflared does not validate the Access token; Kanban still does). The board route has it. Fix in the dashboard: MCP 2 of `vps-remote-access.md`.
- Next action: owner review; first real run on a fresh Ubuntu 24.04 x86_64 VPS following `docs/vps-bootstrap.md`.

## Open hypotheses

- Coolify password rules accept the generated password (random base64 + `-Kb7`).
- `docker-compose.custom.yml` applied by rerunning the installer keeps realtime and terminal working through the domain.
- The `cloudflare` identity provider type seen on the account (empty name) is not a login method the owner policy allows; the policy requires Google.

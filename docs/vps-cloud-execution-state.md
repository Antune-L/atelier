# VPS cloud execution — working state

## Current state

- Revision: branch `feat/vps-cloud-execution` on top of main `3bfe729` (2026-10-08). The loopback bind and Host/Origin guard shipped in `4f29093`.
- Implementation status: PRD tasks T1–T10 are implemented. T11, the real qualification on the VPS, is on the user's side and follows `docs/vps-install.md`.
- Goal: run Kanban as a second, independent instance on the Ubuntu VPS that also hosts Coolify. Cloud cards keep going while the Mac is off, and the Mac stays autonomous when the VPS is unreachable. Only one quality validation runs at a time across both hosts.
- Scope authorized by the user on 2026-10-08: implement Phase A (ordinary cloud cards, PR-only, no previews) and Phase B (same-host previews through a broker). PRD: `plans/20261008-vps-cloud-execution.prd.json`.
- Private analysis reports, not in the public repo: `~/Library/Application Support/kanban-agents/notes/athena-vps-*.md`.

## Decisions

- D1: the VPS continues alone when the Mac is off.
- D2: the Mac stays autonomous when the VPS is unreachable.
- D3: exactly one quality validation total, enforced by a static per-host quality owner.
- D4: the pilot project is `Antune-L/atelier`.
- D5: Ubuntu with a native systemd unit, not a Coolify image. The real VPS runs Ubuntu 26.04; the guide supports 24.04 and 26.04.
- D6: GitHub over HTTPS through `gh auth setup-git`.
- D7: Claude and Codex are both supported; Azure DevOps is not cloud-qualified.
- D8: no agent on the VPS may reach root. The service and its agents run as a dedicated `kanban` user without sudo or docker; they may share its data and credentials.
- D9: previews run on the same VPS as Coolify.
- D10: the user accepted that Mac agents can still reach the VPS as root through the operator SSH key, so Phases A and B protect against VPS agents only.
- D11: the VPS uses the owner's GitHub account with a fine-grained token limited to the owner's repos. Organization repos where the owner is only a collaborator may use a classic token. There is no robot account, so rulesets, CODEOWNERS and the never-APPROVE rule bring no protection. PR-only delivery is enforced by Kanban's cloud role instead.
- D12: there is one `gh` login per VPS, not a token per project. A fine-grained token covers every selected repo of one owner, and a classic token covers everything.
- D13: the Mac keeps today's direct preview mode. Only the VPS uses the broker.

## Plan

- Phase A, code:
  1. A cloud host role: PR-only, no review-request automation, no self-update.
  2. The static quality owner setting.
  3. The server port no longer exported to agents.
  4. Graceful SIGTERM.
  5. An optional Unix-socket UI listener.
  6. Install files: systemd unit and release script.
  7. An install guide.
- Phase B, code:
  1. A preview broker with its own user and socket, holding the Coolify token, Dockerfile-only.
  2. A root cleanup helper behind a socket-activated unit.
  3. A broker transport in PreviewManager.
  4. A configurable Playwright browser.
- User side: VPS commands, logins, and the final real-card qualification.

## Verified findings

- Isolated dry-run server on macOS:
  - With `KANBAN_SOCKET`, TCP answers only `/health` and the authenticated MCP endpoints.
  - The socket serves the API and WebSockets.
  - The cloud role refuses auto-merge, direct push and the merge route.
  - `qualityOwner=false` disables Devin.
  - SIGTERM stops cleanly and removes the socket.
- Ubuntu 24.04 x64 container:
  - The same socket checks pass under a dedicated `kanban` user.
  - `kanban-release.sh` passes shellcheck, is idempotent, and produces a root-owned release with the Linux Claude and Codex packages, without `.git`.
  - `systemd-analyze verify` reports nothing for the units.
- Ubuntu 26.04 x64 container (2026-10-09):
  - The A1 packages install. The `apparmor` package already ships `/etc/apparmor.d/bwrap-userns-restrict`, while 24.04 only has it under `/usr/share/apparmor/extra-profiles`. The guide handles both.
  - Bun 1.3.14 installs, `kanban-release.sh` builds main, and the branch server answers `/health` on TCP, `forbidden` for `/api` on TCP and serves `/api` on the socket.
- Real VPS, step 0 (2026-10-09): `x86_64`, Ubuntu 26.04 LTS, `kernel.apparmor_restrict_unprivileged_userns = 1`. Public listeners: SSH, Docker ports 80, 443, 6001, 6002, 8000 and 8080. Nothing listens on 52817.
- Broker against a fake HTTPS Coolify:
  - Refused: Compose, custom run options, other repositories, foreign apps, wrong domains, other servers and other environment names.
  - Allowed: the normal create, deploy and delete cycle, rebuilt from the root config.
  - Cleanup reaches the helper and refuses non-registered apps.
- Typecheck, lint and 279 existing tests pass. A regression review found no default-path regression; its only finding (SIGINT handling) is fixed.

- Bun's default `Bun.serve` bind is `*:port`. With `hostname: "127.0.0.1"`, Node's HTTP client and curl still reach it through `localhost`.
- `Antune-L/atelier` is public, so rulesets are free.
- Fine-grained tokens on an organization need membership and, by default, owner approval.

## Open hypotheses

- The Codex bubblewrap sandbox and Google Chrome work under the hardened unit, with the AppArmor userns restriction on. To probe on the VPS.
- Real Coolify accepts the broker's rebuilt payload (`environment_name` plus `environment_uuid`, no compose fields). To probe on the VPS in Phase B.

## Next action

Merge the branch into main after the user's go-ahead. The user then follows `docs/vps-install.md` Phase A and reports the acceptance checks.

## History

- 2026-10-09: the user ran step 0 on the VPS. It runs Ubuntu 26.04, so the guide was adapted and Phase A was replayed in a 26.04 container.

- 2026-10-08: implemented the cloud role, quality owner, socket UI, graceful stop, agent port, Playwright pinning, preview broker, root cleanup helper, units, release script and guide; verified as listed above.
- 2026-10-08: plan resumed. Decisions D11–D13 settled in conversation, and implementation of Phases A and B authorized.

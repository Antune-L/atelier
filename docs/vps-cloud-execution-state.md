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
- D14: no update button in the VPS UI. The server and its agents share the `kanban` user (D8), so a button would give agents a trigger for a root action. No socket, `.path` unit or HTTP route reachable by `kanban` starts an upgrade. Upgrades run as `ssh <vps> sudo kanban-upgrade`.
- D15: every file root executes or loads on the VPS (`kanban-release`, `kanban-upgrade`, the units, the broker and its cleanup helper) is installed from a reviewed commit with `git show <sha>:<path> | sudo install ... /dev/stdin <dest>`, never from `/opt/kanban/current`. Neither script updates itself from a release.

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
- Upgrade tooling:
  1. `kanban-release --build-only <sha>` builds without switching `current`. Build steps run in transient systemd units with the service's `IPAddressDeny`, so no build process survives.
  2. `kanban-upgrade`: lock in `/run`, `main` tip or `--sha`, disk check, build before stop, read-only active-work check as `kanban` (`--force` to override), backup as `kanban`, atomic switch, `/health` check, code-only rollback, retention.
  3. Install guide: root files from a reviewed sha (D15), Upgrade section around `sudo kanban-upgrade`, manual fallback kept.
- User side: VPS commands, logins, and the final real-card qualification. The real qualification of `kanban-upgrade` on the VPS is pending.

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
- Real VPS, A7 (2026-10-09): `/health` from the Mac times out (`000`), TCP `/api/settings` on the VPS returns `forbidden`, and a card with auto-merge or direct push is refused with the PR-only message. Remaining: a real card to PR with the Mac off, and a restart during a card.
- Real VPS, Phase A (2026-10-09): release `f4c5949` installed, skills copied to `/var/lib/kanban/.agents/skills`, and `kanban.service` active with `dryRun=false`, the Claude binary ready and the Codex runtime `ready`.
- First real card on the VPS failed with `ENOENT ... scandir '/var/lib/kanban/kanban-worktrees'`: the slot reset lists the worktrees root before `git worktree add` creates it, so any fresh host fails. Fixed by treating a missing root as empty in `delegationWorkspace.ts`; reproduced before and passing after with a probe. Workaround on the VPS: create the directory as `kanban`.
- After that failure, "relance en place" spawned Claude in the never-created `slot-1` worktree. The spawn ENOENT came from the missing cwd, and the Claude SDK reported it as a libc mismatch. The binary itself runs under `kanban` (`2.1.288`). Fix: `relaunchInPlace` now refuses a missing worktree with a clear message. A full-launch fallback was rejected because a regression review showed it could re-fork a branch that was already pushed.
- The next card failed with `401 OAuth access token is invalid`: the `CLAUDE_CODE_OAUTH_TOKEN` in `kanban.env` is rejected. The user is checking and regenerating it.
- A7 test 4 (2026-10-09): after the token was regenerated, a VPS card opened draft PR #192 (1 file, not merged). Whether the Mac was off, and whether Codex ran under bubblewrap, is not recorded yet. Test 5 (restart during a card) is pending. Fixes `dc34077` are pushed but not yet released on the VPS.
- Real VPS, Phase B (2026-10-09):
  - The broker started (`preview broker ready`, project `atelier`).
  - Coolify answered 403 `You are not allowed to access the API.` until the VPS addresses were added to Coolify's API IP allowlist. Requests from the VPS to its own domain are hairpinned through Docker.
  - The token needs `read` as well; the guide now says so.
  - Chrome and Playwright MCP 0.0.83 install on Ubuntu 26.04 (checked in a container and on the VPS). The MCP cache step must run from a directory `kanban` can read, so the guide now uses `cd /tmp`.
  - Next: B4 owner switch and B6, a Devin card with a preview and its cleanup.
- Devin availability did not refresh after toggling the quality owner, because the projects list carries `autonomousPilot`. The UI now refreshes projects after the toggle.
- Agents cannot pass a multi-line `--body` with backticks to `gh pr create` in dontAsk mode. They fall back to `.pr-body.md` and cannot `rm` it, which blocks the clean-tree done gate (PR #193). `.pr-body.md` is now added to `.git/info/exclude` at boot.
- `KANBAN_SLOTS` in `/etc/kanban/kanban.env` raises the slot count (default 5). The service MemoryMax is 8.5G on this VPS.
- First Devin card (2026-10-09): the broker created and deployed the preview (revision `e7f98c8`) and the cleanup completed. Kanban never saw it ready and paused after 30 minutes with `Coolify deployment did not become ready within the preview timeout.`
  - Root cause, proven with `systemd-run`: under the unit's `IPAddressDeny`, the call to `https://coolify.bixu.fr` times out (`000`). Without the deny it returns `401`, and through `--resolve ...:127.0.0.1` with the deny it also returns `401`. Docker DNATs a hairpin connection to the public IP into the proxy's private address (`coolify-proxy` = 10.0.1.7).
  - Fix: `KANBAN_PREVIEW_CONNECT_ADDRESS=127.0.0.1` in the drop-in. The preview health probe and the quality health wait use `node:https` with a custom lookup, which keeps SNI and certificate checks on the hostname (probed against github.com). Chrome gets `--host-resolver-rules=MAP <preview host> 127.0.0.1` through the Playwright MCP config file, probed with a positive and a negative control.
- `kanban-upgrade` comes from PR #194 (merged from a VPS card). It does not copy unit or broker files, so drop-in changes still need a manual `install` and `daemon-reload`.
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

- 2026-10-09: added `kanban-upgrade` and `kanban-release --build-only` (D14, D15). Not yet run on the VPS.

- 2026-10-09: the user finished A1–A5 on the VPS; the service runs. Next: A6 tunnel and settings, then the A7 checks.

- 2026-10-09: the user ran step 0 on the VPS. It runs Ubuntu 26.04, so the guide was adapted and Phase A was replayed in a 26.04 container.

- 2026-10-08: implemented the cloud role, quality owner, socket UI, graceful stop, agent port, Playwright pinning, preview broker, root cleanup helper, units, release script and guide; verified as listed above.
- 2026-10-08: plan resumed. Decisions D11–D13 settled in conversation, and implementation of Phases A and B authorized.

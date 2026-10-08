# VPS cloud execution — working state

## Current state

- Revision: main `3bfe729` (2026-10-08). The loopback bind and Host/Origin guard shipped in `4f29093`.
- Goal: run Kanban as a second, independent instance on the Ubuntu 24.04 VPS that also hosts Coolify. Cloud cards keep going while the Mac is off, and the Mac stays autonomous when the VPS is unreachable. Only one quality validation runs at a time across both hosts.
- Scope authorized by the user on 2026-10-08: implement Phase A (ordinary cloud cards, PR-only, no previews) and Phase B (same-host previews through a broker). PRD: `plans/20261008-vps-cloud-execution.prd.json`.
- Private analysis reports, not in the public repo: `~/Library/Application Support/kanban-agents/notes/athena-vps-*.md`.

## Decisions

- D1: the VPS continues alone when the Mac is off.
- D2: the Mac stays autonomous when the VPS is unreachable.
- D3: exactly one quality validation total, enforced by a static per-host quality owner.
- D4: the pilot project is `Antune-L/atelier`.
- D5: Ubuntu 24.04 with a native systemd unit, not a Coolify image.
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

- Bun's default `Bun.serve` bind is `*:port`. With `hostname: "127.0.0.1"`, Node's HTTP client and curl still reach it through `localhost`.
- `Antune-L/atelier` is public, so rulesets are free.
- Fine-grained tokens on an organization need membership and, by default, owner approval.

## Open hypotheses

- Codex bubblewrap sandbox and headless Chromium under the hardened unit (to probe on the VPS).
- Bun WebSocket upgrades over a Unix-socket listener (to probe locally).

## Next action

Write the PRD JSON, then implement Phase A.

## History

- 2026-10-08: plan resumed. Decisions D11–D13 settled in conversation, and implementation of Phases A and B authorized.

# Mac ↔ VPS link (N2, N3, N4, SETUP) — state

Plan: `plans/athena/2026-10-31-plan-mac-vps-n2-n3-n4/report.md` in the main checkout (git-ignored).

## Current summary

- Branch: `feat/mac-vps-link`, from `main` at `4f629e5`.
- Phase 1 committed as `16531a3`: S1, N2-1, N2-2, N2-3 (code + `docs/mac-remote-access.md`), N2-4 (UI bits + checklist). Live checks (Cloudflare refusals, phone checklist) not run.
- Phase 2 done (uncommitted, awaiting review): S2a, S2b, S3, N3-1, N3-2. Verified with fake adapter, a stub `ssh` on PATH and local Unix sockets only; no real SSH, VPS or browser run.
- Out of scope: C0 (manual test in the Finder-launched app, done by the user), N2-5 (optional hardening).
- Next action: review and commit phase 2, deploy a release on the VPS (installs `kanban-bridge` and creates `bridge.sock`), then try "Board cible: VPS" from the Finder-launched Mac app (C0 conditions). Phase 3: N4 outbox ops on the same bridge and the same `VpsLinkSync` task.

## Phase 2 design (S2a, S2b, S3, N3)

- S2a: `runBoundedCommand` gained `stdin` and `maxStderrChars`. `SystemAdapter.runVpsBridge` (`src/server/system/vpsBridge.ts`) runs `ssh <NON_INTERACTIVE_SSH_OPTIONS from previewCleanup> <alias> /opt/kanban/current/deploy/vps/kanban-bridge <op>` with the JSON on stdin, 45 s budget, bounded stdout/stderr, and classifies failures (`auth`, `host_key`, `unreachable`, `timeout`, `remote_missing`, `version_mismatch`, `remote_unavailable`, `bad_output`, `invalid_request`). The fake (`fakeVpsBridge.ts`) never spawns; `KANBAN_FAKE_VPS_BRIDGE_FAILURE=<kind>` simulates a failure.
- S2b: `deploy/vps/kanban-bridge` (POSIX sh + `curl --unix-socket`, curl is already used by `kanban-upgrade.sh`) allowlists the op, exits 64 on unknown op and 69 when the socket is missing. On the cloud host with `KANBAN_SOCKET` set, the server opens a second socket `bridge.sock` next to `ui.sock` (0660) served by `vpsBridgeServer.ts` only; ui.sock and TCP never route `/ops/*`. Op registry = `BRIDGE_OPS` + a `Record<BridgeOp, handler>`. `BRIDGE_PROTOCOL_VERSION` lives in `src/shared/vpsBridge.ts`; the Mac checks it via `version` (cached 5 min per alias).
- S3: table `vps_pending_sends` (row validated in `rows.ts`, mutations in `store.ts`). `VpsLinkSync` (Mac only, started in `index.ts` when not cloud host) stores the send before the first attempt, retries pending rows with the same `mac:<id>` every 5 min, stops a tick at the first transport failure, marks a VPS rejection `failed`, deletes the row on success. No expiry. Routes `/api/vps-link/{projects,tickets,sends}`.
- N3-1: `create_ticket` takes exactly `requestId`, `project`, `title`, `description`, `analysis` (`none` | `analyze`), strict; calls `TicketOperations.createTodoTicket` with `afterCreate` `none` or `analyze`, normal origin, project defaults (incl. `defaultAutoMerge`). `list_projects` returns non-hidden projects with key, label, base branch and VCS provider.
- N3-2: `VpsTicketForm.tsx` renders in `NewTicketSheet` when the "Board cible" selector (shown only when `!cloudHost` and `sshHostAlias` is set) is on VPS. Local mode is unchanged apart from the selector. Acknowledgement links to `otherBoardUrl#ticket=<id>`.

## Plan adaptations due to 4f629e5 (PR-only mode removed)

- `capabilities.prOnly` no longer exists; `capabilities.cloudHost` (`isCloudHost()`) is the VPS marker. Mac-only UI (SSH alias, "Board cible") and VPS-only UI ("Mac" target, "Envoyés au Mac") gate on `cloudHost`.
- N3: `TicketOperations` no longer forces `autoMerge: false` on the cloud host. A card created from the Mac with no delivery flag inherits the VPS project's `defaultAutoMerge`, exactly like a card created on the VPS board. The Mac form sends no delivery knobs in VPS mode, so N3 cards get the VPS project defaults (decision kept: normal unlocked cards, TODO or TODO + analysis, never create-and-start).
- `deliveryPolicyError` and `PR_ONLY_MESSAGE` are gone: there is no VPS-side delivery refusal to reuse. N3-1 rejects unknown fields instead of relying on it.
- N4-5: forcing `autoMerge: false` and `directPush: false` on cards imported from the VPS outbox is a Mac-side admission control, not a PR-only rule, so it stays.
- The plan's "PR-only rules" (VPS refuses auto-merge/direct push) are obsolete and not implemented.

## Verified findings

- Board settings live in the `meta` table (`board_name`, `other_board_url`, `board_ssh_host_alias`, `public_hostname`), validated by `src/shared/boardLink.ts`; the SSH alias pattern and DNS hostname schema are now shared with `previewCleanup.ts` and `remoteMcp/config.ts`.
- The desktop app reads `public_hostname` read-only from `dataRoot/kanban.db` before importing the server, exports it as `DEV_HOST`, and drops `KANBAN_HOST` when set. Restart required; Réglages shows the active hostname from `/api/capabilities`.
- `sshHostAlias` and `publicHostname` are hidden and ignored by `PATCH /api/settings` on the cloud host.
- `POST /api/native/pick-folder` and `canPickFolder` now require a loopback Host header.
- cloudflared keys `originRequest.access.{required,teamName,audTag}` checked against the Cloudflare docs (context7).

- Throwaway checks (deleted): bridge handler on a temp DB, 17/17 (version, strict inputs, unknown op 404, GitHub and Azure creation, replay returns the same card, changed content under the same requestId is `CONFLICT`, analysis only when asked, card TODO with `origin` null and the project `defaultAutoMerge`); `VpsLinkSync` on the fake adapter, 13/13 (pending on failure, retry with the same requestId after a lost answer yields one card, version mismatch, background rejection becomes `failed`); real runner with a stub `ssh` and the bridge script on a temp socket, 15/15 (card content absent from argv, socket mode 660, error classification, exit 64 and 69).
- A dry-run server boot with the new code reached "backend prêt" on an isolated port and data root.

## Open issues

- The isolated cloudflared refusal test relies on Cloudflare forwarding a client-supplied `Cf-Access-Jwt-Assertion` on a hostname without an Access application; unverified, the doc has a positive control that detects it.
- Terminal keyboard behaviour on mobile browsers is unverified.
- Phase 2 UI not verified in a browser (the isolated-server probe was refused by the session's permission classifier).
- Real SSH from the Finder-launched app (C0), StrictHostKeyChecking=yes against the user's known_hosts and the VPS release containing `kanban-bridge` with its exec bit are unverified live.
- `ticket_creation_requests` is deleted with its card (`ON DELETE CASCADE`): if the VPS created the card, the answer was lost and the card was deleted before the Mac retry, the retry creates a new card.
- The analysis mode is not part of the idempotency payload: a replay with the same requestId and another analysis mode returns the existing card. The Mac never changes a stored send, so this cannot happen through the bridge.
- When the VPS is unreachable at form time, the VPS project list fails and the form cannot be submitted; there is no cached catalogue (sends that fail after the list loaded do become pending).

## History

# Mac ↔ VPS link (N2, N3, N4, SETUP) — state

Plan: `plans/athena/2026-10-31-plan-mac-vps-n2-n3-n4/report.md` in the main checkout (git-ignored).

## Current summary

- Branch: `feat/mac-vps-link`, from `main` at `4f629e5`.
- Phase 1 committed as `16531a3`: S1, N2-1, N2-2, N2-3 (code + `docs/mac-remote-access.md`), N2-4 (UI bits + checklist). Live checks (Cloudflare refusals, phone checklist) not run.
- Phase 2 committed as `13e75fa`: S2a, S2b, S3, N3-1, N3-2.
- Phase 3 done (uncommitted, awaiting review): N4-1, N4-4, N4-2, N4-3, N4-5, N4-6. Bridge protocol bumped to 2 (Mac and VPS must be upgraded together). Verified with temp DBs, the real bridge handler wired to `VpsLinkSync` in-process, provider fixtures and fake adapters; no real SSH, VPS, provider session or browser run.
- Out of scope: C0 (manual test in the Finder-launched app, done by the user), N2-5 (optional hardening), SETUP.
- Next action: review and commit phase 3, deploy a release on the VPS and on the Mac (protocol 2), tick the Mac projects and the remote-cards profile in Réglages › MCP distant on the Mac, then send a card from the VPS form ("Board cible : Mac") with the Mac asleep and check it arrives locked after wake.

## Phase 3 design (N4)

- N4-1: table `mac_outbox` (VPS; rows in `rows.ts`, mutations in `store.ts`). Enqueue is keyed by a client id (`board:<uuid>` from the form, `agent:<ticketId>:<requestId>` from the tool): same id and content returns the existing row, other content is a conflict. Ops `outbox_fetch` (pending items, oldest first, at most 50 and about 400 000 characters per page) and `outbox_ack` (by id, `received` + Mac ticket id or `rejected` + reason; rows are kept with `received_at`). Only `pending` rows change. The outbox never creates a VPS card. Shared logic in `src/server/macOutbox.ts`.
- N4-4: one guard in `remoteAnalysis.ts` (`REMOTE_ANALYSIS_QUALIFIED_ON_MAC = false`, `remoteAnalysisRefusal`, `assertRemoteAnalysisAllowed`) used by triage, feasibility (refused cards fail at `start`, before the dry-run shortcut), reformulation, split and feasibility answers (409 at `startBatch`); `admitRemoteAnalysis` also refuses off the cloud host as a last line. Only remote-origin cards on a non-cloud host; the VPS is unchanged. It covers cards from the remote MCP on the Mac too.
- N4-2: the Mac publishes its catalogue with `catalogue_publish` at the start of every sync (immediately on start, then every 5 minutes): the projects of `remoteMcpProjectIds` (the same allowlist the importer re-validates, so the catalogue never offers a project the Mac would refuse) with key, label, base branch and VCS provider, plus the board name. The VPS stores it in meta `mac_catalogue` with `publishedAt`. Stale after 24 h (`MAC_CATALOGUE_STALE_AFTER_MS`): a sleeping Mac is the normal case, so the 5-minute period would flag it all night. Pairing is implicit (whoever can reach `bridge.sock`).
- N4-3: capability `macOutbox` (cloud host with a non-empty catalogue) shows the "Board cible" selector on the VPS with "Ce VPS" / "Mac" (`BoardTargetSelect.tsx`, shared with the Mac form, plus shared draft fields). `MacOutboxForm.tsx`: project from the catalogue, title + description, `POST /api/mac-outbox` (VPS only, never the bridge), list "Envoyés au Mac" (pending, received with date and a link `otherBoardUrl#ticket=<id>`, rejected with reason), stale warning, "Actualiser". No useEffect.
- N4-5: `VpsLinkSync` tick = pending N3 sends, then catalogue publish, then outbox import (up to 10 pages). `admitVpsOutboxItem` (`vpsOutboxImport.ts`): receipt first (re-ack only), project in the Mac allowlist now, Mac remote-cards profile via `remoteMcp/admission.ts` (shared with the remote MCP tools), card created by `TicketOperations.createTodoTicket` with requestId `outbox:<itemId>`, origin `remote`, frozen profile agents, `autoMerge: false`, `directPush: false`, `afterCreate: "none"`; the receipt row (`vps_outbox_receipts`, no foreign key) is inserted by a new `inTransaction` hook inside the same SQLite transaction as the card and its idempotency row; the hub push happens after commit. Rejections (project not allowed, no profile, invalid card) are acked `rejected`; an unavailable profile engine leaves the item pending. Approval confirm now shows the project label and key.
- N4-6: worker tool `send_to_mac` (requestId, project, title, description; strict). Not in any role default (`CONDITIONAL_WORKER_TOOL_NAMES`); `SlotManager.startAgentSession` grants it through `extraWorkerTools` when `macOutboxAvailable` (cloud host + catalogue), and `workerToolsForSession` keeps it to `orchestrator` sessions, for both providers (Claude in-process MCP, Codex worker MCP). Delegated implementers, reviewers, analysis and Atelier sessions never get it. The coordinator re-checks availability; an unknown project returns the catalogue keys. No approve, start or ack capability.

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
- Phase 3 throwaway checks (deleted): real bridge handler on a temp VPS DB driven by `VpsLinkSync` on a temp Mac DB, 36/36 (catalogue publish, duplicate enqueue, conflict, no VPS card, ack transport failure then retry without duplicate, lost ack response, card deleted before ack re-acked without re-creation, failure inside the transaction rolled back then exactly one card, restart on the same Mac DB, project no longer allowed and missing profile rejected and not retried, GitHub and Azure DevOps projects, locked card with `autoMerge`/`directPush` false and frozen Codex profile, hub push outside the transaction, size-bounded pages); VPS routes, 8/8; N4-4 and N4-6 through the coordinator and the managers on Claude and Codex cards, 10/10; provider fixtures, 5/5 (Codex `enabled_tools` + worker MCP `tools/list`/`tools/call`, Claude `allowedTools` + in-process MCP `listTools`/`callTool`, with and without the grant, and every non-orchestrator role excluded).

## Open issues

- The isolated cloudflared refusal test relies on Cloudflare forwarding a client-supplied `Cf-Access-Jwt-Assertion` on a hostname without an Access application; unverified, the doc has a positive control that detects it.
- Terminal keyboard behaviour on mobile browsers is unverified.
- Phase 2 UI not verified in a browser (the isolated-server probe was refused by the session's permission classifier).
- Real SSH from the Finder-launched app (C0), StrictHostKeyChecking=yes against the user's known_hosts and the VPS release containing `kanban-bridge` with its exec bit are unverified live.
- `ticket_creation_requests` is deleted with its card (`ON DELETE CASCADE`): if the VPS created the card, the answer was lost and the card was deleted before the Mac retry, the retry creates a new card.
- The analysis mode is not part of the idempotency payload: a replay with the same requestId and another analysis mode returns the existing card. The Mac never changes a stored send, so this cannot happen through the bridge.
- When the VPS is unreachable at form time, the VPS project list fails and the form cannot be submitted; there is no cached catalogue (sends that fail after the list loaded do become pending).
- Phase 3: the catalogue is only as fresh as the last sync; a VPS agent sharing the kanban user can still alter the queue or catalogue, so the guarantee is that imported cards stay in the Mac allowlist and locked (a substitution between two allowed projects is possible; the approval dialog shows the project actually used).
- Phase 3: when the Mac profile engine is unavailable (e.g. Codex not logged in), items stay pending without a reason shown on the VPS.
- Phase 3: the VPS list does not refresh live (reopen or "Actualiser"); the selector appears once capabilities reload (focus) after the first publication.
- Phase 3: the receipt is permanent; re-sending the same card needs a new send from the VPS (new id).

## History

- 2026-10-31: phase 1 committed (`16531a3`), phase 2 committed (`13e75fa`), phase 3 (N4) implemented and verified offline, uncommitted.

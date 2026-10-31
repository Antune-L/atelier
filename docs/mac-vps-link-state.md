# Mac ↔ VPS link (N2, N3, N4, SETUP) — state

Plan: `plans/athena/2026-10-31-plan-mac-vps-n2-n3-n4/report.md` in the main checkout (git-ignored).

## Current summary

- Branch: `feat/mac-vps-link`, from `main` at `4f629e5`.
- Done cards (uncommitted, awaiting review): S1, N2-1, N2-2, N2-3 (code + `docs/mac-remote-access.md`), N2-4 (UI bits + checklist). Live checks (Cloudflare refusals, phone checklist) not run.
- Out of scope: C0 (manual test in the Finder-launched app, done by the user), N2-5 (optional hardening).
- Next action: review and commit phase 1, then run the Mac tunnel setup and the acceptance checks of `docs/mac-remote-access.md` section 7.

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

## Open issues

- The isolated cloudflared refusal test relies on Cloudflare forwarding a client-supplied `Cf-Access-Jwt-Assertion` on a hostname without an Access application; unverified, the doc has a positive control that detects it.
- Terminal keyboard behaviour on mobile browsers is unverified.

## History

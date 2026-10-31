# Mac ↔ VPS link (N2, N3, N4, SETUP) — state

Plan: `plans/athena/2026-10-31-plan-mac-vps-n2-n3-n4/report.md` in the main checkout (git-ignored).

## Current summary

- Branch: `feat/mac-vps-link`, from `main` at `4f629e5`.
- Done cards: none yet.
- Out of scope: C0 (manual test in the Finder-launched app, done by the user), N2-5 (optional hardening).
- Next action: phase 1 (S1, N2-1, N2-2, N2-3, N2-4).

## Plan adaptations due to 4f629e5 (PR-only mode removed)

- `capabilities.prOnly` no longer exists; `capabilities.cloudHost` (`isCloudHost()`) is the VPS marker. Mac-only UI (SSH alias, "Board cible") and VPS-only UI ("Mac" target, "Envoyés au Mac") gate on `cloudHost`.
- N3: `TicketOperations` no longer forces `autoMerge: false` on the cloud host. A card created from the Mac with no delivery flag inherits the VPS project's `defaultAutoMerge`, exactly like a card created on the VPS board. The Mac form sends no delivery knobs in VPS mode, so N3 cards get the VPS project defaults (decision kept: normal unlocked cards, TODO or TODO + analysis, never create-and-start).
- `deliveryPolicyError` and `PR_ONLY_MESSAGE` are gone: there is no VPS-side delivery refusal to reuse. N3-1 rejects unknown fields instead of relying on it.
- N4-5: forcing `autoMerge: false` and `directPush: false` on cards imported from the VPS outbox is a Mac-side admission control, not a PR-only rule, so it stays.
- The plan's "PR-only rules" (VPS refuses auto-merge/direct push) are obsolete and not implemented.

## Verified findings

## Open issues

## History

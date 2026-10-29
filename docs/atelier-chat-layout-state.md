# Atelier chat layout implementation state

## Current summary

- Updated: 2026-10-29.
- Repository revision at intake: `9a8a03820c5ed42eeed1de52dc383398ff1a600b`, branch `main`; working tree was clean.
- Approved direction: B, conversation first. Hide conversation history by default, open it on demand, simplify the header, widen the chat and compact the composer while preserving existing actions.
- B is implemented. The user authorized committing and pushing directly to `main`; this checkpoint is included in that delivery commit. Changes are limited to frontend layout, scoped chat typography and reusable overlay presentation; agent execution and delivery code are unchanged.
- Conversation history is closed by default and opens from the left. PRD/cards open in existing document sheets while the chat stays mounted. Session details and system/project controls remain accessible on demand.
- Desktop verification at 1280×780: 56px navigation rail, 64px conversation header, conversation Markdown at 15px with 24.75px line height, wider reading and composer surfaces.
- Mobile verification at 390×740: full 390px conversation width, 64px header, on-demand global navigation, no horizontal overflow. The current conversation stage is restored beneath its title.
- Blockers and unresolved questions: none. The earlier source-reading question became obsolete when the Luna continuation supplied the code.
- Delivery revision: the commit containing this checkpoint, based on the intake revision above. Delivery verification compares its local and remote `main` refs after pushing.
- Next action: no implementation remains; complete the authorized direct-main push and remote-ref verification.

## Verification results

- Existing typecheck and lint scripts passed; 37 existing targeted Atelier tests passed with zero failures. No tests were added.
- Simplifier review removed obsolete collapse state and duplicate mounted controls, retained existing handlers, and normalized touched JSX. Regression review mapped all consumers of Sheet, Sidebar, ConversationPanel, SubagentsPanel and AtelierAttachments; optional defaults preserve existing right-side sheets and noncompact attachment controls.
- Browser checks used the actual application against a disposable dry-run backend on port 52947 and Vite on 53018, with isolated database, config and uploads. The normal and real-mode databases were not used.
- Independent review passed its blocker gate and covered history/search/selection, document focus, drafts, Claude/Codex session controls, notification/new-ticket right-side sheets, responsive layout and light/dark appearance. Its two major visual findings and missing-stage finding were fixed and measured afterward by the implementer; the independent scores were not reissued.
- Active subagent rendering was checked through controlled browser-store examples because the backend derives active agents from live sessions. This is UI evidence only; no real provider session was started.
- A mobile refinement briefly mounted two notification centers sharing an open state. The accessibility tree showed duplicate hidden notification dialogs; retaining one mounted center fixed the reproduced issue, and exactly one accessible dialog was verified afterward.
- Final browser console: zero errors and warnings. Final screenshots and the verbatim independent report plus follow-up evidence are retained under the ignored browser-artifact directory.
- Cleanup: the owned browser and both validation servers were stopped; disposable database/config/upload data were removed. Ports 52947 and 53018 have no remaining listener.
- Scope: common Claude/Codex interface only. Both session-control variants were inspected. Real provider execution and GitHub/Azure delivery qualification are outside this visual change.

## Verification plan

- Preserve free discussion, project filtering, attachments, session controls, interruption, PRD and card access, and current subagent activity.
- Reuse existing UI primitives and theme tokens; keep visual changes independent of Claude/Codex execution and GitHub/Azure delivery behavior.
- Validate desktop and mobile in a disposable dry-run environment with isolated database and configuration; do not use a real-mode application.
- Compare the rendered result with the approved B mockup through an independent evaluator.
- Review the final diff, apply simplifier and regression checks, and run existing relevant type, lint and test checks. Do not add tests without an explicit request.

## History

- 2026-10-28: three standalone interactive mockup directions were delivered. The application was unchanged.
- 2026-10-29: the user selected B for integration; implementation intake and source research began.
- 2026-10-29: a late Luna source result resolved the initial research interruption; implementation resumed.
- 2026-10-29: independent visual review completed, findings were fixed, and final targeted/static/browser checks passed.
- 2026-10-29: the user authorized direct-main delivery after implementation and validation.

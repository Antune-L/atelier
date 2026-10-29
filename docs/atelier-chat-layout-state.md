# Atelier chat layout implementation state

## Current summary

- Updated: 2026-10-29.
- Current correction base: `eafba08` on `main`; the remote statistics changes were fast-forwarded before debugging. The original layout intake was `9a8a03820c5ed42eeed1de52dc383398ff1a600b`.
- Approved direction: B, conversation first. Hide conversation history by default, open it on demand, simplify the header, widen the chat and compact the composer while preserving existing actions.
- B was delivered as `9f5c4d5`. The horizontal-overflow correction is implemented and verified; direct-main delivery remains authorized. Agent execution and delivery code are unchanged.
- Conversation history is closed by default and opens from the left. PRD/cards open in existing document sheets while the chat stays mounted. Session details and system/project controls remain accessible on demand.
- Desktop verification at 1280×780: 56px navigation rail, 64px conversation header, conversation Markdown at 15px with 24.75px line height, wider reading and composer surfaces.
- The user reported transcript horizontal scrolling with real conversation content. Reproduction at 2000×999 found a 1944px transcript with 35569px scroll width from long tokens and a wide Markdown table; the initial visual fixtures had missed this content case.
- Scoped chat Markdown now wraps unbroken prose, links and inline code. Tables scroll inside their own bounded frame; fenced code retains its existing local scrolling and copy button. Shared Markdown styling is unchanged.
- Browser verification at 2000×999, 1280×780 and 390×740 covers long paths, URLs, a ten-column table, code blocks and combined messages, with reasoning open and closed. Transcript scroll width equals its visible width in all 24 combinations; the document also stays within the viewport.
- Blockers and unresolved questions: none.
- No further implementation remains. The session delivery result records the published correction commit and remote-ref verification.

## Verification results

- The correction passes the existing typecheck and lint scripts and 27 existing Markdown/Atelier tests with zero failures. No tests were added. The Markdown server-render checks emit React layout-effect warnings; their attribution was not checked on the base revision.
- Simplifier and regression review found no actionable issues in the two implementation files. The shared chat class covers user messages, assistant replies and live/folded reasoning. No shared Markdown renderer, provider or host contract changed.
- The local code and table scroll positions can change while transcript scrollLeft remains zero. The code text is preserved and its copy button reaches the successful state.
- Simplifier review removed obsolete collapse state and duplicate mounted controls, retained existing handlers, and normalized touched JSX. Regression review mapped all consumers of Sheet, Sidebar, ConversationPanel, SubagentsPanel and AtelierAttachments; optional defaults preserve existing right-side sheets and noncompact attachment controls.
- Browser checks used the actual application against a disposable dry-run backend on port 52947 and Vite on 53018, with isolated database, config and uploads. The correction fixture uses `/private/tmp/atelier-overflow-20261029/data`; the normal and real-mode databases were not used.
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
- 2026-10-29: a reported horizontal-scroll regression was reproduced with long Markdown content and corrected with bounded, chat-specific text/table styling.

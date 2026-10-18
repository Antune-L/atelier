# Current implementation state

- Base revision: 8b8285943b02f6bcaaf1c515c861f0820ffdeb47; branch: feat/atelier-project-orchestration.
- Isolated checkout: /private/tmp/kanban-atelier-implementation. The main checkout and its untracked reports/ and research_notes/ are preserved.
- Authorized scope: preserve free Atelier conversation, carry all supplied links/images/documents into optional PRD preparation for roadmap or milestone work, and enable project-scoped existing-card starts and new TODO creation from the conversation. No exclusive milestone/debug modes.
- Compatibility: both Claude Agent SDK and Codex App Server paths; reuse shared TicketOperations admission and PR-host-independent logic. GitHub and Azure integrations must remain intact.
- Verified baseline: Atelier conversations are read-only at the repository/tool boundary; current public ticket operations already support idempotent creation and single-card start admission, eligibility and slot queueing.
- Validation required: meaningful regression tests and isolated browser acceptance, then real authenticated Codex and Claude application-level qualification against disposable fixtures. Static/fake success must not be reported as live provider success.
- Implementation ownership: project-scoped board tools and admission; upload picker/context hydration; native image transport for both providers; optional roadmap PRD/schema/render/card filtering. Workers have separate file scopes and coordinate integration APIs.
- Decisions: retain repository read-only permissions, bind actions to persisted conversation project, reuse TicketOperations and conversation-scoped request IDs, require a quote from the latest genuine user request for mutations, and persist backend operation results.
- Rich context: preserve persisted Markdown upload references; safely hydrate only application-owned uploads, inline supported documents, and transmit native images on both providers rather than relying on inaccessible upload paths.
- PRD: optional roadmap milestones plus task association and selected milestone; legacy PRDs stay compatible and milestone order does not create stacked branch dependencies.
- Environment: isolated dependency symlink ready; origin/main matches base; GitHub access confirmed; Codex and Claude authentication confirmed with read-only probes.
- Final checks: full suite 600 passed, 3 skipped, 0 failed; typecheck, lint, web build and diff checks passed. The final type-only convention cleanup was followed by another successful typecheck/lint and 69 affected tests.
- Independent reviews: backend/security found no confirmed P1/P2. Product review found a failed-upload retry defect and partial-batch duplication; atomic reference append and picker reset were fixed, covered by three tests, and independently rechecked.
- Real provider qualification: Codex and Claude each passed all six scenarios through application SessionHub/Manager/MCP. Both recognized a generated pixel-only image code, read supplied document content, respected project boundaries, created a parked TODO, requested an existing queued start, and persisted a two-milestone PRD with task associations and exact supplied source references. All native sessions closed.
- Qualification limits: feasibility and implementation enqueue effects were stubbed; no live implementer, real worktree, GitHub or Azure publication was launched by qualification. Interpreting user intent remains the agent's responsibility; backend checks provenance, project, lifecycle and idempotency.
- Claude environment: the first attempt failed because inherited ANTHROPIC_BASE_URL pointed to an unavailable loopback endpoint. Removing that key only in disposable qualification processes restored native authentication and successful model turns; user configuration and production environment handling are unchanged.
- Browser acceptance: isolated dry-run server on a temporary port/data root, actual built frontend, Playwright interactions. Verified roadmap rendering, M1/M2 card filtering, retained title/unchecked selection across scopes, confirmed TODO-only creation, initial/later document uploads with retained drafts and reset picker, desktop/mobile/light/dark rendering, 390px without horizontal overflow and no console errors.
- Delivery: implementation is isolated on feat/atelier-project-orchestration for a PR targeting main. Reproduction commands and qualification boundaries are recorded in atelierProviderQualification.md.
- Next action: review and merge the PR after user approval; no merge is authorized by the implementation request.

# History

- User authorized implementation, functional validation with both providers and a PR targeting main.

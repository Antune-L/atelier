# Server folder browser

## Current state

- Original implementation base: `9ca5e2c70bc2c336fc520ae3ed9a11985e391dd5`. Delivery parent: `76575d9c3b6c013273a052c7d13006901cac7187`. User requested delivery directly to `main`.
- User confirmed that the requested folders are on the VPS hosting Atelier.
- Root cause: `src/server/routes.ts` reports the native folder picker only for a desktop callback and a loopback request. The project form previously hid browsing otherwise.
- Reference: `/Users/antoineliu/project/orchestrateur/apps/web/src/features/spaces/FolderPicker.tsx` uses an in-page folder list backed by the selected machine. Atelier now uses its existing dialog and button components for the same server-folder workflow.
- `src/server/system/folderBrowser.ts` lists directories, including directory symlinks, under the permissions of the Atelier process. It accepts absolute paths and home shorthand, excludes files and `.git`, and performs no mutation. Navigation is not confined to the home directory: VPS repositories may live elsewhere.
- `GET /api/folders` uses the existing server request guard and disables response caching. The desktop native route and capability retain their existing meaning; the project form uses web browsing when that capability is absent.

## Verification

- `bun run typecheck`: passed.
- Before delivery, typecheck, targeted ESLint and the 19 existing route tests were rerun against the delivery parent.
- `bun run build:web`: passed, with the bundle-size warning.
- ESLint on all changed TypeScript files: passed.
- `bun run lint`: failed with 20 errors in ignored local files under `plans/athena/2026-10-31-consommation-lecture-background`. No errors were reported in changed files. Base-checkout reproduction was not performed, so base attribution remains unverified.
- `bun test src/server/routes.github.test.ts src/server/routes.atelier.test.ts src/server/routes.codex.test.ts`: 19 passed, 0 failed. These use simulated providers; no new tests were added.
- Playwright against an isolated dry-run server and temporary database on port 52937: verified browsing without a native capability, parent navigation, empty directories, directory symlinks, omitted files, invalid-path feedback, selection into the existing inspection step, and Escape cancellation. HTTP checks returned 200 with `Cache-Control: no-store` for a directory and 400 for a relative path.
- Simplifier review removed redundant picker-availability props from the path input and folder step. Regression review checked every consumer of those components, the native capability, the new API method, and the shared response schema; no remaining mismatch was found.
- Claude/Codex and GitHub/Azure DevOps use the same provider-independent folder path. No provider or PR-host calls were added. Real provider sessions, native desktop interaction and the deployed Linux VPS were not exercised.

## Remaining work

- No open product questions or implementation hypotheses.
- Deployment and verification on the VPS remain outstanding. Next action: deliver these changes through the project's normal release process, then confirm browsing under the VPS service account.

# External browser validation MCP v1

Orchestrateur owns missions, implementation, E2E relevance and delivery. Atelier owns an exact-SHA Coolify preview and an independent Claude or Codex browser validator. This API creates no mirror ticket and never publishes Git changes, opens a PR or merges. The coordination contract is implemented by `src/shared/externalValidation.ts`; the original coordination document is `/tmp/orchestrateur-atelier-validation-contract.md` (not modified).

The authenticated local public MCP endpoint exposes:

- `start_external_validation({requestId, missionId, project, branch, headSha, provider, scenarios})`: reserve a durable request and return asynchronous state. Each scenario has `id`, `description`, `expected`, and `interaction` (`interactive`, `visual`, or `display`). IDs must be unique. The SHA is a full lowercase 40-character Git commit. Repeating identical inputs returns the existing receipt; changing inputs under that ID fails.
- `get_external_validation({requestId})`: reconcile receipt and owned-preview cleanup. Unknown IDs return `{validation:null}`. Use this after an uncertain start response.
- `cancel_external_validation({requestId})`: abort the independent session and stop its owned preview. Repetition is safe; unknown IDs return `{validation:null}`. Poll get until cleanup settles.
- `read_external_validation_artifact({requestId, artifactId})`: return `{artifact:{id,name,mimeType,sha256,contentBase64}}`. Only retained, registered files under the request's directory are readable; each response is limited to 512000 base64 characters (oversized captures are refused without truncation) and its content digest is checked.

All other responses use `{validation: ExternalValidation}`. The public Zod schemas define every field, including deployment identity, per-scenario observations, browser actions, retained artifact IDs, timestamps, provider, session identity, simulation and cleanup state. Public errors and descriptions are English.

## Preparation

Register the project in Atelier, enable and configure previews, and prepare the branch using the existing preview recipe workflow. Supply Coolify server/project/source configuration, HTTPS domain, private preview authentication, and an already pushed branch containing a valid recipe with nonempty seeded `testData`. Install the pinned Playwright MCP/browser prerequisites and authenticate the selected agent provider on the host. Existing environment, seed and authentication handling is reused; credentials are not copied into receipts. The current preview engine supports GitHub repositories only; Azure DevOps projects are blocked explicitly. No `.spec.ts` or other test file is required in the validated project.

The branch is inspected before deployment and again by the preview engine. Coolify must confirm that the deployment serves the requested SHA before the browser starts. The existing functional runner verifies successful, attributed browser operations and exact observations; interactive scenarios need their own interaction, and visual scenarios need accepted screenshots. Every requested scenario must pass, browser closure must be confirmed, and owned-preview cleanup must be complete before the receipt becomes passed. Dry-run requests are explicitly simulated and blocked, never reported as live success.

## Storage and recovery

Private receipts and evidence are stored outside source checkouts at `~/.local/share/atelier/external-validations/<database-path-hash>/<request-id-hash>/`. Do not delete this directory while resources or native cleanup obligations remain. Receipts use atomic replacement and private permissions. Artifacts remain available after preview deletion. Existing Coolify ownership markers and cleanup reconciliation are reused; deployment identity remains in the receipt after cleanup.

On restart, active validations become interrupted rather than silently rerunning browser actions. The stable ownership marker locates previews even when the process died before writing their ID into the receipt. Terminal receipt reads request preview shutdown; the preview manager continues its existing cleanup polling. Native/browser cleanup obligation files keep `cleanupStatus: failed` until an operator establishes closure; automatic replay cannot prove that an old provider process died. A new validation needs a new request ID. Cancellation and shutdown wait for active runner compensation before dependent preview/provider services shut down.

## Verification boundaries

Unit tests cover both requested provider values in dry-run, idempotence/conflict detection, restart reads, unknown requests, artifact authorization and native closure uncertainty. Typecheck and lint cover shared integration. These are simulated checks, not live Coolify deployment, GitHub access, provider authentication or browser acceptance proof. Live validation requires the configured private infrastructure and is intentionally not performed as part of implementation verification.

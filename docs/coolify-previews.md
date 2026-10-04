# Coolify previews

Use a preview to try a remote branch or a completed feature's pull request (PR, a proposed change on GitHub). Kanban Agents builds the latest selected commit on your Coolify server and gives it a protected URL. Ticket previews can also ask Claude or Codex to check acceptance criteria in a browser from your Mac. The preview is separate from your local development application.

This guide covers GitHub projects. Azure DevOps previews are not supported in this version. Each project needs a working container recipe; enabling the setting alone does not make an application deployable.

## Requirements

Before configuring a project, prepare:

- A reachable Coolify instance and server, with a Coolify project and environment for previews.
- A Coolify API token authorized to read deployment information, create and configure applications, deploy them, and delete owned applications. This token gives Kanban Agents access to Coolify; it is separate from the password used to open a preview.
- Coolify access to the GitHub repository. Private repositories need an authorized GitHub App or a repository deploy key already registered in Coolify. A deploy key is an SSH credential authorized to clone that repository.
- A preview domain and wildcard DNS record (a record that covers generated subdomains), pointing to the Coolify server. For a base domain such as `previews.example.com`, configure `*.previews.example.com` and check that generated names resolve from both the server and your Mac.
- An existing SSH alias on the Mac for verified server cleanup. SSH is the secure connection used to check and remove only the preview's owned resources. The alias must reach the selected server with working authentication and trusted host verification.
- Docker for local preparation checks, plus a working Claude or Codex session for agent tasks and browser validation.

Keep Kanban Agents running while deploying, validating, stopping or waiting for automatic expiration. Browser checks run on the Mac, not on the Coolify server.

## Configure Coolify once

Global settings connect Kanban Agents to Coolify and protect every preview with HTTP Basic authentication (the browser's username and password prompt).

1. Open **Réglages**, then **Coolify**.
2. Enter the HTTP(S) API address in **Adresse Coolify** and the API token in **Jeton API**. Use HTTPS for a remote instance; do not embed credentials in the URL.
3. Click **Enregistrer et tester la connexion**. A successful test loads the available servers, projects and GitHub Apps. It confirms API connectivity; check each project's repository access in its preview settings. Project recipe readiness is checked automatically in project settings and for a selected remote branch, then checked again at launch.
4. Select **Serveur** and **Projet Coolify**. Optionally choose **GitHub App par défaut** (a GitHub connection registered in Coolify). It is a preference among connections with verified access to the project's repository, rather than a connection imposed on every project.
5. Set **Environnement** to your preview environment. The default is `previews`.
6. Enter only the base hostname in **Domaine des prévisualisations**, for example `previews.example.com`. Do not include `https://` or a path. Kanban Agents generates a unique subdomain for each attempt.
7. Enter the preview **Nom d'utilisateur** and **Mot de passe** manually. These are global access credentials shared by previews, separate from the API token. For Dockerfile previews, keep the password within **31 UTF-8 bytes** because of a verified limitation in Coolify 4.3.23. A randomly generated password of 24 ASCII characters fits this limit. The Compose gateway does not have that native Coolify limitation.
8. Enter your existing alias in **Alias SSH pour le nettoyage (facultatif)** and click **Enregistrer**.

The SSH field is optional when saving settings, but cleanup cannot be confirmed without a verified SSH target. A successful Coolify deletion response does not prove that containers and other resources have disappeared.

The API token and preview credentials are stored in a private local JSON file in the running application's data directory, with directory permissions `0700` and file permissions `0600`. This is file storage, not Keychain storage. The settings API returns configured flags instead of secret values; the preview credentials are sent privately to the authentication configuration and browser checks. Do not put their values in project recipes, source files or tickets.

Changes to global connection, identity, authentication or domain settings are blocked while previews are active or still require cleanup. Stop them and wait for cleanup to complete before changing those settings. Domain changes apply to newly created attempts.

## Choose each project's repository connection

Open the project's **Prévisualisations Coolify** settings. Optionally select an existing key under **Clé de déploiement du projet** and save. This key takes priority for future previews, including public repositories. Clearing it restores the GitHub App/public selection described below. A selected key must exist in Coolify; an unavailable key or incomplete key lookup stops creation without falling back to another source. Each attempt retains its selected source and key identifier, so changing project settings does not change an existing attempt.

The key list is loaded independently from the global connection test. Only key names and identifiers are returned to the interface or saved in project settings; private and public key contents stay out of these responses and records. The saved-key check confirms availability in Coolify, not repository access. Access is established only when Coolify clones the frozen repository revision during deployment. Kanban Agents does not generate, upload or authorize repository keys automatically. Its token needs access to read Coolify's key inventory when this option is used.

**Connexion GitHub du projet** defaults to **Automatique selon le dépôt**. The application checks which existing Coolify connections can access that project's repository whenever a preview is created; checking the settings is a read-only way to see that result beforehand. A private repository uses its verified connection, even when another account's connection is preferred globally. A repository confirmed as public can deploy without a GitHub App.

The automatic choice uses the global default only when its repository access is verified. If several connections have access and the default does not resolve the choice, select one of the verified connections for that project and click **Enregistrer les prévisualisations**. This explicit selection is retained for future previews and rechecked before deployment. It does not change an existing preview's connection.

**Vérifier l'accès au dépôt** checks the saved selection without deploying or changing settings. Save a changed selection first; saving also refreshes the access check. If a saved connection no longer works, return to **Automatique selon le dépôt**, save, then inspect the newly verified choices. If no connection can access a private repository, authorize the appropriate GitHub App in Coolify or select an existing authorized deploy key. If the check is incomplete, check Coolify connectivity and the project's GitHub access, then retry; incomplete evidence does not permit a deployment.

Kanban Agents neither installs a GitHub App automatically nor switches the accounts used by the GitHub command-line tool (`gh`). Coolify's repository connection and the Mac's access to remote branches and pull requests are separate requirements.

## Prepare a new project

Preparation creates the project's repeatable build and startup instructions before any feature is deployed.

1. Open **Réglages**, then **Projets**, and open the project's **Prévisualisations Coolify** settings.
2. Enable **Activer les prévisualisations Coolify**.
3. Set **Recette du projet**. Its default is `.coolify/preview.json`; use a tracked, repository-relative path if your project uses another location.
4. Set **Durée de vie (heures)**. The default is 24 hours and the maximum is 168 hours.
5. Save the preview settings. The project panel automatically checks the saved recipe and container-definition inputs on the project's remote base branch. **Projet prêt pour Coolify** means these inputs are present and valid at the displayed commit; it does not prove a successful build or live deployment.
6. If preparation is needed and no matching card exists, click **Préparer pour Coolify**. The application creates a normal TODO ticket. If a card already exists, use **Ouvrir la carte de préparation**; repeated preparation does not create duplicate cards. If an earlier preparation is finished but the branch still lacks valid inputs, **Relancer la préparation** explicitly starts a new preparation attempt. A failed repository lookup is shown as unavailable verification, with a retry action rather than a preparation diagnosis.
7. Start the preparation card through the normal ticket workflow with Claude or Codex, review the resulting draft PR and local validation evidence, then merge it into the base branch. Click **Revérifier le projet** afterward. A ready project no longer offers another preparation card.

The ticket embeds the complete [Coolify preparation skill](../skills/coolify-preview-setup/SKILL.md), so both supported providers receive the same contract without requiring a manually installed slash command. The agent prepares files and submits a draft PR for review; it does not deploy or merge the preparation PR.

An existing worktree setup script can supply useful installation, migration and fixture steps. Check what it actually starts: a script that creates only a database still needs containers for the backend and interface. Adapt local paths, development servers and `localhost` URLs to the remote application. Use disposable test data and separate preview services; do not reuse production databases, host credentials or home-directory mounts.

Preparation must inspect the project's seeders (scripts that create test data). When they exist, the selected Dockerfile or Compose startup automatically runs migrations followed by safe preview seeders on every startup and restart, before serving traffic or reporting readiness. Seeding is mandatory, and migration or seeding errors prevent startup. Repeated initialization must not duplicate fixtures or delete existing persistent preview data. Adapt unsafe or nonrepeatable seeders only for previews, using the isolated preview database and safe integrations so seeds cannot send real email or mutate external services. If no seeders exist, record the searched paths and scripts explicitly.

This contract applies to newly created preparation cards. Existing cards retain their embedded instructions, and existing recipes do not change automatically. Adapt an existing preparation to this policy, or create a new preparation when the readiness and retry workflow permits it; repository readiness alone does not verify seeding.

### Choose a container recipe

The recipe describes the build, HTTP port, readiness path and non-secret runtime environment. It does not contain credentials or claim that validation passed. Adapt the [version 1 recipe examples](../skills/coolify-preview-setup/references/recipe.md) to the application's existing build and startup commands.

| Option | Use and examples |
| --- | --- |
| Dockerfile | One application image, protected by Coolify's native HTTP authentication. See [Dockerfile.preview](../Dockerfile.preview) and [.coolify/preview.json](../.coolify/preview.json). |
| Compose | Several services, with a public authentication gateway protecting every HTTP and WebSocket path. See [.coolify/docker-compose.preview.yml](../.coolify/docker-compose.preview.yml), [.coolify/preview.compose.json](../.coolify/preview.compose.json) and [.coolify/Caddyfile.preview](../.coolify/Caddyfile.preview). |

These examples run Kanban Agents with simulated agents and fresh demo data. Prepare each other project's actual application and required services rather than assuming the example image will run it.

Recipe paths remain relative to the repository. For Compose, Coolify uses the recipe's `buildContext` as its working directory, even when the Compose file is inside `.coolify`. With `buildContext: "."`, service build contexts are `.` and local verification must use the repository root as the Compose project directory.

For Compose, the recipe's `serviceName` and `port` identify the public gateway. The backend privately injects `KANBAN_PREVIEW_AUTH_USERNAME` and `KANBAN_PREVIEW_AUTH_HASH` into that gateway. Upstream services set both names to the literal non-secret value `disabled` to prevent Coolify's shared environment file from leaking gateway credentials into them. Do not add these reserved names to the recipe's environment values.

### Understand local check evidence

The preparation ticket provides the exact installed verification helper to use. Its bounded Dockerfile check builds and runs a disposable container, publishes only a local loopback port, checks readiness, and cleans up its owned resources. A custom recipe location uses the optional `.coolify/verification.json` selector described in the recipe reference.

The automatic helper currently covers Dockerfile recipes. Compose preparation needs a separately controlled local check, including gateway authentication, application readiness and cleanup. Do not interpret a Compose helper refusal as a successful check.

The helper's health check does not prove that seeders completed or created usable data. When seeders exist, preparation evidence must also use existing project commands to verify a fresh isolated preview database, then repeated initialization and restart against the same database. Record actual seed completion, representative seeded test-data checks, login checks when the application supports login, and the absence of duplicate fixtures or destruction of persistent preview data. If no seeders exist, the explicit repository search evidence suffices for the seeding requirement. Keep missing checks incomplete and distinguish simulated checks from authorized live preview validation.

A local build and health check do not prove remote DNS, certificates, GitHub source access or browser behavior. Record which checks actually ran. The remote preview and its browser report provide those separate observations.

## Create a remote branch preview

This flow does not require a ticket or a PR.

1. Open **Prévisualisations** beside **Worktree** in the Home header.
2. Under **Nouvelle prévisualisation**, choose a project and an existing **Branche distante à prévisualiser**. Suggestions come from the project's remote branch list; typed branch names must also exist remotely.
3. Wait for automatic recipe readiness. The result shows **Branche vérifiée** and its observed commit. **Revérifier la branche** checks again and reloads saved Coolify settings. An unavailable check does not establish that the project needs preparation.
4. Complete global Coolify settings if required. If previews are disabled for this project, **Activer pour ce projet** enables the existing project option explicitly. Readiness and connection/authentication configuration are separate prerequisites.
5. Click **Lancer la prévisualisation**. The backend resolves the current remote commit again and freezes that revision for the attempt; the checked commit may have advanced before launch. The list shows the attempt's actual revision and status.
6. Wait for **Disponible**, open its protected URL and use the global preview login. A later push does not silently update this attempt.

The list contains both independent branch attempts and existing ticket previews, with project, branch, revision, expiration, URL and cleanup status. The Home project/search controls filter it. **Ouvrir le ticket** leads to a linked ticket when one exists. Independent branch attempts expose no ticket acceptance-validation action because they have no ticket criteria.

Stop an attempt and wait for completed cleanup before previewing a newer commit. A cleaned independent attempt offers **Relancer le dernier commit distant**, which starts a new attempt at the branch's current remote revision.

## Create a finished feature's preview

Create the preview after the feature has its GitHub PR and the ticket is completed or merged.

1. Open the finished feature ticket. Check that its PR includes the merged preparation recipe and the intended feature changes.
2. In its preview panel, click **Créer une prévisualisation**. Global settings must be complete and the project's preview option must be enabled.
3. Wait for deployment and readiness. Kanban Agents reads the PR's latest commit when creating the attempt and verifies the deployed commit before marking it ready. A later push does not update this attempt automatically.
4. Click **Ouvrir**. Enter the global preview username and password when the browser prompts. The API token is not a preview login.
5. Try the feature with its isolated test data. Confirm the page and interactive behavior you wanted to review.

Each attempt uses its own disposable Coolify application. An older attempt must finish cleanup before a replacement can be created. To preview a newer PR commit, stop the old attempt, wait for cleanup, then create another one.

## Ask Claude or Codex to validate

For ticket-linked previews, agent validation records browser evidence against the ready preview and deployed commit. Independent branch previews have no ticket acceptance criteria and do not expose these actions.

1. Keep Kanban Agents running on the Mac, with access to the preview URL and the selected provider.
2. Click **Vérifier avec Claude** or **Vérifier avec Codex** in the ready preview panel.
3. Wait for the run to finish. Each provider runs its own check; one provider's result does not establish the other's result.
4. Open the ticket's **Validation** tab. Review **Historique des validations**, the run status and each criterion's verdict.
5. Use **Voir la preuve** to inspect the observed output. When an artifact exists, use **Ouvrir la capture** or **Ouvrir la pièce jointe**.

Distinguish an application failure from missing evidence, a connection problem or a judge's interpretation. For example, a report can observe the requested banner yet reject it after adding an exclusivity requirement that the original criterion did not contain. Keep the failure visible and compare the plan, browser observation and verdict before deciding whether code needs a fix. Do not silently loosen criteria to obtain a pass.

## Stop, clean up and expire

Stop a preview whenever it is no longer needed, including while deployment or verification is in progress.

1. Click **Supprimer la prévisualisation** in the ticket's preview panel or the **Prévisualisations** list.
2. Wait for the stopped state and completed cleanup. A submitted deletion or an application missing from Coolify is not sufficient evidence of resource removal.
3. If cleanup fails, inspect its reported reason, fix the underlying connection or SSH problem, then click **Réessayer le nettoyage**.
4. Create a replacement only after cleanup is complete.

Cleanup is confined to owned preview resources. Shared image layers and build cache are not globally pruned. Interrupted deployment cleanup uses bounded waiting and repeated remote observations; it is not an atomic guarantee from Coolify.

The configured lifetime starts the expiration workflow, but expiration and cleanup require Kanban Agents' backend to be running. If the Mac is offline or the application is closed, the backend recovers overdue work on restart. Do not assume an expired URL has been removed until cleanup reports completion.

## Troubleshooting

| What you see | What to check |
| --- | --- |
| The connection test fails | Check the Coolify address, network reachability and token access to the selected team/server/project. The test is API connectivity, not a deployment test. |
| No private repository source is available, or creation fails to read the PR | Use **Vérifier l'accès au dépôt** in the project's preview settings. Confirm an existing Coolify GitHub App can access that repository and the project's GitHub integration can read its PR. API connectivity alone does not prove source access. |
| The selected deploy key is unavailable or clone fails | Refresh the key list and select an existing key in Coolify. Confirm its public key is authorized on the repository. Metadata availability alone does not prove clone access; an invalid explicit key never falls back to a GitHub App or public source. |
| Several GitHub connections match the repository | Select a verified connection under **Connexion GitHub du projet** and save, or use an authorized global default. The default is preferred only after its access is verified. |
| The GitHub connection check is incomplete | Check Coolify connectivity and the project's GitHub access, then retry the read-only check. Kanban Agents does not select an unverified connection. |
| The recipe is missing or invalid | Check **Recette du projet**, confirm the file and container inputs are tracked on the selected remote branch, and merge the reviewed preparation PR into its base when necessary. Use the version 1 recipe contract. |
| A Compose build cannot find its Dockerfile | Resolve build contexts from the recipe's `buildContext`, not the Compose file's directory. Repeat the local check with the same project directory as Coolify. |
| The URL does not resolve, or HTTPS fails | Check the wildcard DNS record, generated hostname, server address and certificate. DNS caching can delay visibility; verify resolution from the Mac as well as the server. |
| The browser asks for credentials or returns 401 | The challenge is expected without credentials. Use the global preview login, not the API token. Check the configured authentication if those credentials are rejected. |
| Dockerfile creation rejects the password | Keep it at most 31 UTF-8 bytes on Coolify 4.3.23; non-ASCII characters may use several bytes. Global credentials can only change after active previews and unresolved cleanup are cleared. |
| A provider's validation fails or has incomplete evidence | Read the run's plan, observations and evidence in **Validation** before changing code. Check Mac/provider connectivity and compare the verdict with the original criterion. |
| Stop remains pending or cleanup fails | Keep the backend running, verify the selected server's SSH alias, and use **Réessayer le nettoyage** after fixing the reported cause. Do not recreate the preview while cleanup is unresolved. |
| The settings cannot be changed | Stop all affected active previews and complete their cleanup first; this protects existing attempts from losing their connection or authentication settings. |

# Coolify previews

Use a preview to try a completed feature before merging its pull request (PR, a proposed change on GitHub). Kanban Agents builds the PR's latest commit on your Coolify server, gives it a protected URL, and can ask Claude or Codex to check it in a browser from your Mac. The preview is separate from your local development application.

This guide covers GitHub projects. Azure DevOps previews are not supported in this version. Each project needs a working container recipe; enabling the setting alone does not make an application deployable.

## Requirements

Before configuring a project, prepare:

- A reachable Coolify instance and server, with a Coolify project and environment for previews.
- A Coolify API token authorized to read deployment information, create and configure applications, deploy them, and delete owned applications. This token gives Kanban Agents access to Coolify; it is separate from the password used to open a preview.
- Coolify access to the GitHub repository. Private repositories need an authorized GitHub App with access to that repository.
- A preview domain and wildcard DNS record (a record that covers generated subdomains), pointing to the Coolify server. For a base domain such as `previews.example.com`, configure `*.previews.example.com` and check that generated names resolve from both the server and your Mac.
- An existing SSH alias on the Mac for verified server cleanup. SSH is the secure connection used to check and remove only the preview's owned resources. The alias must reach the selected server with working authentication and trusted host verification.
- Docker for local preparation checks, plus a working Claude or Codex session for agent tasks and browser validation.

Keep Kanban Agents running while deploying, validating, stopping or waiting for automatic expiration. Browser checks run on the Mac, not on the Coolify server.

## Configure Coolify once

Global settings connect Kanban Agents to Coolify and protect every preview with HTTP Basic authentication (the browser's username and password prompt).

1. Open **Réglages**, then **Coolify**.
2. Enter the HTTP(S) API address in **Adresse Coolify** and the API token in **Jeton API**. Use HTTPS for a remote instance; do not embed credentials in the URL.
3. Click **Enregistrer et tester la connexion**. A successful test loads the available servers, projects and GitHub Apps. It confirms API connectivity; repository and recipe access are checked when creating a preview.
4. Select **Serveur** and **Projet Coolify**. For a private repository, select its authorized **GitHub App (dépôts privés)**.
5. Set **Environnement** to your preview environment. The default is `previews`.
6. Enter only the base hostname in **Domaine des prévisualisations**, for example `previews.example.com`. Do not include `https://` or a path. Kanban Agents generates a unique subdomain for each attempt.
7. Enter the preview **Nom d'utilisateur** and **Mot de passe** manually. These are global access credentials shared by previews, separate from the API token. For Dockerfile previews, keep the password within **31 UTF-8 bytes** because of a verified limitation in Coolify 4.3.23. A randomly generated password of 24 ASCII characters fits this limit. The Compose gateway does not have that native Coolify limitation.
8. Enter your existing alias in **Alias SSH pour le nettoyage (facultatif)** and click **Enregistrer**.

The SSH field is optional when saving settings, but cleanup cannot be confirmed without a verified SSH target. A successful Coolify deletion response does not prove that containers and other resources have disappeared.

The API token and preview credentials are stored in a private local JSON file in the running application's data directory, with directory permissions `0700` and file permissions `0600`. This is file storage, not Keychain storage. The settings API returns configured flags instead of secret values; the preview credentials are sent privately to the authentication configuration and browser checks. Do not put their values in project recipes, source files or tickets.

Changes to global connection, identity, authentication or domain settings are blocked while previews are active or still require cleanup. Stop them and wait for cleanup to complete before changing those settings. Domain changes apply to newly created attempts.

## Prepare a new project

Preparation creates the project's repeatable build and startup instructions before any feature is deployed.

1. Open **Réglages**, then **Projets**, and open the project's **Prévisualisations Coolify** settings.
2. Enable **Activer les prévisualisations Coolify**.
3. Set **Recette du projet**. Its default is `.coolify/preview.json`; use a tracked, repository-relative path if your project uses another location.
4. Set **Durée de vie (heures)**. The default is 24 hours and the maximum is 168 hours.
5. Click **Préparer pour Coolify**. The application creates or reuses a normal TODO ticket. This button neither starts the agent nor deploys anything.
6. Open that preparation ticket, check the requested application and data isolation, then start it through the normal ticket workflow with Claude or Codex.
7. Review the resulting draft PR and its local validation evidence. Merge the preparation changes into the branch used as the basis for future feature PRs before creating their previews.

The ticket embeds the complete [Coolify preparation skill](../skills/coolify-preview-setup/SKILL.md), so both supported providers receive the same contract without requiring a manually installed slash command. The agent prepares files and submits a draft PR for review; it does not deploy or merge the preparation PR.

An existing worktree setup script can supply useful installation, migration and fixture steps. Check what it actually starts: a script that creates only a database still needs containers for the backend and interface. Adapt local paths, development servers and `localhost` URLs to the remote application. Use disposable test data and separate preview services; do not reuse production databases, host credentials or home-directory mounts.

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

A local build and health check do not prove remote DNS, certificates, GitHub source access or browser behavior. Record which checks actually ran. The remote preview and its browser report provide those separate observations.

## Create a finished feature's preview

Create the preview after the feature has its GitHub PR and the ticket is completed or merged.

1. Open the finished feature ticket. Check that its PR includes the merged preparation recipe and the intended feature changes.
2. In its preview panel, click **Créer une prévisualisation**. Global settings must be complete and the project's preview option must be enabled.
3. Wait for deployment and readiness. Kanban Agents reads the PR's latest commit when creating the attempt and verifies the deployed commit before marking it ready. A later push does not update this attempt automatically.
4. Click **Ouvrir**. Enter the global preview username and password when the browser prompts. The API token is not a preview login.
5. Try the feature with its isolated test data. Confirm the page and interactive behavior you wanted to review.

Each attempt uses its own disposable Coolify application. An older attempt must finish cleanup before a replacement can be created. To preview a newer PR commit, stop the old attempt, wait for cleanup, then create another one.

## Ask Claude or Codex to validate

Agent validation records browser evidence against the ready preview and deployed commit.

1. Keep Kanban Agents running on the Mac, with access to the preview URL and the selected provider.
2. Click **Vérifier avec Claude** or **Vérifier avec Codex** in the ready preview panel.
3. Wait for the run to finish. Each provider runs its own check; one provider's result does not establish the other's result.
4. Open the ticket's **Validation** tab. Review **Historique des validations**, the run status and each criterion's verdict.
5. Use **Voir la preuve** to inspect the observed output. When an artifact exists, use **Ouvrir la capture** or **Ouvrir la pièce jointe**.

Distinguish an application failure from missing evidence, a connection problem or a judge's interpretation. For example, a report can observe the requested banner yet reject it after adding an exclusivity requirement that the original criterion did not contain. Keep the failure visible and compare the plan, browser observation and verdict before deciding whether code needs a fix. Do not silently loosen criteria to obtain a pass.

## Stop, clean up and expire

Stop a preview whenever it is no longer needed, including while deployment or verification is in progress.

1. Click **Supprimer la prévisualisation** in the ticket's preview panel.
2. Wait for the stopped state and completed cleanup. A submitted deletion or an application missing from Coolify is not sufficient evidence of resource removal.
3. If cleanup fails, inspect its reported reason, fix the underlying connection or SSH problem, then click **Réessayer le nettoyage**.
4. Create a replacement only after cleanup is complete.

Cleanup is confined to owned preview resources. Shared image layers and build cache are not globally pruned. Interrupted deployment cleanup uses bounded waiting and repeated remote observations; it is not an atomic guarantee from Coolify.

The configured lifetime starts the expiration workflow, but expiration and cleanup require Kanban Agents' backend to be running. If the Mac is offline or the application is closed, the backend recovers overdue work on restart. Do not assume an expired URL has been removed until cleanup reports completion.

## Troubleshooting

| What you see | What to check |
| --- | --- |
| The connection test fails | Check the Coolify address, network reachability and token access to the selected team/server/project. The test is API connectivity, not a deployment test. |
| No private repository source is available, or creation fails to read the PR | Confirm the selected GitHub App can access that repository and the project's GitHub integration can read its PR. API connectivity alone does not prove source access. |
| The recipe is missing or invalid | Check **Recette du projet**, confirm the file and container inputs are tracked in the PR, and merge the reviewed preparation PR into its base. Use the version 1 recipe contract. |
| A Compose build cannot find its Dockerfile | Resolve build contexts from the recipe's `buildContext`, not the Compose file's directory. Repeat the local check with the same project directory as Coolify. |
| The URL does not resolve, or HTTPS fails | Check the wildcard DNS record, generated hostname, server address and certificate. DNS caching can delay visibility; verify resolution from the Mac as well as the server. |
| The browser asks for credentials or returns 401 | The challenge is expected without credentials. Use the global preview login, not the API token. Check the configured authentication if those credentials are rejected. |
| Dockerfile creation rejects the password | Keep it at most 31 UTF-8 bytes on Coolify 4.3.23; non-ASCII characters may use several bytes. Global credentials can only change after active previews and unresolved cleanup are cleared. |
| A provider's validation fails or has incomplete evidence | Read the run's plan, observations and evidence in **Validation** before changing code. Check Mac/provider connectivity and compare the verdict with the original criterion. |
| Stop remains pending or cleanup fails | Keep the backend running, verify the selected server's SSH alias, and use **Réessayer le nettoyage** after fixing the reported cause. Do not recreate the preview while cleanup is unresolved. |
| The settings cannot be changed | Stop all affected active previews and complete their cleanup first; this protects existing attempts from losing their connection or authentication settings. |


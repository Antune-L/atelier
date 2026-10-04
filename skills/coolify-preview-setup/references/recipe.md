# Preview recipe version 1

`.coolify/preview.json` is the repository-owned input read by Kanban Agents. It is not a Coolify API payload. Paths are relative to the repository root and must identify tracked files within the build context.

For a configured custom recipe location, the bounded no-argument verifier reads optional `.coolify/verification.json` with `{ "recipePath": "the/repository-relative/recipe.json" }`. Both selector and recipe are confined to the working repository. Omit the selector for the default path.

Required fields:

| Field | Meaning |
| --- | --- |
| `version` | Integer `1` for this contract. |
| `buildPack` | `dockerfile` or `dockercompose`. |
| `buildContext` | Relative directory containing verified build inputs, usually `.`. |
| `port` | Integer internal HTTP port exposed by the main application. |
| `healthPath` | Existing read-only HTTP readiness path beginning with `/`. |
| `environment` | Object mapping runtime variable names to non-secret string values. |

For `dockerfile`, include `dockerfile` with the relative Dockerfile path. For `dockercompose`, include `composeFile` with the relative Compose file path, `serviceName` identifying the public gateway, and `authentication: "gateway"`. The `port` identifies that gateway's listener. Do not include both definition-path fields. Optional `websocketPaths` contains the used WebSocket paths.

Example for a Bun application after verifying its files and routes:

```json
{
  "version": 1,
  "buildPack": "dockerfile",
  "dockerfile": "Dockerfile.preview",
  "buildContext": ".",
  "port": 52817,
  "healthPath": "/health",
  "environment": {
    "PORT": "52817",
    "KANBAN_DRY_RUN": "1",
    "KANBAN_SETUP": "0"
  },
  "websocketPaths": ["/ws", "/ws/terminal"]
}
```

The default data policy is ephemeral, with no persistent mounts. Keep health checks inside Docker/Compose definitions as well as the recipe. Document required secret names and remote authentication through the application's existing mechanism; never store their values here.

Initialization belongs in the selected container startup, not in an optional recipe field. Inspect and record existing seeders, or document the searched paths and scripts when none exist. For either Dockerfile or Compose, run migrations then safe preview seeders automatically on every startup and restart before traffic and readiness. Errors must prevent startup. Seeding must be repeatable without duplicate fixtures or destruction of persistent preview data; adapt unsafe or nonrepeatable seeders in preview scope using isolated test data and safe integrations. A Compose initialization service that only runs at creation does not meet the restart requirement.

Coolify 4.3.23 sets Compose's `--project-directory` to the recipe's `buildContext`, which becomes the deployment working directory. Relative service build contexts and file paths resolve from there, rather than from the Compose file's directory. With `buildContext: "."`, use service `build.context: .` even when the Compose file lives in `.coolify`, and verify locally with the repository root as `--project-directory`.

Compose gateway example:

```json
{
  "version": 1,
  "buildPack": "dockercompose",
  "composeFile": ".coolify/docker-compose.preview.yml",
  "buildContext": ".",
  "serviceName": "preview-gateway",
  "authentication": "gateway",
  "port": 8080,
  "healthPath": "/health",
  "environment": {
    "KANBAN_DRY_RUN": "1",
    "KANBAN_SETUP": "0"
  },
  "websocketPaths": ["/ws", "/ws/terminal"]
}
```

The backend reserves `KANBAN_PREVIEW_AUTH_USERNAME` and `KANBAN_PREVIEW_AUTH_HASH` for private runtime injection; neither may appear in recipe.environment. The gateway service maps those two runtime values through Compose interpolation. Upstream services explicitly set both names to the fixed non-secret string `disabled`, which overrides shared environment-file inheritance without exposing the private values.

The recipe describes preparation inputs, not validation success. Store revision-bound check evidence separately. Revalidate the artifact when recipe, container, startup or fixture inputs change.

The generic verification helper checks image health, not seed completion or seeded data. When seeders exist, collect project-specific evidence with existing repository commands on a fresh preview database and after repeated initialization and restart, including seed completion, representative seeded test-data checks, and login checks when the application supports login. If no seeders exist, the explicit repository search evidence suffices for the seeding requirement. Existing recipes and already-created preparation cards require adaptation to this policy; updating the skill does not change them retroactively.

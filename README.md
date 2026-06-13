# Kanban Agents (V0)

Application kanban locale single-user où des sessions Claude Code autonomes implémentent les tickets de bout en bout : PRD optionnel, implémentation dans un worktree isolé, review bloquante, tests locaux, PR draft sur GitHub.

Variante **« sans SDK »** : les agents sont de vraies sessions Claude Code interactives spawnées dans tmux, pilotées via un **channel MCP** (research preview). Pas d'Agent SDK, pas de `claude -p`.

## Stack

| Couche      | Choix                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------- |
| Runtime     | Bun                                                                                         |
| Backend     | ElysiaJS (HTTP) + Bun WebSocket natif                                                       |
| Persistance | SQLite (`bun:sqlite`)                                                                       |
| Frontend    | React + Vite + Tailwind + shadcn-like UI + dnd-kit                                          |
| Agents      | sessions Claude Code dans tmux (1 session = 1 ticket)                                       |
| Liaison     | `worker/worker.ts` = serveur MCP channel (stdio), connexion WS **sortante** vers le backend |
| VCS         | git worktrees sur 5 slots fixes, `gh` CLI pour les PR                                       |

## Démarrage

```bash
bun install
bun run dev          # backend (:52817) + frontend Vite (:52818) en parallèle
```

Puis ouvre http://localhost:52818. Le frontend proxifie `/api` et `/ws` vers le backend.
Les ports sont volontairement atypiques pour éviter les conflits avec d'autres services.

Scripts utiles :

```bash
bun run dev:server   # backend seul
bun run dev:web      # frontend seul
bun run typecheck    # tsc --noEmit (backend + frontend + worker)
bun run lint         # eslint
bun run build:web    # build de production du frontend
bun run start        # backend en mode production
```

### Variables d'environnement

| Var                           | Défaut          | Rôle                                                             |
| ----------------------------- | --------------- | ---------------------------------------------------------------- |
| `PORT`                        | `52817`         | port du backend (port atypique pour éviter les conflits)         |
| `KANBAN_DB`                   | `./kanban.db`   | chemin de la base SQLite                                         |
| `KANBAN_DRY_RUN`              | `1` (activé)    | **dry-run par défaut**. Mettre `0` pour les vrais effets de bord |
| `KANBAN_SETUP`                | non défini      | mettre `1` pour exécuter le setup premier-boot (effets de bord)  |
| `BACKEND_WS` / `BACKEND_HTTP` | dérivés du port | injectés dans les slots/worker                                   |
| `CURSOR_API_KEY`              | non défini      | auth Cursor headless (alternative à `agent login`) pour la délégation à Composer |

## App desktop (macOS, Electrobun)

L'app est packageable en application desktop macOS via [Electrobun](https://github.com/blackboardsh/electrobun) (WebKit, pas Electron/CEF). Le wrapper (`desktop/index.ts`) démarre le backend Bun **in-process** puis ouvre une fenêtre WebKit sur `http://localhost:52817` — `/api` et `/ws` restent same-origin, le front est inchangé.

```bash
bun run dev:desktop    # build web + agents, puis electrobun dev (fenêtre de dev)
bun run build:desktop  # build le .app → build/dev-macos-arm64/Kanban Agents-dev.app
```

L'app n'est pas signée (usage local) : au premier lancement, clic droit → **Ouvrir**. L'icône est générée depuis `src/web/public/favicon.svg` vers `icon.iconset/` (converti en `.icns` par Electrobun).

### Données desktop & synchronisation

Contrairement au mode web, l'app desktop lit/écrit son **propre** `config.json` + `kanban.db` sous `~/Library/Application Support/kanban-agents/` (mode réel, `KANBAN_DRY_RUN=0`). Au premier lancement, `config.json` est seedé depuis le placeholder `config.example.json` → board vide et un seul projet `mon-projet`.

Pour partager les données avec `bun run real` (même base + même config) :

```bash
bun run link:desktop-data   # symlink AppSupport → config.json + kanban-real.db + uploads/ du repo
```

- L'app desktop et `bun run real` partagent alors `kanban-real.db` (le WAL SQLite suit le symlink), la config et le dossier `uploads/` (les chemins d'upload stockés en base sont absolus, donc le partage du dossier est nécessaire).
- ⚠️ Les deux + `bun run dev` veulent **le port 52817** : un seul process à la fois → la base partagée fait office de sync.
- `bun run dev` reste un bac à sable dry-run séparé sur `./kanban.db`.
- Les symlinks utilisent des chemins absolus : relancer le script si le repo est déplacé.

## Mode dry-run (défaut, sans effet de bord)

Toute la couche à effets de bord (git, tmux, `gh`, `osascript`, `~/.claude.json`, `bun install`) passe par une interface injectable (`src/server/system/types.ts`). Deux implémentations :

- **`FakeSystemAdapter`** (`KANBAN_DRY_RUN` ≠ `0`, défaut) : journalise l'intention, **zéro effet de bord**. Le gate `done()` réussit toujours, les sessions tmux sont suivies en mémoire. C'est le mode dev/test.
- **`RealSystemAdapter`** (`KANBAN_DRY_RUN=0`) : exécute réellement git/tmux/gh/osascript/filesystem. Jamais instancié dans le chemin dev/test.

Ce que le dry-run **simule** (sans rien exécuter) : suppression/création de worktree, `git fetch`, dépôt de `.mcp.json` + `.claude/settings.json`, copie des `.env*`, `bun install`, spawn tmux de `claude`, vérification du gate `done`, notifications macOS, scripts de test projet.

→ Le backend boote, sert l'API + le WS, et le pipeline complet est exerçable de bout en bout sans toucher aux vrais repos.

## Setup premier boot (`KANBAN_SETUP=1`)

Désactivé par défaut. Quand `KANBAN_SETUP=1` ET `KANBAN_DRY_RUN=0` :

1. Pré-écrit `hasTrustDialogAccepted: true` dans `~/.claude.json` pour les 3 chemins de slots.
2. Ajoute `.claude/` et `.mcp.json` au `.git/info/exclude` de chaque repo de `PROJECTS`.

Prérequis manuels : `tmux` et `gh` installés/authentifiés.

## Délégation à Composer 2.5 (option par ticket)

Sur chaque carte en TODO, un sélecteur **Agent** choisit qui écrit le code de l'étape *implementing* :

- **Claude** (défaut) : la session Claude Code implémente elle-même.
- **Composer 2.5** : la session Claude **planifie**, délègue l'écriture du code à Cursor headless (`cursor-agent`, modèle `composer-2.5`), puis **reprend la main** pour relire, tester, committer, pousser et ouvrir la PR. Composer ne commit jamais — Claude possède tout le git.

Prérequis (sinon l'option est grisée ; détectée au boot via `GET /api/capabilities`) :

- `cursor-agent` (ou `agent`) installé : `curl https://cursor.com/install -fsS | bash`.
- Authentifié : `agent login` **ou** `CURSOR_API_KEY` exporté. Plan Cursor payant (chaque run est facturé).

Le script pilote est vendoré dans `templates/run_composer.sh` (le contrat le lance en arrière-plan et poll sans terminer le tour).

## Options de PR (par ticket)

À la création et sur chaque carte en TODO :

- **PR en draft** (coché par défaut) : le contrat injecté ouvre la PR via `gh pr create --draft`. Décoché → `gh pr create` (PR prête).
- **Merge automatique** : une fois la gate `done()` validée (arbre propre, branche poussée, PR existante), le backend marque la PR prête puis la merge (`gh pr merge --rebase`) dans la branche de base. La carte va alors en **PR mergée**. Un merge auto force la PR en non-draft (une draft n'est pas mergeable) ; en cas d'échec, la carte reste en **Fini** avec l'erreur affichée et la PR ouverte à merger manuellement.

## Architecture

```
src/
  shared/            types + zod schemas + constantes + config PROJECTS (partagés back/front/worker)
  server/
    index.ts         entrée : Bun.serve (HTTP via Elysia + WS client /ws + WS worker /workers)
    routes.ts        API REST Elysia (/api/*)
    db/              schema SQLite, mapping de lignes validé par zod, Store (toutes les mutations)
    hub.ts           ClientHub : broadcast WS vers l'UI (snapshot + push par mutation)
    workerHub.ts     WorkerHub : connexions sortantes des worker.ts, routage tool_call / events
    notifier.ts      notification macOS + toast UI
    mutex.ts         mutex par clé (sérialise les ops git par repo)
    boot.ts          setup premier boot (gated KANBAN_SETUP=1)
    system/          frontière d'effets de bord : types + FakeSystemAdapter + RealSystemAdapter
    agents/
      slotManager.ts cycle de vie des 3 slots (cleanup→fetch→worktree→deposit→spawn→gate→release), file FIFO, recovery, retry
      coordinator.ts route les tool calls + Stop hook (auto-nudge ×1 → stalled), answer/validate-prd
      contract.ts    construit le contrat de pipeline injecté en événement `ticket`
      slotTemplates.ts génère .mcp.json + .claude/settings.json (allowlist + hooks)
      watchdog.ts    watchdog soft 45 min (notif + badge, pas de kill)
  web/               frontend React (board, colonnes dnd-kit, détail, slots, toasts)
worker/worker.ts     serveur MCP channel (stdio) → WS sortant vers le backend
templates/
  preToolUse.ts      hook PreToolUse : deny --no-verify & co
  stopHook.ts        hook Stop : POST /api/internal/stop
  run_composer.sh    driver Cursor headless (Composer 2.5) pour la délégation d'implémentation
```

### Flux d'un ticket

1. Carte créée en **TODO**, dragée vers **À implémenter** → `POST /move` → `SlotManager.startTicket`.
2. Slot libre acquis (sinon file FIFO). Cycle de vie git sérialisé par repo via mutex.
3. tmux spawn `claude` ; `worker.ts` se connecte en WS sortant et reçoit le contrat (`ticket`).
4. L'agent pilote via les tools : `update_stage`, `ask_user`, `submit_prd`, `done`, `fail`.
5. `done(pr_url)` → le backend vérifie lui-même (git status propre, branche poussée, PR existante via `gh pr view`). Échec → `stalled`, slot conservé. Succès → carte **Fini**, slot libéré.
6. Hook `Stop` : tour fini sans tool de protocole → auto-relance ×1 (événement `nudge`) → sinon `stalled` + notification.

### Channels (backend ↔ agent)

- **backend → agent** (notifications MCP) : `ticket`, `answer`, `prd_validated`, `nudge`.
- **agent → backend** (tools) : `update_stage`, `ask_user`, `submit_prd`, `done`, `fail`.

## Garde-fous de développement

- `KANBAN_DRY_RUN` activé par défaut : aucun vrai `claude`/tmux/git/gh/osascript, aucune modification de `~/.claude.json` ni des vrais repos.
- `KANBAN_SETUP` désactivé par défaut.
- Aucun commit git n'est créé dans ce repo par l'application.

## Limites V0 connues

- Lots 4 (review bloquante argus + Figma) et 5 (PRD) : la **mécanique** (boucle ×2 max, comparaison maquette, submit_prd/ask_user/validation) est pilotée par l'agent via le contrat injecté et les tools/événements ; le backend ne lance pas lui-même argus (c'est le subagent natif de la session qui le fait, par design « sans SDK »).
- Le live spawning de `claude` n'est vérifiable qu'en `KANBAN_DRY_RUN=0` (smoke-checké en dry-run).
- Le rendu markdown du PRD/commentaires est en texte préformaté (pas de moteur markdown en V0).

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
bun run dev          # backend (:3001) + frontend Vite (:5173) en parallèle
```

Puis ouvre http://localhost:5173. Le frontend proxifie `/api` et `/ws` vers le backend.

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
| `PORT`                        | `3001`          | port du backend                                                  |
| `KANBAN_DB`                   | `./kanban.db`   | chemin de la base SQLite                                         |
| `KANBAN_DRY_RUN`              | `1` (activé)    | **dry-run par défaut**. Mettre `0` pour les vrais effets de bord |
| `KANBAN_SETUP`                | non défini      | mettre `1` pour exécuter le setup premier-boot (effets de bord)  |
| `BACKEND_WS` / `BACKEND_HTTP` | dérivés du port | injectés dans les slots/worker                                   |

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

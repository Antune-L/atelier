# Kanban Agents (V0)

Application kanban locale single-user où des sessions Claude Code autonomes implémentent les tickets de bout en bout : implémentation dans un worktree isolé, review bloquante, tests locaux, PR sur GitHub.

Variante **« sans SDK »** : les agents sont de vraies sessions Claude Code interactives spawnées dans tmux, pilotées via un **channel MCP**. Pas d'Agent SDK, pas de `claude -p`.

## Stack

| Couche      | Choix                                              |
| ----------- | -------------------------------------------------- |
| Runtime     | Bun                                                |
| Backend     | ElysiaJS (HTTP) + WebSocket natif Bun              |
| Persistance | SQLite (`bun:sqlite`)                              |
| Frontend    | React + Vite + Tailwind + dnd-kit                  |
| Agents      | sessions Claude Code dans tmux (1 session = 1 ticket) |
| VCS         | git worktrees + `gh` CLI pour les PR               |

## Prérequis

- [Bun](https://bun.sh)
- `git`
- `tmux` et `gh` (CLI GitHub authentifié) — uniquement pour le mode réel (voir plus bas)

## Démarrage

```bash
bun install
cp config.example.json config.json   # requis : config machine (repoPath, baseBranch, scripts…)
bun run dev          # backend (:52817) + frontend Vite (:52818)
```

`config.json` est gitignoré et obligatoire — le serveur refuse de démarrer sans. Adapte-le à ta machine (chemin des projets, branche de base, scripts).

Puis ouvre **http://localhost:52818**. Le frontend proxifie `/api` et `/ws` vers le backend.

Par défaut, `bun run dev` tourne en **dry-run** : aucun effet de bord (pas de vrai `claude`/tmux/git/gh, aucun repo touché). Le pipeline complet reste exerçable de bout en bout — c'est le mode recommandé pour découvrir l'app et développer.

Autres scripts :

```bash
bun run dev:server   # backend seul
bun run dev:web      # frontend seul
bun run typecheck    # tsc --noEmit
bun run lint         # eslint
```

## Variables d'environnement

Les ports sont volontairement atypiques pour éviter les conflits avec d'autres services.

| Var              | Défaut        | Rôle                                                       |
| ---------------- | ------------- | ---------------------------------------------------------- |
| `PORT`           | `52817`       | port du backend                                            |
| `KANBAN_DB`      | `./kanban.db` | chemin de la base SQLite                                   |
| `KANBAN_DRY_RUN` | `1`           | **dry-run par défaut**. Mettre `0` pour les vrais effets de bord |

## Mode réel

Pour que les agents spawnent réellement `claude` dans tmux, créent des worktrees et ouvrent des PR :

```bash
bun run real         # KANBAN_DRY_RUN=0 sur kanban-real.db
```

Prérequis : `tmux` et `gh` installés et authentifiés. Le mode réel exécute git/tmux/gh/filesystem pour de vrai.

## App desktop (macOS, optionnel)

L'app est packageable en application desktop macOS via [Electrobun](https://github.com/blackboardsh/electrobun) (WebKit). Le wrapper démarre le backend Bun in-process puis ouvre une fenêtre sur le frontend.

```bash
bun run dev:desktop    # fenêtre de dev
bun run build:desktop  # .app → build/dev-macos-arm64/
```

L'app desktop tourne en mode réel et utilise sa propre base sous `~/Library/Application Support/kanban-agents/`. Pour partager données et config avec `bun run real` :

```bash
bun run link:desktop-data   # symlink AppSupport → config/db/uploads du repo
```

⚠️ Desktop, `bun run real` et `bun run dev` veulent tous **le port 52817** : un seul process à la fois.

## Architecture (vue d'ensemble)

```
src/
  shared/   types + zod schemas + constantes (partagés back/front/worker)
  server/   Bun.serve : Elysia HTTP + WS, SQLite Store, SlotManager, contrat MCP
  web/      frontend React (board, colonnes dnd-kit, détail)
worker/     serveur MCP channel (stdio) → WS sortant vers le backend
templates/  hooks de session (PreToolUse/Stop) + drivers
```

### Flux d'un ticket

1. Carte créée en **TODO**, dragée vers **À implémenter**.
2. Un slot (git worktree) est acquis ; une session `claude` est spawnée dans tmux.
3. L'agent pilote son travail via les tools MCP : `update_stage`, `ask_user`, `done`, `fail`.
4. `done(pr_url)` → le backend vérifie lui-même (arbre propre, branche poussée, PR existante) avant de clôturer.

Pour les détails d'implémentation, voir `CLAUDE.md`.

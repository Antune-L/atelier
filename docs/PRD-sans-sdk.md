# PRD — Kanban Agents V0 « sans SDK » (PTY + channels + slots fixes)

Variante du [PRD.md](./PRD.md) qui n'utilise **ni Agent SDK ni `claude -p`** : les agents sont de vraies sessions Claude Code interactives, spawnées dans tmux par le backend, pilotées via un channel MCP (research preview). Le produit (kanban, colonnes, PRD optionnel, review bloquante, PR draft) est identique ; seules la couche agents et la gestion des worktrees changent.

## 1. Stack

| Couche | Choix |
| --- | --- |
| Runtime | Bun |
| Backend | ElysiaJS + WebSocket natif |
| Persistance | SQLite (`bun:sqlite`) |
| Frontend | React + dnd-kit + shadcn/ui + Tailwind |
| Agents | **Sessions Claude Code interactives dans tmux** (1 session = 1 ticket) |
| Liaison backend ↔ agent | **Channel MCP** (`--dangerously-load-development-channels`) + hooks |
| Modèle | 100 % Opus (`claude --model opus`) |
| VCS | git worktrees sur slots fixes, `gh` CLI pour les PR |

⚠️ **Risque assumé** : les channels sont une research preview derrière un flag `--dangerously-*`. Une mise à jour de Claude Code peut casser la liaison. En contrepartie : zéro dépendance SDK, sessions attachables à la main (`tmux attach`), abonnement Claude Code standard.

## 2. Slots fixes

**5 slots (configurable via `KANBAN_SLOTS`, défaut 5)** : `~/kanban-agents/slots/slot-1..N`. Un slot = un chemin réservé, détruit/recréé à chaque ticket — pas un worktree permanent. La concurrence max est donc égale au nombre de slots (file FIFO au-delà).

### Cycle de vie d'un slot

```
1. Cleanup     git -C <repo-précédent> worktree remove <slot> --force   (repo lu en DB)
2. Création    git -C <repoPath> fetch origin
               git -C <repoPath> worktree add <slot> -b feat/<id>-<slug> origin/<baseBranch>
3. Préparation backend dépose .mcp.json (channel worker) + .claude/settings.json
               (allowlist bash, hooks, consignes projet) ; copie des .env* du repo
               principal (chemins relatifs préservés, fichiers *prod* EXCLUS) ; bun install
4. Travail     tmux new-session -d -s ticket-<id> -c <slot> 'claude --model opus
                 --dangerously-load-development-channels server:worker
                 --permission-mode acceptEdits'
               (env : TICKET_ID, SLOT_ID, BACKEND_WS, DISABLE_AUTOUPDATER=1
                — une mise à jour de Claude Code en vol ne doit pas casser les channels)
5. Gate done   à la réception de done(pr_url), le backend vérifie LUI-MÊME :
               git status propre, branche poussée (ahead 0), PR existante (gh pr view).
               Échec → ticket stalled, slot conservé, notification.
6. Libération  kill tmux ; worktree remove ; branche locale supprimée
               → dès la PR draft créée et vérifiée (tout est sur GitHub)
```

- **Multi-projets** : le slot héberge n'importe quel repo (`git -C <repoPath> worktree add <chemin-du-slot>`). Deux slots sur le même projet = deux worktrees, OK (branches différentes).
- **Slot occupé** au-delà du nominal : `awaiting_answers` (question en attente) et `failed` (travail non commité conservé sur place jusqu'à « Relancer » ou « Abandonner »). Assumé en V0.
- **Mutex git par repo** : le backend sérialise les opérations de cycle de vie (`fetch`, `worktree add/remove`) par repo — deux slots sur le même projet ne touchent jamais le `.git` partagé en même temps.

### Setup automatisé au premier boot du backend

1. Pré-écrit `hasTrustDialogAccepted: true` dans `~/.claude.json` pour les chemins de slots (champ existant, fichier local qu'on contrôle — à re-vérifier si le format interne change).
2. Ajoute `.claude/` et `.mcp.json` au `.git/info/exclude` de chaque repo de `PROJECTS` (local, jamais commité, vaut pour tous ses worktrees).
3. Seuls prérequis manuels : tmux et `gh` installés/authentifiés.

Expérience cible : `bun run start` → drag d'une carte → un claude apparaît seul dans tmux. Aucune action manuelle.

## 3. Liaison backend ↔ agent (channel worker)

Le script `worker.ts` (serveur MCP channel) est spawné par chaque session Claude. Il **n'ouvre aucun port** : il se connecte en WebSocket sortant au backend (`BACKEND_WS`) en s'identifiant par `TICKET_ID`/`SLOT_ID` — pas de conflit de ports entre slots, et le backend voit qui est vivant.

```
Backend ──WS──► worker.ts ──notification channel──► session Claude (événements séquentiels,
        ◄──WS── worker.ts ◄──tool calls────────────  OK car 1 session = 1 ticket)
```

### Sens backend → agent (événements de channel)

- `ticket` : payload initial (description, consignes projet, contrat de pipeline).
- `answer` : réponse de l'utilisateur à une question (commentaire lié au `question_id`).
- `prd_validated` : l'utilisateur a validé le PRD, lancer l'implémentation.

### Sens agent → backend (tools exposés par worker.ts)

| Tool | Effet backend |
| --- | --- |
| `update_stage(stage)` | met à jour le badge de la carte (push WS au front) |
| `ask_user(question)` | commentaire `author=agent` + `question_id`, stage `awaiting_answers` ; la session **reste en vie**, la réponse revient en événement `answer` |
| `submit_prd(markdown)` | carte → colonne « PRD à implémenter », PRD affiché |
| `done(pr_url)` | carte → « Fini », kill tmux, cleanup, slot libéré |
| `fail(reason, findings)` | stage `failed`, badge rouge, slot conservé |

### Filets de sécurité (hooks + watchdog)

- **Permissions sans prompt bloquant** : `acceptEdits` couvre les éditions ; pour bash, allowlist dans le `.claude/settings.json` du slot (git sans `--no-verify`, scripts bun/npm du projet, `gh pr create`) + hook `PreToolUse` qui **refuse** tout le reste avec le message « commande non autorisée, utilise ask_user si indispensable ». Une session headless ne doit JAMAIS atteindre un prompt interactif.
- **Hook `Stop`** → POST backend « la session a fini son tour » (+ `session_id` Claude Code, stocké pour un éventuel `claude --resume` après crash). Tour fini sans `done`/`fail`/`ask_user` → **auto-relance ×1** : le backend injecte un événement de rappel (« termine le protocole ») dans la session vivante ; si le tour suivant est encore muet → ticket `stalled` + notification.
- **Watchdog soft** : 45 min sans `update_stage` ni fin de tour → notification + badge ⚠️ sur la carte. Pas de kill automatique (un gros ticket FFTIR légitime peut être long) ; tu décides via `tmux attach` ou Abandonner.

### Notifications macOS

Le backend déclenche une notification native (osascript) sur : `ask_user`, `done`, `failed`, `stalled`, watchdog. App locale single-user — pas d'autre canal en V0.

## 4. Pipeline d'un ticket

Identique au PRD principal (§3) avec deux adaptations :

1. **Review bloquante** : pas de « session séparée » — l'agent lance un **subagent à contexte frais** (outil Agent natif de Claude Code) avec le skill **argus** sur le diff, plus la comparaison Figma si tag UI (frame parente, pas le node feuille). Max 2 boucles findings→fix→re-review, sinon `fail()`.
2. **PRD optionnel** : la session produit le plan, appelle `submit_prd` puis `ask_user` pour ses questions, et **attend en vie** (slot occupé) jusqu'à `prd_validated`. Pas de resume : c'est la même session du début à la fin du ticket.

Le contrat complet (étapes, tools à appeler, interdits type `--no-verify` pour FFTIR, conventions de commit) est injecté via l'événement `ticket` + les `instructions` du serveur MCP worker.

## 5. Configuration des projets

Identique au PRD principal (§4) — mêmes `PROJECTS` (ac-expo / fftir / sofrapa, branches de base, `commitTimeoutMs`), sans `worktreesDir` (remplacé par les slots globaux).

## 6. Modèle de données

Schéma du PRD principal (§5) avec :

```sql
slots (
  id INTEGER PRIMARY KEY,           -- 1..N (N = KANBAN_SLOTS, défaut 5)
  ticket_id TEXT REFERENCES tickets(id),  -- NULL = libre
  repo_path TEXT,                   -- pour le cleanup du worktree précédent
  tmux_session TEXT
)
```

Sur `tickets` : `planning_session_id` supprimé (session unique), `session_id` = id Claude Code remonté par le hook Stop, `worktree_path` → `slot_id`.

## 7. API

Identique au PRD principal (§6), plus :

```
WS  /workers        connexions des worker.ts (identifiées par TICKET_ID/SLOT_ID)
GET /api/slots      état des slots (libre / ticket / stalled)
```

## 8. Recovery

- **Redémarrage du backend seul** : les sessions tmux survivent ; les worker.ts retentent leur connexion WS en boucle → les pipelines reprennent seuls. (Avantage net sur la variante SDK.)
- **Reboot machine / tmux mort** : au boot, tout slot dont la session tmux n'existe plus (`tmux has-session`) → ticket `interrupted`, bouton « Relancer » (re-spawn dans le slot, `claude --resume <session_id>` si disponible, sinon repart du worktree en l'état).
- **Ticket `stalled`** (fin de tour sans tool) : notification, relance manuelle par injection d'un événement de rappel dans la session encore vivante.

## 9. UI

Identique au PRD principal (§9), plus :
- Bandeau « Slots » : une pastille par slot (libre / ticket en cours / stalled-failed) avec bouton **« Ouvrir le terminal »** → copie la commande `tmux attach -t ticket-<id>` (intervention humaine directe dans la session).
- **Verrouillage en vol** : pendant le traitement, seuls les commentaires restent éditables et le seul drag autorisé est vers Abandonnés (confirmé). Les autres champs/déplacements sont bloqués — l'agent ne verrait pas les modifications.

## 10. Ordre de construction

1. Socle : Elysia + SQLite + WS, config projets, table slots.
2. Board CRUD sans agents (identique au PRD principal).
3. `worker.ts` + spawn tmux : cycle complet sur 1 ticket sans PRD ni review (implémentation → tests → PR draft vérifiée → cleanup). Projet cobaye à trancher à ce moment-là (option : repo sandbox jetable avant les vrais repos).
4. Review bloquante par subagent + boucle ×2.
5. Flow PRD : `submit_prd`, `ask_user`, validation, suite dans la même session.
6. Slots en parallèle (5 par défaut, configurable via `KANBAN_SLOTS`), recovery, hooks Stop/stalled, Abandonnés, polish UI.

## Hors scope V0

Identique au PRD principal, plus :
- Stash de sauvetage sur `failed` (le slot reste simplement occupé).
- Reprise automatique des `interrupted`.

## Différences clés vs PRD principal (résumé)

| | PRD principal (SDK) | Ce PRD (sans SDK) |
| --- | --- | --- |
| Runtime agent | `query()` Agent SDK | session Claude Code interactive (tmux) |
| Parallélisme | 5 queries | slots fixes (5 par défaut, configurable `KANBAN_SLOTS`) |
| Worktrees | 1 par ticket, cleanup au merge | slots réutilisés, cleanup à la PR draft |
| Questions/réponses | tool MCP in-process bloquant | tool `ask_user` + événement channel (session vivante) |
| Review « contexte frais » | session SDK séparée | subagent natif |
| Resume | `resume(sessionId)` SDK | inutile (session vivante) ; `--resume` en secours |
| Permissions | `canUseTool` programmatique | `--permission-mode acceptEdits` + allowlist settings |
| Fragilité | dépendance package SDK | flag research preview `--dangerously-*` |
| Intervention humaine | impossible en cours | `tmux attach` à tout moment |

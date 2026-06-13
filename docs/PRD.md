# PRD — Kanban Agents (V0)

Application kanban locale single-user où des agents Claude implémentent les tickets de bout en bout : PRD optionnel, implémentation dans un worktree isolé, review bloquante, tests locaux, PR draft sur GitHub.

## 1. Stack

| Couche | Choix |
| --- | --- |
| Runtime | Bun |
| Backend | ElysiaJS + WebSocket natif |
| Persistance | SQLite (`bun:sqlite`) |
| Frontend | React + dnd-kit + shadcn/ui + Tailwind |
| Agents | Claude Agent SDK (TypeScript), derrière une interface `WorkerAgent` |
| Modèle | 100 % Opus (`claude-opus-4-8`) pour toutes les étapes — configurable par étape |
| VCS | git worktrees, `gh` CLI pour les PR |

Pas d'auth (app locale, single-user). Repo : `~/kanban-agents`.

## 2. Colonnes et machine à états

### Colonnes (drag & drop)

```
Abandonnés ◄── TODO ──► À implémenter ──► PRD à implémenter ──► (retour À implémenter) ──► Fini
```

- **TODO** : cartes créées à la main (titre, description markdown libre, projet, tags, option PRD, URL Figma si tag UI).
- **À implémenter** : le drag déclenche le pipeline. La carte y reste pendant tout le traitement, avec un badge de `stage`.
- **PRD à implémenter** : destination automatique quand l'option PRD est cochée et que le plan est prêt. Les questions de l'agent apparaissent en commentaires ; les réponses de l'utilisateur débloquent la suite. Un bouton « Valider le PRD » renvoie la carte en implémentation (resume de session).
- **Fini** : PR draft ouverte + tests locaux verts. Bouton « PR mergée » → archive la carte + nettoie worktree et branche locale.
- **Abandonnés** : drag = action destructive avec confirmation → abort du `query()` en vol, suppression worktree + branche.

### Stages (champ `stage`, indépendant de la colonne)

```
queued → planning → awaiting_answers → implementing → reviewing → fixing → testing → opening_pr → done
                                                          │
                                                          └──► failed (boucle review épuisée ou tests rouges)
```

- Sans option PRD : `queued → implementing → …` (pas de planning). La review reste systématique.
- `failed` : la carte reste dans « À implémenter », badge rouge, findings en commentaire. Re-drag = relance ; drag vers Abandonnés = cleanup.
- `interrupted` : posé au boot du backend sur tout ticket qui était en vol (voir §8).

## 3. Pipeline d'un ticket

1. **Worktree** : `git worktree add <worktreesDir>/<ticket-id> -b feat/<ticket-id>-<slug>` depuis la branche de base du projet (fetch + base à jour d'abord).
2. **(Option PRD) Planning** : session Opus produit `docs/prd-<ticket-id>.md` dans le worktree + questions via `ask_user`. Carte → « PRD à implémenter ». Réponses en commentaires → resume de la même session jusqu'à validation du PRD par l'utilisateur.
3. **Implémentation** : session Opus (resume de la session planning si PRD, sinon nouvelle) implémente dans le worktree. Peut poser des questions via `ask_user` à tout moment (stage `awaiting_answers` temporaire, badge sur la carte).
4. **Review bloquante** : **session séparée** (contexte frais) qui lance le skill **argus** sur le diff, plus la **comparaison maquette Figma** si tag UI (gotcha connu : toujours récupérer la frame parente du node-id, un node peut être une cellule feuille). Findings → resume de la session implémenteur (`fixing`) → re-review. **Max 2 boucles** ; au-delà → `failed`.
5. **Tests locaux** : commandes du projet (typecheck, lint, tests) exécutées dans le worktree. Rouge après correction → `failed`.
6. **Livraison** : commit (conventions du projet, hooks respectés — voir config FFTIR), push, `gh pr create --draft` vers la branche cible du projet. Carte → « Fini » avec lien PR.

**Concurrence** : 5 pipelines max en parallèle (file FIFO au-delà). Un seul agent actif par ticket à la fois.

## 4. Configuration des projets (statique, hardcodée)

```ts
const PROJECTS = {
  "ac-expo": {
    label: "AC EXPO",
    repoPath: "/Users/antoineliu/ac-expo",
    baseBranch: "dev-preprod",       // base ET cible des PR
    worktreesDir: "/Users/antoineliu/ac-expo-worktrees",
    commitTimeoutMs: 120_000,
  },
  "fftir": {
    label: "FFTIR",
    repoPath: "/Users/antoineliu/fftir-thot",
    baseBranch: "dev",
    worktreesDir: "/Users/antoineliu/fftir-thot-worktrees",  // convention existante
    commitTimeoutMs: 600_000,        // hooks lefthook full-repo > 2 min
    // JAMAIS --no-verify (consigne injectée dans le system prompt de l'agent)
  },
  "sofrapa": {
    label: "SOFRAPA",
    repoPath: "/Users/antoineliu/sofrapa-autego",
    baseBranch: "dev",
    worktreesDir: "/Users/antoineliu/sofrapa-worktrees",
    commitTimeoutMs: 120_000,
  },
} satisfies Record<string, ProjectConfig>;
```

Les commandes de test/lint/typecheck sont lues dans le `package.json` du repo (scripts standard), avec override possible dans `ProjectConfig`.

## 5. Modèle de données (SQLite)

```sql
tickets (
  id TEXT PRIMARY KEY,              -- nanoid
  title TEXT NOT NULL,
  description TEXT NOT NULL,        -- markdown libre
  project TEXT NOT NULL,            -- clé de PROJECTS
  tags TEXT NOT NULL DEFAULT '[]',  -- JSON array, "ui" déclenche la comparaison maquette
  figma_url TEXT,                   -- requis si tag "ui"
  prd_enabled INTEGER NOT NULL DEFAULT 0,
  column TEXT NOT NULL,             -- abandoned | todo | implementing | prd | done
  stage TEXT,                       -- machine à états §2
  review_rounds INTEGER NOT NULL DEFAULT 0,
  session_id TEXT,                  -- session implémenteur (resume)
  planning_session_id TEXT,
  worktree_path TEXT,
  branch TEXT,
  pr_url TEXT,
  error TEXT,                       -- détail si failed/interrupted
  archived INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER, updated_at INTEGER
)

comments (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(id),
  author TEXT NOT NULL,             -- "user" | "agent" | "system"
  body TEXT NOT NULL,               -- markdown
  question_id TEXT,                 -- si réponse attendue par ask_user
  created_at INTEGER
)

events (                            -- journal append-only pour debug/audit
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id TEXT, type TEXT, payload TEXT, created_at INTEGER
)
```

## 6. API (Elysia)

```
GET    /api/projects                       liste statique
GET    /api/tickets?archived=false         board complet
POST   /api/tickets                        création
PATCH  /api/tickets/:id                    édition champs
POST   /api/tickets/:id/move               { column } — déclenche/stoppe le pipeline
POST   /api/tickets/:id/comments           commentaire user (réponse à question si question_id)
POST   /api/tickets/:id/validate-prd       PRD validé → reprise implémentation
POST   /api/tickets/:id/merged             archive + cleanup worktree/branche
POST   /api/tickets/:id/retry              relance après failed/interrupted
WS     /ws                                 push temps réel : ticket mis à jour, nouveau commentaire, stage
```

Toute mutation broadcast l'état du ticket sur le WS. L'UI ne polle jamais.

## 7. Couche agents

### Interface `WorkerAgent` (abstraction vendor)

```ts
interface WorkerAgent {
  plan(ticket, ctx): Promise<{ sessionId: string }>;       // PRD + questions
  resume(sessionId, message, ctx): Promise<void>;           // réponses, findings, validation
  implement(ticket, ctx): Promise<{ sessionId: string }>;
  review(ticket, ctx): Promise<ReviewResult>;               // session séparée, argus + figma
  abort(ticketId): void;
}
```

Implémentation V0 : `ClaudeWorkerAgent` (Agent SDK). Le modèle est un champ de config par étape (`models: { plan, implement, review, fix }`), tous à Opus en V0.

### Permissions (headless, pas d'humain au terminal)

- `cwd` = worktree du ticket, édition/lecture confinées au worktree.
- Bash allowlist : git (sans `--no-verify`), bun/npm scripts du projet, `gh pr create`.
- Tout le reste → soit refusé, soit escaladé via `ask_user`.

### Tool custom `ask_user` (MCP in-process)

L'agent appelle `ask_user(question)` → le backend crée un commentaire `author=agent` avec `question_id`, passe le stage à `awaiting_answers`, push WS. Le tool call reste bloquant côté agent jusqu'à la réponse (commentaire user lié au `question_id`). Pas de timeout en V0.

### Prompts

System prompt par étape, assemblé avec : description du ticket, consignes projet (hooks FFTIR, conventions), contrat de sortie (ex. review = JSON findings), et pour la review l'instruction d'utiliser le skill argus (+ skill comparaison maquette si tag UI, avec l'URL Figma).

## 8. Recovery

Au boot du backend : tout ticket avec un `stage` actif passe à `interrupted` (l'agent sous-jacent est mort avec le process). L'UI affiche un badge et le bouton « Relancer » (`/retry`), qui resume la session si elle existe, sinon repart de l'étape courante. Pas de reprise automatique en V0.

## 9. UI (shadcn)

- **Board** : 5 colonnes dnd-kit, filtre par projet (Select), bouton « Nouveau ticket » (Dialog).
- **Carte** : titre, projet (Badge), tags, badge de stage animé pendant le traitement, badge rouge si failed, compteur de questions en attente, lien PR.
- **Détail (Sheet/Dialog)** : description, fil de commentaires (questions agent mises en évidence, champ de réponse), PRD rendu en markdown avec bouton « Valider le PRD », findings de review, actions (relancer, abandonner, PR mergée).
- **Confirmations** : AlertDialog pour Abandonnés et PR mergée (destructifs).

## 10. Ordre de construction (tout en V0)

1. Socle : repo, Elysia + SQLite + WS, types partagés, config projets.
2. Board CRUD : colonnes, cartes, drag & drop, détail, commentaires — sans agents.
3. Couche agents : `WorkerAgent`, worktrees, pipeline sans PRD ni review (implémentation → tests → PR draft) sur 1 ticket.
4. Review bloquante : session review séparée, argus, boucle ×2, comparaison Figma sur tag UI.
5. Flow PRD : planning, `ask_user`, colonne PRD, validation, resume.
6. Parallélisme (5), recovery, Abandonnés/cleanup, polish UI.

## Hors scope V0

- Multi-vendor (Codex) — l'interface `WorkerAgent` le prépare, rien d'autre.
- Channels Claude Code (notifications perso) — gadget possible en V1.
- Attente CI verte avant « Fini » (Fini = PR draft + tests locaux).
- Auth, multi-user, déploiement.

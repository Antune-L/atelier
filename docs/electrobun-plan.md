# Plan : packager en app desktop avec Electrobun (macOS)

> Objectif : un exécutable macOS clic-and-go, **sans toucher au front**, et qui permet de lancer indifféremment la **version web** (onglet navigateur) ou la **version app** (fenêtre native) **sans aucune différence** de comportement.
>
> Cible actuelle : **macOS uniquement**. Windows/Linux hors scope (voir [Évolutions](#évolutions-multi-os)).

## Pourquoi Electrobun (et pas Electron)

Le backend est 100 % Bun (`bun:sqlite`, `Bun.serve`, `Bun.spawn`, `Bun.file/Glob/which`, shell `$`). Electrobun **tourne sur Bun** → tout le backend reste valide, zéro réécriture Bun→Node. Webview système (WebKit) → binaire minuscule. Voir le comparatif dans la discussion précédente.

## Principe directeur : same-origin = zéro changement front

Le front utilise **uniquement des chemins relatifs** :

- API : `fetch("/api/…")` (`src/web/src/lib/api.ts:16`)
- WebSocket : `` `${proto}://${location.host}/ws` `` (`src/web/src/lib/store.ts:4`)

Donc **tant que l'UI est servie sur la même origine que le backend**, le front marche tel quel, sans build conditionnel ni variable d'environnement. La clé du plan est donc :

> **Servir l'UI buildée (`dist/web`) directement depuis `Bun.serve`**, pour que `http://localhost:52817` rende l'app complète (UI + `/api` + `/ws` same-origin).

Une fois ça en place, « web » et « app » chargent **la même URL servie par le même backend**. La seule différence est le contenant (onglet vs fenêtre Electrobun) — invisible pour le code front.

### État actuel à corriger

Aujourd'hui le backend **ne sert pas** l'UI buildée : `Bun.serve` (`src/server/index.ts:97`) ne gère que `/ws`, `/workers`, `/uploads/*`, et les routes Elysia (`/api` préfixé dans `src/server/routes.ts:107`, + `/health`). En dev, c'est Vite (port 52818) qui sert l'UI et proxifie `/api` + `/ws` vers 52817 (`src/web/vite.config.ts`). Il n'existe **aucun** service statique de prod → c'est le trou à boucher.

## Architecture cible

```
                    ┌─────────────────────────────────────────┐
                    │  Backend Bun (startServer)               │
   mode web   ──────│  Bun.serve :52817                        │
   (navigateur)     │   ├─ /api/*      Elysia (routes.ts)      │
                    │   ├─ /ws /workers WebSocket              │
   mode app   ──────│   ├─ /uploads/*  fichiers               │
   (Electrobun)     │   └─ /*          dist/web (static + SPA) │← NOUVEAU
                    └─────────────────────────────────────────┘
                              ▲ spawn claude/cursor/gh/git (inchangé)
```

- **Mode web** : `bun start` → ouvrir `http://localhost:52817` dans un navigateur.
- **Mode app** : le main process Electrobun (lui-même Bun) appelle `startServer()` **in-process**, attend `/health`, puis ouvre une fenêtre sur `http://localhost:52817`.

In-process (et non sidecar) car : un seul runtime Bun, `process.execPath` = le Bun embarqué → le spawn des workers (`src/server/agents/slotTemplates.ts:63`, déjà câblé sur `bunPath = process.execPath`, `src/server/index.ts:32`) continue de fonctionner sans changement, et le bundler d'Electrobun empaquette les deps serveur automatiquement.

## Lot 1 — Backend : servir l'UI buildée (partagé web + app)

Bénéficie aussi au déploiement web (qui n'a aujourd'hui pas de service statique de prod).

1. **Refactor `src/server/index.ts`** : extraire la séquence de boot (création db/store/hubs/slotManager + `Bun.serve`) dans une fonction exportable `startServer(opts?): Promise<{ port: number; stop(): void }>`. Le top-level actuel devient `await startServer()` (mode web inchangé, `bun start` marche pareil).
2. **Ajouter le service statique** dans le `fetch` de `Bun.serve`, en **dernier fallback** (après `/ws`, `/workers`, `/uploads/*`, et après `app.handle` pour `/api` + `/health`) :
   - GET d'un chemin non-API → `Bun.file(join(webDist, pathname))` ; si absent → `dist/web/index.html` (fallback SPA pour le routing client).
   - `webDist = join(resourcesRoot, "dist", "web")`.
   - ⚠️ Ne pas court-circuiter `/api`, `/health`, `/ws`, `/workers`, `/uploads/*` : garder l'ordre actuel, le static est le **else** final.
3. **`build:web`** existe déjà (`dist/web/`, `package.json`). Ajouter un script `start:prod` = `build:web` puis `bun start`, pour tester le mode web unifié.

> Test de validation lot 1 : `bun run build:web && bun start`, puis ouvrir `http://localhost:52817` dans Chrome → l'app doit fonctionner **sans Vite** (DnD, WS temps réel, uploads). Si OK, la moitié app est déjà gagnée.

## Lot 2 — Séparer ressources (read-only) et données (writable)

Un `.app` packagé est **read-only** : tout ce qui s'écrit doit sortir du bundle. Aujourd'hui tout est rooté sur un unique `PROJECT_ROOT` (`src/server/config.ts:18`, `src/server/index.ts:27`), ce qui va casser en mode app.

Introduire deux racines distinctes (en mode web/dev, les deux = racine repo → comportement inchangé) :

| Racine | Contenu | Mode web (défaut) | Mode app |
|---|---|---|---|
| **`resourcesRoot`** (read-only) | `dist/web`, `worker/worker.ts`, `templates/*` | racine repo | `<bundle>/Resources` |
| **`dataRoot`** (writable) | `kanban.db`, `uploads/`, `config.json`, `slots/` | racine repo | `~/Library/Application Support/kanban-agents` |

État du câblage existant (bonne nouvelle, presque tout est déjà surchargeable) :

- **DB** : `KANBAN_DB` env ✅ (`src/server/index.ts:29`)
- **config.json** : `KANBAN_CONFIG` env ✅ (`src/server/config.ts:62`)
- **slots** : `slotRoot` de la config, accepte un chemin absolu ✅ (`src/server/config.ts:98`)
- **uploads** : ⚠️ codé en dur `join(projectRoot, "uploads")` (`src/server/uploads.ts:39,51`) → **seul point à modifier** : router sur `dataRoot` au lieu de `projectRoot`.
- **templates/worker** : `resolveTemplatePaths(projectRoot)` (`src/server/agents/slotTemplates.ts:107`) → faire pointer sur `resourcesRoot`.

Implémentation : `startServer(opts)` accepte `{ resourcesRoot, dataRoot }` (défaut tous deux = `PROJECT_ROOT`). Le mode app passe les deux racines + les env (`KANBAN_DB`, `KANBAN_CONFIG`) calés sur `dataRoot`.

> ⚠️ Premier lancement app : `config.json` n'existe pas dans `dataRoot`. Prévoir un bootstrap (copier `config.example.json` vers `<dataRoot>/config.json` et guider l'utilisateur) — sinon `loadConfig` throw au boot (`src/server/config.ts:70`).

## Lot 3 — Le wrapper Electrobun

1. **Scaffolding** : `bun add -d electrobun`, init du projet Electrobun (dossier `app/` ou `desktop/`), config `electrobun.config.ts` (appId, nom, icône, build macOS).
2. **Main process** (`desktop/main.ts`) :
   ```
   import { startServer } from "../src/server/index.ts"
   const { port } = await startServer({ resourcesRoot, dataRoot })
   // attendre /health OK (poll court), puis :
   new BrowserWindow({ url: `http://localhost:${port}` })
   ```
   - `resourcesRoot` = dossier ressources du bundle ; `dataRoot` = `~/Library/Application Support/kanban-agents` (créer si absent).
   - À la fermeture : `stop()` le serveur (et tuer les sessions/slots en cours via le `Watchdog`/`SlotManager` existant).
3. **Ressources à embarquer non-bundlées** (ce sont des entrypoints de sous-process, pas des imports) : `worker/worker.ts`, `templates/preToolUse.ts`, `templates/stopHook.ts`, `templates/run_composer.sh`, et `dist/web/`. Les déclarer comme fichiers de ressources dans la config Electrobun.

## Lot 4 — Spécificités macOS à régler

1. **PATH des apps GUI** ⚠️ (piège majeur) : une app lancée depuis le Finder **n'hérite pas du PATH du shell**. Donc `Bun.which("claude"|"cursor-agent"|"gh"|"git")` (`src/server/system/real.ts:278`) et les spawns échoueront alors que ça marche en terminal.
   - Fix : reconstruire un PATH au boot du mode app (lire via un login shell `zsh -ilc 'echo $PATH'`, ou préfixer les emplacements usuels : `/opt/homebrew/bin`, `/usr/local/bin`, `~/.local/bin`, `~/.bun/bin`) et l'injecter dans l'env des spawns.
2. **Notifications** : `osascript` (`src/server/system/real.ts:212`) fonctionne en mode app sur macOS → **on garde** (mono-OS).
3. **Binaires externes requis** : `claude`, `cursor-agent`, `gh`, `git` doivent être installés + authentifiés sur la machine. L'app ne les fournit pas → au boot, vérifier leur présence (`checkComposerAvailable` existe déjà) et afficher un onboarding clair si absent.
4. **Code signing + notarization** : nécessaire pour distribuer hors « app non identifiée ». Electrobun fournit le pipeline de signature ; prévoir un Developer ID Apple. Pour usage perso, on peut différer (clic-droit → Ouvrir).

## Checklist d'exécution

- [ ] **L1.1** Refactor `index.ts` → `startServer(opts)` exportable ; top-level = `await startServer()`.
- [ ] **L1.2** Service statique `dist/web` + fallback SPA dans `Bun.serve` (else final).
- [ ] **L1.3** Script `start:prod` ; valider l'app **sans Vite** sur `:52817` (DnD WebKit inclus).
- [ ] **L2.1** Introduire `resourcesRoot` / `dataRoot` dans `startServer`.
- [ ] **L2.2** Router `uploads` sur `dataRoot` (`src/server/uploads.ts`).
- [ ] **L2.3** Bootstrap `config.json` au premier lancement app.
- [ ] **L3.1** Scaffolding Electrobun + config build macOS.
- [ ] **L3.2** `main.ts` : `startServer` in-process → fenêtre sur `localhost`.
- [ ] **L3.3** Embarquer `worker/`, `templates/`, `dist/web` comme ressources.
- [ ] **L4.1** Résolution PATH pour apps GUI (le piège #1).
- [ ] **L4.2** Onboarding si CLI externes absents.
- [ ] **L4.3** (Optionnel) Signature/notarization.

## Pièges connus

- **DnD-kit sous WebKit** : Electrobun rend via WebKit (pas Chromium). Tester le drag-and-drop du board tôt (lot 1, dans Safari/WebKit) avant d'investir dans le packaging.
- **`location.host` en mode app** : la fenêtre charge `http://localhost:52817` → `location.host = localhost:52817`, donc `/ws` et `/api` same-origin résolvent correctement, **sans changement front**. ✅
- **Bundle read-only** : ne jamais écrire dans `resourcesRoot` en mode app (cf. lot 2).
- **Dev inchangé** : `bun dev` (Vite + proxy) reste le workflow de développement ; le service statique ne sert qu'en prod/app.
- **Double `Bun.serve`** : ne pas lancer à la fois le mode web (`bun start`) et l'app sur le même port 52817 → conflit. Évident, mais à garder en tête.

## Évolutions multi-OS

Hors scope actuel, mais sans dette bloquante : Electrobun cible déjà Windows (WebView2) et Linux (WebKitGTK). Pour y aller plus tard, traiter (1) le rendu sur chaque moteur webview, (2) remplacer `osascript` par les notifications natives Electrobun, (3) la résolution PATH par OS.

## Questions ouvertes

1. **In-process vs sidecar** confirmé in-process — OK, ou tu préfères l'isolation crash d'un sidecar (au prix d'un packaging plus lourd) ?
2. **`dataRoot`** : `~/Library/Application Support/kanban-agents` convient, ou tu veux garder les données à la racine repo même en mode app (dev perso) ?
3. **Signature Apple** dans le scope v1, ou clic-droit→Ouvrir suffit pour l'instant ?

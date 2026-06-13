# Plan : packager en app desktop avec Electrobun (macOS)

> Objectif : un exécutable macOS clic-and-go, **sans toucher au front**, et qui permet de lancer indifféremment la **version web** (onglet navigateur) ou la **version app** (fenêtre native) **sans aucune différence** de comportement.
>
> Cible actuelle : **macOS uniquement**. Windows/Linux hors scope (voir [Évolutions](#évolutions-multi-os)).
>
> _Révisé juin 2026 — refs `file:line` re-vérifiées ; ajout des prérequis Bun 1.3 / option CEF / sidecar / pré-build worker / piège d'ordre d'import / tmux._

## Pourquoi Electrobun (et pas Electron)

Le backend est 100 % Bun (`bun:sqlite`, `Bun.serve`, `Bun.spawn`, `Bun.file/Glob/which`, shell `$`). Electrobun **tourne sur Bun** → tout le backend reste valide, zéro réécriture Bun→Node. Webview système (WebKit) → binaire minuscule (~12 MB).

**Avantage décisif vs Electron/Tauri** : Electrobun embarque un **CEF (Chromium) optionnel** (v125) en plus du WebKit système. Si le drag-and-drop casse sous WebKit (risque réel, cf. Lot 1 + pièges), on bascule en rendu Chromium **sans réécrire le backend** — ce que Tauri (WebKit-only) ne peut pas, et qu'Electron n'offre qu'au prix d'une réécriture Bun→Node.

### Statut Electrobun (juin 2026)

- **v1 sortie le 6 fév. 2026**, série v1.18.x livrée en mai–juin 2026 (cadence active). « Production-ready » revendiqué pour **outils internes / utilitaires dev** = pile notre catégorie.
- ⚠️ **Jeune, mono-éditeur** (Blackboard), doc parfois désynchronisée de l'implémentation, marketplace de plugins prévue Q3 2026. Sur un edge case WebKit, on est seul.
- ⚠️ **Prérequis runtime : Bun ≥ 1.3.0** ([compat](https://blackboard.sh/electrobun/docs/guides/compatability/)). Le projet tourne en **1.2.21** (`bun --version`) → upgrade obligatoire. Bonne nouvelle : `@types/bun` est **déjà en 1.3.14** (`bun.lock`), le code est déjà typé contre 1.3 → l'upgrade ≈ `bun upgrade` + un run de tests, pas une migration.

## Principe directeur : same-origin = zéro changement front

Le front utilise **uniquement des chemins relatifs** :

- API : `fetch("/api/…")` (`src/web/src/lib/api.ts:18`, upload `:63`)
- WebSocket : `` `${proto}://${location.host}/ws` `` (`src/web/src/lib/store.ts:4`)

Vérifié : un `grep import.meta.env|VITE_|http://|localhost|process.env` sur `src/web/src/` ne renvoie **aucun** hit — aucune URL absolue ni variable de build ne peut fuiter. Donc **tant que l'UI est servie sur la même origine que le backend**, le front marche tel quel, sans build conditionnel ni variable d'environnement. La clé du plan est donc :

> **Servir l'UI buildée (`dist/web`) directement depuis `Bun.serve`**, pour que `http://localhost:52817` rende l'app complète (UI + `/api` + `/ws` same-origine).

Une fois ça en place, « web » et « app » chargent **la même URL servie par le même backend**. La seule différence est le contenant (onglet vs fenêtre Electrobun) — invisible pour le code front.

### État actuel à corriger

Aujourd'hui le backend **ne sert pas** l'UI buildée : `Bun.serve` (`src/server/index.ts:97`) ne gère que `/ws`, `/workers`, `/uploads/*`, et les routes Elysia (`/api` préfixé dans `src/server/routes.ts`, + `/health` `index.ts:83`). En dev, c'est Vite (port 52818) qui sert l'UI et proxifie `/api` + `/ws` vers 52817 (`src/web/vite.config.ts`). Il n'existe **aucun** service statique de prod → c'est le trou à boucher.

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
                              ▲ spawn tmux→claude/cursor/gh/git (inchangé)
```

- **Mode web** : `bun start` → ouvrir `http://localhost:52817` dans un navigateur.
- **Mode app** : le main process Electrobun (lui-même Bun) lance `startServer()`, attend `/health`, puis ouvre une fenêtre sur `http://localhost:52817`.

⚠️ **In-process vs sidecar — à trancher par un spike, penche sidecar.** Electrobun exécute ton code dans un **Bun Worker thread** relié au natif par FFI, et **les précédents réels font tourner le backend en sidecar** (process séparé sur un port), pas in-process. L'hypothèse initiale — `process.execPath` = Bun embarqué réutilisable pour spawn les workers (`bunPath = process.execPath`, `src/server/index.ts:32`, injecté dans `.mcp.json` `slotTemplates.ts:78`) — **n'est pas vérifiée depuis le worker thread**. Décision :

> Partir en **sidecar** (un `Bun.spawn` du serveur sur un port libre, fenêtre pointée dessus) sauf si le spike L0.3 confirme que l'in-process spawn les workers correctement. Le sidecar isole aussi les crashs serveur de l'UI.

Indépendamment de ce choix : le **spawn du worker** (`<bunPath> worker.js`, déclenché par *claude* via `.mcp.json`, **pas** par notre backend) est une **chaîne séparée** → voir Lot 3 (worker pré-buildé).

## Lot 1 — Backend : servir l'UI buildée (partagé web + app)

Bénéficie aussi au déploiement web (qui n'a aujourd'hui pas de service statique de prod, cf. `portability.md`).

1. **Refactor `src/server/index.ts`** : extraire la séquence de boot (création db/store/hubs/slotManager + `Bun.serve`) dans une fonction exportable `startServer(opts?): Promise<{ port: number; stop(): void }>`. Le top-level actuel devient `await startServer()` (mode web inchangé, `bun start` marche pareil).
2. **Ajouter le service statique** dans le `fetch` de `Bun.serve`, en **dernier fallback** (après `/ws`, `/workers`, `/uploads/*`, et après `app.handle` pour `/api` + `/health`) :
   - GET d'un chemin non-API → `Bun.file(join(webDist, pathname))` ; si absent → `dist/web/index.html` (fallback SPA pour le routing client).
   - `webDist = join(resourcesRoot, "dist", "web")`.
   - ⚠️ Ne pas court-circuiter `/api`, `/health`, `/ws`, `/workers`, `/uploads/*` : garder l'ordre actuel, le static est le **else** final.
3. **`build:web`** existe déjà (`dist/web/`, `package.json`). Ajouter un script `start:prod` = `build:web` puis `bun start`, pour tester le mode web unifié.

> Test de validation lot 1 : `bun run build:web && bun start`, puis ouvrir `http://localhost:52817` dans Chrome → l'app doit fonctionner **sans Vite** (DnD, WS temps réel, uploads). Si OK, la moitié app est déjà gagnée.

## Lot 2 — Séparer ressources (read-only) et données (writable)

Un `.app` packagé est **read-only** : tout ce qui s'écrit doit sortir du bundle. Aujourd'hui tout est rooté sur un unique `PROJECT_ROOT` (`src/server/config.ts:18`, `src/server/index.ts:26`), ce qui va casser en mode app.

Introduire deux racines distinctes (en mode web/dev, les deux = racine repo → comportement inchangé) :

| Racine | Contenu | Mode web (défaut) | Mode app |
|---|---|---|---|
| **`resourcesRoot`** (read-only) | `dist/web`, `worker.js`, hooks buildés, `templates/run_composer.sh` | racine repo | `<bundle>/Resources` |
| **`dataRoot`** (writable) | `kanban.db`, `uploads/`, `config.json`, `slots/` | racine repo | `~/Library/Application Support/kanban-agents` |

État du câblage existant (bonne nouvelle, presque tout est déjà surchargeable) :

- **DB** : `KANBAN_DB` env ✅ (`src/server/index.ts:29`)
- **config.json** : `KANBAN_CONFIG` env ✅ (`src/server/config.ts:62`)
- **slots** : clé `slotsRoot` de la config, accepte un chemin absolu ✅ (`src/server/config.ts:57,97`)
- **uploads** : `saveUpload`/`serveUpload` prennent déjà `projectRoot` en **argument** (`src/server/uploads.ts:36,48`) — rien à changer dans le module. **Seul point à modifier : les 2 appelants**, leur passer `dataRoot` au lieu de `PROJECT_ROOT` (`src/server/routes.ts:374` `saveUpload`, `src/server/index.ts:110` `serveUpload`).
- **templates/worker** : `resolveTemplatePaths(projectRoot)` (`src/server/agents/slotTemplates.ts:122`) → faire pointer sur `resourcesRoot`.

Implémentation : `startServer(opts)` accepte `{ resourcesRoot, dataRoot }` (défaut tous deux = `PROJECT_ROOT`). Le mode app passe les deux racines + les env (`KANBAN_DB`, `KANBAN_CONFIG`) calés sur `dataRoot`.

> ⚠️ **Bootstrap + ordre d'import (piège subtil).** `config = loadConfig()` est un **const top-level** (`src/server/config.ts:89`) évalué **à l'import**, qui **throw si le fichier manque** (`config.ts:70`). Or les imports ES sont hoistés **avant** le corps de `main.ts` → un `import { startServer }` statique crashe **avant** que `main.ts` ait pu créer `config.json`. Fix : dans `main.ts`, (1) copier `config.example.json` → `<dataRoot>/config.json` si absent, (2) poser `process.env.KANBAN_CONFIG`/`KANBAN_DB`, **puis** (3) `const { startServer } = await import(...)` — l'import **dynamique** s'évalue après, fichier + env en place.

## Lot 3 — Le wrapper Electrobun

1. **Scaffolding** : `bun add -d electrobun`, init du projet Electrobun (dossier `desktop/`), config `electrobun.config.ts` (appId, nom, icône, build macOS, WebKit ou CEF).
2. **Main process** (`desktop/main.ts`) :
   ```
   // 1. bootstrap config + env AVANT tout import du serveur (cf. Lot 2)
   ensureConfig(dataRoot); process.env.KANBAN_CONFIG = ...; process.env.KANBAN_DB = ...
   process.env.PATH = await repairPath()        // cf. Lot 4 (piège #1)
   // 2. import DYNAMIQUE (sinon loadConfig throw à l'import)
   const { startServer } = await import("../src/server/index.ts")
   const { port } = await startServer({ resourcesRoot, dataRoot })   // ou sidecar : Bun.spawn
   // 3. attendre /health OK (poll court), puis :
   new BrowserWindow({ url: `http://localhost:${port}` })
   ```
   - `resourcesRoot` = dossier ressources du bundle ; `dataRoot` = `~/Library/Application Support/kanban-agents` (créer si absent).
   - À la fermeture : `stop()` le serveur **et** tuer les sessions tmux détachées (sinon fuite de process `claude`, cf. Lot 4).
3. **Ressources à embarquer** : `dist/web/`, `templates/run_composer.sh`, et les **entrypoints de sous-process pré-buildés** (voir point 4). Les déclarer comme fichiers de ressources dans la config Electrobun.
4. ⚠️ **Pré-builder worker + hooks (sinon deps non résolues).** `worker/worker.ts`, `templates/preToolUse.ts`, `templates/stopHook.ts` importent des deps npm (`@modelcontextprotocol/sdk`, `zod`) — dans un bundle **read-only sans `node_modules`**, `bun <script.ts>` échouera à résoudre les imports. Avant packaging : `bun build worker/worker.ts --target=bun --outfile worker.js` (deps inlinées en 1 fichier), idem hooks, puis pointer `.mcp.json`/hooks (`slotTemplates.ts:78,109,114`) sur les `.js` buildés. Alternative : `bun build --compile` en binaires autonomes (supprime la dépendance à `bunPath`, mais ~90 MB/binaire).

## Lot 4 — Spécificités macOS à régler

1. **PATH des apps GUI** ⚠️ (piège majeur) : une app lancée depuis le Finder **n'hérite pas du PATH du shell**. Donc `Bun.which(...)` (`src/server/system/real.ts:418`) **et** tous les spawns (`tmux`, `claude`, `gh`, `git`, `cursor-agent`) échoueront alors que ça marche en terminal.
   - Fix : reconstruire le PATH **une seule fois au boot du main process** (login shell `zsh -ilc 'echo $PATH'`, ou préfixer `/opt/homebrew/bin`, `/usr/local/bin`, `~/.local/bin`, `~/.bun/bin`) et l'écrire dans `process.env.PATH`. ✅ **Aucun changement par-spawn** : `spawnSession` ne passe à tmux que 4 `-e` (`real.ts:183`) et les `Bun.spawn` n'ont pas d'`env:` explicite → **tout hérite de `process.env`**.
2. **Notifications** : `osascript` (`src/server/system/real.ts:351`) fonctionne en mode app sur macOS → **on garde** (mono-OS). Option : notifications natives Electrobun plus tard.
3. **Binaires externes requis** : `tmux`, `claude`, `cursor-agent`, `gh`, `git` doivent être installés + authentifiés. ⚠️ **tmux** porte tout le cycle de vie agent (`real.ts:182-216`) — homebrew, **jamais dans le PATH launchd par défaut** → couvert par le fix #1, mais à lister dans l'onboarding. L'app ne fournit aucun de ces binaires → au boot, vérifier leur présence (`checkComposerAvailable` existe déjà) et afficher un onboarding clair si absent.
4. **Teardown tmux** ⚠️ : tmux crée un serveur détaché + état dans `/tmp` **hors bundle**. À la fermeture de l'app, tuer les sessions (`killSession`, `real.ts:205`) sinon les process `claude` fuient après la fermeture de la fenêtre.
5. **Effet de bord `~/.claude.json`** : `seedTrustForSlots` écrit dans le `~/.claude.json` de l'utilisateur (`real.ts:113`). OK, mais c'est une mutation d'état global partagé avec son CLI — à documenter (pas de surprise silencieuse).
6. **Code signing + notarization** : nécessaire pour distribuer hors « app non identifiée ». Electrobun fournit le pipeline. ⚠️ **Piège app qui spawn des binaires non-signés** (`claude`/`bun`/`tmux`) : le hardened runtime peut exiger des entitlements (`com.apple.security.cs.allow-unsigned-executable-memory` ou disable-library-validation) — risque notarization réel et non vérifié. Pour usage perso, différer (clic-droit → Ouvrir).

## Checklist d'exécution

**Spikes bloquants (AVANT de packager) :**

- [ ] **L0.1** `bun upgrade` → 1.3.x + `bun test` (types déjà 1.3.14 → faible friction).
- [ ] **L0.2** `build:web` + piloter le **board DnD en WKWebView** (Safari). Si KO → option **CEF/Chromium** d'Electrobun (pas un abandon).
- [ ] **L0.3** Spike Electrobun minimal : `process.execPath` pointe-t-il un Bun réutilisable depuis le worker thread ? → tranche **in-process vs sidecar**.

**Backend (partagé web + app) :**

- [ ] **L1.1** Refactor `index.ts` → `startServer(opts)` exportable ; top-level = `await startServer()`.
- [ ] **L1.2** Service statique `dist/web` + fallback SPA dans `Bun.serve` (else final).
- [ ] **L1.3** Script `start:prod` ; valider l'app **sans Vite** sur `:52817`.
- [ ] **L2.1** Introduire `resourcesRoot` / `dataRoot` dans `startServer`.
- [ ] **L2.2** Router `uploads` sur `dataRoot` (changer les 2 appelants : `routes.ts:374`, `index.ts:110`).
- [ ] **L2.3** Bootstrap `config.json` + **import dynamique** de `startServer` (piège ordre d'import).

**Wrapper Electrobun :**

- [ ] **L3.1** Scaffolding Electrobun + config build macOS.
- [ ] **L3.2** `main.ts` : bootstrap → PATH → import dynamique → serveur (in-process **ou sidecar** selon L0.3) → fenêtre.
- [ ] **L3.3** `bun build` de `worker.ts` + hooks en `.js` (deps inlinées) ; repointer `.mcp.json`/hooks.
- [ ] **L3.4** Embarquer `dist/web`, `templates/`, scripts buildés comme ressources.

**macOS :**

- [ ] **L4.1** Résolution PATH au boot (piège #1) — couvre tmux/claude/gh/git/cursor-agent.
- [ ] **L4.2** Onboarding si CLI externes absents (inclure **tmux**) + teardown tmux à la fermeture.
- [ ] **L4.3** (Optionnel) Signature/notarization (+ entitlements spawn de binaires non-signés).

## Pièges connus

- **DnD-kit sous WebKit** ⚠️ : Electrobun rend via WebKit (= moteur Safari). Régressions **ouvertes** en 2026 sur ce moteur : offset du drag overlay au coin haut-gauche ([dnd-kit #1910](https://github.com/clauderic/dnd-kit/issues/1910)), désync autoscroll ([#1825](https://github.com/clauderic/dnd-kit/issues/1825)). Le board n'a **aucun `touch-action: none`**. À tester **en premier** (L0.2). Filet : `touch-action: none` + drag handle, sinon **CEF/Chromium**.
- **Bun 1.3.0 requis** : Electrobun v1 ne tourne pas sous le 1.2.21 actuel (cf. prérequis). Faire L0.1 avant tout.
- **Deps des sous-process** : `worker.ts`/hooks ne se résolvent pas depuis un bundle read-only → `bun build` préalable (L3.3), ne pas embarquer le `.ts` brut.
- **`location.host` en mode app** : la fenêtre charge `http://localhost:52817` → `/ws` et `/api` same-origine résolvent correctement, **sans changement front**. ✅
- **Bundle read-only** : ne jamais écrire dans `resourcesRoot` en mode app (cf. lot 2).
- **Dev inchangé** : `bun dev` (Vite + proxy) reste le workflow de développement ; le service statique ne sert qu'en prod/app.
- **Double `Bun.serve`** : ne pas lancer à la fois le mode web (`bun start`) et l'app sur le même port 52817 → conflit.

## Évolutions multi-OS

Hors scope actuel, mais sans dette bloquante : Electrobun cible déjà Windows (WebView2) et Linux (WebKitGTK). Pour y aller plus tard, traiter (1) le rendu sur chaque moteur webview, (2) remplacer `osascript` par les notifications natives Electrobun, (3) la résolution PATH par OS, (4) le pré-build worker/hooks par plateforme.

## Questions ouvertes

1. **In-process vs sidecar** : le plan penche désormais **sidecar** (précédents Electrobun + worker thread non vérifié) — à confirmer par le spike L0.3. OK pour partir sidecar par défaut ?
2. **Rendu WebKit vs CEF** : on tente WebKit (bundle ~12 MB) et on bascule CEF seulement si le DnD casse (L0.2) — OK, ou tu veux CEF d'emblée pour sécuriser le rendu ?
3. **`dataRoot`** : `~/Library/Application Support/kanban-agents` convient, ou garder les données à la racine repo même en mode app (dev perso) ?
4. **Signature Apple** dans le scope v1, ou clic-droit→Ouvrir suffit pour l'instant ?

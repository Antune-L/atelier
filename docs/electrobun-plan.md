# Plan : packager en app desktop avec Electrobun (macOS)

> Objectif : un exécutable macOS clic-and-go, **sans toucher au front**, et qui permet de lancer indifféremment la **version web** (onglet navigateur) ou la **version app** (fenêtre native) **sans aucune différence** de comportement.
>
> Cible actuelle : **macOS uniquement**. Windows/Linux hors scope (voir [Évolutions](#évolutions-multi-os)).
>
> _Révisé juin 2026 — refs `file:line` re-vérifiées + **passe de validation empirique** (DnD WebKit, PATH, Bun 1.3, in-process). Voir [Validé empiriquement](#validé-empiriquement-juin-2026)._

## Pourquoi Electrobun (et pas Electron)

Le backend est 100 % Bun (`bun:sqlite`, `Bun.serve`, `Bun.spawn`, `Bun.file/Glob/which`, shell `$`). Electrobun **tourne sur Bun** → tout le backend reste valide, zéro réécriture Bun→Node. Webview système (WebKit) → binaire minuscule (~12 MB).

**Avantage théorique vs Electron/Tauri** : Electrobun embarque un **CEF (Chromium) optionnel** (v125) en plus du WebKit système. C'était le filet anti-régression-DnD. ✅ **Mais le test empirique (juin 2026) montre 0 régression DnD sous WebKit** (cf. validation) → **CEF non nécessaire**, on garde WebKit. Le filet reste disponible si un futur composant casse sous WebKit.

### Statut Electrobun (juin 2026)

- **v1 sortie le 6 fév. 2026**, série v1.18.x livrée en mai–juin 2026 (cadence active). « Production-ready » revendiqué pour **outils internes / utilitaires dev** = pile notre catégorie.
- ⚠️ **Jeune, mono-éditeur** (Blackboard), doc parfois désynchronisée de l'implémentation, marketplace de plugins prévue Q3 2026. Sur un edge case WebKit, on est seul.
- ⚠️ **Electrobun 2.0 en réécriture Rust** (runtime « cottontail »), **découplé de Bun** (annoncé par le créateur sur HN, ~mai 2026). Risque stratégique moyen terme : notre avantage « 100 % Bun » pourrait s'éroder en v2 → garder la logique backend modulaire.

### Validé empiriquement (juin 2026)

| Point | Méthode | Résultat |
|---|---|---|
| **Bun 1.3** (prérequis Electrobun) | upgrade → 1.3.14, `typecheck`, smoke runtime | ✅ typecheck OK ; boot + `Bun.serve` + `bun:sqlite` OK, 0 erreur. `@types/bun` aligné (1.3.14) |
| **DnD sous WebKit** | Playwright **WebKit 26.4** (= moteur Safari) vs **Chromium 148**, board réel en dry-run | ✅ rendu parfait ; carte suit le curseur (transforms **pixel-identiques**) ; un drag a persisté ; **0 erreur** ; **delta WebKit/Chromium = 0** → pas la régression dnd-kit redoutée (le board n'utilise pas `DragOverlay`) |
| **PATH apps GUI** (le piège #1) | `env -i` (simule launchd) + login shell | ✅ env vidé → aucun CLI ; `zsh -ilc` récupère **tous** les binaires (tmux/claude/gh/cursor-agent) |
| **`process.execPath` réutilisable** | recherche code/docs Electrobun | ✅ Electrobun bundle un **bun STOCK** à `/Contents/MacOS/bun` (pas un `--compile`) → réutilisable pour spawn le worker via `process.argv0` |

**Reste à prouver** (nécessite un build packagé) : `Bun.serve` **in-process** dans une app Electrobun (aucun précédent — voir Architecture + L0.3).

## Principe directeur : same-origin = zéro changement front

Le front utilise **uniquement des chemins relatifs** :

- API : `fetch("/api/…")` (`src/web/src/lib/api.ts:18`, upload `:63`)
- WebSocket : `` `${proto}://${location.host}/ws` `` (`src/web/src/lib/store.ts:4`)

Vérifié : un `grep import.meta.env|VITE_|http://|localhost|process.env` sur `src/web/src/` ne renvoie **aucun** hit. Donc **tant que l'UI est servie sur la même origine que le backend**, le front marche tel quel. La clé du plan :

> **Servir l'UI buildée (`dist/web`) depuis `Bun.serve`** et **charger la fenêtre sur `http://localhost:52817`**.

⚠️ **Ne PAS utiliser le protocole idiomatique `views://` d'Electrobun** pour charger l'UI : ça mettrait l'UI sur l'origine `views://` et casserait le same-origin (`/api` et `/ws` deviendraient cross-origin). On charge délibérément via `http://localhost` (notre `Bun.serve`) — Electrobun accepte une `url` http dans `BrowserWindow` (le starter officiel charge déjà un Vite sur `localhost`).

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

**In-process vs sidecar — penche désormais in-process (de-risqué).** Electrobun exécute ton code dans un **Bun Worker thread** (main thread = boucle GUI native via FFI) et **spawn lui-même des sous-process** (`spawn(process.argv0, …)`). Comme le runtime bundlé est un **bun stock** (`/Contents/MacOS/bun`), `process.argv0` est réutilisable → le spawn des workers (`bunPath`, `src/server/index.ts:32`, injecté dans `.mcp.json` `slotTemplates.ts:78`) **fonctionnera**. Le **seul** inconnu restant :

> ⚠️ **Aucun précédent public de `Bun.serve` in-process** dans une app Electrobun (les apps servent l'UI via `views://` ou un Vite ; un exemple tiers met même son backend en **sidecar**). `Bun.serve` n'est pas bloqué (API Bun standard, dispo dans le Worker), juste jamais démontré → **à valider sur un build packagé (L0.3)**. Repli si KO : **sidecar** (`Bun.spawn` du serveur sur un port libre), qui isole aussi les crashs.

⚠️ **`bunPath` en mode app** : utiliser **`process.argv0`** (convention Electrobun) plutôt que `process.execPath` ; les deux devraient pointer `/Contents/MacOS/bun`, à confirmer au spike.

Indépendamment : le **spawn du worker** (`<bunPath> worker.js`, déclenché par *claude* via `.mcp.json`, **pas** par notre backend) est une chaîne séparée → voir Lot 3 (worker pré-buildé).

## Lot 1 — Backend : servir l'UI buildée (partagé web + app)

Bénéficie aussi au déploiement web (qui n'a aujourd'hui pas de service statique de prod, cf. `portability.md`).

1. **Refactor `src/server/index.ts`** : extraire la séquence de boot (création db/store/hubs/slotManager + `Bun.serve`) dans une fonction exportable `startServer(opts?): Promise<{ port: number; stop(): void }>`. Le top-level actuel devient `await startServer()` (mode web inchangé).
2. **Ajouter le service statique** dans le `fetch` de `Bun.serve`, en **dernier fallback** (après `/ws`, `/workers`, `/uploads/*`, et après `app.handle`) :
   - GET d'un chemin non-API → `Bun.file(join(webDist, pathname))` ; si absent → `dist/web/index.html` (fallback SPA).
   - `webDist = join(resourcesRoot, "dist", "web")`.
   - ⚠️ Ne pas court-circuiter `/api`, `/health`, `/ws`, `/workers`, `/uploads/*` : le static est le **else** final.
3. **`build:web`** existe déjà. Ajouter un script `start:prod` = `build:web` puis `bun start`.

> Test de validation lot 1 : `bun run build:web && bun start`, ouvrir `http://localhost:52817` dans **Safari** → l'app doit fonctionner **sans Vite** (DnD ✅ déjà validé sous WebKit, WS temps réel, uploads).

## Lot 2 — Séparer ressources (read-only) et données (writable)

Un `.app` packagé est **read-only** : tout ce qui s'écrit doit sortir du bundle. Aujourd'hui tout est rooté sur un unique `PROJECT_ROOT` (`src/server/config.ts:18`, `src/server/index.ts:26`).

| Racine | Contenu | Mode web (défaut) | Mode app |
|---|---|---|---|
| **`resourcesRoot`** (read-only) | `dist/web`, `worker.js`, hooks buildés, `templates/run_composer.sh` | racine repo | `<bundle>/Resources` |
| **`dataRoot`** (writable) | `kanban.db`, `uploads/`, `config.json`, `slots/` | racine repo | `~/Library/Application Support/kanban-agents` |

État du câblage existant (presque tout déjà surchargeable) :

- **DB** : `KANBAN_DB` env ✅ (`src/server/index.ts:29`)
- **config.json** : `KANBAN_CONFIG` env ✅ (`src/server/config.ts:62`)
- **slots** : clé `slotsRoot`, chemin absolu accepté ✅ (`src/server/config.ts:57,97`)
- **uploads** : `saveUpload`/`serveUpload` prennent déjà `projectRoot` en **argument** (`src/server/uploads.ts:36,48`). **Seul point à modifier : les 2 appelants** → leur passer `dataRoot` (`src/server/routes.ts:374`, `src/server/index.ts:110`).
- **templates/worker** : `resolveTemplatePaths(projectRoot)` (`src/server/agents/slotTemplates.ts:122`) → pointer sur `resourcesRoot`.

`startServer(opts)` accepte `{ resourcesRoot, dataRoot }` (défaut = `PROJECT_ROOT`). Le mode app passe les deux + les env calés sur `dataRoot`.

> ⚠️ **Bootstrap + ordre d'import (piège subtil).** `config = loadConfig()` est un **const top-level** (`src/server/config.ts:89`) évalué **à l'import**, qui **throw si le fichier manque** (`config.ts:70`). Les imports ES sont hoistés **avant** le corps de `main.ts` → un `import { startServer }` statique crashe **avant** le bootstrap. Fix : dans `main.ts`, (1) copier `config.example.json` → `<dataRoot>/config.json` si absent, (2) poser `process.env.KANBAN_CONFIG`/`KANBAN_DB`, **puis** (3) `const { startServer } = await import(...)` (import **dynamique**).

## Lot 3 — Le wrapper Electrobun

1. **Scaffolding** : `bun add -d electrobun`, init du projet (dossier `desktop/`), config `electrobun.config.ts` (appId, nom, icône, build macOS, WebKit).
2. **Main process** (`desktop/main.ts`) :
   ```
   // 1. bootstrap config + env AVANT tout import du serveur (cf. Lot 2)
   ensureConfig(dataRoot); process.env.KANBAN_CONFIG = ...; process.env.KANBAN_DB = ...
   process.env.PATH = await repairPath()        // cf. Lot 4 (piège #1, ✅ validé)
   // 2. import DYNAMIQUE (sinon loadConfig throw à l'import)
   const { startServer } = await import("../src/server/index.ts")
   const { port } = await startServer({ resourcesRoot, dataRoot })   // ou sidecar si L0.3 KO
   // 3. attendre /health OK, puis :
   new BrowserWindow({ url: `http://localhost:${port}` })            // http://, PAS views://
   ```
   - À la fermeture : `stop()` le serveur **et** tuer les sessions tmux détachées (sinon fuite de process `claude`, cf. Lot 4).
3. **Ressources à embarquer** : `dist/web/`, `templates/run_composer.sh`, et les **entrypoints de sous-process pré-buildés** (point 4).
4. ⚠️ **Pré-builder worker + hooks (sinon deps non résolues).** `worker/worker.ts`, `templates/preToolUse.ts`, `templates/stopHook.ts` importent `@modelcontextprotocol/sdk`, `zod` — dans un bundle **read-only sans `node_modules`**, `bun <script.ts>` échouera à résoudre les imports. Avant packaging : `bun build worker/worker.ts --target=bun --outfile worker.js` (deps inlinées), idem hooks ; pointer `.mcp.json`/hooks (`slotTemplates.ts:78,109,114`) sur les `.js`. Le bun bundlé étant **stock**, il exécute ces `.js` sans souci. (Alternative : `bun build --compile` en binaires autonomes, ~90 MB/binaire.)

## Lot 4 — Spécificités macOS à régler

1. **PATH des apps GUI** ⚠️ (piège majeur) — ✅ **fix validé (juin 2026)** : une app Finder n'hérite pas du PATH shell → `Bun.which(...)` (`real.ts:418`) et les spawns (`tmux`, `claude`, `gh`, `git`, `cursor-agent`) échouent. Fix prouvé : reconstruire le PATH **une fois au boot** via `zsh -ilc 'echo $PATH'` et l'écrire dans `process.env.PATH`. ✅ Aucun changement par-spawn : `spawnSession` ne passe que 4 `-e` à tmux (`real.ts:183`), les `Bun.spawn` n'ont pas d'`env:` → **tout hérite de `process.env`**.
2. **Notifications** : `osascript` (`real.ts:351`) fonctionne en mode app sur macOS → **on garde** (mono-OS).
3. **Binaires externes requis** : `tmux`, `claude`, `cursor-agent`, `gh`, `git` installés + authentifiés. ⚠️ **tmux** porte tout le cycle de vie agent (`real.ts:182-216`) — couvert par le fix #1, à lister dans l'onboarding. Vérifier la présence au boot (`checkComposerAvailable` existe) + onboarding si absent.
4. **Teardown tmux** ⚠️ : tmux crée un serveur détaché + état dans `/tmp` **hors bundle**. À la fermeture, tuer les sessions (`killSession`, `real.ts:205`) sinon les process `claude` fuient.
5. **Effet de bord `~/.claude.json`** : `seedTrustForSlots` écrit dans le `~/.claude.json` de l'utilisateur (`real.ts:113`) — mutation d'état global partagé avec son CLI, à documenter.
6. **Code signing + notarization** : la CLI Electrobun **auto-signe chaque binaire** de `/Contents/MacOS` + pose 3 entitlements (`allow-jit`, `allow-unsigned-executable-memory`, `disable-library-validation`). Un binaire **bundlé** passe la notarization. ⚠️ **Inconnu réel** : spawn d'un binaire **non-signé résolu via PATH** (notre cas : `claude`/`tmux` homebrew) sous hardened runtime — **pas de précédent**, à tester (L0.3). Pour usage perso : différer (clic-droit → Ouvrir).

## Checklist d'exécution

**Spikes (dé-risquer AVANT de packager) :**

- [x] **L0.1** ✅ Bun → **1.3.14** ; `typecheck` OK ; smoke runtime (boot + `Bun.serve` + `bun:sqlite`) OK.
- [x] **L0.2** ✅ **DnD validé sous WebKit 26.4** (parité Chromium 148, 0 erreur, rendu parfait).
- [ ] **L0.3** ⏳ **LE spike restant** — sur une app Electrobun **buildée + notarisée** (le dev mode ne révèle pas les blocages hardened-runtime), confirmer en un run : (a) `Bun.serve({port:0})` bind et sert depuis le Worker thread ; (b) `Bun.spawn` de `tmux`/`claude` (bundlé **et** résolu via PATH) non bloqué par Gatekeeper ; (c) `process.argv0` → `/Contents/MacOS/bun`.

**Backend (partagé web + app) :**

- [ ] **L1.1** Refactor `index.ts` → `startServer(opts)` exportable.
- [ ] **L1.2** Service statique `dist/web` + fallback SPA (else final).
- [ ] **L1.3** Script `start:prod` ; valider l'app **sans Vite** sur `:52817`.
- [ ] **L2.1** Introduire `resourcesRoot` / `dataRoot` dans `startServer`.
- [ ] **L2.2** Router `uploads` sur `dataRoot` (2 appelants : `routes.ts:374`, `index.ts:110`).
- [ ] **L2.3** Bootstrap `config.json` + **import dynamique** de `startServer`.

**Wrapper Electrobun :**

- [ ] **L3.1** Scaffolding Electrobun + config build macOS.
- [ ] **L3.2** `main.ts` : bootstrap → PATH → import dynamique → serveur (in-process, repli sidecar) → fenêtre `http://localhost`.
- [ ] **L3.3** `bun build` de `worker.ts` + hooks en `.js` ; repointer `.mcp.json`/hooks ; utiliser `process.argv0`.
- [ ] **L3.4** Embarquer `dist/web`, `templates/`, scripts buildés comme ressources.

**macOS :**

- [x] **L4.1** ✅ Résolution PATH au boot (`zsh -ilc`) — validée empiriquement.
- [ ] **L4.2** Onboarding si CLI absents (inclure **tmux**) + teardown tmux à la fermeture.
- [ ] **L4.3** (Optionnel) Signature/notarization + tester spawn de binaires PATH non-signés.

## Pièges connus

- **DnD-kit sous WebKit** — ✅ **validé juin 2026** : WebKit 26.4 = **parité totale** avec Chromium, 0 régression (le board n'utilise pas `DragOverlay`, cible des bugs Safari [#1910](https://github.com/clauderic/dnd-kit/issues/1910)). CEF **non nécessaire**.
- **Bun 1.3.0 requis** — ✅ **fait** (1.3.14, typecheck + smoke OK).
- **`Bun.serve` in-process** ⚠️ : aucun précédent Electrobun → **seul vrai inconnu**, valider sur build (L0.3).
- **Deps des sous-process** : `worker.ts`/hooks ne se résolvent pas depuis un bundle read-only → `bun build` préalable (L3.3).
- **Electrobun 2.0 / découplage Bun** ⚠️ : réécriture Rust annoncée — garder le backend modulaire.
- **`location.host` en mode app** : la fenêtre charge `http://localhost:52817` → `/ws` et `/api` same-origine ✅ (à condition de charger en `http://`, pas `views://`).
- **Bundle read-only** : ne jamais écrire dans `resourcesRoot` (cf. lot 2).
- **Dev inchangé** : `bun dev` (Vite + proxy) reste le workflow de dev.
- **Double `Bun.serve`** : ne pas lancer mode web (`bun start`) et app sur le même port 52817.

## Évolutions multi-OS

Hors scope actuel, sans dette bloquante : Electrobun cible Windows (WebView2) et Linux (WebKitGTK). Plus tard : (1) rendu par moteur webview, (2) remplacer `osascript` par les notifications natives Electrobun, (3) résolution PATH par OS, (4) pré-build worker/hooks par plateforme.

## Questions ouvertes

1. **In-process vs sidecar** : le plan penche **in-process** (bun stock + worker thread spawn déjà des sous-process) ; seul `Bun.serve` in-process reste à prouver (spike L0.3). OK pour partir in-process avec repli sidecar ?
2. ~~**WebKit vs CEF**~~ ✅ **résolu** : DnD validé sous WebKit → on reste WebKit, CEF inutile.
3. **`dataRoot`** : `~/Library/Application Support/kanban-agents` convient, ou garder les données à la racine repo même en mode app (dev perso) ?
4. **Signature Apple** dans le scope v1, ou clic-droit→Ouvrir suffit pour l'instant ?

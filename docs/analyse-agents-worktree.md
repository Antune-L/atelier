# Analyse des agents Claude spawnés en worktree

> Objectif : mesurer le comportement réel des sessions Claude que le backend spawn dans les slots (worktrees) pour implémenter/reviewer les tickets — ce qui marche, les erreurs de commandes, le coût en tokens et les axes d'amélioration.
>
> Date de l'analyse : **2026-06-13**. Source : journal d'événements `kanban-real.db` + **42 transcripts** de sessions sous `slots/slot-1…8` (dont **21 sessions d'agent spawné** détectées) + lecture du code d'orchestration.

## Sommaire
- [1. Mécanisme de spawn (rappel)](#1-mécanisme-de-spawn-rappel)
- [2. Vérité terrain](#2-vérité-terrain)
- [3. Ce qui a marché du premier coup](#3-ce-qui-a-marché-du-premier-coup)
- [4. Erreurs dans les commandes](#4-erreurs-dans-les-commandes)
- [5. Économies de tokens possibles](#5-économies-de-tokens-possibles)
- [6. Recommandations priorisées](#6-recommandations-priorisées)
- [Annexe — données brutes par session](#annexe--données-brutes-par-session)

---

## 1. Mécanisme de spawn (rappel)

Commande lancée par `RealSystemAdapter.spawnSession` (`src/server/system/real.ts:169`), dans un `tmux` dont le pane reste vivant 1 h après crash :

```
claude --model opus --effort xhigh --dangerously-load-development-channels server:worker --permission-mode auto
```

- **Modèles** (`config.json`) : implémentation `opus` + effort `xhigh` ; triage `sonnet`.
- **Contrat** : injecté via une notification de channel MCP (`buildTicketContract` / `buildReviewContract`).
- **Permissions** : allowlist Bash (`slotTemplates.ts`) + hook `PreToolUse` deny (`templates/preToolUse.ts`) + hook `Stop` qui POST au backend.
- **Pilotage** : l'agent appelle les tools MCP `worker` (`update_stage`, `ask_user`, `submit_prd`, `done`, `fail`).
- **Triage** préalable en lecture seule : `claude -p --model sonnet --output-format stream-json --allowedTools Read,Glob,Grep`.

---

## 2. Vérité terrain

**Le système fonctionne.** Sur **20 tickets** : **15 merged, 4 done, 1 en cours**. La gate `done` (worktree propre + branche poussée + PR existante) n'a quasi jamais rejeté à tort.

La friction n'est pas dans les échecs finaux mais dans les **re-runs** :

| Signal (events) | Valeur | Lecture |
|---|---|---|
| `created` | 20 | tickets |
| `session_spawned` | 28 | **+8 re-spawns** pour 20 tickets |
| `abandoned` | 9 | sessions nettoyées/relancées |
| `auto_nudge` | 6 | tours finis sans tool de protocole |
| `interrupted` | 2 | session tmux disparue |
| `failed` | 2 | `fail()` ou crash |
| `stalled` | 1 | 2 nudges → blocage |
| `auto_merge_failed` | 2 | merge auto refusé (PR non mergeable) |

**Volume tokens (21 sessions spawnées détectées)** : output **2,39 M**, input frais 857 k, cache_create 6,87 M, **cache_read 183,8 M** (96 % du contexte — le cache fonctionne, le levier est *moins de tours*, pas la config de cache). Le vrai total est plus élevé : certaines sessions re-spawnées sont classées « manuel » par la détection (ex. la review `wkYuMuhCZy` jouée 2× = ~460 k output).

---

## 3. Ce qui a marché du premier coup

Sessions **mono-spawn, `done` atteint, 0 nudge, 0 refus, ≤1 erreur bash, sans boucle `fixing` d'échec** :

| Ticket | Slot | Tours | Output | Effort | Note |
|---|---|---|---|---|---|
| `8YGPOSNMsx` (lien PR) | 1 | 48 | **17 k** | medium | le plus propre & le moins cher |
| `d1bF0Y1jie` (suppr. branche) | 4 | 56 | 26 k | medium | 0 erreur |
| `9NonQ0XGnp` (prd) | 1 | 56 | 25 k | medium | — |
| `PLGrzZQ83G` (review) | 5 | 73 | 36 k | medium | — |
| `Am4AO/TJ0Jw2L5hu` (conflit) | 2 | 66 | 60 k | défaut | 0 erreur |
| `_rGIiRW1gY` (prd après valid.) | 6 | 78 | 105 k | défaut | review passée au 1er tour |
| `QYJ-VWmY80` (faux positif PR) | 4 | 92 | 110 k | défaut | 0 erreur |

**Pattern gagnant** : ticket sur un repo que l'agent connaît (kanban-agents), périmètre net, **effort `medium`**, PRD désactivé, argus ne trouve rien → pas de boucle `fixing`. Beaucoup de sessions sont allées `implementing→reviewing→testing→opening_pr` **sans `fixing`** = review réussie au premier tour.

---

## 4. Erreurs dans les commandes

### 4a. 🔴 RTK mutilait les commandes git des agents — ✅ **RÉSOLU le 2026-06-13**

Le hook RTK global (`~/.claude/settings.json` → `~/.claude/hooks/rtk-rewrite.sh`) est **hérité par chaque session spawnée** (fusionné avec le `settings.json` du slot). Il réécrit `git …` → `rtk git …`. Avec l'ancienne version, le proxy `rtk git` **rejetait des flags standards** que Claude Code utilise par réflexe, et **corrompait les scripts shell multi-lignes** d'argus :

| Flag / pattern | Occurrences | Symptôme |
|---|---|---|
| `git --no-pager diff` | 18 | `unexpected argument '--no-pager'` |
| `git log -n N` | 8 | `unexpected argument '-n'` |
| `git -C <path>` | 4 | `unexpected argument '-C'` |
| `git commit -q` | 2 | `unexpected argument '-q'` |
| scripts argus `$(mktemp)`/`$(cat)` | — | `parse error … ar/folde` (chemin `/var/folders` corrompu) |

**Impact** : **12 des 21 sessions** touchées. Chaque échec = 1 tool call perdu + re-raisonnement + retry. Les sessions de review (argus) étaient les plus affectées.

**Correctif (RTK 0.42.4)** — vérifié en rejouant les 5 patterns à l'identique, **5/5 passent** :
1. Le binaire `rtk` 0.42.4 **accepte désormais** `--no-pager`, `-C`, `-q`, `-n`.
2. Le hook **ne réécrit plus** les commandes complexes (heredocs `<<`, substitutions `$(…)`, assignations) — elles partent en bash brut → plus de corruption.

Le fix est **global** (binaire + hook `~/.claude/`) : tous les futurs agents en bénéficient sans modif côté `slots/` ou code. RTK reste actif et économise toujours (`rtk gain` : 50,6 M tokens / 21,6 %).

> ⚠️ `rtk gain` signale *« Hook outdated — run `rtk init -g` to update »* : le binaire est à jour mais le script de hook est ancien. Ça marche, mais `rtk init -g` aligne les deux (recommandé).

### 4b. Le hook deny `rm -rf` bloque le nettoyage d'argus — *ouvert*

Le pattern `/\brm\s+-rf\b/` (`templates/preToolUse.ts:10`) bloque **tout** `rm -rf`, y compris `rm -rf $TMPDIR/argus.XXX` (argus nettoyant son propre scratch). 3 refus observés → tour perdu + temp non nettoyés.

### 4c. Le classifieur `--permission-mode auto` bloque les sondes `gh api` — *ouvert*

`slot-2` : `gh api repos/Antune-L/atelier` refusé (« probing access to an unrelated repo »). L'agent sondait un repo **non lié** au ticket. 2 refus.

### 4d. Erreurs d'environnement / chemins — *ouvert*

- `exit code 255` (`FPsRGrqRgA`) — crash claude/git opaque, non diagnostiquable (pane tué).
- `ENOENT … slots/slot-4/node_modules` (`8YGPOSNMsx`) — race install/worktree.
- Chemins doublés `apps/frontend/apps/frontend/` et confusion `apps/front` vs `apps/frontend` sur le repo `crossed-words` (monorepo husky/oxlint/prettier que l'agent a dû redécouvrir).

---

## 5. Économies de tokens possibles

| Levier | Gaspillage observé | Gain estimé |
|---|---|---|
| **Re-spawns** | review `wkYuMuhCZy` jouée 2× = **460 k** ; `FPsRGrqRgA` 5 tentatives ; `-InrTBXqQu` ~383 k sur 3 sessions | ~0,7–1 M output dupliqué |
| **Effort surdimensionné** | `medium` ≈ 26 k vs `xhigh`/`opus` ≈ 100–160 k à complexité comparable | **4–5×** sur tickets simples |
| **Reviews aussi chères que des features** | `KBn1C` 166 k, `wkYuMuhCZy` 258 k — argus full fan-out (37 `Agent`, 30 `ToolSearch`) | 30–50 % via depth `light` réel / reviewers `sonnet` |
| **Traîne `cache_read`** | `-InrTBXqQu` : 245 tours → **42 M cache_read** (contexte re-lu à chaque tour) | scinder PRD ↔ implémentation |
| **Nudges / erreurs parasites** | 6 nudges + ~36 commandes rtk échouées (cf. 4a, désormais résolu) | tours évités |

---

## 6. Recommandations priorisées

**P0 — ✅ Neutraliser RTK dans les slots.** Fait via RTK 0.42.4 (cf. 4a). Reste : `rtk init -g` pour aligner le hook.

**P0 — Dimensionner effort/modèle via le triage.** Le triage `sonnet` tourne déjà (`triage.ts`) mais ne renvoie qu'un verdict de faisabilité. Étendre son JSON avec `complexity`/`suggested_effort` → router les tickets simples vers `sonnet`+`medium` au lieu de `opus`+`xhigh` par défaut (`config.json`).

**P1 — Heartbeat pour reviews & phases longues.** Le contrat impose déjà un heartbeat `update_stage` toutes les ~3 min pour Composer (`contract.ts:31`) mais **pas pour argus ni l'implémentation longue**. L'étendre, ou rendre le nudge conscient qu'un sous-agent `Agent` tourne (ne pas nudger pendant un fan-out).

**P1 — Assouplir le nudge.** `AUTO_NUDGE_MAX = 1` (`src/shared/constants.ts:133`) → `stalled` après 2 tours « silencieux », trop nerveux. Passer à 2–3, et/ou conditionner à l'âge réel de `lastProgressAt` plutôt qu'à la simple fin de tour.

**P2 — Affiner le deny `rm -rf`** pour autoriser le scratch `$TMPDIR/argus.*` (`templates/preToolUse.ts`). **Dire aux agents review** de ne pas sonder de repos tiers via `gh api` (utiliser `gh pr diff` qui cible la PR).

**P2 — Remplir `instructions` par projet.** `fftir` l'utilise (consigne `--no-verify`) ; `crossed-words`/`sofrapa` l'ont vide → l'agent redécouvre husky/oxlint/prettier à chaque fois. Pré-câbler lint/test/commit par projet (`config.json`).

**P2 — Capturer le tail du pane mort** dans `error` sur `exit 255` (le pane vit déjà 1 h, `real.ts:172`) pour rendre les échecs diagnostiquables.

**P3 — Scinder PRD/plan et implémentation** en sessions séparées (contexte frais) pour couper la traîne `cache_read` des gros tickets (245 tours).

---

## Annexe — données brutes par session

`done/fail` = a appelé le tool de protocole correspondant ; `stages` = transitions `update_stage` observées.

| Slot | Ticket (branche) | Tours | Output | cacheRd | Bash | Err | Deny | Nudge | Fin | Stages |
|---|---|---|---|---|---|---|---|---|---|---|
| 4 | `-InrTBXqQu` nouvelle-feature | 245 | 319,7 k | 42,3 M | 19 | 0 | 0 | 1 | done | planning→implementing→reviewing→fixing→testing→opening_pr |
| 3 | `wkYuMuhCZy` review-pr-122 | 98 | 258,9 k | 9,8 M | 25 | 4 | 1 | 0 | done | reviewing |
| 7 | `UTTJzoZxd4` enhancement-prd | 104 | 182,6 k | 10,2 M | 12 | 1 | 0 | 1 | — | planning→implementing→reviewing |
| 1 | `KBn1C-58o1` review-pr-121 | 65 | 166,8 k | 4,9 M | 15 | 2 | 1 | 0 | done | reviewing |
| 1 | `7Iy_jCPdbb` slot | 161 | 162,7 k | 17,9 M | 21 | 1 | 0 | 0 | done | implementing→reviewing→fixing→testing→opening_pr |
| 2 | `F3_7H4t9lK` probleme-argus | 103 | 157,2 k | 10,0 M | 15 | 1 | 0 | 0 | done | implementing→reviewing→fixing→testing |
| 1 | `FPsRGrqRgA` note-de-patch | 93 | 136,0 k | 5,6 M | 24 | 4 | 0 | 0 | — | implementing→reviewing→testing |
| 5 | `6nmuFQq5Wf` agent-implem | 171 | 132,1 k | 16,1 M | 31 | 2 | 0 | 0 | done | implementing→reviewing→fixing→testing→opening_pr |
| 3 | `_-AIEqetqe` au-sein-carte | 121 | 131,1 k | 11,3 M | 18 | 1 | 0 | 0 | done | implementing→reviewing→fixing→reviewing→testing→opening_pr |
| 1 | `mfSFGWY6vU` si-le-ticket | 119 | 126,9 k | 11,3 M | 26 | 2 | 0 | 0 | done | implementing→reviewing→testing→opening_pr |
| 4 | `QYJ-VWmY80` faux-positif | 92 | 109,7 k | 6,0 M | 20 | 0 | 0 | 0 | done | implementing→reviewing→fixing→testing→opening_pr |
| 6 | `_rGIiRW1gY` prd-apres-valid | 78 | 105,1 k | 5,8 M | 13 | 0 | 0 | 0 | done | implementing→reviewing→testing→opening_pr |
| 2 | `b0Zscbs95s` dans-todo | 106 | 76,3 k | 6,3 M | 24 | 3 | 0 | 0 | done | implementing→reviewing→testing→opening_pr |
| 1 | `xjKvZE82e1` probleme-serveur | 115 | 74,5 k | 5,9 M | 28 | 2 | 0 | 0 | done | implementing→reviewing→testing→opening_pr |
| 8 | `gTS8X8sNLV` visuel-des-slots | 76 | 66,8 k | 4,0 M | 22 | 1 | 0 | 0 | done | implementing→reviewing→fixing→testing→opening_pr |
| 2 | `Am4AO-vrm9` conflit | 66 | 60,1 k | 3,0 M | 18 | 0 | 0 | 0 | done | implementing→reviewing→testing→opening_pr |
| 5 | `PLGrzZQ83G` review | 73 | 36,2 k | 3,8 M | 21 | 0 | 1 | 0 | done | implementing→reviewing→fixing→testing→opening_pr |
| 4 | `d1bF0Y1jie` suppr-branche | 56 | 26,2 k | 2,4 M | 10 | 0 | 0 | 0 | done | implementing→reviewing→testing→opening_pr |
| 1 | `9NonQ0XGnp` prd | 56 | 25,1 k | 2,6 M | 13 | 1 | 0 | 0 | done | implementing→reviewing→testing→opening_pr |
| 1 | `8YGPOSNMsx` lien-pr | 48 | 17,2 k | 1,9 M | 15 | 0 | 0 | 0 | done | implementing→reviewing→testing→opening_pr |

**Usage des outils (agrégat sessions spawnées)** : `Bash` 416 · `Read` 209 · `Edit` 206 · `update_stage` 87 · `Agent` 37 · `ToolSearch` 30 · `done` 20 · `Write` 12 · `Skill` 8 · `submit_prd` 2 · `ask_user` 1.

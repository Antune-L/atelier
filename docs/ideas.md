# Idées

## TODO

### BACKLOG :

- Pouvoir exporter une colonne Kanban (Notion / Trello) côté utilisateur et l'importer dans l'outil, afin de vérifier que chaque ticket est implémentable comme ça sans inventer, sans supposer ou qu'il faut retravailler -> Réutiliser ce qu'on a fait au niveau de l'analyse
- Pouvoir importer des cartes
- L'analyse doit pouvoir être configuré afin d'utiliser Composer 2.5 via CLI Cursor (Option pour choisir Sonnet ou Composer)
- Quid si y'a plusieurs questions c'est quoi l'UI ?
- Au sein d'une carte, on devrait pouvoir changer le statut, c'est à dire si elle est dans TODO, la mettre dans à implémenter etc...
- Quand on appuie sur le bouton pour copier le nom du slot, y'a pas de toast pour dire que c'est bien copié.
  - Est-ce que c'est possible d'ouvrir directement le terminal ? Ou c'est bloqué par le navigateur ? (ça serait top de pouvoir ouvrir le terminal directement depuis l'interface)
- Si le ticket failed, le mettre directement dans la bonne colonne.
- Lorsque je clique la notification, ça doit focus sur le navigateur.
- Après implémentation du PRD : envoyer un message (via Slack, Email, à voir) qui contient le contenu du PRD afin d'avoir une sauvegarde du plan
- PRD : envoyer toutes les questions ou 10 par 10
- Dans TODO: ajouter un + à côté du nombre de ticket pour ajouter un nouveau ticket
- Avoir un menu actions avec plusieurs boutons "généraux"
  - Avoir un bouton qui envoie un agent avec un skill très précis qui analyse les dernières utilisations des différents skills afin de les améliorer et les rendre plus performants. ie argus : regarder les dernières PRs et les résultats.

#### NICE TO HAVE

- Migration en application Electron

## DONE

- (DONE) Ports atypiques pour éviter les conflits → backend `52817` (`DEFAULT_PORT`), frontend Vite `52818` (`DEV_PORT`), proxy `/api` + `/ws` câblés
- (DONE) Timestamp dans les commentaires → `formatDateTime(createdAt)` affiché dans l'en-tête de chaque commentaire (`CommentRow`)
- (DONE) Favicon en lien avec le projet → `src/web/public/favicon.svg` (kanban dans la palette Atelier), lié dans `index.html`
- (DONE) Ajouter le projet kanban-agents dans l'outil → entrée `kanban-agents` dans `config.json` (dogfooding sur `main`)
  - (DONE) Option « PR en draft » (cochée par défaut, par ticket) → colonne `pr_draft` (+ migration), le contrat choisit `gh pr create --draft` vs `gh pr create`
  - (DONE) Option « merge auto de la PR » (par ticket) → colonne `auto_merge` (+ migration) ; après la gate `done`, le backend fait `gh pr ready` + `gh pr merge --rebase` (`SystemAdapter.mergePr`), carte → « PR mergée ». Le merge auto force la PR non-draft
- (DONE) PRD en format HTML, lisible sur l'interface
- (DONE) Augmenter le nombre de slot → 5, configurable via KANBAN_SLOTS
- (DONE) Faire un skill ou autre qui détermine si un ticket est implémentable ou pas, et qui explique pourquoi (sans inventer, sans supposer, sans retravailler) → bouton « Analyser » sur la carte (claude -p sonnet read-only, verdict implémentable / questions / à retravailler)
- (DONE) Faire une interface moins sombre, utiliser la palette https://coolors.co/palette/001219-005f73-0a9396-94d2bd-e9d8a6-ee9b00-ca6702-bb3e03-ae2012-9b2226
- (DONE) Echap ne permet pas de fermer la carte
- (DONE) A quoi sert les tags ? → tags retirés ; les liens Figma sont auto-détectés dans la description (badge UI + comparaison maquette dans le contrat)
- (DONE) Pouvoir chercher un ticket
- (DONE) Pouvoir supprimer un ticket ?
- (DONE) Pouvoir coller des images ou des vidéos dans la description, si c'est trop compliqué, mettre le chemin vers le fichier quand on colle au moins
- (DONE) Eviter d'utiliser les Checkbox mais plutot Switch
- (DONE) Rendre plus propre les mots "agent" et "user" dans l'interface, c'est pas très clair
- (DONE) Est-ce qu'on peut faire une option pour pouvoir interagir directement avec le terminall lié à une feature ? → vue read-only (tmux capture-pane) ; terminal interactif embarqué = plus tard
- (DONE) Si l'utilisateur envoie un commentaire, le message doit être remonté dans la session Claude Code correspondante → événement user_comment via le channel MCP (tickets démarrés uniquement ; commentaires bloqués en TODO)
- (DONE) Pouvoir modifier un ticket après l'analyse de faisabilité → bouton « Modifier » (titre + description, tant que le ticket n'est pas en traitement) ; modifier le texte invalide le verdict de triage
- (DONE) Renommer le site avec un nom plus parlant que "Kanban Agents" → « Atelier » (titre + en-tête)
- (DONE) Sortir les variables de config du code (shared / rows db) → `config.json` (gitignoré) + `config.example.json`, chargé et validé par zod au boot (`src/server/config.ts`) ; `shared/projects.ts` supprimé. Infra (PORT/DB/WS) reste en env
- (DONE) Preview de l'analyse en cours → triage en streaming (`--output-format stream-json`) affiché dans un terminal live (lecture seule) dans le drawer
- (DONE) "(en attente de sortie…)" trop vague au lancement → phases du cycle de vie remontées (worktree → install → spawn → attente agent), l'endpoint terminal renvoie `{ output, phase }` (plus de 409 pendant le setup)
- (DONE) Logs côté backend → logger scopé/horodaté/coloré (`src/server/logger.ts`), niveau via `KANBAN_LOG`, câblé sur slot/coordinator/triage/watchdog/boot
- (DONE) Animation + élargissement du drawer de détail → `modal.tsx` slide-in/out + fade, `max-w-xl` → `max-w-4xl`
- (DONE) Terminal du détail trop à l'étroit (scrolling) → terminal `max-h-72` → `60vh` + bouton plein écran (lié à l'élargissement du drawer)
- (DONE) Spawn du Claude en mode auto pour éviter les prompts de permission → `--permission-mode auto` (classifieur)
- (DONE) Datetime de fin sur erreur / implémentation → colonne `finished_at` (+ migration), affichée dans le détail (« Terminé / Échec le … »)
- (DONE) Choisir le modèle + l'effort de l'agent qui orchestre → sélecteur par ticket (colonne TODO), stocké en DB (`model`/`effort` + migration), lu au spawn (`claude --model … --effort …`) au lancement et au retry ; `null` = défaut `config.json`. Fast mode écarté (pas de flag CLI ; `--model` opus/sonnet/haiku + `--effort` low→max)
- (DONE) Colonne « PR mergée » repliable → nouvelle colonne `merged` (le bouton « PR mergée » y range la carte au lieu de l'archiver, elle reste visible), repli persistant (`localStorage`), repliée par défaut ; toutes les colonnes repliables (barre verticale étroite, reste cible de drop)
- (DONE) Drawer de suivi en pleine page, 2 colonnes → `Modal` `fullWidth`, infos à gauche / terminal à droite (`TerminalView` `fill` pleine hauteur), bouton masquer/afficher le terminal (persisté, infos centrées quand masqué) + bouton ✕ fermer (le clic sur le fond ne ferme plus en pleine largeur)
- (DONE) Pouvoir déléguer l'implémentation à Composer 2.5 (option qu'on pourrait choisir, genre combo)
- (DONE) Nouvelle tab qui permet de lancer argus en autonomie sur les PRs qui ont besoin de review
  - Pour Sofrapa ou FFTir pour l'instant. Les variables doivent être configurables dans un fichier de config assez facilement ou importés depuis un fichier d'env, à trancher.
  - Récupérer les PRs ouvertes sur GitHub via l'API ou CLI
  - Chaque review occupe un slot afin d'avoir un worktree et pouvoir faire l'analyse du code.
  - Pouvoir choisir ou non de mettre en light ou full
  - Mettre directement les commentaires sur GitHub via CLI
  - Choisir quel PR on veut reviewer
  - Voir la progression

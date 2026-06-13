# Portabilité & accès réseau

> Objectif : rendre le site utilisable depuis d'autres appareils **sans l'exposer à Internet**, en n'autorisant que **certains appareils** (données sensibles).

## Approche retenue : Tailscale

Réseau privé chiffré (overlay WireGuard) entre les appareils explicitement ajoutés.

- Autorisation **par appareil/identité**, pas par "qui est sur le WiFi". Un invité sur le WiFi sans Tailscale + approbation ne voit rien → plus robuste que le filtrage réseau.
- Être sur le même WiFi n'est plus requis (marche aussi depuis l'extérieur, chiffré). Tailscale = filtrage par appareil, pas par réseau physique.
- **Zéro exposition Internet** : rien d'ouvert publiquement, pas de port-forward sur la box, trafic chiffré bout-en-bout.

## État actuel (trous à boucher)

- **Backend Bun/Elysia** (`src/server/index.ts:89`) : `Bun.serve` sans `hostname` → écoute déjà sur `0.0.0.0` (joignable sur le LAN si le firewall autorise).
- **Vite** (`src/web/vite.config.ts:18`) : bind `localhost` seulement → pas joignable depuis un autre appareil sans `server.host`.
- **Aucune auth** + **CORS `*`** (`src/server/index.ts:84`) → quiconque atteint le serveur peut tout lire/écrire. Vrai problème pour données sensibles.

## Mise en place Tailscale

1. **Machine serveur** : installer Tailscale (`brew install --cask tailscale` ou l'app), `tailscale up`, connexion au compte.
2. **Chaque appareil autorisé** : installer l'app Tailscale, se connecter au **même compte** (ou invitation via partage). Nom stable type `ma-machine.<tailnet>.ts.net` (MagicDNS) + IP `100.x.x.x`.
3. **Accès** : via ce nom, ex. `https://ma-machine.<tailnet>.ts.net`.

### HTTPS (gratuit, sans warning)

`tailscale serve` met un proxy HTTPS devant l'app et fournit un **certificat valide** `*.ts.net` automatiquement.

- Faire pointer `tailscale serve` vers le serveur Bun (port 52817).
- HTTPS propre côté appareils, données chiffrées en transit, WebSockets supportés.
- ⚠️ **Piège** : `tailscale serve` = privé (tailnet seulement, ce qu'on veut). Ne **jamais** utiliser `tailscale funnel` → expose à l'Internet public.

### Verrouillage des appareils

- Admin console → activer **Device approval** : tout nouvel appareil doit être approuvé manuellement.
- Optionnel : **ACLs** pour limiter quels appareils joignent quel port.
- Plan personnel gratuit : ~100 appareils / 3 utilisateurs → suffisant.

## Changements app nécessaires (le vrai travail technique)

Tailscale gère réseau/chiffrement/auth-appareil, mais l'archi **2 ports en dev** (Vite 52818 + Bun 52817) ne se met pas proprement derrière un seul proxy HTTPS.

1. **Servir le front buildé depuis le serveur Bun** (`build:web` → statique servi par Bun) → une seule origine derrière `tailscale serve`. **Changement principal** et prérequis au reste. (Alternative dev-only : `server.host: true` + `allowedHosts` incluant le nom `.ts.net`, mais 1 seul port est plus propre.)
2. **Resserrer le CORS** : remplacer `access-control-allow-origin: *` (`src/server/index.ts:84`) par l'origine `.ts.net` connue.
3. Vérifier chemins **relatifs** front (`/api`, `/ws`) → déjà le cas via proxy Vite, marchera derrière une origine unique.
4. Optionnel (conseillé données sensibles) : couche d'identité applicative via les en-têtes exposés par `tailscale serve` (quel utilisateur/appareil) → audit "qui a fait quoi".

## Questions ouvertes

- Tous les appareils peuvent-ils installer Tailscale (pas de device managé/verrouillé) ?
- Strictement-LAN en plus, ou l'accès par appareil Tailscale (même hors WiFi) convient ?

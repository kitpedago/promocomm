# Déploiement en production

Décision du 2026-09-08 (spec : `docs/superpowers/specs/2026-09-08-deploiement-client-design.md`).

## Cible

PC du client, partition Debian avec Docker. Consignes client : tout conteneurisé,
volumes nommés dans `/var/lib/docker/volumes/` (partition dédiée sdb1, Veeam),
espace de travail `/opt/docker/`. Accès utilisateurs en HTTP sur le LAN
(`http://<ip-du-pc>:3020`). Sauvegardes assurées par le client.

## Principe

Image pré-construite, jamais de build ni de source chez le client.

- PC dev : `.\scripts\release.ps1` construit l'image depuis le `Dockerfile` et la
  pousse sur le registry Gitea du VPS (`git.gd.solutions/gducos/promocomm`,
  tags `latest` + sha court). Prérequis une fois : `docker login git.gd.solutions`
  avec un jeton `write:package`.
- Client : `/opt/docker/promocomm/` = `deploy/docker-compose.yml` + `.env` +
  `update.sh`. Installation et mise à jour décrites dans `deploy/README.md`.
  Jeton Gitea `read:package` pour `docker login`.

## Données initiales

Dump `pg_dump -Fc` de la base dev (issue de l'import du `.bak` legacy), restauré
dans `promocomm-db` chez le client (`deploy/README.md`, section « Données initiales »).
Les comptes de service sont dans le dump ; `npm run db:seed` n'est pas nécessaire.

## Administration à distance

SSH sur l'hôte Debian via WireGuard vers le VPS (`wg-quick` sur l'hôte, seul
composant non conteneurisé, signalé au client). Mise à jour : `ssh client
/opt/docker/promocomm/update.sh`. Copie prod → dev : `PROD_DATABASE_URL` sur le
PC dev vers `<ip-wireguard-client>:5443`.

## Hors scope pour l'instant

HTTPS (Caddy), CI Gitea Actions pour builder sur le VPS, conteneurisation de WireGuard.

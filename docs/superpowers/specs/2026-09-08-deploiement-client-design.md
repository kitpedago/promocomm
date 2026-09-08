# Déploiement chez le client (Debian + Docker) — design

Date : 2026-09-08. Remplace la stratégie Windows 11 / Docker Desktop décrite
jusqu'ici dans `docs/projet-deploiement.md`.

## Contexte et contraintes client

- La prod tourne sur un PC du client, partition Debian avec Docker installé.
- Consigne client : tout conteneurisé. Partition `sdb1` (50 Go) montée sur
  `/var/lib/docker/` ; utiliser des **volumes Docker nommés** stockés dans
  `/var/lib/docker/volumes/` (lisibilité + restauration Veeam).
- Espace de travail : `/opt/docker/` (fichiers compose, `.env`, scripts).
- Sauvegardes : prises en charge par le client (Veeam). Rien à ajouter.
- Accès utilisateurs : LAN en HTTP simple, `http://<ip-ou-nom-pc>:3020`.
- Base miroir (`MIROIR_DB`) active en prod, lue par des outils sur d'autres
  postes du LAN : Postgres exposé sur le LAN.
- Administration à distance : SSH via WireGuard vers le VPS OVH.

## Décisions

1. **Image pré-construite, jamais de build chez le client.** Registry
   conteneurs de Gitea sur le VPS (`git.gd.solutions`, endpoint `/v2/` actif).
   Image `git.gd.solutions/gducos/promocomm:<tag>`. Chez le client : compose
   + `.env` seulement. Pas de source, pas de Node, pas de git.
2. **Build sur le PC dev** via `scripts/release.ps1` (tags `latest` et
   sha court, push). CI Gitea Actions : plus tard, hors scope.
3. **WireGuard sur l'hôte Debian** (`wg-quick`), pas conteneurisé : le tunnel
   sert au SSH de l'hôte. Seul écart à « tout conteneurisé », à signaler.
4. **Données initiales par dump** : `pg_dump -Fc` de la base dev (déjà
   migrée depuis le `.bak` legacy), `pg_restore` dans `promocomm-db` chez le
   client. Le seed admin n'est pas nécessaire (comptes de service présents
   dans le dump ; `npm run db:seed` reste disponible sur le PC dev).

## Livrables (dossier `deploy/` du repo)

Copié une fois dans `/opt/docker/promocomm/` (scp via WireGuard ou clé USB).

| Fichier | Rôle |
|---|---|
| `deploy/docker-compose.yml` | compose prod : `promocomm-db` + `promocomm-app` |
| `deploy/.env.example` | variables prod, à copier en `.env` et remplir |
| `deploy/update.sh` | `docker compose pull && up -d && image prune -f` |
| `deploy/README.md` | install pas à pas, restauration initiale, mise à jour |
| `scripts/release.ps1` | build + tag + push depuis le PC dev |
| `docs/projet-deploiement.md` | réécrit pour Debian (l'ancien contenu W11 disparaît) |

Le `docker-compose.yml` racine (dev : db + app buildée + mssql ETL) ne change pas.

## Compose prod

```yaml
services:
  promocomm-db:
    image: postgres:16-alpine
    container_name: promocomm-db
    restart: unless-stopped
    environment: POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB
    ports: ["5443:5432"]            # LAN : outils miroir + import prod depuis le dev
    volumes: [promocomm-db-data:/var/lib/postgresql/data]
    healthcheck: pg_isready
  promocomm-app:
    image: git.gd.solutions/gducos/promocomm:${PROMOCOMM_TAG:-latest}
    container_name: promocomm-app
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://…@promocomm-db:5432/…
      BETTER_AUTH_URL: ${APP_URL}
      BETTER_AUTH_SECRET, MIROIR_DB, TZ=Europe/Paris
    ports: ["3020:3000"]            # LAN
    depends_on: promocomm-db healthy
volumes:
  promocomm-db-data:
    name: promocomm-db-data         # pas de préfixe projet, lisible dans /var/lib/docker/volumes
```

Absents volontairement : `MSSQL_URL` (lu seulement à l'appel de l'ETL),
`PROD_DATABASE_URL` (mode dev), bind mount `data/bak`, réseau à IP fixe,
service mssql.

Point à vérifier à l'implémentation : `/admin/import` liste `data/bak` ;
sans le dossier, la page doit afficher « aucun fichier » et non planter.

## Variables `.env` prod

```
POSTGRES_USER=promocomm
POSTGRES_PASSWORD=<fort>
POSTGRES_DB=promocomm
APP_URL=http://<ip-ou-nom-pc>:3020
BETTER_AUTH_SECRET=<npx -y @better-auth/cli secret>
MIROIR_DB=promocomm_miroir
PROMOCOMM_TAG=latest
```

## Flux

**Release (PC dev)** : `scripts/release.ps1` → `docker build` → tags
`latest` + `<sha>` → `docker push`. Prérequis une fois : `docker login
git.gd.solutions` avec un token Gitea `write:package`.

**Install (client, une fois)** : `docker login git.gd.solutions` avec un
token `read:package` ; copier `deploy/` dans `/opt/docker/promocomm/` ;
remplir `.env` ; `docker compose up -d` (migrations drizzle jouées au
démarrage du conteneur app) ; restaurer le dump dev :
`docker exec -i promocomm-db pg_restore -U … -d … --clean --if-exists < dump`
puis redémarrer l'app pour rejouer les migrations sur la base restaurée.

**Mise à jour** : `ssh` via WireGuard puis `/opt/docker/promocomm/update.sh`.
Rollback : `PROMOCOMM_TAG=<sha précédent>` dans `.env` puis `update.sh`.

**Copie prod → dev** (existant, `/admin/import`) : `PROD_DATABASE_URL`
sur le PC dev pointe vers `<ip-wireguard-client>:5443`.

## Hors scope

Sauvegardes (Veeam client), HTTPS/Caddy, CI Gitea Actions, conteneurisation
de WireGuard.

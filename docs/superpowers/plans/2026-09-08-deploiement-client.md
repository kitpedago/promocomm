# Déploiement client Debian + Docker — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer un dossier `deploy/` autonome (compose prod + env + update + README) et un script de release qui pousse l'image sur le registry Gitea du VPS, pour installer PromoComm sur le Debian du client sans build ni source sur place.

**Architecture:** L'image est construite sur le PC dev depuis le `Dockerfile` existant et poussée sur `git.gd.solutions/gducos/promocomm`. Chez le client, `/opt/docker/promocomm/` contient uniquement `docker-compose.yml` + `.env` + `update.sh` ; deux conteneurs (`promocomm-db`, `promocomm-app`), volume nommé `promocomm-db-data`. Le compose racine (dev) ne change pas.

**Tech Stack:** Docker Compose v2, registry Gitea (API Docker v2), PowerShell 5.1 (script release), sh POSIX (update).

**Spec:** `docs/superpowers/specs/2026-09-08-deploiement-client-design.md`

## Global Constraints

- Volumes Docker **nommés**, sans préfixe projet : `name: promocomm-db-data` (consigne client, Veeam).
- Espace de travail client : `/opt/docker/promocomm/`.
- Image : `git.gd.solutions/gducos/promocomm:${PROMOCOMM_TAG:-latest}`.
- Ports LAN : app `3020:3000`, Postgres `5443:5432` (pas de bind `127.0.0.1`).
- Aucun `MSSQL_URL`, `PROD_DATABASE_URL`, bind mount `data/bak`, réseau à IP fixe, service mssql en prod.
- Push git toujours sur `origin` **et** `gd`.
- `deploy/*` exécuté sous Linux : fins de ligne LF, forcées par `.gitattributes` (`deploy/** text eol=lf`).

---

### Task 1 : compose prod + env

**Files:**
- Create: `deploy/docker-compose.yml`
- Create: `deploy/.env.example`
- Create: `.gitattributes`

**Interfaces:**
- Produces : variables `.env` lues par le compose : `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `APP_URL`, `BETTER_AUTH_SECRET`, `MIROIR_DB`, `PROMOCOMM_TAG`. Le README (Task 2) et `release.ps1` (Task 3) réutilisent le nom d'image.

- [ ] **Step 1 : `.gitattributes`**

```
deploy/** text eol=lf
```

- [ ] **Step 2 : `deploy/.env.example`**

```
# PromoComm — production chez le client. Copier en .env et remplir.

# --- PostgreSQL (conteneur promocomm-db) ---
POSTGRES_USER=promocomm
POSTGRES_PASSWORD=change-me
POSTGRES_DB=promocomm

# --- URL vue par les navigateurs du LAN (Better Auth s'en sert pour les cookies) ---
APP_URL=http://192.168.1.10:3020

# --- Better Auth : générer avec  npx -y @better-auth/cli secret ---
BETTER_AUTH_SECRET=change-me

# --- Base miroir aux noms SQL Server (page /admin/miroir). Vide = désactivé. ---
MIROIR_DB=promocomm_miroir

# --- Tag de l'image à déployer (latest ou sha court, cf. scripts/release.ps1) ---
PROMOCOMM_TAG=latest
```

- [ ] **Step 3 : `deploy/docker-compose.yml`**

```yaml
# PromoComm — production chez le client (Debian + Docker).
# Emplacement : /opt/docker/promocomm/ avec un .env rempli depuis .env.example.
#
#   docker compose up -d        # démarrer / appliquer les changements
#   ./update.sh                 # mettre à jour l'image et redémarrer
#
# Aucun build ici : l'image est construite sur le PC de dev (scripts/release.ps1)
# et publiée sur le registry Gitea git.gd.solutions.
services:
  promocomm-db:
    image: postgres:16-alpine
    container_name: promocomm-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    ports:
      # LAN : outils lisant la base miroir + copie prod → dev (/admin/import)
      - "5443:5432"
    volumes:
      - promocomm-db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  promocomm-app:
    image: git.gd.solutions/gducos/promocomm:${PROMOCOMM_TAG:-latest}
    container_name: promocomm-app
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@promocomm-db:5432/${POSTGRES_DB}
      BETTER_AUTH_URL: ${APP_URL}
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}
      MIROIR_DB: ${MIROIR_DB:-}
      TZ: Europe/Paris
    ports:
      - "3020:3000"
    depends_on:
      promocomm-db:
        condition: service_healthy

volumes:
  promocomm-db-data:
    # Nom explicite (pas de préfixe projet) : /var/lib/docker/volumes/promocomm-db-data
    name: promocomm-db-data
```

- [ ] **Step 4 : valider**

Run : `docker compose -f deploy/docker-compose.yml --env-file deploy/.env.example config`
Expected : YAML résolu sans erreur, `image: git.gd.solutions/gducos/promocomm:latest`, volume `name: promocomm-db-data`.

- [ ] **Step 5 : commit**

```bash
git add .gitattributes deploy/docker-compose.yml deploy/.env.example
git commit -m "feat(deploy): compose de production pour le Debian client (image registry Gitea, volume nommé)"
```

---

### Task 2 : update.sh + README client

**Files:**
- Create: `deploy/update.sh`
- Create: `deploy/README.md`

**Interfaces:**
- Consumes : compose et variables de Task 1.

- [ ] **Step 1 : `deploy/update.sh`**

```sh
#!/bin/sh
# Mise à jour de PromoComm : récupère la dernière image (tag PROMOCOMM_TAG du .env)
# et redémarre les conteneurs. Les migrations de base sont jouées au démarrage de l'app.
set -eu
cd "$(dirname "$0")"
docker compose pull
docker compose up -d
docker image prune -f
docker compose ps
```

- [ ] **Step 2 : `deploy/README.md`**

Contenu (les blocs de code internes utilisent des fences ```` ``` ````) :

````markdown
# PromoComm — installation chez le client (Debian + Docker)

Tout tourne en conteneurs. Espace de travail : `/opt/docker/promocomm/`.
Données : volume Docker nommé `promocomm-db-data` (`/var/lib/docker/volumes/`).

## Prérequis

- Docker Engine + plugin compose (`docker compose version` ≥ 2).
- `/var/lib/docker` sur la partition dédiée : `df -h /var/lib/docker`.
- Un jeton Gitea `read:package` (fourni par GD Solutions) pour lire l'image.

## Installation (une fois)

```sh
sudo mkdir -p /opt/docker/promocomm && cd /opt/docker/promocomm
# déposer ici docker-compose.yml, .env.example, update.sh (ce dossier deploy/)
cp .env.example .env && nano .env      # mots de passe, APP_URL = http://<ip-du-pc>:3020, secret
chmod +x update.sh
docker login git.gd.solutions          # utilisateur Gitea + jeton read:package
docker compose up -d
docker compose logs -f promocomm-app   # attendre "listening" ; les migrations sont jouées avant
```

L'application répond sur `http://<ip-du-pc>:3020` depuis tout poste du LAN.

## Données initiales (restauration d'un dump)

Le dump `promocomm-<date>.dump` (format `pg_dump -Fc`) est fourni par GD Solutions.

```sh
cd /opt/docker/promocomm
docker exec -i promocomm-db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' < promocomm-<date>.dump
docker compose restart promocomm-app   # rejoue les migrations sur la base restaurée
```

## Mise à jour

```sh
/opt/docker/promocomm/update.sh
```

Retour arrière : mettre `PROMOCOMM_TAG=<sha précédent>` dans `.env` puis relancer `update.sh`.

## Base miroir

`MIROIR_DB` dans `.env` active la base aux noms SQL Server, réglée depuis la page
`/admin/miroir`. Les outils externes se connectent sur `<ip-du-pc>:5443`
avec le rôle `miroir_lecteur` (mot de passe affiché dans la page).

## Sauvegardes

À la charge du client (Veeam). Le volume `promocomm-db-data` contient toute la
donnée, visuels compris. Pour un dump cohérent à la demande :

```sh
docker exec promocomm-db sh -c 'pg_dump -Fc -U "$POSTGRES_USER" "$POSTGRES_DB"' > promocomm-$(date +%F).dump
```

## Dépannage

```sh
docker compose ps                      # état des conteneurs
docker compose logs --tail=200 promocomm-app
docker compose logs --tail=200 promocomm-db
docker compose down && docker compose up -d   # redémarrage complet, données conservées
```
````

- [ ] **Step 3 : valider**

Run : `sh -n deploy/update.sh` (Git Bash)
Expected : aucune sortie (syntaxe OK).

- [ ] **Step 4 : commit**

```bash
git add deploy/update.sh deploy/README.md
git commit -m "docs(deploy): script de mise à jour et README d'installation client"
```

---

### Task 3 : script de release (PC dev)

**Files:**
- Create: `scripts/release.ps1`

**Interfaces:**
- Produces : image `git.gd.solutions/gducos/promocomm:latest` et `:<sha7>` sur le registry.

- [ ] **Step 1 : `scripts/release.ps1`**

```powershell
<#
.SYNOPSIS
    Construit l'image de production et la pousse sur le registry Gitea (git.gd.solutions).

.DESCRIPTION
    Tags poussés : latest + sha court du commit courant. Chez le client,
    deploy/update.sh récupère le tag PROMOCOMM_TAG (latest par défaut).
    Prérequis, une fois : docker login git.gd.solutions (jeton Gitea write:package).

.EXAMPLE
    .\scripts\release.ps1            # build + push
.EXAMPLE
    .\scripts\release.ps1 -NoPush    # build seulement (vérifier que l'image se construit)
#>
param(
    [string] $Image = 'git.gd.solutions/gducos/promocomm',
    [switch] $NoPush
)
$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot '..'

if (git -C $root status --porcelain) {
    Write-Warning "Arbre de travail modifié : le tag sha ne reflétera pas exactement l'image."
}
$sha = (git -C $root rev-parse --short HEAD).Trim()

docker build -t "${Image}:latest" -t "${Image}:$sha" $root
if ($LASTEXITCODE -ne 0) { throw "docker build a échoué (code $LASTEXITCODE)" }

if ($NoPush) { Write-Host "Image construite : ${Image}:$sha (pas de push)"; exit 0 }

docker push "${Image}:$sha"
if ($LASTEXITCODE -ne 0) { throw "docker push $sha a échoué (code $LASTEXITCODE)" }
docker push "${Image}:latest"
if ($LASTEXITCODE -ne 0) { throw "docker push latest a échoué (code $LASTEXITCODE)" }
Write-Host "Publié : ${Image}:latest et ${Image}:$sha"
```

- [ ] **Step 2 : valider le build**

Run : `.\scripts\release.ps1 -NoPush`
Expected : build OK, dernière ligne `Image construite : git.gd.solutions/gducos/promocomm:<sha> (pas de push)`.

- [ ] **Step 3 : commit**

```bash
git add scripts/release.ps1
git commit -m "feat(deploy): script de release (build + push image sur le registry Gitea)"
```

---

### Task 4 : documentation projet

**Files:**
- Modify: `docs/projet-deploiement.md` (remplacer tout le contenu)

- [ ] **Step 1 : réécrire `docs/projet-deploiement.md`**

```markdown
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
```

- [ ] **Step 2 : commit + push**

```bash
git add docs/projet-deploiement.md docs/superpowers/plans/2026-09-08-deploiement-client.md
git commit -m "docs(deploy): stratégie de déploiement Debian client, plan d'implémentation"
git push origin feat/preferences-utilisateur && git push gd feat/preferences-utilisateur
```

---

### Task 5 : première release + dump (manuel, dépend de l'utilisateur)

- [ ] **Step 1 :** l'utilisateur crée un jeton Gitea `write:package` et lance `docker login git.gd.solutions`.
- [ ] **Step 2 :** `.\scripts\release.ps1` puis vérifier sur Gitea (Packages du dépôt) que `promocomm:latest` apparaît.
- [ ] **Step 3 :** dump de la base dev :

```powershell
docker exec promocomm-db sh -c 'pg_dump -Fc -U "$POSTGRES_USER" "$POSTGRES_DB" > /tmp/init.dump'
docker cp promocomm-db:/tmp/init.dump data\backups\promocomm-init-2026-09-08.dump
docker exec promocomm-db rm -f /tmp/init.dump
```

Expected : fichier > 100 Ko dans `data/backups/` (ignoré par git), à transférer chez le client.

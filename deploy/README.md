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
# déposer ici docker-compose.yml, .env.example, init-app-role.sh, update.sh (ce dossier deploy/)
cp .env.example .env && nano .env      # mots de passe (openssl rand -base64 24 | tr -d '/+='), APP_URL, secret
chmod +x update.sh init-app-role.sh
docker login git.gd.solutions          # utilisateur Gitea + jeton read:package
docker compose up -d
docker compose logs -f promocomm-app   # attendre "listening" ; les migrations sont jouées avant
```

Le compose refuse de démarrer tant qu'une valeur obligatoire du `.env` est
vide. Un `$` dans un mot de passe se double (`$$`).

Par défaut l'application répond sur `http://<ip-du-pc>:3020` depuis tout poste
du LAN (`APP_URL`). Derrière un reverse proxy (HTTPS), mettre `APP_URL` sur le
nom public et ajouter les autres noms d'accès dans `TRUSTED_ORIGINS`, sinon la
connexion est refusée (« Invalid origin ») alors que les pages s'affichent.

Les adaptations locales (proxy, ports, volumes) vont dans un
`docker-compose.override.yml`, que les livraisons ne touchent pas.

## Données initiales (restauration d'un dump)

Le dump `promocomm-<date>.dump` (format `pg_dump -Fc`) est fourni par GD Solutions.

```sh
cd /opt/docker/promocomm
docker exec -i promocomm-db sh -c 'pg_restore -U "$APP_DB_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' < promocomm-<date>.dump
docker compose restart promocomm-app   # rejoue les migrations sur la base restaurée
```

## Comptes PostgreSQL

- `POSTGRES_USER` : superutilisateur de l'instance, jamais utilisé par l'application.
- `APP_DB_USER` : compte applicatif `NOSUPERUSER CREATEDB CREATEROLE`,
  propriétaire de la base. `CREATEDB`/`CREATEROLE` servent à la base miroir
  (création de `promocomm_miroir` et des rôles `miroir_*`).

`init-app-role.sh` le crée au premier démarrage (volume vide). Sur une
installation antérieure à ce script, où l'application se connectait en
superutilisateur, le créer à la main puis renseigner `APP_DB_*` dans `.env` :

```sh
docker exec -i promocomm-db psql -U "$POSTGRES_USER" -d promocomm <<'EOF'
CREATE ROLE promocomm_app LOGIN NOSUPERUSER CREATEDB CREATEROLE PASSWORD '<mot de passe>';
ALTER DATABASE promocomm OWNER TO promocomm_app;
ALTER SCHEMA public OWNER TO promocomm_app;
REASSIGN OWNED BY <ancien rôle> TO promocomm_app;
-- si les rôles miroir existent déjà :
GRANT miroir_ecrivain TO promocomm_app WITH ADMIN OPTION;
GRANT miroir_lecteur TO promocomm_app WITH ADMIN OPTION;
EOF
```

## Mise à jour

```sh
/opt/docker/promocomm/update.sh
```

Retour arrière : mettre `PROMOCOMM_TAG=<sha précédent>` dans `.env` puis relancer `update.sh`.

## Base miroir

`MIROIR_DB` dans `.env` active la base aux noms SQL Server, réglée depuis la page
`/admin/miroir`. Le rôle `miroir_lecteur` (outils externes : Power BI, WinDev…)
n'existe qu'après le bouton « Créer l'utilisateur » de cette page, qui affiche
son mot de passe.

PostgreSQL n'est pas publié sur le réseau. Pour un accès ponctuel (outils BI
sur le miroir, copie prod → dev), ajouter dans `docker-compose.override.yml` :

```yaml
services:
  promocomm-db:
    ports:
      - "5443:5432"
```

puis `docker compose up -d` ; retirer et relancer une fois l'usage terminé.

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

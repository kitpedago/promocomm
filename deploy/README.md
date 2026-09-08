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

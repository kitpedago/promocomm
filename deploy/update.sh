#!/bin/sh
# Mise à jour de PromoComm : récupère la dernière image (tag PROMOCOMM_TAG du .env)
# et redémarre les conteneurs. Les migrations de base sont jouées au démarrage de l'app.
set -eu
cd "$(dirname "$0")"
docker compose pull
docker compose up -d
docker image prune -f
docker compose ps

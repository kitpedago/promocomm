#!/bin/sh
# Mise à jour de PromoComm, de bout en bout : téléchargement de l'image (tag
# PROMOCOMM_TAG du .env), sauvegarde de la base, redémarrage, contrôle.
# Les migrations de base sont jouées au démarrage de l'app.
# S'arrête à la première erreur en nommant l'étape ; relançable sans danger.
set -eu
cd "$(dirname "$0")"

etape=
trap '[ $? -eq 0 ] || echo "ÉCHEC, étape : $etape" >&2' EXIT

etape="téléchargement de l'image"
avant=$(docker inspect --format '{{.Image}}' promocomm-app 2>/dev/null || true)
docker compose pull

etape='sauvegarde de la base'
dump=promocomm-$(date +%F-%H%M).dump
# .partiel : un dump interrompu ne doit pas passer pour une sauvegarde.
docker exec promocomm-db sh -c 'pg_dump -Fc -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$dump.partiel"
[ -s "$dump.partiel" ]
mv "$dump.partiel" "$dump"
ls -lh "$dump"

etape='redémarrage des conteneurs'
docker compose up -d

# L'image remplacée reste disponible pour le retour arrière (PROMOCOMM_TAG=precedent).
# Seulement si l'image a changé : relancer le script ne déplace pas l'étiquette.
apres=$(docker inspect --format '{{.Image}}' promocomm-app)
if [ -n "$avant" ] && [ "$avant" != "$apres" ]; then
  docker tag "$avant" git.gd.solutions/gducos/promocomm:precedent
fi

etape="contrôle : l'application ne répond pas (migration en échec ?)"
i=0
until docker exec promocomm-app node -e "fetch('http://127.0.0.1:3000/').then(() => process.exit(0), () => process.exit(1))" 2>/dev/null; do
  i=$((i + 1))
  if [ "$i" -ge 60 ]; then
    docker compose logs --tail=50 promocomm-app
    echo "Retour arrière : PROMOCOMM_TAG=precedent dans .env, puis docker compose up -d" >&2
    exit 1
  fi
  sleep 2
done

etape='nettoyage des images'
docker image prune -f
docker compose ps
echo "Mise à jour terminée, version $(docker exec promocomm-app printenv APP_VERSION), sauvegarde $dump"

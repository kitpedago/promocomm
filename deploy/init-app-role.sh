#!/bin/sh
# Joué par l'image postgres au PREMIER démarrage seulement (volume vide) :
# crée le compte applicatif, sans SUPERUSER. CREATEDB/CREATEROLE sont requis
# par la base miroir (CREATE DATABASE … OWNER miroir_ecrivain, CREATE ROLE).
# Installation existante : rejouer ces ordres à la main (deploy/README.md).
set -eu
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -v user="$APP_DB_USER" -v pw="$APP_DB_PASSWORD" <<'EOF'
CREATE ROLE :"user" LOGIN NOSUPERUSER CREATEDB CREATEROLE PASSWORD :'pw';
ALTER DATABASE :"DBNAME" OWNER TO :"user";
ALTER SCHEMA public OWNER TO :"user";
EOF

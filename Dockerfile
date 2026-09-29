# Image de prod — référencée par le profil "app" de docker-compose.yml.
# Build TanStack Start (vite) puis runtime minimal : srvx sert dist/server
# (SSR + server functions) et dist/client (assets statiques).

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
# drizzle.config.ts + drizzle/ + src/db : nécessaires à "drizzle-kit migrate"
# joué à chaque démarrage (idempotent) avant de lancer le serveur.
COPY drizzle.config.ts ./
COPY drizzle ./drizzle
COPY src/db ./src/db
# DDL du miroir, lu au runtime par miroir.server.ts (process.cwd() = /app)
COPY src/lib/miroir.schema.sql ./src/lib/
COPY --from=build /app/dist ./dist
# sha du commit, passé par scripts/release.ps1 et affiché à l'administrateur.
# En fin de fichier : il change à chaque livraison, les couches au-dessus restent en cache.
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION
EXPOSE 3000
# --static est résolu par srvx relativement au dossier de l'entrée, d'où ../client
CMD ["sh", "-c", "npx drizzle-kit migrate && exec npx srvx serve --prod --entry=dist/server/server.js --static=../client --port=3000 --host=0.0.0.0"]

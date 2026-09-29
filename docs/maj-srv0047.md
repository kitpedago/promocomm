# PromoComm — mise à jour sur SRV0047

Manipulation à réaliser sur le serveur du client lorsqu'une nouvelle version
est livrée, qu'elle contienne du code, une migration SQL ou les deux.

Tout se fait **dans une session ouverte sur SRV0047**, sans passer par SRV0034.
Aucune autre machine du client n'intervient. Seule dépendance extérieure : le
registry `git.gd.solutions`, en HTTPS (port 443), d'où l'image est téléchargée.

## Ce qu'il faut savoir

- Une mise à jour consiste à télécharger une nouvelle image et à redémarrer le
  conteneur de l'application. Rien n'est compilé sur le serveur.
- **Les migrations SQL sont dans l'image.** Le conteneur les joue tout seul à
  chaque démarrage, avant de lancer le serveur. Il n'y a aucun script SQL à
  exécuter à la main, et pas de procédure « migration seule » : une migration
  arrive toujours avec une image.
- Rejouer une mise à jour est sans danger : une migration déjà appliquée est
  ignorée.
- `.env` et `docker-compose.override.yml` ne sont jamais modifiés par une mise
  à jour.
- Coupure de service : quelques secondes, le temps du redémarrage.

## Avant de commencer

| Élément | Valeur |
| --- | --- |
| Compte | `svc0029` |
| Dossier | `/opt/docker/promocomm` |
| Conteneurs | `promocomm-app`, `promocomm-db` |

À demander avec chaque livraison : contient-elle une migration ? Des fichiers
de déploiement ont-ils changé (voir le cas particulier en fin de document) ?

## Procédure

### 1. Mettre de côté la version en place

```sh
cd /opt/docker/promocomm
docker tag "$(docker inspect --format '{{.Image}}' promocomm-app)" git.gd.solutions/gducos/promocomm:precedent
```

La commande étiquette l'image du conteneur en service. Sans cette étiquette, l'ancienne image est supprimée par la mise à jour et le
retour arrière n'est plus possible depuis le serveur seul.

### 2. Sauvegarder la base

Obligatoire si la livraison contient une migration, conseillé sinon.

```sh
docker exec promocomm-db sh -c 'pg_dump -Fc -U "$POSTGRES_USER" "$POSTGRES_DB"' > promocomm-$(date +%F-%H%M).dump
ls -lh promocomm-*.dump
```

Le fichier ne doit pas être vide.

### 3. Mettre à jour

```sh
./update.sh
```

Le script télécharge l'image, recrée le conteneur, supprime les images
devenues inutiles et affiche l'état des conteneurs.

### 4. Contrôler

```sh
docker compose logs --tail=50 promocomm-app
docker compose ps
```

Dans le journal, deux lignes attendues, dans cet ordre :

```
[✓] migrations applied successfully!
➜ Listening on: http://localhost:3000/ (all interfaces)
```

`docker compose ps` doit afficher `promocomm-app` à l'état `Up`, pas
`Restarting`. Terminer par une connexion à l'application depuis un navigateur.

### 5. Base miroir

Si la base miroir est activée, un rafraîchissement part automatiquement au
démarrage. Sur la page `/admin/miroir`, vérifier que « Dernier passage »
indique 0 échec. Le bouton de rafraîchissement permet de le relancer.

## En cas de problème

| Symptôme | Cause probable | Action |
| --- | --- | --- |
| `update.sh` s'arrête sur `unauthorized` ou `denied` | Jeton du registry expiré | `docker login git.gd.solutions` avec le jeton `read:package`, puis relancer |
| `update.sh` s'arrête sur une erreur réseau | `git.gd.solutions` injoignable en 443 | Vérifier la sortie Internet du serveur, puis relancer |
| `promocomm-app` à l'état `Restarting` | Migration en échec : le serveur ne démarre pas tant qu'elle échoue | Relever l'erreur dans le journal, faire le retour arrière, transmettre l'erreur à GD Solutions |
| Application joignable mais anomalie fonctionnelle | Défaut de la nouvelle version | Retour arrière |

## Retour arrière

### Revenir à la version précédente du code

Dans `.env`, remplacer `PROMOCOMM_TAG=latest` par `PROMOCOMM_TAG=precedent`, puis :

```sh
docker compose up -d
docker compose logs --tail=50 promocomm-app
```

Utiliser `docker compose up -d` et non `update.sh` : l'étiquette `precedent`
n'existe que sur le serveur, le téléchargement échouerait.

Remettre `PROMOCOMM_TAG=latest` avant la mise à jour suivante.

### Revenir à l'ancien schéma de base

Revenir à l'ancienne image **n'annule pas** une migration déjà jouée. La
plupart des migrations ne font qu'ajouter des colonnes : l'ancienne version
fonctionne alors sans rien faire de plus.

La restauration de la sauvegarde est un dernier recours, à décider avec
GD Solutions : toute saisie faite depuis la sauvegarde est perdue.

```sh
docker compose stop promocomm-app
docker exec -i promocomm-db sh -c 'pg_restore -U "$APP_DB_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' < promocomm-<date>.dump
docker compose up -d
```

## Cas particulier : fichiers de déploiement modifiés

Rare. La livraison le signale quand `docker-compose.yml` ou `update.sh`
changent. Les récupérer avant l'étape 3, depuis le dépôt de paquets Gitea :

```sh
cd /opt/docker/promocomm
cp docker-compose.yml docker-compose.yml.avant
curl -u "gducos:<jeton read:package>" -O https://git.gd.solutions/api/packages/gducos/generic/promocomm-deploy/<version>/<fichier>
chmod +x update.sh
```

Ne jamais écraser `.env` ni `docker-compose.override.yml` : ils portent les
réglages propres au site.

## Particularités de SRV0047

Relevées le 2026-09-09, à confirmer sur place si un doute existe.

- L'application est derrière un reverse proxy Traefik (`/opt/docker/traefik`),
  en HTTPS : `https://promocom.keredes.local`. Elle ne publie aucun port.
- PostgreSQL n'est pas joignable depuis le réseau.
- Le reverse proxy, le volume des fichiers `.bak` et le service SQL Server
  d'import sont déclarés dans `docker-compose.override.yml`.

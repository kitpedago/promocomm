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

## Mise à jour du code en production

Installé le 2026-09-08 sur `SRV0047` (Debian, compte `svc0029`, `http://10.1.210.29:3020`
ou `http://srv0047:3020`). Accès : RDP sur SRV0031 puis terminal sur SRV0047.

### 1. Côté dev (ce PC)

```powershell
git commit ...                       # le code à livrer, sur la branche voulue
git push origin <branche>; git push gd <branche>
.\scripts\release.ps1                # build + push latest et <sha court>
```

Prérequis une fois : `docker login git.gd.solutions` (jeton Gitea `docker-dev`, package read+write).
Le script avertit si l'arbre de travail est modifié : l'image contiendrait alors plus
que le commit tagué. Commiter avant.

### 2. Migration SQL, le cas échéant

Le schéma est dans `src/db/schema.ts`, les migrations dans `drizzle/`. Avant la release :

```powershell
npm run db:generate                  # crée drizzle/NNNN_xxx.sql depuis le schéma
npm run db:migrate                   # l'applique en dev, à vérifier
git add drizzle src/db && git commit -m "feat(db): ..."
```

Rien de plus côté client : le conteneur app joue `drizzle-kit migrate` à chaque
démarrage (voir `Dockerfile`), idempotent. Une migration destructive (suppression de
colonne, changement de type) se prépare avec un dump préalable (section 4).

### 3. Côté client (SRV0047)

```sh
cd /opt/docker/promocomm
./update.sh                          # pull de l'image, up -d, prune, état
docker compose logs --tail=50 promocomm-app   # migrations puis serveur à l'écoute
```

Coupure de service : quelques secondes (redémarrage du conteneur app). La base ne bouge pas.

Retour arrière : dans `.env`, `PROMOCOMM_TAG=<sha précédent>` (visible sur Gitea,
Paquets du dépôt, ou `git log`), puis `./update.sh`. Ne rembobine pas une migration
déjà jouée : restaurer un dump si le schéma doit revenir en arrière.

### 4. Dump avant migration risquée / copie prod → dev

Sur le client :

```sh
docker exec promocomm-db sh -c 'pg_dump -Fc -U "$POSTGRES_USER" "$POSTGRES_DB"' > /opt/docker/promocomm/promocomm-$(date +%F).dump
```

Restauration : `deploy/README.md`, section « Données initiales ».

### 5. Transfert de fichiers dev ↔ client

Le SSH public du VPS est fermé (`ufw`), le client ne peut pas `scp` depuis le VPS.
Passer par un paquet **generic** Gitea (HTTPS, port 443) :

```powershell
# dev → Gitea (jeton docker-dev)
curl.exe -u "gducos:<jeton>" -T <fichier> https://git.gd.solutions/api/packages/gducos/generic/promocomm-deploy/<version>/<fichier>
```

```sh
# Gitea → client (jeton docker-client, read)
curl -u "gducos:<jeton>" -O https://git.gd.solutions/api/packages/gducos/generic/promocomm-deploy/<version>/<fichier>
```

`<version>` = une date, un nouveau nom par lot (Gitea refuse d'écraser un fichier existant, 409).
Premier lot : `2026-09-08` (compose + dump initial).

## Administration à distance

SSH sur l'hôte Debian via WireGuard vers le VPS (`wg-quick` sur l'hôte, seul
composant non conteneurisé, signalé au client). Mise à jour : `ssh client
/opt/docker/promocomm/update.sh`. Copie prod → dev : `PROD_DATABASE_URL` sur le
PC dev vers `<ip-wireguard-client>:5443`.

## Hors scope pour l'instant

HTTPS (Caddy), CI Gitea Actions pour builder sur le VPS, conteneurisation de WireGuard.

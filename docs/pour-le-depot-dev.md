# PromoComm — corrections à porter dans le dépôt de dev

Constats relevés le 2026-09-09 sur l'installation client SRV0047, pendant la
mise en place du reverse proxy et le durcissement de la base. Chaque point a
été **vérifié sur l'installation**, pas déduit. Contourné côté serveur quand
c'était possible, mais le correctif durable est dans le dépôt.

Classé par gravité.

---

## 1. `src/lib/miroir.schema.sql` n'est pas dans l'image — le miroir n'a jamais fonctionné

**Gravité : fonctionnalité entièrement inopérante depuis l'installation.**

`lib/miroir.server.ts` fait :

```js
var DDL = path.resolve(process.cwd(), "src/lib/miroir.schema.sql");
...
await miroir.query(await readFile(DDL, "utf8"));
```

Or l'image ne contient que `/app/src/db/`. `/app/src/lib/` **n'existe pas** :

```
$ docker exec promocomm-app ls /app/src/
db
$ docker exec promocomm-app ls /app/src/lib/
ls: /app/src/lib/: No such file or directory
```

Chaque passage du miroir échouait donc sur
`ENOENT ... open '/app/src/lib/miroir.schema.sql'`, et la base
`promocomm_miroir` est restée vide depuis l'installation — visible dans
« Dernier passage » sur `/admin/miroir`.

**Correctif attendu** : copier `src/lib/` (ou au moins ce `.sql`) dans l'image,
ou embarquer le contenu dans le bundle plutôt que de le lire au runtime. Un
fichier lu par `process.cwd()` depuis un bundle est fragile : le chemin dépend
du répertoire de lancement, pas de l'emplacement du code.

**Contournement en place côté serveur** : le DDL a été régénéré à partir des
métadonnées de l'application (`copies` du bundle `transform-*.js` et
`inverser()` de `miroir.helpers-*.js`), les types étant résolus en exécutant
chaque requête de copie en `LIMIT 0` et en passant l'OID et le modificateur de
chaque colonne à `format_type()`. Résultat : 122 tables, 1 028 colonnes,
0 copie ignorée. Le miroir tourne depuis : `52653 lignes, 122 tables,
0 échec(s)`, recoupé table par table avec la source.

Le fichier est monté par un volume sur `/app/src/lib`. **Ce montage masquera le
fichier d'origine** le jour où l'image l'embarquera : prévenir l'exploitant
pour qu'il le retire.

---

## 2. `trustedOrigins` figé à la construction — un seul nom d'hôte possible en production

**Gravité : bloquant pour toute mise derrière un proxy ou tout changement de nom.**

Le bundle `auth-*.js` contient :

```js
trustedOrigins: ["http://localhost:3021"]
```

C'est la valeur de dev, figée au build. En production, Better Auth n'accepte
donc que l'origine de `BETTER_AUTH_URL`. Conséquence concrète : un accès par un
autre nom que celui de `APP_URL` affiche bien les pages, mais **refuse la
connexion** avec `Invalid origin` — comportement déroutant, car la page de
login s'affiche normalement.

Sur ce site, il a fallu ajouter un routeur Traefik qui redirige en 301 tout nom
non canonique (`srv0047`, `srv0047.keredes.local`, l'IP) vers l'unique nom
accepté.

**Correctif attendu** : rendre `trustedOrigins` configurable par variable
d'environnement (liste séparée par des virgules), en gardant `localhost:3021`
comme valeur de dev par défaut.

---

## 3. `.env.example` livre `POSTGRES_PASSWORD=change-me` — et l'installation a démarré avec

**Gravité : la base a tourné en production avec un mot de passe public.**

Le `.env` du client n'avait jamais été rempli : `POSTGRES_PASSWORD` valait
encore le placeholder, et la base avait été **initialisée avec**. Vérifié en
`scram-sha-256` depuis un poste du LAN, port 5443 publié : la connexion était
acceptée. Avec, de surcroît, un rôle `SUPERUSER` (point 4).

Le mot de passe a été tourné sur ce site.

**Correctif attendu** : refuser le démarrage si `POSTGRES_PASSWORD` vaut encore
le placeholder, ou faire générer la valeur par le script d'installation. Un
placeholder qui fonctionne est un placeholder qui reste.

---

## 4. L'application se connecte en `SUPERUSER`

**Gravité : élévation de privilèges en cas de compromission.**

Le `docker-compose.yml` construit :

```yaml
DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@promocomm-db:5432/${POSTGRES_DB}
```

soit le compte créé par `POSTGRES_USER`, qui est le superutilisateur de
l'instance. Un superutilisateur PostgreSQL peut exécuter des commandes système
(`COPY ... FROM PROGRAM`), lire les fichiers du serveur (`pg_read_file`) et
contourner toute vérification de droits.

Un rôle applicatif a été créé sur ce site : `NOSUPERUSER CREATEDB CREATEROLE`,
propriétaire de la base, des schémas et des tables. `CREATEDB` et `CREATEROLE`
sont **nécessaires** — `lib/miroir.server.ts` exécute réellement
`CREATE DATABASE ... OWNER miroir_ecrivain` et `CREATE ROLE ... LOGIN`. Il faut
aussi l'`ADMIN OPTION` sur `miroir_ecrivain` si ce rôle préexiste.

Testé après bascule : DDL sur `public`, `DROP`/`CREATE SCHEMA` (import legacy),
journal Drizzle, `CREATE ROLE`, `CREATE DATABASE ... OWNER` passent ;
`COPY ... TO PROGRAM`, `pg_read_file()` et l'auto-promotion `SUPERUSER` sont
refusés.

**Correctif attendu** : prévoir dans `.env.example` un compte applicatif
distinct du compte d'administration, et documenter les privilèges minimaux.
Envisager de faire tomber le besoin de `CREATEROLE`/`CREATEDB` en sortant la
création de la base miroir de l'application.

---

## 5. Le repli de `URLBasePublique` est une adresse de dev codée en dur

Dans `ovh-sms.helpers-*.js` :

```js
var BASE_URL_DEFAUT = "http://10.66.66.1:3020";
```

Cette adresse n'existe sur aucune interface du serveur client. Elle était aussi
la valeur en base, si bien que **tous les liens envoyés par SMS pointaient dans
le vide**. Et vider le paramètre depuis `/parametres` ne neutralise pas le
problème : le repli reprend la main.

**Correctif attendu** : dériver le repli de `APP_URL`, ou ne rien mettre et
refuser d'insérer un lien si le paramètre est vide.

---

## 6. `README.md` (dossier `deploy/`) — trois indications fausses

- « Les outils externes se connectent sur `<ip-du-pc>:5443` avec le rôle
  `miroir_lecteur` » : ce rôle **n'existe pas** tant que le bouton « Créer
  l'utilisateur » de `/admin/miroir` n'a pas été cliqué. Le README le présente
  comme acquis.
- Le port d'accès annoncé est `3020` ; ce site est passé en HTTPS derrière un
  reverse proxy. À formuler de façon neutre, ou à marquer comme valeur par
  défaut modifiable.
- Le dépôt des `.bak` par `scp` dans `data/bak/` : ce site est passé à un
  volume nommé, le chemin hôte n'existe plus.

---

## 7. Ports publiés par défaut

`docker-compose.yml` publie `3020:3000` et `5443:5432`. Le second expose
PostgreSQL — donc le superutilisateur du point 4 — à tout le réseau local, pour
deux usages occasionnels (outils de BI sur le miroir, copie prod → dev).

**Correctif attendu** : ne rien publier par défaut, et documenter comment
ouvrir ponctuellement. Un port ouvert en permanence pour un besoin occasionnel
est un mauvais compromis par défaut.

---

## 8. Détail : `drizzle-kit` affiche de la publicité tierce dans les journaux de production

À chaque démarrage, la sortie contient des lignes du type :

```
◇ injected env (0) from .env.local,.env // tip: ⌁ auth for agents [www.vestauth.com]
◇ injected env (0) from .env.local,.env // tip: ◈ secrets for agents [www.dotenvx.com]
```

Sans conséquence, mais ces liens vers des domaines tiers dans les journaux d'un
serveur de production peuvent surprendre à juste titre lors d'un audit. Épingler
la version de `drizzle-kit` ou passer les migrations par un runner silencieux
lève l'ambiguïté.

---

## 9. NOUVEAU (2026-09-09, après livraison de `d6fdc62`) — l'ETL a été supprimé du compose alors que l'application le propose toujours

**Gravité : fonctionnalité cassée en production, et régression réintroduite à chaque livraison.**

Le `deploy/docker-compose.yml` de `d6fdc62` ne contient plus le service SQL
Server, ni le montage des `.bak`, ni `MSSQL_URL`. Or l'image livrée contient
toujours la page `/admin/import`, qui affiche :

```
SQL Server injoignable. Démarrer le profil ETL sur le serveur :
    docker compose --profile etl up -d
MSSQL_URL non défini (.env)
```

L'interface renvoie donc l'exploitant vers un profil Compose **qui n'existe
dans aucun fichier livré**. Le client a encore besoin de cette fonction : le
démantèlement était prévu « dans quelques jours », il n'a pas eu lieu.

Le service a été rétabli côté serveur dans `docker-compose.override.yml`, ce
qui le met à l'abri des livraisons suivantes. Mais tant que l'amont et l'image
divergent, toute nouvelle installation partira cassée.

**Correctif attendu** : soit remettre le service sous profil `etl` dans
`deploy/docker-compose.yml` avec `MSSQL_URL`/`MSSQL_SA_PASSWORD` dans
`.env.example`, soit retirer la page `/admin/import` de l'image. Les deux
doivent bouger ensemble.

Pour mémoire, ce que l'image attend (relevé dans `fns-*.js`) : `BAK_DIR =
<cwd>/data/bak`, `BAK_DIR_IN_MSSQL = "/bak"`, `Server=promocomm-mssql,1433`,
base de travail `promocomm_src`, profil `etl`.

---

## 10. NOUVEAU — la procédure « installation existante » du README échoue

Dans `deploy/README.md`, section « Comptes PostgreSQL » :

```sql
REASSIGN OWNED BY <ancien rôle> TO promocomm_app;
```

Cet ordre **échoue** quand l'ancien rôle est le superutilisateur d'amorçage de
l'instance — c'est-à-dire le compte créé par `POSTGRES_USER`, donc le cas de
toute installation faite avec l'image `postgres` :

```
ERROR: cannot reassign ownership of objects owned by role promocomm
       because they are required by the database system
```

Le bloc étant exécuté d'un seul tenant, tout est annulé : l'exploitant croit
avoir migré alors que rien n'a changé, et l'application continue de se
connecter en superutilisateur.

**Correctif attendu** : viser explicitement les schémas applicatifs plutôt que
`REASSIGN OWNED`. Deux pièges à respecter dans l'ordre des ordres — les tables
d'abord, les séquences ensuite, et seulement les séquences autonomes : celles
rattachées à une colonne (`IDENTITY`, `serial`) suivent leur table et un
`ALTER SEQUENCE` direct dessus lève « is linked to table ».

Un script fonctionnel, appliqué avec succès sur SRV0047, est disponible :
`contournements-retires-20260909/role-applicatif.sql`.

---

## Ce qui a changé côté serveur, pour information

Ces changements vivent dans `docker-compose.override.yml` et `.env`, les deux
fichiers que `promocomm-deploy.tar.gz` ne contient pas — ils survivent donc à
un redéploiement. Ils n'ont pas à être repris dans le dépôt, mais les connaître
évite les surprises :

- reverse proxy Traefik dans `/opt/docker/traefik`, HTTPS sur 443, réseau
  Docker externe `network_promocomm` ; l'application ne publie plus de port
- accès par `https://promocom.keredes.local` ; port 80 fermé
- `DATABASE_URL` pointé sur le rôle applicatif
- volume nommé `promocomm-bak-data` à la place du bind `./data/bak`
- port `5443` fermé
- volume `promocomm-miroir-schema` monté sur `/app/src/lib` — **retiré** à la
  livraison de `d6fdc62`, l'image embarquant désormais le fichier
- service SQL Server sous profil `etl` **rétabli** dans l'override (point 9)

**Attention aux `$` dans `.env`** : Compose les interprète comme des variables.
Un mot de passe qui en contient arrive tronqué dans le conteneur, qui part en
boucle de redémarrage. Il faut les doubler (`$$`). Cela mériterait un mot dans
le `.env.example`.

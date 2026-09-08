# Migration d'une application WinDev + SQL Server

Dossier /opt/promocomm créé et avec ce seul fichier.

## Origine
Application Windev pour Windows
Essentiellement des fenêtres avec des listes.
Base de données SQL Serveur

## Architecture
L'application est développée en local sur le PC Windows (rapatriée du VPS OVH le 2026-08-27).
La prod est installée sur un PC Windows 11 chez le client (plus de serveur Debian), accès par
AnyDesk. Déploiement par images Docker pré-construites poussées sur GHCR : jamais de build ni de
source chez le client, mise à jour = `pull` + `up -d`. Détail de la stratégie : `docs/projet-deploiement.md`.

## Base de données
Le client dispose d'un bak de sa base de données. Créer en interne une page qui permet de charger plusieurs fois au long de la phase de dév, les données du bak mise à jour vers la base PostgreSQL.

## Stack
TanStack le plus possible. Autres : arbitrer avec moi.

## Base de code
Tout le code de l'application WinDev
https://github.com/kitpedago/PromoComm_WinDev. S'en inspirer pour les tâches métiers spécifiques.
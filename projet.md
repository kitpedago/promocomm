# Migration d'une application WinDev + SQL Server

Dossier /opt/promocomm créé et avec ce seul fichier.

## Origine
Application Windev pour Windows
Essentiellement des fenêtres avec des listes.
Base de données SQL Serveur

## Architecture
L'application sera développée sur le VPS OVH comme les autres projets. Mais il sera ensuite tranféré sur un serveur Debian, local chez le client. Il faut dockeriser au maximum. Le seul accès au serveur du client sera pas SSH via AnyDesk sur le PC Windows.
On automatisera le déploiement du docker vers le serveur (on verra quelle orga)

## Base de données
Le client dispose d'un bak de sa base de données. Créer en interne une page qui permet de charger plusieurs fois au long de la phase de dév, les données du bak mise à jour vers la base PostgreSQL.

## Stack
TanStack le plus possible. Autres : arbitrer avec moi.

## Base de code
Tout le code de l'application WinDev
https://github.com/kitpedago/PromoComm_WinDev. S'en inspirer pour les tâches métiers spécifiques.
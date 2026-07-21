# Supervision Frontend

Dashboard web développé avec **Angular** pour la supervision en temps réel d'infrastructures virtualisées **Proxmox VE** et **VMware ESXi**.

Interface connectée à l'[API backend Spring Boot](https://github.com/sofienecharaa-code/supervision-backend) associée à ce projet.

## Stack technique

- **Angular 22** (Signals, syntaxe de contrôle de flux moderne `@if`/`@for`)
- **Chart.js** / **ng2-charts** pour les graphiques
- **jsPDF** / **html2canvas** pour l'export PDF
- **RxJS** pour la gestion des flux de données temps réel

## Fonctionnalités

- Authentification (page de connexion, token JWT, guard de route)
- Vue d'ensemble : liste des hosts (Proxmox et VMware) avec statut en temps réel
- Graphiques CPU / RAM / Stockage par host (donut charts)
- Historique des métriques dans le temps (courbes d'évolution)
- Liste des VMs/containers par host, avec statut (actif/arrêté/erreur)
- Actions Start/Stop directement depuis le dashboard
- Recherche et tri des hosts
- Panneau d'alertes RAM à 3 niveaux (sûr/moyen/élevé)
- Export des données en CSV et PDF (avec graphiques intégrés)
- Rafraîchissement automatique (polling configurable)
- Design sur-mesure inspiré des salles de supervision (NOC)

## Architecture

- `components/dashboard/` — Vue principale
- `components/login/` — Authentification
- `components/resource-chart/` — Graphiques donut CPU/RAM/Stockage
- `components/history-chart/` — Graphiques d'historique
- `services/` — Appels HTTP (hosts, VMs, historique, auth)
- `guards/` — Protection des routes
- `interceptors/` — Injection automatique du token JWT

Tous ces dossiers se trouvent sous `src/app/`
## Configuration

L'URL de l'API backend est définie dans chaque service (`http://localhost:8080` par défaut) — à adapter si le backend tourne sur une autre machine.

## Lancer le projet

```bash
npm install
ng serve
```

L'application démarre sur `http://localhost:4200`.

## Projet associé

Le backend Spring Boot correspondant : [supervision-backend](https://github.com/sofienecharaa-code/supervision-backend)

## Contexte

Projet réalisé dans le cadre d'un stage : supervision centralisée d'infrastructures virtualisées, avec connexion réelle et testée à des serveurs Proxmox VE et VMware ESXi.
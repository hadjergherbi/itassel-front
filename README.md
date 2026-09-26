# ITASSEL

Plateforme de gestion des doléances citoyennes du **Ministère des Sports** (Algérie). Interface web permettant aux citoyens de déposer et de suivre leurs doléances, et aux agents et administrateurs de les traiter.

Ce dépôt contient uniquement le **front-end**. L’API est un projet séparé : [lien du repo backend].

## Stack technique

| Technologie | Version |
|---|---|
| React | 19.2.8 |
| React DOM | 19.2.8 |
| Vite | 8.3.0 |
| Tailwind CSS | 4.3.3 |
| React Router | 7.18.4 |
| Axios | 1.20.0 |

Autres dépendances notables : Lucide React (icônes).

## Fonctionnalités principales

**Espace public**

- Accueil institutionnel (français, anglais, arabe)
- Dépôt d’une doléance (formulaire, pièces jointes, confirmation)
- Suivi d’un dossier par référence et code envoyé par e-mail

**Back-office administrateur**

- Authentification, mot de passe oublié, définition du mot de passe
- Tableau de bord (indicateurs, priorités)
- Liste et détail des doléances : statuts, réaffectation, notes internes, pièces jointes
- Export CSV / PDF
- Gestion des services, utilisateurs et rôles (Super Admin)
- Paramètres, journal des actions et activité de la plateforme
- Compte agent (profil, mot de passe)

## Prérequis

- **Node.js** (aucune version n’est figée dans `package.json` ; une version LTS récente est recommandée)
- **npm**

Une API backend doit être disponible et renseignée via `VITE_API_URL`.

## Installation

```bash
git clone <url-de-ce-depot>
cd ITASSEL
npm install
```

Le fichier `.env.example` n’est pas versionné. Créez un `.env` à la racine :

```
VITE_API_URL=http://127.0.0.1:8000/api
```

Adaptez l’URL à celle de l’API backend.

## Développement

```bash
npm run dev
```

L’application est servie par Vite (par défaut `http://localhost:5173`).

## Build de production

```bash
npm run build
```

Le résultat est généré dans `dist/`. Prévisualisation locale :

```bash
npm run preview
```

## Structure de `src/`

```
src/
├── admin/        # Authentification admin, layout, garde des routes
├── components/   # Composants UI publics et back-office
├── config/       # Coordonnées institutionnelles (site, réseaux)
├── i18n/         # Traductions fr / en / ar et contexte de langue
├── lib/          # Clients Axios, endpoints, helpers
└── pages/        # Pages publiques et pages admin/
```

- **`admin/`** — session, menu latéral, contrôle d’accès Super Admin.
- **`components/`** — en-tête, formulaire, tableaux, modales, notes, exports.
- **`i18n/`** — textes de l’interface (public, commun, admin).
- **`lib/`** — appels API, erreurs, statuts, sécurité côté client.
- **`pages/`** — écrans publics ; **`pages/admin/`** — écrans du back-office.

## Backend

API Laravel (ou équivalent) : [lien du repo backend].

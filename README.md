# ITASSEL

Plateforme de gestion des doléances citoyennes du **Ministère des Sports** (Algérie). Interface web permettant aux citoyens de déposer et de suivre leurs doléances, et aux agents et administrateurs de les traiter.

Ce dépôt contient uniquement le **front-end**. L’API Laravel est un dépôt séparé : récupérez son adresse auprès du responsable du projet, puis renseignez-la dans `VITE_API_URL`.

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

Une API Laravel doit être disponible. Son URL de base se règle avec `VITE_API_URL` (elle se termine par `/api`). Vite lit cette variable **au build** : la valeur est figée dans les fichiers générés.

## Installation

```bash
git clone <url-de-ce-depot>
cd ITASSEL
npm install
```

Les modèles versionnés sont `.env.example` (développement) et `.env.production.example` (production). Les autres fichiers `.env` sont ignorés par Git.

Pour le développement local, copiez l’exemple :

```bash
cp .env.example .env
```

Puis pointez vers l’API locale :

```
VITE_API_URL=http://127.0.0.1:8000/api
```

## Développement

```bash
npm run dev
```

L’application est servie par Vite (par défaut `http://localhost:5173`).

## Build de production

```bash
npm run build
```

Le résultat est généré dans `dist/`. Ce dossier est listé dans `.gitignore` : il n’est pas versionné, et ne doit pas l’être, parce qu’il embarque l’URL d’API du build (souvent `http://127.0.0.1:8000/api` en local).

Prévisualisation locale :

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

L’API est un projet Laravel distinct de ce dépôt. Il n’y a pas d’URL publique figée ici : clonez le dépôt indiqué par l’équipe, démarrez-le, puis réglez `VITE_API_URL` sur son préfixe `/api`.

## Sécurité — jeton d’administration

Le jeton de session du back-office est enregistré dans `localStorage` (clé `itassel_admin_token`). N’importe quel script exécuté dans la page peut le lire : une faille XSS suffit à le voler et à l’utiliser comme l’agent connecté. Ce choix n’est pas modifié ici ; un cookie `HttpOnly` demanderait un changement du contrat avec l’API.

Le code ne passe pas de HTML brut au navigateur : aucun `dangerouslySetInnerHTML`, aucune affectation `innerHTML`. React échappe le texte affiché. Ne pas introduire de HTML construit à partir de données de l’API ou de saisies utilisateur.

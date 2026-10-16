# ITASSEL

Plateforme de gestion des doléances citoyennes du **Ministère des Sports** (Algérie). Interface web permettant aux citoyens de déposer et de suivre leurs doléances, et aux agents et aux administrateurs de les traiter.

Ce dépôt contient uniquement le **front-end** : [itassel-front](https://github.com/hadjergherbi/itassel-front). L’API Laravel est le dépôt [itassel-back](https://github.com/hadjergherbi/itassel-back).

## Démarrage rapide

1. Lancer le back (voir [Backend](#backend)).
2. Lancer le front :

```bash
git clone https://github.com/hadjergherbi/itassel-front.git
cd itassel-front
npm install
cp .env.example .env
```

Dans `.env`, remplacer la valeur d’exemple par l’API locale :

```
VITE_API_URL=http://127.0.0.1:8000/api
```

```bash
npm run dev
```

Vite sert l’application sur `http://localhost:5173` (port par défaut, non modifié dans `vite.config.js`).

- Page publique : `http://localhost:5173/`
- Connexion administrateur : `http://localhost:5173/admin/connexion`

La connexion utilise un compte de démonstration créé par le seeder du back (`php artisan db:seed`) : `demo.admin@itassel.dz` (super admin) ou `demo.sport@itassel.dz` (service Sport). En environnement `local`, le mot de passe est `DemoLocalOnly` tant que `ITASSEL_DEMO_PASSWORD` n’est pas défini. Le détail est dans le [README du back](https://github.com/hadjergherbi/itassel-back).

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

Une API Laravel doit être disponible. Son URL de base se règle avec `VITE_API_URL` (elle se termine par `/api`). Vite lit cette variable **au build** : la valeur est figée dans les fichiers générés. En développement, si elle est absente, le code retombe sur `http://127.0.0.1:8000/api`. En production, elle est obligatoire.

## Installation

```bash
git clone https://github.com/hadjergherbi/itassel-front.git
cd itassel-front
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

`.env.example` contient `https://exemple.gov.dz/api` et `.env.production.example` contient `https://api.exemple.dz/api` : ce sont des modèles, pas l’adresse locale.

## Développement

```bash
npm run dev
```

L’application est servie par Vite (par défaut `http://localhost:5173`).

- Page publique : `http://localhost:5173/`
- Connexion administrateur : `http://localhost:5173/admin/connexion`

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

L’API est le dépôt [itassel-back](https://github.com/hadjergherbi/itassel-back). Prérequis indiqués dans son README : PHP 8.2 ou supérieur, Composer, MySQL.

```bash
git clone https://github.com/hadjergherbi/itassel-back.git
cd itassel-back
composer install
cp .env.example .env
php artisan key:generate
```

Renseignez les identifiants de la base (`DB_*`) dans `.env`, puis :

```bash
php artisan migrate
php artisan db:seed
php artisan serve
```

L’API écoute par défaut sur `http://127.0.0.1:8000`. Les routes métier sont préfixées par `/api`, d’où `VITE_API_URL=http://127.0.0.1:8000/api`.

`php artisan db:seed` crée les comptes de démonstration (`demo.admin@itassel.dz`, `demo.sport@itassel.dz`). Hors `local` et `testing`, `ITASSEL_DEMO_PASSWORD` est obligatoire. Voir le [README du back](https://github.com/hadjergherbi/itassel-back).

## Sécurité — jeton d’administration

Le jeton de session du back-office est enregistré dans `localStorage` (clé `itassel_admin_token`). N’importe quel script exécuté dans la page peut le lire : une faille XSS suffit à le voler et à l’utiliser comme l’agent connecté. Ce choix n’est pas modifié ici ; un cookie `HttpOnly` demanderait un changement du contrat avec l’API.

Le code ne passe pas de HTML brut au navigateur : aucun `dangerouslySetInnerHTML`, aucune affectation `innerHTML`. React échappe le texte affiché. Ne pas introduire de HTML construit à partir de données de l’API ou de saisies utilisateur.

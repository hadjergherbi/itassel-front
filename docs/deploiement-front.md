# Déploiement du front ITASSEL

Ce document décrit les en-têtes HTTP à poser **côté serveur** sur le dossier `dist/` (Vite). Ne pas ajouter de CSP en balise `<meta>` : elle casserait le serveur de développement Vite (`npm run dev`).

## Inventaire des ressources externes

Fichier `index.html` (développement et production) :

| Type | Origine | Usage |
| --- | --- | --- |
| Feuilles de style | `https://fonts.googleapis.com` | IBM Plex Sans, IBM Plex Mono, Roboto |
| Fichiers de polices | `https://fonts.gstatic.com` | Chargés par la feuille Google Fonts |
| Préconnexion | `fonts.googleapis.com`, `fonts.gstatic.com` | `rel="preconnect"` |
| API | `VITE_API_URL` (ex. `https://api.exemple.gov.dz`) | Axios (`src/lib/api.js`, `src/lib/adminApi.js`) |

**Non utilisés** : reCAPTCHA, CDN JavaScript, analytics, iframes, WebSocket.

**Images** : uniquement `/public` (`self`) et éventuellement `data:` (icône SVG inline du `<select>` dans `FormFields.jsx`).

Remplacez `https://api.exemple.gov.dz` ci-dessous par l’URL réelle de l’API (sans slash final). En local : `http://127.0.0.1:8000`.

## Content-Security-Policy recommandée

```
default-src 'self';
script-src 'self';
style-src 'self' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data:;
connect-src 'self' https://api.exemple.gov.dz https://fonts.googleapis.com https://fonts.gstatic.com;
frame-ancestors 'none';
base-uri 'self';
form-action 'self'
```

`script-src` ne contient pas `'unsafe-inline'`. Le `index.html` de production ne doit contenir que des `<script type="module" src="/assets/…">` (fichiers externes).

## Apache (`dist/.htaccess`)

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^ index.html [L]
</IfModule>

<IfModule mod_headers.c>
  Header always set X-Frame-Options "DENY"
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()"
  Header always set Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://api.exemple.gov.dz https://fonts.googleapis.com https://fonts.gstatic.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"

  # HSTS : uniquement en HTTPS.
  Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
</IfModule>

<Files "index.html">
  Header set Cache-Control "no-cache, no-store, must-revalidate"
  Header set Pragma "no-cache"
</Files>

<IfModule mod_expires.c>
  ExpiresActive On
  <DirectoryMatch "/assets">
    ExpiresDefault "access plus 1 year"
    Header set Cache-Control "public, max-age=31536000, immutable"
  </DirectoryMatch>
</IfModule>
```

Si `DirectoryMatch` n’est pas autorisé dans `.htaccess`, utilisez plutôt dans le vhost :

```apache
<Location "/assets">
  Header set Cache-Control "public, max-age=31536000, immutable"
</Location>
```

Activez `mod_headers`, `mod_rewrite` et `mod_expires`.

## Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name itassel.exemple.gov.dz;
    root /var/www/itassel/dist;
    index index.html;

    ssl_certificate     /etc/ssl/certs/itassel.crt;
    ssl_certificate_key /etc/ssl/private/itassel.key;

    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://api.exemple.gov.dz https://fonts.googleapis.com https://fonts.gstatic.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" always;

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
        try_files $uri =404;
    }

    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Vérification après `npm run build`

1. Ouvrir `dist/index.html` : aucun `<script>` inline (`onclick=`, `javascript:`, ou bloc `<script>` sans `src`).
2. Servir `dist/` avec les en-têtes ci-dessus et ouvrir la console : aucune violation CSP (polices, API, images).
3. Si Vite injectait un script inline (modulepreload / fallback), la correction serait d’ajouter un nonce généré à la volée par le serveur, **pas** `'unsafe-inline'`.

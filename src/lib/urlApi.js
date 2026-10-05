/**
 * URL de l'API. Le repli local n'existe qu'en développement.
 * En production, VITE_API_URL est obligatoire.
 */
export function urlApi() {
  const configuree = import.meta.env.VITE_API_URL
  if (typeof configuree === 'string' && configuree.trim()) return configuree.trim()
  if (import.meta.env.PROD) {
    throw new Error(
      'VITE_API_URL est obligatoire en production. Définissez-la avant le build (voir .env.production.example).',
    )
  }
  return 'http://127.0.0.1:8000/api'
}

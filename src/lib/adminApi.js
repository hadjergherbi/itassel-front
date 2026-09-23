import axios from 'axios'

// Jeton de connexion du back-office (valable 8 heures côté Laravel).
export const ADMIN_TOKEN_KEY = 'itassel_admin_token'
// Événement émis quand le jeton est refusé (expiré, supprimé) : l'écran
// revient alors sur la page de connexion.
export const ADMIN_LOGOUT_EVENT = 'itassel:admin-logout'

export function readToken() {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY)
  } catch {
    return null
  }
}

export function writeToken(token) {
  try {
    localStorage.setItem(ADMIN_TOKEN_KEY, token)
  } catch {
    // stockage indisponible : la session durera le temps de l'onglet
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
  } catch {
    // rien à nettoyer
  }
}

const adminApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
  headers: { Accept: 'application/json' },
})

adminApi.interceptors.request.use((config) => {
  const token = readToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url ?? ''
    if (error.response?.status === 401 && !url.includes('/admin/login')) {
      clearToken()
      window.dispatchEvent(new Event(ADMIN_LOGOUT_EVENT))
    }
    return Promise.reject(error)
  },
)

/** Extrait les erreurs de validation Laravel : { message, fields: { champ: 'texte' } } */
export function extractErrors(error, fallback = "L'opération a échoué. Réessayez.") {
  const data = error?.response?.data
  const fields = {}
  if (data?.errors && typeof data.errors === 'object') {
    Object.entries(data.errors).forEach(([key, value]) => {
      fields[key] = Array.isArray(value) ? value[0] : String(value)
    })
  }
  let message = data?.message || fallback
  if (!error?.response) message = 'Connexion au serveur impossible. Vérifiez votre connexion.'
  if (error?.response?.status === 429) message = 'Trop de tentatives. Réessayez dans une minute.'
  return { message, fields }
}

export default adminApi

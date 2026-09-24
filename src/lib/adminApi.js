import axios from 'axios'
import {
  ADMIN_EXPIRE_KEY,
  ADMIN_LOGOUT_EVENT,
  ADMIN_TOKEN_KEY,
  AUTH_ACTIVITY_EVENT,
  FLASH_SESSION_EXPIREE,
  canalAuth,
  diffuserAuth,
  marquerDeconnexionEnCours,
  sessionDeconnexionEnCours,
  setPendingLoginState,
} from './securite'

export { ADMIN_LOGOUT_EVENT, ADMIN_TOKEN_KEY }

export function readToken() {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY)
  } catch {
    return null
  }
}

export function readExpireLe() {
  try {
    return localStorage.getItem(ADMIN_EXPIRE_KEY)
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

export function writeSession(token, expireLe) {
  writeToken(token)
  try {
    if (expireLe) localStorage.setItem(ADMIN_EXPIRE_KEY, String(expireLe))
    else localStorage.removeItem(ADMIN_EXPIRE_KEY)
  } catch {
    // ignore
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    localStorage.removeItem(ADMIN_EXPIRE_KEY)
  } catch {
    // rien à nettoyer
  }
}

export function sessionEncoreValide() {
  const token = readToken()
  if (!token) return false
  const expire = readExpireLe()
  if (!expire) return true
  const ts = Date.parse(expire)
  if (Number.isNaN(ts)) return true
  if (ts <= Date.now()) {
    clearToken()
    return false
  }
  return true
}

export function declencherSessionExpiree(from = window.location.pathname) {
  if (sessionDeconnexionEnCours()) return
  marquerDeconnexionEnCours()
  clearToken()
  const detail = { reason: 'expired', flash: FLASH_SESSION_EXPIREE, from }
  setPendingLoginState({ flash: FLASH_SESSION_EXPIREE, from })
  diffuserAuth({ type: 'logout', ...detail })
  window.dispatchEvent(new CustomEvent(ADMIN_LOGOUT_EVENT, { detail }))
}

const canal = canalAuth()
if (canal) {
  canal.addEventListener('message', (event) => {
    const data = event.data
    if (data?.type === 'activity') {
      window.dispatchEvent(new CustomEvent(AUTH_ACTIVITY_EVENT, { detail: data }))
      return
    }
    if (data?.type === 'logout') {
      if (sessionDeconnexionEnCours()) return
      marquerDeconnexionEnCours()
      clearToken()
      if (data.flash) setPendingLoginState({ flash: data.flash, from: data.from })
      window.dispatchEvent(new CustomEvent(ADMIN_LOGOUT_EVENT, { detail: data }))
    }
  })
}

const adminApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
  headers: { Accept: 'application/json' },
})

adminApi.interceptors.request.use((config) => {
  const url = config.url ?? ''
  if (!url.includes('/admin/login')) {
    const expire = readExpireLe()
    const ts = expire ? Date.parse(expire) : NaN
    if (!Number.isNaN(ts) && ts <= Date.now()) {
      declencherSessionExpiree()
      return Promise.reject(new axios.Cancel('Session expirée'))
    }
  }
  const token = readToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url ?? ''
    if (error.response?.status === 401 && !url.includes('/admin/login')) {
      declencherSessionExpiree()
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

/** Lit un JSON d'erreur Laravel renvoyé dans un blob (export 422). */
export async function extractBlobErrors(error, fallback = "L'opération a échoué. Réessayez.") {
  const blob = error?.response?.data
  if (blob instanceof Blob) {
    try {
      const json = JSON.parse(await blob.text())
      const fake = { response: { status: error.response?.status, data: json } }
      return extractErrors(fake, fallback)
    } catch {
      // blob non JSON
    }
  }
  return extractErrors(error, fallback)
}

export function nomDepuisDisposition(header, fallback) {
  if (!header) return fallback
  const utf8 = header.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8) {
    try {
      return decodeURIComponent(utf8[1].trim())
    } catch {
      return utf8[1].trim()
    }
  }
  const simple = header.match(/filename="([^"]+)"/i) || header.match(/filename=([^;]+)/i)
  return simple ? simple[1].trim() : fallback
}

export default adminApi

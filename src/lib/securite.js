// Constantes et helpers de session. Pour tester l'inactivité à la main,
// passer DELAI_INACTIVITE_MS à 60_000 (1 minute) : l'avertissement
// apparaît 60 s avant la fin (AVERTISSEMENT_AVANT_MS).

export const DELAI_INACTIVITE_MS = 30 * 60 * 1000
export const AVERTISSEMENT_AVANT_MS = 60 * 1000
export const DELAI_AVERTISSEMENT_MS = DELAI_INACTIVITE_MS - AVERTISSEMENT_AVANT_MS
export const THROTTLE_ACTIVITE_MS = 1000

export const AUTH_CHANNEL_NAME = 'itassel-auth'
export const ADMIN_TOKEN_KEY = 'itassel_admin_token'
export const ADMIN_EXPIRE_KEY = 'itassel_admin_expire_le'
export const ADMIN_LOGOUT_EVENT = 'itassel:admin-logout'
export const AUTH_ACTIVITY_EVENT = 'itassel:auth-activity'

export const FLASH_SESSION_EXPIREE = 'session_expiree'
export const FLASH_INACTIVITE = 'inactivite'

let pendingLoginState = null
let deconnexionEnCours = false
let canal = null

export function setPendingLoginState(state) {
  pendingLoginState = state
}

export function takePendingLoginState() {
  const state = pendingLoginState
  pendingLoginState = null
  return state
}

export function sessionDeconnexionEnCours() {
  return deconnexionEnCours
}

export function marquerDeconnexionEnCours() {
  deconnexionEnCours = true
}

export function resetDeconnexionEnCours() {
  deconnexionEnCours = false
}

export function canalAuth() {
  if (typeof BroadcastChannel === 'undefined') return null
  if (!canal) canal = new BroadcastChannel(AUTH_CHANNEL_NAME)
  return canal
}

export function diffuserAuth(message) {
  try {
    canalAuth()?.postMessage(message)
  } catch {
    // canal indisponible
  }
}

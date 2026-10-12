import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import adminApi, {
  ADMIN_LOGOUT_EVENT,
  clearToken,
  readExpireLe,
  sessionEncoreValide,
  writeSession,
} from '../lib/adminApi'
import {
  diffuserAuth,
  marquerDeconnexionEnCours,
  resetDeconnexionEnCours,
  sessionDeconnexionEnCours,
  setPendingLoginState,
} from '../lib/securite'

const AdminAuthContext = createContext(null)

/** Codes que la matrice verrouille pour le super administrateur. */
const PERMISSIONS_VERROUILLEES = ['roles.gerer', 'utilisateurs.gerer']

function codesPermissions(utilisateur) {
  const brut = utilisateur?.permissions ?? utilisateur?.codes_permissions ?? []
  if (!Array.isArray(brut)) return []
  return brut.map((item) => (typeof item === 'string' ? item : item?.code)).filter(Boolean)
}

export function AdminAuthProvider({ children }) {
  const [utilisateur, setUtilisateur] = useState(null)
  const [expireLe, setExpireLe] = useState(() => (sessionEncoreValide() ? readExpireLe() : null))
  const [status, setStatus] = useState(() => (sessionEncoreValide() ? 'checking' : 'anonymous'))
  const [erreurChargement, setErreurChargement] = useState(false)
  const essaiSession = useRef(0)

  const verifierSession = useCallback(async () => {
    if (!sessionEncoreValide()) {
      setErreurChargement(false)
      setStatus('anonymous')
      return
    }
    const id = ++essaiSession.current
    setStatus('checking')
    setErreurChargement(false)
    try {
      const res = await adminApi.get('/admin/me')
      if (essaiSession.current !== id) return
      setUtilisateur(res.data)
      setExpireLe(readExpireLe())
      setStatus('authenticated')
      setErreurChargement(false)
      resetDeconnexionEnCours()
    } catch (err) {
      if (essaiSession.current !== id || axios.isCancel(err)) return
      if (err.response?.status === 401) {
        clearToken()
        setUtilisateur(null)
        setExpireLe(null)
        setErreurChargement(false)
        setStatus('anonymous')
        return
      }
      setErreurChargement(true)
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    if (!sessionEncoreValide()) return undefined
    verifierSession()
    return () => {
      essaiSession.current += 1
    }
  }, [verifierSession])

  useEffect(() => {
    const onLogout = () => {
      setUtilisateur(null)
      setExpireLe(null)
      setErreurChargement(false)
      setStatus('anonymous')
    }
    window.addEventListener(ADMIN_LOGOUT_EVENT, onLogout)
    return () => window.removeEventListener(ADMIN_LOGOUT_EVENT, onLogout)
  }, [])

  const login = useCallback(async (email, motDePasse) => {
    const res = await adminApi.post('/admin/login', {
      email: email.trim(),
      mot_de_passe: motDePasse,
    })
    writeSession(res.data.token, res.data.expire_le)
    setExpireLe(res.data.expire_le ?? null)
    setStatus('authenticated')
    resetDeconnexionEnCours()
    try {
      const me = await adminApi.get('/admin/me')
      setUtilisateur(me.data)
      return me.data
    } catch (err) {
      if (err.response?.status === 401) throw err
      setUtilisateur(res.data.utilisateur)
      return res.data.utilisateur
    }
  }, [])

  const rafraichirProfil = useCallback(async () => {
    const res = await adminApi.get('/admin/me')
    setUtilisateur(res.data)
    return res.data
  }, [])

  const majProfil = useCallback((partial) => {
    setUtilisateur((u) => (u ? { ...u, ...partial } : u))
  }, [])

  const logout = useCallback(async (options = {}) => {
    try {
      await adminApi.post('/admin/logout')
    } catch {
      // jeton déjà invalide : on déconnecte quand même
    }
    const deja = sessionDeconnexionEnCours()
    if (!deja) marquerDeconnexionEnCours()
    clearToken()
    setUtilisateur(null)
    setExpireLe(null)
    setStatus('anonymous')
    const from = options.from || window.location.pathname
    if (options.flash) setPendingLoginState({ flash: options.flash, from })
    if (!deja) {
      diffuserAuth({
        type: 'logout',
        reason: options.reason || 'manual',
        flash: options.flash,
        from,
      })
    }
  }, [])

  const estSuperAdmin = utilisateur?.role === 'super_admin'
  const peut = useCallback(
    (code) => {
      if (!code) return false
      if (codesPermissions(utilisateur).includes(code)) return true
      return estSuperAdmin && PERMISSIONS_VERROUILLEES.includes(code)
    },
    [estSuperAdmin, utilisateur],
  )

  const value = useMemo(
    () => ({
      utilisateur,
      status,
      expireLe,
      erreurChargement,
      reessayerSession: verifierSession,
      estSuperAdmin,
      peut,
      login,
      logout,
      rafraichirProfil,
      majProfil,
    }),
    [utilisateur, status, expireLe, erreurChargement, estSuperAdmin, peut, login, logout, rafraichirProfil, majProfil, verifierSession],
  )

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth doit être utilisé dans <AdminAuthProvider>')
  return ctx
}

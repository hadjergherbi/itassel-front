import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
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

export function AdminAuthProvider({ children }) {
  const [utilisateur, setUtilisateur] = useState(null)
  const [expireLe, setExpireLe] = useState(() => (sessionEncoreValide() ? readExpireLe() : null))
  const [status, setStatus] = useState(() => (sessionEncoreValide() ? 'checking' : 'anonymous'))

  useEffect(() => {
    if (!sessionEncoreValide()) return undefined
    let cancelled = false

    adminApi
      .get('/admin/me')
      .then((res) => {
        if (cancelled) return
        setUtilisateur(res.data)
        setExpireLe(readExpireLe())
        setStatus('authenticated')
        resetDeconnexionEnCours()
      })
      .catch(() => {
        if (cancelled) return
        clearToken()
        setUtilisateur(null)
        setExpireLe(null)
        setStatus('anonymous')
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const onLogout = () => {
      setUtilisateur(null)
      setExpireLe(null)
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
    setUtilisateur(res.data.utilisateur)
    setStatus('authenticated')
    resetDeconnexionEnCours()
    return res.data.utilisateur
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

  const value = useMemo(
    () => ({
      utilisateur,
      status,
      expireLe,
      estSuperAdmin: utilisateur?.role === 'super_admin',
      login,
      logout,
      rafraichirProfil,
      majProfil,
    }),
    [utilisateur, status, expireLe, login, logout, rafraichirProfil, majProfil],
  )

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth doit être utilisé dans <AdminAuthProvider>')
  return ctx
}

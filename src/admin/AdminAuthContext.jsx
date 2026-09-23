import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import adminApi, {
  ADMIN_LOGOUT_EVENT,
  clearToken,
  readToken,
  writeToken,
} from '../lib/adminApi'

const AdminAuthContext = createContext(null)

export function AdminAuthProvider({ children }) {
  const [utilisateur, setUtilisateur] = useState(null)
  // checking : jeton trouvé, vérification en cours | authenticated | anonymous
  const [status, setStatus] = useState(() => (readToken() ? 'checking' : 'anonymous'))

  // Au chargement : si un jeton existe, on vérifie qu'il est encore valable.
  useEffect(() => {
    if (!readToken()) return undefined
    let cancelled = false

    adminApi
      .get('/admin/me')
      .then((res) => {
        if (cancelled) return
        setUtilisateur(res.data)
        setStatus('authenticated')
      })
      .catch(() => {
        if (cancelled) return
        clearToken()
        setUtilisateur(null)
        setStatus('anonymous')
      })

    return () => {
      cancelled = true
    }
  }, [])

  // Jeton refusé par Laravel pendant l'utilisation : retour à la connexion.
  useEffect(() => {
    const onLogout = () => {
      setUtilisateur(null)
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
    writeToken(res.data.token)
    setUtilisateur(res.data.utilisateur)
    setStatus('authenticated')
    return res.data.utilisateur
  }, [])

  const rafraichirProfil = useCallback(async () => {
    const res = await adminApi.get('/admin/me')
    setUtilisateur(res.data)
    return res.data
  }, [])

  const logout = useCallback(async () => {
    try {
      await adminApi.post('/admin/logout')
    } catch {
      // jeton déjà invalide : on déconnecte quand même
    }
    clearToken()
    setUtilisateur(null)
    setStatus('anonymous')
  }, [])

  const value = useMemo(
    () => ({
      utilisateur,
      status,
      estSuperAdmin: utilisateur?.role === 'super_admin',
      login,
      logout,
      rafraichirProfil,
    }),
    [utilisateur, status, login, logout, rafraichirProfil],
  )

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth doit être utilisé dans <AdminAuthProvider>')
  return ctx
}

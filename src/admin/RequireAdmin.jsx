import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAdminAuth } from './AdminAuthContext'
import { takePendingLoginState } from '../lib/securite'
import { useLanguage } from '../i18n/LanguageContext'
import Button from '../components/ui/Button'

/** Protège les pages du back-office : redirige vers la connexion si besoin. */
export default function RequireAdmin({ children }) {
  const { status, erreurChargement, reessayerSession } = useAdminAuth()
  const location = useLocation()
  const { tf } = useLanguage()
  const sessionFermee = !erreurChargement && status !== 'checking' && status !== 'authenticated'
  // Lu dans un effet, pas pendant le rendu : StrictMode rejoue le rendu
  // et un second appel trouverait le message déjà consommé.
  const [loginState, setLoginState] = useState(null)

  useEffect(() => {
    if (!sessionFermee) return undefined
    setLoginState((actuel) => actuel ?? takePendingLoginState() ?? {})
  }, [sessionFermee])

  if (erreurChargement) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page px-4">
        <div className="max-w-md rounded-[8px] border border-gray-200 bg-white p-6 text-center shadow-sm">
          <p className="mb-4 text-sm text-gray-800" role="alert">
            {tf('admin.session.serveurInjoignable')}
          </p>
          <Button onClick={() => reessayerSession()}>{tf('commun.retry')}</Button>
        </div>
      </div>
    )
  }

  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page text-sm text-gray-500">
        {tf('admin.layout.chargement')}
      </div>
    )
  }

  if (sessionFermee) {
    if (!loginState) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-page text-sm text-gray-500">
          {tf('admin.layout.chargement')}
        </div>
      )
    }
    return (
      <Navigate
        to="/admin/connexion"
        replace
        state={{ from: loginState.from || location.pathname, flash: loginState.flash }}
      />
    )
  }

  return children
}

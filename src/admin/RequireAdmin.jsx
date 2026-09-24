import { Navigate, useLocation } from 'react-router-dom'
import { useAdminAuth } from './AdminAuthContext'
import { takePendingLoginState } from '../lib/securite'
import { useLanguage } from '../i18n/LanguageContext'

/** Protège les pages du back-office : redirige vers la connexion si besoin. */
export default function RequireAdmin({ children }) {
  const { status } = useAdminAuth()
  const location = useLocation()
  const { tf } = useLanguage()

  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page text-sm text-gray-500">
        {tf('admin.layout.chargement')}
      </div>
    )
  }

  if (status !== 'authenticated') {
    const extra = takePendingLoginState() ?? {}
    return (
      <Navigate
        to="/admin/connexion"
        replace
        state={{ from: extra.from || location.pathname, flash: extra.flash }}
      />
    )
  }

  return children
}

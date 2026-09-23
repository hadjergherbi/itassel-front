import { Navigate, useLocation } from 'react-router-dom'
import { useAdminAuth } from './AdminAuthContext'

/** Protège les pages du back-office : redirige vers la connexion si besoin. */
export default function RequireAdmin({ children }) {
  const { status } = useAdminAuth()
  const location = useLocation()

  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page text-sm text-gray-500" dir="ltr">
        Chargement…
      </div>
    )
  }

  if (status !== 'authenticated') {
    return <Navigate to="/admin/connexion" replace state={{ from: location.pathname }} />
  }

  return children
}

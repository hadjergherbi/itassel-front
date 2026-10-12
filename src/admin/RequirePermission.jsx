import { Navigate } from 'react-router-dom'
import { useAdminAuth } from './AdminAuthContext'

/** Laisse passer seulement si le profil courant possède la permission. */
export default function RequirePermission({ code, children }) {
  const { peut } = useAdminAuth()
  if (!peut(code)) return <Navigate to="/admin/tableau-de-bord" replace />
  return children
}

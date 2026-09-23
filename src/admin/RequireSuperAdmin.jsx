import { Navigate } from 'react-router-dom'
import { useAdminAuth } from './AdminAuthContext'

export default function RequireSuperAdmin({ children }) {
  const { estSuperAdmin } = useAdminAuth()
  if (!estSuperAdmin) return <Navigate to="/admin/tableau-de-bord" replace />
  return children
}

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LanguageProvider } from './i18n/LanguageContext'
import AccueilPublic from './pages/AccueilPublic'
import DeposerDoleance from './pages/DeposerDoleance'
import ConfirmationDepot from './pages/ConfirmationDepot'
import SuivreDemande from './pages/SuivreDemande'
import SuiviDossier from './pages/SuiviDossier'
import { AdminAuthProvider } from './admin/AdminAuthContext'
import RequireAdmin from './admin/RequireAdmin'
import RequireSuperAdmin from './admin/RequireSuperAdmin'
import AdminLayout from './admin/AdminLayout'
import AdminConnexion from './pages/admin/AdminConnexion'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminDoleances from './pages/admin/AdminDoleances'
import AdminDoleanceDetail from './pages/admin/AdminDoleanceDetail'
import AdminServices from './pages/admin/AdminServices'
import AdminUtilisateurs from './pages/admin/AdminUtilisateurs'
import AdminRoles from './pages/admin/AdminRoles'
import AdminParametres from './pages/admin/AdminParametres'
import AdminIssues from './pages/admin/AdminIssues'
import AdminLogsDashboard from './pages/admin/AdminLogsDashboard'
import AdminJournal from './pages/admin/AdminJournal'
import DefinirMotDePasse from './pages/DefinirMotDePasse'

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <AdminAuthProvider>
          <Routes>
            <Route path="/" element={<AccueilPublic />} />
            <Route path="/deposer" element={<DeposerDoleance />} />
            <Route path="/confirmation" element={<ConfirmationDepot />} />
            <Route path="/deposer/confirmation" element={<ConfirmationDepot />} />
            <Route path="/suivre" element={<SuivreDemande />} />
            <Route path="/suivre/dossier" element={<SuiviDossier />} />
            <Route path="/definir-mot-de-passe" element={<DefinirMotDePasse />} />

            <Route path="/admin/connexion" element={<AdminConnexion />} />
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <AdminLayout />
                </RequireAdmin>
              }
            >
              <Route index element={<Navigate to="tableau-de-bord" replace />} />
              <Route path="tableau-de-bord" element={<AdminDashboard />} />
              <Route path="doleances" element={<AdminDoleances />} />
              <Route path="doleances/:reference" element={<AdminDoleanceDetail />} />
              <Route
                path="services"
                element={
                  <RequireSuperAdmin>
                    <AdminServices />
                  </RequireSuperAdmin>
                }
              />
              <Route
                path="utilisateurs"
                element={
                  <RequireSuperAdmin>
                    <AdminUtilisateurs />
                  </RequireSuperAdmin>
                }
              />
              <Route
                path="roles"
                element={
                  <RequireSuperAdmin>
                    <AdminRoles />
                  </RequireSuperAdmin>
                }
              />
              <Route
                path="parametres"
                element={
                  <RequireSuperAdmin>
                    <AdminParametres />
                  </RequireSuperAdmin>
                }
              />
              <Route
                path="parametres/issues"
                element={
                  <RequireSuperAdmin>
                    <AdminIssues />
                  </RequireSuperAdmin>
                }
              />
              <Route
                path="logs"
                element={
                  <RequireSuperAdmin>
                    <AdminLogsDashboard />
                  </RequireSuperAdmin>
                }
              />
              <Route
                path="logs/journal"
                element={
                  <RequireSuperAdmin>
                    <AdminJournal />
                  </RequireSuperAdmin>
                }
              />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AdminAuthProvider>
      </BrowserRouter>
    </LanguageProvider>
  )
}

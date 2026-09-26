import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LanguageProvider, useLanguage } from './i18n/LanguageContext'
import AccueilPublic from './pages/AccueilPublic'
import DeposerDoleance from './pages/DeposerDoleance'
import ConfirmationDepot from './pages/ConfirmationDepot'
import SuivreDemande from './pages/SuivreDemande'
import SuiviDossier from './pages/SuiviDossier'
import DefinirMotDePasse from './pages/DefinirMotDePasse'
import { AdminAuthProvider } from './admin/AdminAuthContext'
import RequireAdmin from './admin/RequireAdmin'
import RequireSuperAdmin from './admin/RequireSuperAdmin'
import AdminLayout from './admin/AdminLayout'

const AdminConnexion = lazy(() => import('./pages/admin/AdminConnexion'))
const MotDePasseOublie = lazy(() => import('./pages/admin/MotDePasseOublie'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminDoleances = lazy(() => import('./pages/admin/AdminDoleances'))
const AdminDoleanceDetail = lazy(() => import('./pages/admin/AdminDoleanceDetail'))
const AdminServices = lazy(() => import('./pages/admin/AdminServices'))
const AdminUtilisateurs = lazy(() => import('./pages/admin/AdminUtilisateurs'))
const AdminRoles = lazy(() => import('./pages/admin/AdminRoles'))
const AdminParametres = lazy(() => import('./pages/admin/AdminParametres'))
const AdminIssues = lazy(() => import('./pages/admin/AdminIssues'))
const AdminLogsDashboard = lazy(() => import('./pages/admin/AdminLogsDashboard'))
const AdminJournal = lazy(() => import('./pages/admin/AdminJournal'))
const AdminMonCompte = lazy(() => import('./pages/admin/AdminMonCompte'))

function ChargementPage() {
  const { t } = useLanguage()
  return (
    <div className="flex min-h-[40vh] items-center justify-center bg-page px-4 text-sm text-gray-600">
      {t.commun.loading}
    </div>
  )
}

function RoutesApp() {
  return (
    <Suspense fallback={<ChargementPage />}>
      <Routes>
        <Route path="/" element={<AccueilPublic />} />
        <Route path="/deposer" element={<DeposerDoleance />} />
        <Route path="/confirmation" element={<ConfirmationDepot />} />
        <Route path="/deposer/confirmation" element={<ConfirmationDepot />} />
        <Route path="/suivre" element={<SuivreDemande />} />
        <Route path="/suivre/dossier" element={<SuiviDossier />} />
        <Route path="/definir-mot-de-passe" element={<DefinirMotDePasse />} />

        <Route path="/admin/connexion" element={<AdminConnexion />} />
        <Route path="/admin/mot-de-passe-oublie" element={<MotDePasseOublie />} />
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
          <Route path="mon-compte" element={<AdminMonCompte />} />
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
    </Suspense>
  )
}

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <AdminAuthProvider>
          <RoutesApp />
        </AdminAuthProvider>
      </BrowserRouter>
    </LanguageProvider>
  )
}

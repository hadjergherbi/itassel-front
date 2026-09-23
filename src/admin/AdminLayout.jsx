import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useMatch } from 'react-router-dom'
import {
  Bell,
  Building2,
  ChevronDown,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  Shield,
  Users,
  X,
} from 'lucide-react'
import { useAdminAuth } from './AdminAuthContext'
import { ToastProvider } from '../components/ui/Toast'

function nomService(utilisateur) {
  return utilisateur?.service?.nom ?? utilisateur?.service?.nom_service ?? ''
}

const FILS = [
  { test: (p) => p.startsWith('/admin/logs/journal'), label: 'Journal des actions', parent: 'Logs' },
  { test: (p) => p.startsWith('/admin/logs'), label: 'Tableau de bord', parent: 'Logs' },
  { test: (p) => p.startsWith('/admin/parametres/issues'), label: 'Issues du traitement', parent: 'Paramètres' },
  { test: (p) => p.startsWith('/admin/parametres'), label: 'Paramètres' },
  { test: (p) => p.startsWith('/admin/utilisateurs'), label: 'Utilisateurs', parent: 'Accès' },
  { test: (p) => p.startsWith('/admin/roles'), label: 'Rôles', parent: 'Accès' },
  { test: (p) => p.startsWith('/admin/services'), label: 'Services' },
  { test: (p) => /^\/admin\/doleances\/.+/.test(p), label: 'detail' },
  { test: (p) => p.startsWith('/admin/doleances'), label: 'Doléances' },
  { test: (p) => p.startsWith('/admin/tableau-de-bord'), label: 'Tableau de bord' },
]

function FilAriane() {
  const location = useLocation()
  const detail = useMatch('/admin/doleances/:reference')
  const found = FILS.find((f) => f.test(location.pathname))

  if (detail) {
    return (
      <p className="text-sm text-gray-600">
        <Link to="/admin/doleances" className="font-medium text-gray-700 hover:text-institutional">
          ← Doléances
        </Link>
        <span className="mx-1.5 text-gray-400">/</span>
        <span className="font-mono font-semibold text-institutional" dir="ltr">
          {detail.params.reference}
        </span>
      </p>
    )
  }

  if (!found) return <p className="text-sm font-medium text-gray-700">Tableau de bord</p>
  return (
    <p className="text-sm font-medium text-gray-700">
      {found.parent && <span className="text-gray-400">{found.parent} / </span>}
      {found.label}
    </p>
  )
}

function Lien({ to, end, icon: Icon, children, badge, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        [
          'flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-sm font-medium transition',
          isActive ? 'bg-white/15 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white',
        ].join(' ')
      }
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      <span className="truncate">{children}</span>
      {badge}
    </NavLink>
  )
}

function Groupe({ label, icon: Icon, open, onToggle, active, children }) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={[
          'flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2 text-sm font-medium transition',
          active ? 'bg-white/15 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white',
        ].join(' ')}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-start">{label}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="ms-4 mt-1 space-y-0.5 border-s border-white/10 ps-2">{children}</div>}
    </div>
  )
}

function NavAdmin({ estSuperAdmin, nouvelles, onNavigate }) {
  const location = useLocation()
  const accesActif = location.pathname.startsWith('/admin/utilisateurs') || location.pathname.startsWith('/admin/roles')
  const logsActif = location.pathname.startsWith('/admin/logs')
  const [accesManuel, setAccesManuel] = useState(false)
  const [logsManuel, setLogsManuel] = useState(false)
  const accesOpen = accesActif || accesManuel
  const logsOpen = logsActif || logsManuel

  const badge = nouvelles > 0 && (
    <span className="ms-auto rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold leading-none">
      {nouvelles}
    </span>
  )

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Navigation du back-office">
      <Lien to="/admin/tableau-de-bord" end icon={LayoutDashboard} onClick={onNavigate}>
        Tableau de bord
      </Lien>
      <Lien to="/admin/doleances" icon={Inbox} badge={badge} onClick={onNavigate}>
        Doléances
      </Lien>
      {estSuperAdmin && (
        <>
          <Lien to="/admin/services" icon={Building2} onClick={onNavigate}>
            Services
          </Lien>
          <Lien to="/admin/parametres" icon={Settings} onClick={onNavigate}>
            Paramètres
          </Lien>
          <Groupe
            label="Accès"
            icon={Users}
            open={accesOpen}
            onToggle={() => setAccesManuel((v) => !v)}
            active={accesActif}
          >
            <Lien to="/admin/utilisateurs" icon={Users} onClick={onNavigate}>
              Gestion des utilisateurs
            </Lien>
            <Lien to="/admin/roles" icon={Shield} onClick={onNavigate}>
              Gestion des rôles
            </Lien>
          </Groupe>
          <Groupe
            label="Logs"
            icon={ScrollText}
            open={logsOpen}
            onToggle={() => setLogsManuel((v) => !v)}
            active={logsActif}
          >
            <Lien to="/admin/logs" end icon={LayoutDashboard} onClick={onNavigate}>
              Tableau de bord
            </Lien>
            <Lien to="/admin/logs/journal" icon={ScrollText} onClick={onNavigate}>
              Logs
            </Lien>
          </Groupe>
        </>
      )}
    </nav>
  )
}

export default function AdminLayout() {
  const { utilisateur, logout, rafraichirProfil, estSuperAdmin } = useAdminAuth()
  const [drawer, setDrawer] = useState(false)

  useEffect(() => {
    rafraichirProfil().catch(() => {})
  }, [rafraichirProfil])

  const service = nomService(utilisateur)
  const espace = estSuperAdmin ? 'Administration' : service ? `Espace ${service}` : 'Administration'
  const roleBas = estSuperAdmin
    ? 'Super administrateur'
    : service
      ? `Administrateur · ${service}`
      : 'Administrateur'
  const nouvelles = Number(utilisateur?.compteur_nouvelles) || 0

  const aside = useMemo(
    () => (
      <>
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <img src="/logo-seal.svg" alt="" className="h-10 w-10 shrink-0" width={40} height={40} />
          <div className="leading-tight">
            <div className="text-base font-bold tracking-wide">ITASSEL</div>
            <div className="text-xs text-white/70">{espace}</div>
          </div>
        </div>
        <NavAdmin estSuperAdmin={estSuperAdmin} nouvelles={nouvelles} onNavigate={() => setDrawer(false)} />
        <div className="border-t border-white/10 px-5 py-4">
          <p className="truncate text-sm font-semibold">
            {utilisateur?.prenom} {utilisateur?.nom}
          </p>
          <p className="mb-3 truncate text-xs text-white/70">{roleBas}</p>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 text-xs font-medium text-white/80 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
            Déconnexion
          </button>
        </div>
      </>
    ),
    [espace, estSuperAdmin, logout, nouvelles, roleBas, utilisateur],
  )

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-page" dir="ltr" lang="fr">
        <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-white lg:flex">{aside}</aside>

        {drawer && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
            <aside className="relative z-10 flex h-full w-64 flex-col bg-sidebar text-white">
              <button
                type="button"
                className="absolute end-3 top-3 rounded p-1 text-white/70"
                onClick={() => setDrawer(false)}
                aria-label="Fermer le menu"
              >
                <X className="h-5 w-5" />
              </button>
              {aside}
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                className="rounded-[8px] p-1.5 text-gray-600 hover:bg-gray-100 lg:hidden"
                onClick={() => setDrawer(true)}
                aria-label="Ouvrir le menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <FilAriane />
            </div>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] text-gray-500 hover:bg-gray-100"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </button>
          </header>
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useMatch } from 'react-router-dom'
import {
  Building2,
  ChevronDown,
  ChevronRight,
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
import useInactivite from './useInactivite'
import InactiviteModale from '../components/admin/InactiviteModale'
import { ToastProvider } from '../components/ui/Toast'
import Avatar from '../components/ui/Avatar'
import RechercheRapide from '../components/admin/RechercheRapide'
import NotificationsPanel from '../components/admin/NotificationsPanel'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { useLanguage } from '../i18n/LanguageContext'

function nomService(utilisateur) {
  return utilisateur?.service?.nom ?? utilisateur?.service?.nom_service ?? ''
}

function FilAriane() {
  const location = useLocation()
  const detail = useMatch('/admin/doleances/:reference')
  const { tf } = useLanguage()

  const fils = [
    { test: (p) => p.startsWith('/admin/logs/journal'), label: tf('admin.layout.journal'), parent: tf('admin.layout.logs') },
    { test: (p) => p.startsWith('/admin/logs'), label: tf('admin.layout.tableauDeBord'), parent: tf('admin.layout.logs') },
    { test: (p) => p.startsWith('/admin/parametres/issues'), label: tf('admin.layout.issues'), parent: tf('admin.layout.parametres') },
    { test: (p) => p.startsWith('/admin/parametres'), label: tf('admin.layout.parametres') },
    { test: (p) => p.startsWith('/admin/utilisateurs'), label: tf('admin.layout.utilisateurs'), parent: tf('admin.layout.acces') },
    { test: (p) => p.startsWith('/admin/roles'), label: tf('admin.layout.roles'), parent: tf('admin.layout.acces') },
    { test: (p) => p.startsWith('/admin/services'), label: tf('admin.layout.services') },
    { test: (p) => /^\/admin\/doleances\/.+/.test(p), label: 'detail' },
    { test: (p) => p.startsWith('/admin/doleances'), label: tf('admin.layout.doleances') },
    { test: (p) => p.startsWith('/admin/mon-compte'), label: tf('admin.layout.monCompte') },
    { test: (p) => p.startsWith('/admin/tableau-de-bord'), label: tf('admin.layout.tableauDeBord') },
  ]

  const found = fils.find((f) => f.test(location.pathname))

  if (detail) {
    return (
      <p className="text-sm text-gray-600">
        <Link to="/admin/doleances" className="inline-flex items-center gap-1 font-medium text-gray-700 hover:text-institutional">
          <span aria-hidden className="rtl:-scale-x-100">←</span>
          {tf('admin.layout.retourDoleances')}
        </Link>
        <span className="mx-1.5 text-gray-400">/</span>
        <span className="ltr-isolate whitespace-nowrap font-mono font-semibold text-institutional">
          {detail.params.reference}
        </span>
      </p>
    )
  }

  if (!found) return <p className="whitespace-nowrap text-sm font-medium text-gray-700">{tf('admin.layout.tableauDeBord')}</p>
  return (
    <p className="whitespace-nowrap text-sm font-medium text-gray-700">
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
  const { tf } = useLanguage()
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
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label={tf('admin.layout.nav')}>
      <Lien to="/admin/tableau-de-bord" end icon={LayoutDashboard} onClick={onNavigate}>
        {tf('admin.layout.tableauDeBord')}
      </Lien>
      <Lien to="/admin/doleances" icon={Inbox} badge={badge} onClick={onNavigate}>
        {tf('admin.layout.doleances')}
      </Lien>
      {estSuperAdmin && (
        <>
          <Lien to="/admin/services" icon={Building2} onClick={onNavigate}>
            {tf('admin.layout.services')}
          </Lien>
          <Lien to="/admin/parametres" icon={Settings} onClick={onNavigate}>
            {tf('admin.layout.parametres')}
          </Lien>
          <Groupe
            label={tf('admin.layout.acces')}
            icon={Users}
            open={accesOpen}
            onToggle={() => setAccesManuel((v) => !v)}
            active={accesActif}
          >
            <Lien to="/admin/utilisateurs" icon={Users} onClick={onNavigate}>
              {tf('admin.layout.utilisateurs')}
            </Lien>
            <Lien to="/admin/roles" icon={Shield} onClick={onNavigate}>
              {tf('admin.layout.roles')}
            </Lien>
          </Groupe>
          <Groupe
            label={tf('admin.layout.logs')}
            icon={ScrollText}
            open={logsOpen}
            onToggle={() => setLogsManuel((v) => !v)}
            active={logsActif}
          >
            <Lien to="/admin/logs" end icon={LayoutDashboard} onClick={onNavigate}>
              {tf('admin.layout.tableauDeBord')}
            </Lien>
            <Lien to="/admin/logs/journal" icon={ScrollText} onClick={onNavigate}>
              {tf('admin.layout.logs')}
            </Lien>
          </Groupe>
        </>
      )}
    </nav>
  )
}

export default function AdminLayout() {
  const { utilisateur, logout, rafraichirProfil, estSuperAdmin } = useAdminAuth()
  const { t, tf } = useLanguage()
  const [drawer, setDrawer] = useState(false)
  const inactivite = useInactivite()

  useEffect(() => {
    rafraichirProfil().catch(() => {})
  }, [rafraichirProfil])

  const service = nomService(utilisateur)
  const espace = estSuperAdmin
    ? tf('admin.layout.administration')
    : service
      ? tf('admin.layout.espaceService', { service })
      : tf('admin.layout.administration')
  const roleBas = estSuperAdmin
    ? tf('admin.layout.superAdmin')
    : service
      ? tf('admin.layout.administrateurService', { service })
      : tf('admin.layout.administrateur')
  const nouvelles = Number(utilisateur?.compteur_nouvelles) || 0

  const aside = useMemo(
    () => (
      <>
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <img src="/logoo.png" alt="" className="h-10 w-10 shrink-0" width={100} height={100} />
          <div className="leading-tight">
            <div className="text-base font-bold tracking-wide">{t.brand}</div>
            <div className="text-xs text-white/70">{espace}</div>
          </div>
        </div>
        <NavAdmin estSuperAdmin={estSuperAdmin} nouvelles={nouvelles} onNavigate={() => setDrawer(false)} />
        <div className="border-t border-white/10 px-3 py-4">
          <Link
            to="/admin/mon-compte"
            onClick={() => setDrawer(false)}
            className="flex items-center gap-3 rounded-[8px] px-2 py-2 text-white transition hover:bg-white/10"
          >
            <Avatar personne={utilisateur} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {utilisateur?.prenom} {utilisateur?.nom}
              </p>
              <p className="truncate text-xs text-white/70">{roleBas}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-white/60 rtl:-scale-x-100" aria-hidden />
          </Link>
          <button
            type="button"
            onClick={logout}
            className="mt-2 inline-flex items-center gap-2 px-2 text-xs font-medium text-white/80 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
            {tf('admin.layout.deconnexion')}
          </button>
        </div>
      </>
    ),
    [espace, estSuperAdmin, logout, nouvelles, roleBas, t.brand, tf, utilisateur],
  )

  return (
    <ToastProvider>
      <InactiviteModale
        ouvert={Boolean(inactivite.avertissement)}
        mode={inactivite.avertissement}
        secondes={inactivite.secondes}
        onRester={inactivite.resterConnecte}
        onDeconnecter={inactivite.seDeconnecter}
        onReconnecter={inactivite.seReconnecter}
      />
      <div className="flex min-h-screen bg-page">
        <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-white lg:flex">{aside}</aside>

        {drawer && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
            <aside className="absolute inset-y-0 start-0 z-10 flex h-full w-64 flex-col bg-sidebar text-white">
              <button
                type="button"
                className="absolute end-3 top-3 rounded p-1 text-white/70"
                onClick={() => setDrawer(false)}
                aria-label={tf('admin.layout.fermerMenu')}
              >
                <X className="h-5 w-5" />
              </button>
              {aside}
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="relative z-30 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                className="rounded-[8px] p-1.5 text-gray-600 hover:bg-gray-100 lg:hidden"
                onClick={() => setDrawer(true)}
                aria-label={tf('admin.layout.ouvrirMenu')}
              >
                <Menu className="h-5 w-5" />
              </button>
              <FilAriane />
            </div>
            <RechercheRapide />
            <LanguageSwitcher variante="claire" />
            <NotificationsPanel />
          </header>
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}

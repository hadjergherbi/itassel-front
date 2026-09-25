import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useMatch } from 'react-router-dom'
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Settings,
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

const CLE_GROUPES = 'itassel.menu.groupes'
const CLE_REDUIT = 'itassel.menu.reduit'

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60'

function nomService(utilisateur) {
  return utilisateur?.service?.nom ?? utilisateur?.service?.nom_service ?? ''
}

function lireGroupes() {
  try {
    const brut = localStorage.getItem(CLE_GROUPES)
    if (!brut) return {}
    const parsed = JSON.parse(brut)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function ecrireGroupes(valeur) {
  try {
    localStorage.setItem(CLE_GROUPES, JSON.stringify(valeur))
  } catch {
    // stockage indisponible
  }
}

function lireReduit() {
  try {
    return localStorage.getItem(CLE_REDUIT) === '1'
  } catch {
    return false
  }
}

function ecrireReduit(valeur) {
  try {
    localStorage.setItem(CLE_REDUIT, valeur ? '1' : '0')
  } catch {
    // stockage indisponible
  }
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

function Intitule({ children, reduit }) {
  if (reduit) return null
  return (
    <p className="px-3 pt-4 pb-1 text-[11px] uppercase tracking-wider text-white/45">{children}</p>
  )
}

function Lien({ to, end, icon: Icon, children, badge, onClick, reduit = false, sousLien = false }) {
  const libelle = typeof children === 'string' ? children : undefined
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      title={libelle}
      className={({ isActive }) =>
        [
          'relative flex items-center rounded-[8px] px-3 py-2.5 text-sm font-medium transition-colors duration-150',
          FOCUS,
          reduit ? 'justify-center' : 'gap-2.5',
          isActive
            ? 'bg-white/15 text-white [&_svg]:text-white'
            : 'text-white/75 hover:bg-white/10 hover:text-white [&_svg]:text-white/60 hover:[&_svg]:text-white',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute inset-y-1 start-0 w-[3px] rounded-full bg-action" aria-hidden />
          )}
          {sousLien && !reduit && (
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${isActive ? 'bg-white' : 'bg-white/50'}`}
              aria-hidden
            />
          )}
          {Icon && <Icon className="h-4 w-4 shrink-0" />}
          <span className={reduit ? 'sr-only' : 'truncate'}>{children}</span>
          {!reduit && badge}
        </>
      )}
    </NavLink>
  )
}

function Groupe({ label, icon: Icon, open, onToggle, active, children, reduit, premier, onNavigate }) {
  const panelId = useId()

  if (reduit) {
    return (
      <Lien to={premier} icon={Icon} onClick={onNavigate} reduit>
        {label}
      </Lien>
    )
  }

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className={[
          'flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2.5 text-sm font-medium transition-colors duration-150',
          FOCUS,
          active
            ? 'text-white [&_svg]:text-white'
            : 'text-white/75 [&_svg]:text-white/60 hover:[&_svg]:text-white',
          'hover:bg-white/10 hover:text-white',
        ].join(' ')}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-start">{label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition motion-reduce:transition-none rtl:-scale-x-100 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        id={panelId}
        className={[
          'grid transition-[grid-template-rows] duration-200 motion-reduce:transition-none',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        ].join(' ')}
      >
        <div className="overflow-hidden" inert={!open || undefined}>
          <div className="ms-4 mt-1 space-y-0.5 border-s border-white/10 ps-2">{children}</div>
        </div>
      </div>
    </div>
  )
}

function NavAdmin({ estSuperAdmin, nouvelles, onNavigate, reduit = false, afficherReduire = false, onToggleReduit }) {
  const location = useLocation()
  const { tf } = useLanguage()
  const accesActif = location.pathname.startsWith('/admin/utilisateurs') || location.pathname.startsWith('/admin/roles')
  const logsActif = location.pathname.startsWith('/admin/logs')
  const [stocke, setStocke] = useState(lireGroupes)

  const accesOpen = stocke.acces === true || stocke.acces === false ? stocke.acces : accesActif
  const logsOpen = stocke.logs === true || stocke.logs === false ? stocke.logs : logsActif

  const basculer = (id) => {
    setStocke((prev) => {
      const actuel = prev[id] === true || prev[id] === false ? prev[id] : id === 'acces' ? accesActif : logsActif
      const next = { ...prev, [id]: !actuel }
      ecrireGroupes(next)
      return next
    })
  }

  const badge = nouvelles > 0 && (
    <span
      className="ms-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-action px-1 text-[10px] font-semibold text-white"
      aria-label={tf('admin.layout.nouvellesDoleances', { n: nouvelles })}
    >
      {nouvelles > 99 ? '99+' : nouvelles}
    </span>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav className="scrollbar-menu flex-1 space-y-1 overflow-y-auto px-3 py-2" aria-label={tf('admin.layout.nav')}>
        <Intitule reduit={reduit}>{tf('admin.layout.sectionPilotage')}</Intitule>
        <Lien to="/admin/tableau-de-bord" end icon={LayoutDashboard} onClick={onNavigate} reduit={reduit}>
          {tf('admin.layout.tableauDeBord')}
        </Lien>
        <Lien to="/admin/doleances" icon={Inbox} badge={badge} onClick={onNavigate} reduit={reduit}>
          {tf('admin.layout.doleances')}
        </Lien>
        {estSuperAdmin && (
          <>
            <Intitule reduit={reduit}>{tf('admin.layout.sectionAdministration')}</Intitule>
            <Lien to="/admin/services" icon={Building2} onClick={onNavigate} reduit={reduit}>
              {tf('admin.layout.services')}
            </Lien>
            <Lien to="/admin/parametres" icon={Settings} onClick={onNavigate} reduit={reduit}>
              {tf('admin.layout.parametres')}
            </Lien>
            <Groupe
              label={tf('admin.layout.acces')}
              icon={Users}
              open={accesOpen}
              onToggle={() => basculer('acces')}
              active={accesActif}
              reduit={reduit}
              premier="/admin/utilisateurs"
              onNavigate={onNavigate}
            >
              <Lien to="/admin/utilisateurs" sousLien onClick={onNavigate}>
                {tf('admin.layout.utilisateurs')}
              </Lien>
              <Lien to="/admin/roles" sousLien onClick={onNavigate}>
                {tf('admin.layout.roles')}
              </Lien>
            </Groupe>
            <Groupe
              label={tf('admin.layout.logs')}
              icon={ScrollText}
              open={logsOpen}
              onToggle={() => basculer('logs')}
              active={logsActif}
              reduit={reduit}
              premier="/admin/logs"
              onNavigate={onNavigate}
            >
              <Lien to="/admin/logs" end sousLien onClick={onNavigate}>
                {tf('admin.layout.tableauDeBord')}
              </Lien>
              <Lien to="/admin/logs/journal" sousLien onClick={onNavigate}>
                {tf('admin.layout.journal')}
              </Lien>
            </Groupe>
          </>
        )}
      </nav>
      {afficherReduire && (
        <div className="px-3 py-2">
          <button
            type="button"
            onClick={onToggleReduit}
            title={reduit ? tf('admin.layout.agrandirMenu') : tf('admin.layout.reduireMenu')}
            aria-label={reduit ? tf('admin.layout.agrandirMenu') : tf('admin.layout.reduireMenu')}
            className={[
              'flex w-full items-center rounded-[8px] px-3 py-2.5 text-sm font-medium text-white/75 transition-colors duration-150',
              'hover:bg-white/10 hover:text-white [&_svg]:text-white/60 hover:[&_svg]:text-white',
              FOCUS,
              reduit ? 'justify-center' : 'gap-2.5',
            ].join(' ')}
          >
            {reduit ? (
              <PanelLeftOpen className="h-4 w-4 shrink-0 rtl:-scale-x-100" />
            ) : (
              <PanelLeftClose className="h-4 w-4 shrink-0 rtl:-scale-x-100" />
            )}
            <span className={reduit ? 'sr-only' : 'truncate'}>
              {reduit ? tf('admin.layout.agrandirMenu') : tf('admin.layout.reduireMenu')}
            </span>
          </button>
        </div>
      )}
    </div>
  )
}

function ColonneMenu({
  utilisateur,
  espace,
  roleBas,
  estSuperAdmin,
  nouvelles,
  reduit = false,
  afficherReduire = false,
  onToggleReduit,
  onFermer,
  fermerRef,
  onNavigate,
}) {
  const { t, tf } = useLanguage()
  const nom = [utilisateur?.prenom, utilisateur?.nom].filter(Boolean).join(' ')

  return (
    <>
      <div className="relative bg-gradient-to-b from-white/[0.06] to-transparent">
        <div className={`flex items-center ${reduit ? 'justify-center px-2 py-5' : 'gap-3.5 px-5 py-5'} ${onFermer ? 'pe-2' : ''}`}>
          <Link
            to="/admin/tableau-de-bord"
            onClick={() => {
              onFermer?.()
              onNavigate?.()
            }}
            aria-label={`${t.brand} — ${tf('admin.layout.tableauDeBord')}`}
            className={[
              'flex min-w-0 items-center rounded-[8px] transition-colors hover:bg-white/[0.04]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50',
              reduit ? 'justify-center' : 'flex-1 gap-3.5',
            ].join(' ')}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-md ring-2 ring-white/20 ring-offset-2 ring-offset-sidebar">
              <img src="/logoo.png" alt="" className="h-9 w-9 object-contain" width={100} height={100} />
            </span>
            {!reduit && (
              <span className="min-w-0 flex-1 text-start">
                <span className="block text-lg font-extrabold leading-none tracking-[0.08em] text-white">
                  {t.brand}
                </span>
                <span
                  className="mt-1.5 inline-flex max-w-[150px] items-center gap-1.5 truncate rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/80"
                  title={espace}
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-action" aria-hidden />
                  <span className="truncate">{espace}</span>
                </span>
              </span>
            )}
          </Link>
          {onFermer && (
            <button
              ref={fermerRef}
              type="button"
              className={`ms-auto shrink-0 rounded p-1 text-white/70 hover:text-white ${FOCUS}`}
              onClick={onFermer}
              aria-label={tf('admin.layout.fermerMenu')}
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" aria-hidden />
      </div>
      <NavAdmin
        estSuperAdmin={estSuperAdmin}
        nouvelles={nouvelles}
        onNavigate={onNavigate}
        reduit={reduit}
        afficherReduire={afficherReduire}
        onToggleReduit={onToggleReduit}
      />
      <div className="border-t border-white/10 px-3 py-4">
        <Link
          to="/admin/mon-compte"
          onClick={onNavigate}
          title={reduit ? nom || tf('admin.layout.monCompte') : undefined}
          className={[
            'flex items-center rounded-[8px] py-2 text-white transition-colors duration-150 hover:bg-white/10',
            FOCUS,
            reduit ? 'justify-center px-0' : 'gap-3 px-2',
          ].join(' ')}
        >
          <Avatar personne={utilisateur} size="md" />
          {!reduit && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{nom}</p>
                <p className="truncate text-xs text-white/70">{roleBas}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-white/60 rtl:-scale-x-100" aria-hidden />
            </>
          )}
        </Link>
        <Deconnexion reduit={reduit} />
      </div>
    </>
  )
}

function Deconnexion({ reduit }) {
  const { logout } = useAdminAuth()
  const { tf } = useLanguage()
  return (
    <button
      type="button"
      onClick={logout}
      title={reduit ? tf('admin.layout.deconnexion') : undefined}
      className={[
        'mt-2 flex items-center gap-2.5 rounded-[8px] py-2 text-sm text-white/75 transition-colors duration-150',
        'hover:bg-white/10 hover:text-white [&_svg]:text-white/60 hover:[&_svg]:text-white',
        FOCUS,
        reduit ? 'w-full justify-center px-0' : 'w-full px-3',
      ].join(' ')}
    >
      <LogOut className="h-3.5 w-3.5 shrink-0" />
      <span className={reduit ? 'sr-only' : undefined}>{tf('admin.layout.deconnexion')}</span>
    </button>
  )
}

export default function AdminLayout() {
  const { utilisateur, rafraichirProfil, estSuperAdmin } = useAdminAuth()
  const { tf } = useLanguage()
  const location = useLocation()
  const [drawer, setDrawer] = useState(false)
  const [reduit, setReduit] = useState(lireReduit)
  const hamburgerRef = useRef(null)
  const fermerRef = useRef(null)
  const etaitOuvert = useRef(false)
  const inactivite = useInactivite()

  useEffect(() => {
    rafraichirProfil().catch(() => {})
  }, [rafraichirProfil])

  useEffect(() => {
    setDrawer(false)
  }, [location.pathname])

  useEffect(() => {
    if (drawer) {
      etaitOuvert.current = true
      const precedent = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      const onKey = (e) => {
        if (e.key === 'Escape') setDrawer(false)
      }
      document.addEventListener('keydown', onKey)
      const t = window.setTimeout(() => fermerRef.current?.focus(), 50)
      return () => {
        document.body.style.overflow = precedent
        document.removeEventListener('keydown', onKey)
        window.clearTimeout(t)
      }
    }
    if (etaitOuvert.current) {
      etaitOuvert.current = false
      hamburgerRef.current?.focus()
    }
    return undefined
  }, [drawer])

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

  const basculerReduit = () => {
    setReduit((v) => {
      const next = !v
      ecrireReduit(next)
      return next
    })
  }

  const propsMenu = {
    utilisateur,
    espace,
    roleBas,
    estSuperAdmin,
    nouvelles,
  }

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
        <aside
          className={[
            'sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden bg-sidebar text-white transition-[width] duration-200 motion-reduce:transition-none lg:flex',
            reduit ? 'w-[72px]' : 'w-64',
          ].join(' ')}
        >
          <ColonneMenu
            {...propsMenu}
            reduit={reduit}
            afficherReduire
            onToggleReduit={basculerReduit}
          />
        </aside>

        <div
          className={['fixed inset-0 z-40 lg:hidden', drawer ? 'pointer-events-auto' : 'pointer-events-none'].join(' ')}
          aria-hidden={!drawer}
        >
          <div
            className={[
              'absolute inset-0 bg-black/40 transition-opacity duration-200 motion-reduce:transition-none',
              drawer ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
            onClick={() => setDrawer(false)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={tf('admin.layout.nav')}
            inert={!drawer || undefined}
            className={[
              'absolute inset-y-0 start-0 z-10 flex h-full w-64 flex-col bg-sidebar text-white',
              'transition-transform duration-200 motion-reduce:transition-none',
              drawer ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full',
            ].join(' ')}
          >
            <ColonneMenu
              {...propsMenu}
              onFermer={() => setDrawer(false)}
              fermerRef={fermerRef}
              onNavigate={() => setDrawer(false)}
            />
          </aside>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                ref={hamburgerRef}
                type="button"
                className="rounded-[8px] p-1.5 text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional/40 lg:hidden"
                onClick={() => setDrawer(true)}
                aria-label={tf('admin.layout.ouvrirMenu')}
                aria-expanded={drawer}
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

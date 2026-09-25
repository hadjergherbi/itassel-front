import { useEffect, useId, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Inbox,
  LogIn,
  RotateCcw,
  Settings,
  Users,
  X,
} from 'lucide-react'
import useAdminQuery from '../../lib/useAdminQuery'
import { endpoints } from '../../lib/endpoints'
import { extractBlobErrors, nomDepuisDisposition } from '../../lib/adminApi'
import { formatDate, nomComplet, statutKey } from '../../lib/statuts'
import { useLanguage } from '../../i18n/LanguageContext'
import { useToast } from '../../components/ui/Toast'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import FilterChips from '../../components/ui/FilterChips'
import FilterBar from '../../components/ui/FilterBar'
import SearchInput from '../../components/ui/SearchInput'
import { SelectInput } from '../../components/FormFields'
import DataTable from '../../components/admin/DataTable'
import Pagination from '../../components/ui/Pagination'
import ResultBadge from '../../components/ui/ResultBadge'
import EmptyState from '../../components/ui/EmptyState'
import Avatar from '../../components/ui/Avatar'
import StatusBadge from '../../components/StatusBadge'

const ICONES_CAT = {
  connexion: LogIn,
  doleance: Inbox,
  affectation: ArrowRightLeft,
  utilisateur: Users,
  parametre: Settings,
  export: Download,
}

const COULEURS_CAT = {
  connexion: 'text-nouvelle',
  doleance: 'text-en-cours',
  affectation: 'text-info-demandee',
  utilisateur: 'text-resolue',
  parametre: 'text-double',
  export: 'text-reclasser',
}

const PERIODES = ['aujourdhui', '7j', '30j', '3m', 'personnalisee']

function normaliserCat(code) {
  const c = String(code ?? '').toLowerCase()
  const alias = {
    connexions: 'connexion',
    doleances: 'doleance',
    affectations: 'affectation',
    utilisateurs: 'utilisateur',
    parametres: 'parametre',
    exports: 'export',
  }
  return alias[c] || c
}

function estChangementStatut(r) {
  return String(r.action ?? r.action_code ?? '').toLowerCase().includes('changement_statut')
}

function estSuppression(r) {
  return /supprim|delete/.test(String(r.action ?? r.action_code ?? '').toLowerCase())
}

function jourIso(valeur) {
  if (!valeur) return ''
  const d = new Date(valeur)
  if (Number.isNaN(d.getTime())) return String(valeur).slice(0, 10)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function memeJour(a, b) {
  return jourIso(a) === jourIso(b)
}

function formatHeure(iso, locale) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(`${locale}-u-nu-latn`, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    numberingSystem: 'latn',
  }).format(d)
}

function libelleGroupe(iso, locale, tf) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  const now = new Date()
  if (memeJour(d, now)) return tf('admin.journal.aujourdhui')
  const hier = new Date(now)
  hier.setDate(hier.getDate() - 1)
  if (memeJour(d, hier)) return tf('admin.journal.hier')
  return new Intl.DateTimeFormat(`${locale}-u-nu-latn`, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    numberingSystem: 'latn',
  }).format(d)
}

function IconeCategorie({ code, sensible, className = 'h-4 w-4' }) {
  if (sensible) return <AlertTriangle className={`${className} text-danger-text`} aria-hidden />
  const cat = normaliserCat(code)
  const Icone = ICONES_CAT[cat] || Inbox
  return <Icone className={`${className} ${COULEURS_CAT[cat] || 'text-gray-400'}`} aria-hidden />
}

function LienCible({ cible, onNavigate }) {
  if (!cible) return null
  const texte = cible.libelle || cible.lien || ''
  const ref = /ITS-\d/i.test(texte) || /ITS-\d/i.test(cible.lien || '')
  const to = cible.lien
    ? cible.lien.startsWith('/')
      ? cible.lien
      : `/${cible.lien.replace(/^\//, '')}`
    : null
  if (!to) return <span>{texte}</span>
  return (
    <Link
      to={to}
      onClick={(e) => {
        e.stopPropagation()
        onNavigate?.()
      }}
      className={
        ref
          ? 'ltr-isolate font-mono text-sm font-semibold text-institutional hover:underline'
          : 'text-sm font-medium text-institutional hover:underline'
      }
    >
      {texte}
    </Link>
  )
}

function DetailCell({ r }) {
  if (estChangementStatut(r)) {
    const avant = r.statut_avant ?? r.detail?.statut_avant
    const apres = r.statut_apres ?? r.detail?.statut_apres
    if (avant || apres) {
      return (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <StatusBadge status={statutKey(avant)} label={avant?.libelle} showDot />
          <ArrowRight className="h-3.5 w-3.5 text-gray-400 rtl:-scale-x-100" aria-hidden />
          <StatusBadge status={statutKey(apres)} label={apres?.libelle} showDot />
        </span>
      )
    }
  }
  if (!r.cible && estSuppression(r)) {
    return (
      <span className="text-gray-400 line-through">{r.detail_lisible || r.detail || r.cible?.libelle || '—'}</span>
    )
  }
  return (
    <span className="text-gray-600">
      {r.detail_lisible || r.detail || ''}
      {r.cible?.lien && (
        <>
          {r.detail_lisible || r.detail ? ' ' : ''}
          <LienCible cible={r.cible} />
        </>
      )}
    </span>
  )
}

function CelluleUtilisateur({ r }) {
  if (r.utilisateur) {
    const role = [r.utilisateur.libelle_role, r.utilisateur.service?.nom_service ?? r.utilisateur.service]
      .filter(Boolean)
      .join(' · ')
    return (
      <div className="flex items-center gap-2">
        <Avatar personne={r.utilisateur} size="sm" />
        <div className="min-w-0">
          <p className="truncate font-medium text-gray-900">{nomComplet(r.utilisateur)}</p>
          {role && <p className="truncate text-xs text-gray-500">{role}</p>}
        </div>
      </div>
    )
  }
  return (
    <p className="italic text-gray-500">{r.compte || r.email_tente || '—'}</p>
  )
}

function CarteMobile({ r, locale }) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-900">
          <IconeCategorie code={r.categorie} sensible={r.sensible} />
          <span className={r.sensible ? 'text-danger-text' : undefined}>{r.action_libelle ?? r.action}</span>
        </span>
        <span className="ltr-isolate shrink-0 font-mono text-xs text-gray-500">
          {formatHeure(r.date_action ?? r.date, locale)}
        </span>
      </div>
      <div className="text-sm">
        <DetailCell r={r} />
      </div>
      <CelluleUtilisateur r={r} />
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
        <span className="ltr-isolate font-mono">{r.adresse_ip ?? r.ip ?? '—'}</span>
        <ResultBadge result={r.resultat} />
      </div>
    </div>
  )
}

function DrawerJournal({ id, onClose, onOuvrir, fermerRef }) {
  const { tf, locale } = useLanguage()
  const titreId = useId()
  const { data, loadState, erreur, reload } = useAdminQuery(id ? `/admin/journaux/${id}` : '', {
    enabled: Boolean(id),
    fallback: tf('admin.journal.erreurLigne'),
    fetcher: () => endpoints.journalLigne(id),
  })
  const ligne = data?.ligne ?? data
  const autres = ligne?.autres_actions ?? ligne?.autres ?? data?.autres_actions ?? []
  const ouvert = Boolean(id)

  return (
    <div
      className={['fixed inset-0 z-40', ouvert ? 'pointer-events-auto' : 'pointer-events-none'].join(' ')}
      aria-hidden={!ouvert}
    >
      <div
        className={[
          'absolute inset-0 bg-black/40 transition-opacity duration-200 motion-reduce:transition-none',
          ouvert ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titreId}
        inert={!ouvert || undefined}
        className={[
          'absolute inset-y-0 end-0 z-10 flex h-full w-full max-w-md flex-col bg-white shadow-xl',
          'transition-transform duration-200 motion-reduce:transition-none',
          ouvert ? 'translate-x-0' : 'ltr:translate-x-full rtl:-translate-x-full',
        ].join(' ')}
      >
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <h2 id={titreId} className="text-base font-bold text-gray-900">
            {tf('admin.journal.detailTitre')}
          </h2>
          <button
            ref={fermerRef}
            type="button"
            onClick={onClose}
            className="rounded-[8px] p-1.5 text-gray-500 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional/40"
            aria-label={tf('admin.journal.fermer')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loadState === 'loading' && !ligne?.id_journal && !ligne?.id && (
            <p className="text-sm text-gray-500">{tf('admin.journal.chargement')}</p>
          )}
          {loadState === 'error' && !ligne?.action && (
            <div>
              <p className="mb-3 text-sm text-red-600">{erreur}</p>
              <Button onClick={reload}>{tf('admin.journal.retry')}</Button>
            </div>
          )}
          {ligne && (ligne.action || ligne.action_libelle) && (
            <dl className="space-y-3 text-sm">
              <LigneDetail label={tf('admin.journal.date')}>
                {formatDate(ligne.date_action ?? ligne.date)}
              </LigneDetail>
              <LigneDetail label={tf('admin.journal.colAction')}>
                <span className="inline-flex items-center gap-1.5">
                  <IconeCategorie code={ligne.categorie} sensible={ligne.sensible} />
                  {ligne.action_libelle ?? ligne.action}
                </span>
              </LigneDetail>
              <LigneDetail label={tf('admin.journal.categorie')}>
                {tf(`admin.logsDashboard.categories.${normaliserCat(ligne.categorie)}`)}
              </LigneDetail>
              <LigneDetail label={tf('admin.journal.colResultat')}>
                <ResultBadge result={ligne.resultat} />
              </LigneDetail>
              <LigneDetail label={tf('admin.journal.compte')}>
                {ligne.utilisateur ? nomComplet(ligne.utilisateur) : ligne.compte || ligne.email_tente || '—'}
              </LigneDetail>
              <LigneDetail label={tf('admin.journal.ip')}>
                <span className="ltr-isolate font-mono text-xs">{ligne.adresse_ip ?? ligne.ip ?? '—'}</span>
              </LigneDetail>
              <LigneDetail label={tf('admin.journal.detail')}>
                <DetailCell r={ligne} />
              </LigneDetail>
              {(ligne.navigateur || ligne.user_agent) && (
                <LigneDetail label={tf('admin.journal.navigateur')}>
                  <span className="break-all text-xs text-gray-600">{ligne.navigateur || ligne.user_agent}</span>
                </LigneDetail>
              )}
              {ligne.cible?.lien && (
                <LigneDetail label={tf('admin.journal.cible')}>
                  <LienCible cible={ligne.cible} onNavigate={onClose} />
                </LigneDetail>
              )}
            </dl>
          )}
          <div className="mt-6 border-t border-gray-100 pt-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-900">{tf('admin.journal.autresTitre')}</h3>
            {autres.length === 0 ? (
              <p className="text-xs text-gray-500">{tf('admin.journal.aucuneAutre')}</p>
            ) : (
              <ul className="space-y-1">
                {autres.map((a) => {
                  const aid = a.id_journal ?? a.id
                  return (
                    <li key={aid}>
                      <button
                        type="button"
                        onClick={() => onOuvrir(aid)}
                        className="flex w-full items-center justify-between gap-2 rounded-[8px] px-2 py-2 text-start text-sm hover:bg-gray-50"
                      >
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                          <IconeCategorie code={a.categorie} sensible={a.sensible} className="h-3.5 w-3.5" />
                          <span className="truncate">{a.action_libelle ?? a.action}</span>
                        </span>
                        <span className="ltr-isolate shrink-0 font-mono text-xs text-gray-400">
                          {formatHeure(a.date_action ?? a.date, locale)}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}

function LigneDetail({ label, children }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-gray-800">{children}</dd>
    </div>
  )
}

function MenuExportJournal({ disabled, loading, onExport, tf }) {
  const [ouvert, setOuvert] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!ouvert) return undefined
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) setOuvert(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOuvert(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [ouvert])

  const choisir = (format) => {
    setOuvert(false)
    onExport(format)
  }

  return (
    <div ref={rootRef} className="relative">
      <Button
        variant="secondary"
        onClick={() => setOuvert((v) => !v)}
        loading={loading}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={ouvert}
      >
        <Download className="h-4 w-4" aria-hidden />
        {tf('admin.journal.exporter')}
        <ChevronDown className="h-4 w-4" aria-hidden />
      </Button>
      {ouvert && !loading && (
        <div
          role="menu"
          className="absolute end-0 z-20 mt-1 min-w-64 overflow-hidden rounded-[8px] border border-gray-200 bg-white py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => choisir('csv')}
            className="flex w-full items-center gap-2 px-3 py-2 text-start text-sm text-gray-800 hover:bg-gray-50"
          >
            <FileSpreadsheet className="h-4 w-4 text-institutional" aria-hidden />
            {tf('admin.journal.exporterCsv')}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => choisir('pdf')}
            className="flex w-full items-center gap-2 px-3 py-2 text-start text-sm text-gray-800 hover:bg-gray-50"
          >
            <FileText className="h-4 w-4 text-institutional" aria-hidden />
            {tf('admin.journal.exporterPdf')}
          </button>
        </div>
      )}
    </div>
  )
}

export default function AdminJournal() {
  const { tf, locale } = useLanguage()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [exportBusy, setExportBusy] = useState(false)
  const [exportErreur, setExportErreur] = useState('')
  const [proposerCsv, setProposerCsv] = useState(false)
  const [selection, setSelection] = useState(null)
  const fermerRef = useRef(null)
  const declencheurRef = useRef(null)
  const etaitOuvert = useRef(false)

  const q = params.get('q') ?? ''
  const categorie = params.get('categorie') ?? ''
  const periodeBrute = params.get('periode') ?? ''
  const dateDebut = params.get('date_debut') ?? ''
  const dateFin = params.get('date_fin') ?? ''
  const resultat = params.get('resultat') ?? ''
  const utilisateurId = params.get('utilisateur') ?? ''
  const sensible = params.get('sensible') === '1'
  const action = params.get('action') ?? ''
  const page = Number(params.get('page') || 1)
  const periode =
    PERIODES.includes(periodeBrute) ? periodeBrute : dateDebut || dateFin ? 'personnalisee' : ''

  const { data: usersData } = useAdminQuery('/admin/utilisateurs', {
    fetcher: () => endpoints.utilisateurs(),
  })
  const utilisateurs = usersData?.data ?? usersData ?? []
  const listeUsers = Array.isArray(utilisateurs) ? utilisateurs : utilisateurs.data ?? []

  const set = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next)
  }

  const setPeriode = (value) => {
    const next = new URLSearchParams(params)
    if (value) next.set('periode', value)
    else next.delete('periode')
    if (value !== 'personnalisee') {
      next.delete('date_debut')
      next.delete('date_fin')
    }
    next.delete('page')
    setParams(next)
  }

  const reinitialiser = () => setParams({})

  const queryParams = {
    q: q || undefined,
    categorie: categorie || undefined,
    periode: periode && periode !== 'personnalisee' ? periode : undefined,
    date_debut: dateDebut || undefined,
    date_fin: dateFin || undefined,
    resultat: resultat || undefined,
    utilisateur: utilisateurId || undefined,
    sensible: sensible ? 1 : undefined,
    action: action || undefined,
    page,
  }

  const { data, loadState, erreur, reload } = useAdminQuery('/admin/journaux', {
    params: queryParams,
    fallback: tf('admin.journal.erreur'),
    fetcher: (p) => endpoints.journal(p),
  })

  const lignes = data?.data ?? []
  const total = Number(data?.total ?? lignes.length)

  const filtresActifs = Boolean(
    q || categorie || periode || resultat || utilisateurId || sensible || action || dateDebut || dateFin,
  )

  useEffect(() => {
    if (selection) {
      etaitOuvert.current = true
      const precedent = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      const onKey = (e) => {
        if (e.key === 'Escape') setSelection(null)
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
      declencheurRef.current?.focus()
    }
    return undefined
  }, [selection])

  const exporter = async (format) => {
    if (!total) return
    setExportBusy(true)
    setExportErreur('')
    setProposerCsv(false)
    try {
      const filtres = { ...queryParams, format }
      delete filtres.page
      const res = await endpoints.exportJournal(filtres)
      const type = String(res.headers['content-type'] ?? '')
      if (type.includes('application/json')) {
        const json = JSON.parse(await res.data.text())
        const message = json.message || tf('admin.journal.exportEchec')
        if (json.code === 'export_trop_volumineux') {
          toast.show('error', `${message} ${tf('admin.journal.proposerCsv')}`)
          setExportErreur(message)
          setProposerCsv(true)
        } else {
          setExportErreur(message)
        }
        return
      }
      const jour = new Date().toISOString().slice(0, 10)
      const fallback = `journal_${jour}.${format}`
      const nom = nomDepuisDisposition(res.headers['content-disposition'], fallback)
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data])
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = nom
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      const { message, code } = await extractBlobErrors(err, tf('admin.journal.exportEchec'))
      if (code === 'export_trop_volumineux') {
        toast.show('error', `${message} ${tf('admin.journal.proposerCsv')}`)
        setExportErreur(message)
        setProposerCsv(true)
      } else {
        setExportErreur(message)
      }
    } finally {
      setExportBusy(false)
    }
  }

  const puces = [
    { value: '', label: tf('admin.journal.toutes') },
    { value: 'connexion', label: tf('admin.logsDashboard.categories.connexion'), icon: LogIn },
    { value: 'doleance', label: tf('admin.logsDashboard.categories.doleance'), icon: Inbox },
    { value: 'affectation', label: tf('admin.logsDashboard.categories.affectation'), icon: ArrowRightLeft },
    { value: 'utilisateur', label: tf('admin.logsDashboard.categories.utilisateur'), icon: Users },
    { value: 'parametre', label: tf('admin.logsDashboard.categories.parametre'), icon: Settings },
    { value: 'export', label: tf('admin.logsDashboard.categories.export'), icon: Download },
  ]

  const groupes = []
  const index = new Map()
  lignes.forEach((r) => {
    const id = jourIso(r.date_action ?? r.date) || 'autre'
    if (!index.has(id)) {
      const g = { id, label: libelleGroupe(r.date_action ?? r.date, locale, tf), rows: [] }
      index.set(id, g)
      groupes.push(g)
    }
    index.get(id).rows.push(r)
  })

  const colonnes = [
    {
      id: 'date',
      header: tf('admin.journal.colHeure'),
      className: 'whitespace-nowrap font-mono text-xs text-gray-600',
      cell: (r) => formatHeure(r.date_action ?? r.date, locale),
    },
    {
      id: 'action',
      header: tf('admin.journal.colAction'),
      cell: (r) => (
        <span className={`inline-flex items-center gap-2 ${r.sensible ? 'text-danger-text' : 'text-gray-900'}`}>
          <IconeCategorie code={r.categorie} sensible={r.sensible} />
          <span className="font-medium">{r.action_libelle ?? r.action}</span>
        </span>
      ),
    },
    {
      id: 'detail',
      header: tf('admin.journal.colDetail'),
      cell: (r) => <DetailCell r={r} />,
    },
    {
      id: 'user',
      header: tf('admin.journal.colUtilisateur'),
      cell: (r) => <CelluleUtilisateur r={r} />,
    },
    {
      id: 'ip',
      header: tf('admin.journal.colIp'),
      headerClassName: 'whitespace-nowrap',
      className: 'whitespace-nowrap font-mono text-xs',
      cell: (r) => r.adresse_ip ?? r.ip ?? '—',
    },
    {
      id: 'resultat',
      header: tf('admin.journal.colResultat'),
      cell: (r) => <ResultBadge result={r.resultat} />,
    },
  ]

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={tf('admin.journal.titre')}
        subtitle={tf('admin.journal.sousTitre')}
        actions={
          <MenuExportJournal
            disabled={!total}
            loading={exportBusy}
            onExport={exporter}
            tf={tf}
          />
        }
      />
      {exportErreur && (
        <div className="mb-4 flex flex-wrap items-center gap-3" role="alert">
          <p className="text-sm text-red-600">{exportErreur}</p>
          {proposerCsv && (
            <Button variant="secondary" size="sm" onClick={() => exporter('csv')} loading={exportBusy}>
              <FileSpreadsheet className="h-4 w-4" aria-hidden />
              {tf('admin.journal.exporterCsv')}
            </Button>
          )}
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterChips items={puces} value={categorie} onChange={(v) => set('categorie', v)} />
        <FilterChips
          items={[
            {
              value: '1',
              label: tf('admin.journal.sensibles'),
              icon: AlertTriangle,
              tone: 'warning',
            },
          ]}
          value={sensible ? '1' : ''}
          onChange={(v) => set('sensible', v === '1' && !sensible ? '1' : '')}
        />
      </div>
      <FilterBar>
        <SearchInput
          id="journal-q"
          value={q}
          onChange={(e) => set('q', e.target.value)}
          placeholder={tf('admin.journal.qPlaceholder')}
        />
        <div className="lg:w-52">
          <SelectInput
            value={utilisateurId}
            onChange={(e) => set('utilisateur', e.target.value)}
            aria-label={tf('admin.journal.tousUtilisateurs')}
          >
            <option value="">{tf('admin.journal.tousUtilisateurs')}</option>
            {listeUsers.map((u) => (
              <option key={u.id_utilisateur} value={String(u.id_utilisateur)}>
                {nomComplet(u)}
              </option>
            ))}
          </SelectInput>
        </div>
        <div className="lg:w-44">
          <SelectInput
            value={periode}
            onChange={(e) => setPeriode(e.target.value)}
            aria-label={tf('admin.journal.periode')}
          >
            <option value="">{tf('admin.journal.toutesDates')}</option>
            <option value="aujourdhui">{tf('admin.journal.aujourdhui')}</option>
            <option value="7j">{tf('admin.logsDashboard.7j')}</option>
            <option value="30j">{tf('admin.logsDashboard.30j')}</option>
            <option value="3m">{tf('admin.journal.m3')}</option>
            <option value="personnalisee">{tf('admin.journal.personnalisee')}</option>
          </SelectInput>
        </div>
        {periode === 'personnalisee' && (
          <>
            <div className="lg:w-40">
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => set('date_debut', e.target.value)}
                aria-label={tf('admin.journal.dateDebut')}
                className="w-full rounded-[8px] border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-institutional focus:ring-2 focus:ring-institutional/20"
              />
            </div>
            <div className="lg:w-40">
              <input
                type="date"
                value={dateFin}
                onChange={(e) => set('date_fin', e.target.value)}
                aria-label={tf('admin.journal.dateFin')}
                className="w-full rounded-[8px] border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-institutional focus:ring-2 focus:ring-institutional/20"
              />
            </div>
          </>
        )}
        <div className="lg:w-44">
          <SelectInput
            value={resultat}
            onChange={(e) => set('resultat', e.target.value)}
            aria-label={tf('admin.journal.resultat')}
          >
            <option value="">{tf('admin.journal.tousResultats')}</option>
            <option value="succes">{tf('admin.journal.succes')}</option>
            <option value="echec">{tf('admin.journal.echecs')}</option>
          </SelectInput>
        </div>
        <Button variant="secondary" onClick={reinitialiser} disabled={!filtresActifs}>
          <RotateCcw className="h-4 w-4" /> {tf('admin.journal.reinitialiser')}
        </Button>
      </FilterBar>

      <p className="mb-3 text-sm text-gray-600">{tf('admin.journal.nActions', { n: total })}</p>

      <div className="overflow-hidden rounded-[8px] border border-gray-200 bg-white shadow-sm">
        {loadState === 'error' && !data ? (
          <div className="p-8 text-center">
            <p className="mb-4 text-sm text-red-600">{erreur}</p>
            <Button onClick={reload}>{tf('admin.journal.retry')}</Button>
          </div>
        ) : (
          <DataTable
            columns={colonnes}
            groups={groupes}
            rows={lignes}
            rowKey={(r) => r.id_journal ?? r.id}
            compact
            hoverClassName="hover:bg-gray-50"
            onRowClick={(r) => {
              declencheurRef.current = document.activeElement
              setSelection(r.id_journal ?? r.id)
            }}
            rowClassName={(r) => (r.sensible ? 'bg-danger-bg/40' : '')}
            loading={loadState === 'loading'}
            mobileCard={(r) => <CarteMobile r={r} locale={locale} />}
            emptyState={
              <EmptyState
                title={tf('admin.journal.vide')}
                action={
                  <Button variant="secondary" onClick={reinitialiser}>
                    <RotateCcw className="h-4 w-4" /> {tf('admin.journal.reinitialiser')}
                  </Button>
                }
              />
            }
            pagination={
              <div className="px-4 pb-4">
                <Pagination
                  paginator={
                    data
                      ? {
                          ...data,
                          onPage: (p) => set('page', String(p)),
                        }
                      : null
                  }
                />
              </div>
            }
          />
        )}
      </div>

      <DrawerJournal
        id={selection}
        onClose={() => setSelection(null)}
        onOuvrir={setSelection}
        fermerRef={fermerRef}
      />
    </div>
  )
}

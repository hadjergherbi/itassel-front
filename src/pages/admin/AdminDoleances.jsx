import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Download, Eye, Inbox, RotateCcw } from 'lucide-react'
import StatusBadge from '../../components/StatusBadge'
import DataTable from '../../components/admin/DataTable'
import { ReaffecterDirectModal } from '../../components/admin/ReaffectationPanel'
import { SelectInput } from '../../components/FormFields'
import { useAdminAuth } from '../../admin/AdminAuthContext'
import adminApi, { extractErrors } from '../../lib/adminApi'
import api from '../../lib/api'
import useAdminQuery from '../../lib/useAdminQuery'
import { endpoints } from '../../lib/endpoints'
import { formatDate, statutKey } from '../../lib/statuts'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import IconButton from '../../components/ui/IconButton'
import FilterChips from '../../components/ui/FilterChips'
import FilterBar from '../../components/ui/FilterBar'
import SearchInput from '../../components/ui/SearchInput'
import Pagination from '../../components/ui/Pagination'
import EmptyState from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/Toast'

const PERIODES = [
  { value: '', label: 'Toutes les dates' },
  { value: '7j', label: '7 derniers jours' },
  { value: '30j', label: '30 derniers jours' },
  { value: '3m', label: '3 derniers mois' },
  { value: 'annee', label: 'Cette année' },
]

function nomServiceUtilisateur(utilisateur) {
  return utilisateur?.service?.nom ?? utilisateur?.service?.nom_service ?? ''
}

function nomFichierExport() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `doleances-${yyyy}-${mm}-${dd}.csv`
}

export default function AdminDoleances() {
  const { utilisateur, estSuperAdmin } = useAdminAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const [statuts, setStatuts] = useState([])
  const [services, setServices] = useState([])
  const [natures, setNatures] = useState([])
  const [recherche, setRecherche] = useState(params.get('q') ?? '')
  const [exportBusy, setExportBusy] = useState(false)
  const [exportErreur, setExportErreur] = useState('')
  const [reaffecter, setReaffecter] = useState(null)

  const statut = params.get('statut') ?? ''
  const service = params.get('service') ?? ''
  const nature = params.get('nature') ?? ''
  const periode = params.get('periode') ?? ''
  const q = params.get('q') ?? ''
  const aExaminer = params.get('a_examiner') === '1'
  const reaffectationAttente = params.get('reaffectation') === 'en_attente'
  const sansResponsable = params.get('sans_responsable') === '1'
  const aReclasser = params.get('a_reclasser') === '1'
  const page = Number(params.get('page') || 1)

  const set = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next)
  }

  const queryParams = useMemo(
    () => ({
      statut: statut || undefined,
      service: service || undefined,
      q: q || undefined,
      nature: nature || undefined,
      periode: periode || undefined,
      a_examiner: aExaminer ? 1 : undefined,
      reaffectation: reaffectationAttente ? 'en_attente' : undefined,
      sans_responsable: sansResponsable ? 1 : undefined,
      a_reclasser: aReclasser ? 1 : undefined,
      page,
    }),
    [statut, service, q, nature, periode, aExaminer, reaffectationAttente, sansResponsable, aReclasser, page],
  )

  const { data, loadState, erreur, reload } = useAdminQuery('/admin/doleances', {
    params: queryParams,
    fallback: 'Impossible de charger les doléances.',
    fetcher: (p) => endpoints.doleances(p),
  })

  useEffect(() => {
    adminApi.get('/admin/statuts').then((res) => setStatuts(res.data ?? [])).catch(() => setStatuts([]))
    api
      .get('/referentiels')
      .then((res) => {
        setNatures(res.data?.natures ?? [])
        if (estSuperAdmin) setServices(res.data?.services ?? [])
      })
      .catch(() => {
        setNatures([])
        setServices([])
      })
  }, [estSuperAdmin])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (recherche.trim() !== q) set('q', recherche.trim())
    }, 350)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recherche])

  const resultat = data?.doleances ?? null
  const compteurs = data?.compteurs && !Array.isArray(data.compteurs) ? data.compteurs : {}
  const resume = data?.resume ?? {}
  const aExaminerTotal = Number(resume.a_examiner ?? data?.a_examiner ?? 0)
  const reaffectationsAttenteTotal = Number(
    resume.reaffectations_en_attente ?? data?.reaffectations_en_attente ?? 0,
  )
  const sansResponsableTotal = Number(resume.sans_responsable ?? data?.sans_responsable ?? 0)
  const aReclasserTotal = Number(
    resume.a_reclasser?.total ?? resume.a_reclasser ?? data?.a_reclasser ?? 0,
  )
  const totalCompteurs = Object.values(compteurs).reduce((sum, n) => sum + Number(n || 0), 0)
  const totalAffiche = resultat?.total ?? totalCompteurs
  const lignes = resultat?.data ?? []

  const filtresActifs = Boolean(
    statut || service || q || nature || periode || aExaminer || reaffectationAttente || sansResponsable || aReclasser,
  )

  const reinitialiser = () => {
    setRecherche('')
    setParams({})
  }

  const exporter = async () => {
    if (exportBusy) return
    setExportBusy(true)
    setExportErreur('')
    try {
      const res = await adminApi.get('/admin/doleances/export', {
        params: { ...queryParams, page: undefined },
        responseType: 'blob',
      })
      const type = String(res.headers['content-type'] ?? '')
      if (type.includes('application/json')) {
        const texte = await res.data.text()
        const json = JSON.parse(texte)
        setExportErreur(json.message || "L'export a échoué.")
        return
      }
      const url = URL.createObjectURL(res.data)
      const lien = document.createElement('a')
      lien.href = url
      lien.download = nomFichierExport()
      document.body.appendChild(lien)
      lien.click()
      lien.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      let message = extractErrors(err, "L'export a échoué.").message
      const blob = err.response?.data
      if (blob instanceof Blob) {
        try {
          const json = JSON.parse(await blob.text())
          if (json.message) message = json.message
        } catch {
          // garder le message axios
        }
      }
      setExportErreur(message)
    } finally {
      setExportBusy(false)
    }
  }

  const serviceTitre = estSuperAdmin
    ? service
      ? services.find((s) => String(s.id_service) === service)?.nom_service || 'Service'
      : 'Tous les services'
    : nomServiceUtilisateur(utilisateur)

  const chips = [
    { value: 'toutes', label: 'Toutes', count: totalCompteurs },
    ...(estSuperAdmin
      ? [{ value: 'sans_responsable', label: 'Service sans responsable', count: sansResponsableTotal, tone: 'warning' }]
      : []),
    ...(estSuperAdmin
      ? [{ value: 'reaffectation', label: 'Demandes de réaffectation', count: reaffectationsAttenteTotal, tone: 'warning' }]
      : []),
    { value: 'a_examiner', label: 'Compléments à examiner', count: aExaminerTotal, tone: 'warning' },
    ...(aReclasserTotal > 0
      ? [{ value: 'a_reclasser', label: 'À reclasser', count: aReclasserTotal, tone: 'warning' }]
      : []),
    ...statuts.map((s) => ({
      value: `statut:${s.id_statut}`,
      label: s.libelle,
      count: compteurs[s.id_statut] ?? 0,
    })),
  ]

  const chipActif = sansResponsable
    ? 'sans_responsable'
    : reaffectationAttente
      ? 'reaffectation'
      : aExaminer
        ? 'a_examiner'
        : aReclasser
          ? 'a_reclasser'
          : statut
            ? `statut:${statut}`
            : 'toutes'

  const onChip = (value) => {
    const next = new URLSearchParams(params)
    next.delete('page')
    next.delete('sans_responsable')
    next.delete('reaffectation')
    next.delete('a_examiner')
    next.delete('a_reclasser')
    next.delete('statut')
    if (value === 'sans_responsable') next.set('sans_responsable', '1')
    else if (value === 'reaffectation') next.set('reaffectation', 'en_attente')
    else if (value === 'a_examiner') next.set('a_examiner', '1')
    else if (value === 'a_reclasser') next.set('a_reclasser', '1')
    else if (String(value).startsWith('statut:')) next.set('statut', String(value).slice(7))
    setParams(next)
  }

  const colonnes = [
    {
      id: 'reference',
      header: 'Référence',
      className: 'font-mono text-xs font-semibold text-institutional',
      cell: (d) => (
        <Link to={`/admin/doleances/${d.reference}`} onClick={(e) => e.stopPropagation()} className="hover:underline">
          {d.reference}
        </Link>
      ),
    },
    {
      id: 'nom',
      header: 'Nom',
      className: 'text-gray-800',
      cell: (d) => [d.prenom, d.nom].filter(Boolean).join(' ') || '—',
    },
    {
      id: 'categorie',
      header: 'Catégorie',
      className: 'text-gray-700',
      cell: (d) => d.nature?.libelle ?? '—',
    },
    ...(estSuperAdmin
      ? [
          {
            id: 'service',
            header: 'Service',
            className: 'text-gray-700',
            cell: (d) => d.service?.nom_service ?? '—',
          },
        ]
      : []),
    {
      id: 'date',
      header: 'Date',
      className: 'whitespace-nowrap font-mono text-xs text-gray-600',
      cell: (d) => formatDate(d.date_depot, { withTime: false }),
    },
    {
      id: 'statut',
      header: 'Statut',
      cell: (d) => (
        <div className="space-y-1">
          <StatusBadge status={statutKey(d.statut)} label={d.statut?.libelle} showDot />
          {d.reaffectation_en_attente && (
            <p className="text-xs font-medium text-warning-text">Réaffectation demandée</p>
          )}
          {d.complement_a_examiner && (
            <p className="text-xs font-medium text-warning-text">Complément reçu</p>
          )}
        </div>
      ),
    },
    {
      id: 'responsable',
      header: 'Responsable',
      cell: (d) =>
        d.responsable ? (
          <span className="text-gray-700">
            {d.responsable.prenom} {d.responsable.nom}
          </span>
        ) : (
          <span className="rounded-full bg-warning-bg px-2 py-0.5 text-xs font-medium text-warning-text">
            Service sans responsable
          </span>
        ),
    },
    {
      id: 'actions',
      header: 'Actions',
      headerClassName: 'min-w-[140px]',
      cell: (d) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Link to={`/admin/doleances/${d.reference}`}>
            <IconButton label="Ouvrir">
              <Eye className="h-4 w-4" />
            </IconButton>
          </Link>
          {estSuperAdmin && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setReaffecter(d)}
            >
              Réaffecter
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={estSuperAdmin ? 'Toutes les doléances' : 'Doléances'}
        subtitle={
          estSuperAdmin
            ? `Vue globale · ${totalAffiche} doléance${totalAffiche === 1 ? '' : 's'}`
            : `Service ${serviceTitre} · ${totalAffiche} doléance${totalAffiche === 1 ? '' : 's'}`
        }
        actions={
          <Button variant="secondary" onClick={exporter} loading={exportBusy}>
            <Download className="h-4 w-4" /> Exporter en CSV
          </Button>
        }
      />

      {exportErreur && (
        <p className="mb-4 rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {exportErreur}
        </p>
      )}

      <div className="mb-4">
        <FilterChips items={chips} value={chipActif} onChange={onChip} />
      </div>

      <FilterBar>
        <SearchInput
          id="admin-recherche"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Référence ou nom"
        />
        {estSuperAdmin && (
          <div className="lg:w-52">
            <SelectInput
              id="admin-service"
              value={service}
              onChange={(e) => set('service', e.target.value)}
              aria-label="Tous les services"
            >
              <option value="">Tous les services</option>
              {services.map((s) => (
                <option key={s.id_service} value={String(s.id_service)}>
                  {s.nom_service}
                </option>
              ))}
            </SelectInput>
          </div>
        )}
        <div className="lg:w-52">
          <SelectInput
            id="admin-nature"
            value={nature}
            onChange={(e) => set('nature', e.target.value)}
            aria-label="Toutes les catégories"
          >
            <option value="">Toutes les catégories</option>
            {natures.map((n) => (
              <option key={n.id_nature} value={String(n.id_nature)}>
                {n.libelle}
              </option>
            ))}
          </SelectInput>
        </div>
        <div className="lg:w-52">
          <SelectInput
            id="admin-periode"
            value={periode}
            onChange={(e) => set('periode', e.target.value)}
            aria-label="Toutes les dates"
          >
            {PERIODES.map((p) => (
              <option key={p.value || 'toutes'} value={p.value}>
                {p.label}
              </option>
            ))}
          </SelectInput>
        </div>
        <Button variant="secondary" onClick={reinitialiser} disabled={!filtresActifs}>
          <RotateCcw className="h-4 w-4" /> Réinitialiser
        </Button>
      </FilterBar>

      <div className="overflow-hidden rounded-[8px] border border-gray-200 bg-white shadow-sm">
        {loadState === 'error' && !data ? (
          <div className="p-8 text-center">
            <p className="mb-4 text-sm text-red-600">{erreur}</p>
            <Button onClick={reload}>Réessayer</Button>
          </div>
        ) : (
          <DataTable
            columns={colonnes}
            rows={lignes}
            rowKey={(d) => d.id_doleance ?? d.reference}
            onRowClick={(d) => navigate(`/admin/doleances/${d.reference}`)}
            loading={loadState === 'loading'}
            emptyState={
              <EmptyState
                icon={Inbox}
                title={
                  filtresActifs
                    ? 'Aucune doléance ne correspond à ces critères.'
                    : 'Aucune doléance pour le moment.'
                }
                action={
                  filtresActifs ? (
                    <Button variant="secondary" onClick={reinitialiser}>
                      Réinitialiser les filtres
                    </Button>
                  ) : null
                }
              />
            }
            pagination={
              resultat && resultat.last_page > 1 ? (
                <div className="px-4 pb-4">
                  <Pagination
                    paginator={{
                      ...resultat,
                      onPage: (p) => set('page', String(p)),
                    }}
                  />
                </div>
              ) : null
            }
          />
        )}
      </div>

      <ReaffecterDirectModal
        open={Boolean(reaffecter)}
        onClose={() => setReaffecter(null)}
        dossier={reaffecter}
        onDone={(type, text) => {
          if (type === 'error') setExportErreur(text)
          else {
            setExportErreur('')
            toast.show('success', text)
            reload()
          }
          setReaffecter(null)
        }}
      />
    </div>
  )
}

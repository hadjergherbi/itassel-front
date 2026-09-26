import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Download, Eye, Inbox, MessageSquare, RotateCcw, X } from 'lucide-react'
import StatusBadge from '../../components/StatusBadge'
import DataTable from '../../components/admin/DataTable'
import { ReaffecterDirectModal } from '../../components/admin/ReaffectationPanel'
import { SelectInput } from '../../components/FormFields'
import { useAdminAuth } from '../../admin/AdminAuthContext'
import adminApi from '../../lib/adminApi'
import api from '../../lib/api'
import useAdminQuery from '../../lib/useAdminQuery'
import { endpoints } from '../../lib/endpoints'
import { estTousDomaines, estToutesNatures, formatDate, statutKey } from '../../lib/statuts'
import { BadgePortee } from '../../components/admin/doleance/shared'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import IconButton from '../../components/ui/IconButton'
import FilterChips from '../../components/ui/FilterChips'
import FilterBar from '../../components/ui/FilterBar'
import SearchInput from '../../components/ui/SearchInput'
import Pagination from '../../components/ui/Pagination'
import EmptyState from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/Toast'
import ExportDoleancesModal from '../../components/admin/ExportDoleancesModal'
import { useLanguage } from '../../i18n/LanguageContext'

const PERIODES = ['', '7j', '30j', '3m', 'annee']

function nomServiceUtilisateur(utilisateur) {
  return utilisateur?.service?.nom ?? utilisateur?.service?.nom_service ?? ''
}

export default function AdminDoleances() {
  const { tf } = useLanguage()
  const { utilisateur, estSuperAdmin } = useAdminAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const [statuts, setStatuts] = useState([])
  const [services, setServices] = useState([])
  const [natures, setNatures] = useState([])
  const [recherche, setRecherche] = useState(params.get('q') ?? '')
  const [exportOpen, setExportOpen] = useState(false)
  const [exportErreur, setExportErreur] = useState('')
  const [reaffecter, setReaffecter] = useState(null)

  const statut = params.get('statut') ?? ''
  const service = params.get('service') ?? ''
  const nature = params.get('nature') ?? ''
  const periode = params.get('periode') ?? ''
  const q = params.get('q') ?? ''
  const aExaminer = params.get('a_examiner') === '1'
  const ageMin = params.get('age_min') ?? ''
  const infoSansReponse = params.get('info_sans_reponse') === '1'
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
      age_min: ageMin || undefined,
      info_sans_reponse: infoSansReponse ? 1 : undefined,
      reaffectation: reaffectationAttente ? 'en_attente' : undefined,
      sans_responsable: sansResponsable ? 1 : undefined,
      a_reclasser: aReclasser ? 1 : undefined,
      page,
    }),
    [statut, service, q, nature, periode, aExaminer, ageMin, infoSansReponse, reaffectationAttente, sansResponsable, aReclasser, page],
  )

  const { data, loadState, erreur, reload } = useAdminQuery('/admin/doleances', {
    params: queryParams,
    fallback: tf('admin.doleances.erreur'),
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
    statut ||
      service ||
      q ||
      nature ||
      periode ||
      aExaminer ||
      ageMin ||
      infoSansReponse ||
      reaffectationAttente ||
      sansResponsable ||
      aReclasser,
  )

  const reinitialiser = () => {
    setRecherche('')
    setParams({})
  }

  const serviceTitre = estSuperAdmin
    ? service
      ? services.find((s) => String(s.id_service) === service)?.nom_service || tf('admin.doleances.service')
      : tf('admin.doleances.tousServices')
    : nomServiceUtilisateur(utilisateur)

  const chips = [
    { value: 'toutes', label: tf('admin.doleances.toutes'), count: totalCompteurs },
    ...(estSuperAdmin
      ? [{ value: 'sans_responsable', label: tf('admin.doleances.sansResponsable'), count: sansResponsableTotal, tone: 'warning' }]
      : []),
    ...(estSuperAdmin
      ? [{ value: 'reaffectation', label: tf('admin.doleances.demandesReaff'), count: reaffectationsAttenteTotal, tone: 'warning' }]
      : []),
    { value: 'a_examiner', label: tf('admin.doleances.complementsExaminer'), count: aExaminerTotal, tone: 'warning' },
    ...(aReclasserTotal > 0
      ? [{ value: 'a_reclasser', label: tf('admin.doleances.aReclasser'), count: aReclasserTotal, tone: 'warning' }]
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
      header: tf('admin.doleances.colReference'),
      className: 'ltr-isolate whitespace-nowrap font-mono text-xs font-semibold text-institutional',
      cell: (d) => {
        const n = Number(d.nb_notes) || 0
        const libelle = n > 0 ? tf('admin.notes.nNotes', { n }) : ''
        return (
          <span className="inline-flex items-center gap-2">
            <Link to={`/admin/doleances/${d.reference}`} onClick={(e) => e.stopPropagation()} className="ltr-isolate whitespace-nowrap hover:underline">
              {d.reference}
            </Link>
            {n > 0 && (
              <span
                className="inline-flex items-center gap-0.5 text-gray-400"
                title={libelle}
                aria-label={libelle}
              >
                <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                <span className="text-xs">{n}</span>
              </span>
            )}
          </span>
        )
      },
    },
    {
      id: 'nom',
      header: tf('admin.doleances.colNom'),
      className: 'text-gray-800',
      cell: (d) => [d.prenom, d.nom].filter(Boolean).join(' ') || '—',
    },
    {
      id: 'categorie',
      header: tf('admin.doleances.colCategorie'),
      className: 'text-gray-700',
      cell: (d) => (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <span>{d.nature?.libelle ?? '—'}</span>
          {estToutesNatures(d.nature) && (
            <BadgePortee>{tf('admin.doleances.badgeToutesNatures')}</BadgePortee>
          )}
          {estTousDomaines(d.service) && (
            <BadgePortee>{tf('admin.doleances.badgeTousDomaines')}</BadgePortee>
          )}
        </span>
      ),
    },
    ...(estSuperAdmin
      ? [
          {
            id: 'service',
            header: tf('admin.doleances.service'),
            className: 'text-gray-700',
            cell: (d) =>
              estTousDomaines(d.service) ? (
                <BadgePortee>{d.service?.nom_service || tf('admin.doleances.badgeTousDomaines')}</BadgePortee>
              ) : (
                (d.service?.nom_service ?? '—')
              ),
          },
        ]
      : []),
    {
      id: 'date',
      header: tf('admin.doleances.colDate'),
      className: 'whitespace-nowrap font-mono text-xs text-gray-600',
      cell: (d) => formatDate(d.date_depot, { withTime: false }),
    },
    {
      id: 'statut',
      header: tf('admin.doleances.colStatut'),
      cell: (d) => (
        <div className="space-y-1">
          <StatusBadge status={statutKey(d.statut)} label={d.statut?.libelle} showDot />
          {d.reaffectation_en_attente && (
            <p className="text-xs font-medium text-warning-text">{tf('admin.doleances.reaffDemandee')}</p>
          )}
          {d.complement_a_examiner && (
            <p className="text-xs font-medium text-warning-text">{tf('admin.doleances.complementRecu')}</p>
          )}
        </div>
      ),
    },
    {
      id: 'responsable',
      header: tf('admin.doleances.colResponsable'),
      cell: (d) =>
        d.responsable ? (
          <span className="text-gray-700">
            {d.responsable.prenom} {d.responsable.nom}
          </span>
        ) : (
          <span className="rounded-full bg-warning-bg px-2 py-0.5 text-xs font-medium text-warning-text">
            {tf('admin.doleances.sansResponsable')}
          </span>
        ),
    },
    {
      id: 'actions',
      header: tf('admin.doleances.colActions'),
      headerClassName: 'min-w-[140px]',
      cell: (d) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Link to={`/admin/doleances/${d.reference}`}>
            <IconButton label={tf('admin.doleances.ouvrir')}>
              <Eye className="h-4 w-4" />
            </IconButton>
          </Link>
          {estSuperAdmin && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setReaffecter(d)}
            >
              {tf('admin.doleances.reaffecter')}
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={estSuperAdmin ? tf('admin.doleances.titreToutes') : tf('admin.doleances.titre')}
        subtitle={
          estSuperAdmin
            ? tf('admin.doleances.vueGlobale', { n: totalAffiche })
            : tf('admin.doleances.vueService', { n: totalAffiche, service: serviceTitre })
        }
        actions={
          <Button variant="secondary" onClick={() => setExportOpen(true)}>
            <Download className="h-4 w-4" /> {tf('admin.doleances.exporter')}
          </Button>
        }
      />

      {exportErreur && (
        <p className="mb-4 rounded-[8px] bg-danger-bg px-3 py-2 text-sm text-danger-text" role="alert">
          {exportErreur}
        </p>
      )}

      {(ageMin || infoSansReponse) && (
        <div className="mb-3 flex flex-wrap gap-2">
          {ageMin && (
            <button
              type="button"
              onClick={() => set('age_min', '')}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700"
            >
              {tf('admin.doleances.ageMin', { n: ageMin })}
              <X className="h-3 w-3" aria-hidden />
            </button>
          )}
          {infoSansReponse && (
            <button
              type="button"
              onClick={() => set('info_sans_reponse', '')}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700"
            >
              {tf('admin.doleances.infoSansReponse')}
              <X className="h-3 w-3" aria-hidden />
            </button>
          )}
        </div>
      )}

      <div className="mb-4">
        <FilterChips items={chips} value={chipActif} onChange={onChip} />
      </div>

      <FilterBar>
        <SearchInput
          id="admin-recherche"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder={tf('admin.doleances.placeholder')}
        />
        {estSuperAdmin && (
          <div className="lg:w-52">
            <SelectInput
              id="admin-service"
              value={service}
              onChange={(e) => set('service', e.target.value)}
              aria-label={tf('admin.doleances.tousServices')}
            >
              <option value="">{tf('admin.doleances.tousServices')}</option>
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
            aria-label={tf('admin.doleances.toutesCategories')}
          >
            <option value="">{tf('admin.doleances.toutesCategories')}</option>
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
            aria-label={tf('admin.doleances.periodes.toutes')}
          >
            {PERIODES.map((p) => (
              <option key={p || 'toutes'} value={p}>
                {tf(p ? `admin.doleances.periodes.${p}` : 'admin.doleances.periodes.toutes')}
              </option>
            ))}
          </SelectInput>
        </div>
        <Button variant="secondary" onClick={reinitialiser} disabled={!filtresActifs}>
          <RotateCcw className="h-4 w-4" /> {tf('admin.doleances.reinitialiser')}
        </Button>
      </FilterBar>

      <div className="overflow-hidden rounded-[8px] border border-gray-200 bg-white shadow-sm">
        {loadState === 'error' && !data ? (
          <div className="p-8 text-center">
            <p className="mb-4 text-sm text-red-600">{erreur}</p>
            <Button onClick={reload}>{tf('admin.doleances.retry')}</Button>
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
                    ? tf('admin.doleances.videFiltres')
                    : tf('admin.doleances.vide')
                }
                action={
                  filtresActifs ? (
                    <Button variant="secondary" onClick={reinitialiser}>
                      {tf('admin.doleances.reinitialiserFiltres')}
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

      <ExportDoleancesModal open={exportOpen} onClose={() => setExportOpen(false)} />

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

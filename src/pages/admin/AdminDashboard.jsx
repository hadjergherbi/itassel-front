import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, CheckCircle2, ChevronRight } from 'lucide-react'
import { useAdminAuth } from '../../admin/AdminAuthContext'
import useAdminQuery from '../../lib/useAdminQuery'
import { endpoints } from '../../lib/endpoints'
import adminApi from '../../lib/adminApi'
import {
  COULEURS_STATUT,
  nomComplet,
  nomService,
  statutKey,
} from '../../lib/statuts'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import AlertBanner from '../../components/ui/AlertBanner'
import KpiCard from '../../components/ui/KpiCard'
import BarChart from '../../components/ui/BarChart'
import Card from '../../components/ui/Card'
import StackedBar from '../../components/ui/StackedBar'
import StatusBadge from '../../components/StatusBadge'
import HorizontalBarList from '../../components/ui/HorizontalBarList'
import Tabs from '../../components/ui/Tabs'
import { useFormat, useLanguage } from '../../i18n/LanguageContext'
import { formatNombre } from '../../i18n/format'

const PERIODES = [
  { code: '30j' },
  { code: '3m' },
  { code: '6m' },
  { code: 'annee' },
]

const NATURE_BARS = ['bg-institutional', 'bg-action', 'bg-[#3a9470]', 'bg-[#5bab7e]', 'bg-[#8fcea8]']

const SEG_COLORS = {
  nouvelle: 'bg-nouvelle',
  en_cours: 'bg-en-cours',
  resolue: 'bg-institutional',
  autre: 'bg-gray-300',
}

const ETAT_REAFFECT = {
  en_attente: { label: 'En attente', cls: 'bg-warning-bg text-warning-text' },
  acceptee: { label: 'Acceptée', cls: 'bg-success-bg text-success-text' },
  refusee: { label: 'Refusée', cls: 'bg-danger-bg text-danger-text' },
  annulee: { label: 'Annulée', cls: 'bg-gray-100 text-gray-600' },
  sans_suite: { label: 'Sans suite', cls: 'bg-gray-100 text-gray-600' },
}

function formatDelai(valeur, locale) {
  if (valeur == null || valeur === '') return '—'
  const n = Number(valeur)
  if (Number.isNaN(n)) return '—'
  const loc = locale || (typeof document !== 'undefined' ? document.documentElement.lang : 'fr')
  const localeIntl = loc === 'ar' ? 'ar-DZ' : loc === 'en' ? 'en-GB' : 'fr-DZ'
  return `${formatNombre(n.toFixed ? Number(n.toFixed(1)) : n, localeIntl)} j`
}

function PastilleAge({ jours, niveau }) {
  const n = String(niveau ?? '').toLowerCase()
  const tone =
    n === 'rouge' || n === 'red' || n === 'critique' || n === 'danger'
      ? 'bg-danger-bg text-danger-text'
      : n === 'orange' || n === 'warning' || n === 'alerte'
        ? 'bg-warning-bg text-warning-text'
        : 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>
      J+{jours ?? 0}
    </span>
  )
}

function Skeleton({ className }) {
  return <div className={`animate-pulse rounded-[8px] bg-gray-200 ${className}`} />
}

function SelecteurPeriode({ valeur, onChange }) {
  const { tf } = useLanguage()
  return (
    <div className="inline-flex flex-wrap rounded-[8px] border border-gray-200 bg-white p-0.5">
      {PERIODES.map((p) => (
        <button
          key={p.code}
          type="button"
          onClick={() => onChange(p.code)}
          className={[
            'whitespace-nowrap rounded-[6px] px-3 py-1.5 text-sm font-semibold transition',
            valeur === p.code ? 'bg-institutional text-white' : 'text-gray-600 hover:bg-gray-50',
          ].join(' ')}
        >
          {tf(`admin.dashboard.periodes.${p.code}`)}
        </button>
      ))}
    </div>
  )
}

export default function AdminDashboard() {
  const { tf } = useLanguage()
  const { utilisateur, estSuperAdmin } = useAdminAuth()
  const [params, setParams] = useSearchParams()
  const periodeBrute = params.get('periode')
  const periode = PERIODES.some((p) => p.code === periodeBrute) ? periodeBrute : '6m'

  const { data, loadState, erreur, reload } = useAdminQuery('/admin/tableau-de-bord', {
    params: { periode },
    fallback: tf('admin.dashboard.erreur'),
    fetcher: (p) => endpoints.tableauDeBord(p),
  })

  const setPeriode = (code) => {
    const next = new URLSearchParams(params)
    next.set('periode', code)
    setParams(next, { replace: true })
  }

  useEffect(() => {
    if (PERIODES.some((p) => p.code === periodeBrute)) return
    const next = new URLSearchParams(params)
    next.set('periode', '6m')
    setParams(next, { replace: true })
  }, [periodeBrute, params, setParams])

  if (loadState === 'loading' && !data) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-48" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    )
  }

  if (loadState === 'error' && !data) {
    return (
      <div className="max-w-lg rounded-[8px] border border-gray-200 bg-white p-6 shadow-sm">
        <p className="mb-4 text-sm text-danger-text" role="alert">
          {erreur}
        </p>
        <Button onClick={reload}>{tf('admin.dashboard.retry')}</Button>
      </div>
    )
  }

  if (estSuperAdmin) {
    return (
      <DashboardSuperAdmin
        data={data}
        periode={periode}
        onPeriode={setPeriode}
      />
    )
  }

  return (
    <DashboardService
      data={data}
      utilisateur={utilisateur}
      periode={periode}
      onPeriode={setPeriode}
    />
  )
}

function DashboardSuperAdmin({ data, periode, onPeriode }) {
  const { tf } = useLanguage()
  const { formatDate } = useFormat()
  const indicateurs = data?.indicateurs ?? {}
  const vue = data?.vue_globale ?? {}
  const attente = Number(vue.reaffectations_en_attente ?? data?.reaffectations_en_attente ?? 0)
  const parService = vue.par_service ?? []
  const kpi = {
    total: vue.total ?? indicateurs.total ?? 0,
    nouvelles: vue.nouvelles ?? indicateurs.nouvelles ?? 0,
    en_cours: vue.en_cours ?? indicateurs.en_cours ?? 0,
    resolues: vue.resolues ?? indicateurs.resolues ?? 0,
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={tf('admin.dashboard.vueGlobale')}
        subtitle={tf('admin.dashboard.tousServices')}
        actions={<SelecteurPeriode valeur={periode} onChange={onPeriode} />}
      />
      {attente > 0 && (
        <AlertBanner
          action={
            <Link
              to="/admin/doleances?reaffectation=en_attente"
              className="inline-flex items-center gap-1 text-sm font-medium text-warning-text hover:underline"
            >
              {tf('admin.dashboard.voir')} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
            </Link>
          }
        >
          {tf('admin.dashboard.attenteReaff', { n: attente })}
        </AlertBanner>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={tf('admin.dashboard.totalDoleances')}
          value={kpi.total}
          hint={vue.depuis ? tf('admin.dashboard.depuisLe', { date: formatDate(vue.depuis) }) : undefined}
        />
        <KpiCard label={tf('admin.dashboard.nouvelles')} value={kpi.nouvelles} hint={tf('admin.dashboard.nonTraitees')} dot="bg-nouvelle" />
        <KpiCard label={tf('admin.dashboard.enCours')} value={kpi.en_cours} hint={tf('admin.dashboard.enTraitement')} dot="bg-en-cours" />
        <KpiCard
          label={tf('admin.dashboard.resolues')}
          value={kpi.resolues}
          hint={kpi.total ? tf('admin.dashboard.pctTotal', { n: Math.round((kpi.resolues / kpi.total) * 100) }) : undefined}
          dot="bg-institutional"
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card title={tf('admin.dashboard.recuesParMois')}>
          <BarChart items={data?.par_mois ?? []} legend />
        </Card>
        <Card title={tf('admin.dashboard.utilisateursServices')}>
          <div className="mb-4 flex justify-around text-center">
            <div>
              <p className="text-2xl font-bold">{vue.services ?? 0}</p>
              <p className="text-xs text-gray-500">{tf('admin.dashboard.services')}</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{vue.utilisateurs_actifs ?? 0}</p>
              <p className="text-xs text-gray-500">{tf('admin.dashboard.utilisateursActifs')}</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{vue.comptes_desactives ?? 0}</p>
              <p className="text-xs text-gray-500">{tf('admin.dashboard.compteDesactive')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/admin/utilisateurs" className="text-sm text-institutional hover:underline">
              {tf('admin.dashboard.utilisateurs')}
            </Link>
            <Link to="/admin/services" className="text-sm text-institutional hover:underline">
              {tf('admin.dashboard.services')}
            </Link>
          </div>
        </Card>
      </div>
      <Card
        title={tf('admin.dashboard.parService')}
        extra={
          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-nouvelle" /> {tf('admin.dashboard.nouvelles')}</span>
            <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-en-cours" /> {tf('admin.dashboard.enCours')}</span>
            <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-institutional" /> {tf('admin.dashboard.resolues')}</span>
            <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-gray-300" /> {tf('admin.dashboard.autres')}</span>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="py-2 text-start font-medium">{tf('admin.dashboard.colService')}</th>
                <th className="py-2 text-start font-medium">{tf('admin.dashboard.colTotal')}</th>
                <th className="py-2 text-start font-medium">{tf('admin.dashboard.colRepartition')}</th>
                <th className="py-2 text-end font-medium">{tf('admin.dashboard.colATraiter')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {parService.map((s) => (
                <tr key={s.id_service ?? s.nom_service}>
                  <td className="py-3 font-medium">{s.nom_service}</td>
                  <td className="py-3 font-mono">{s.total}</td>
                  <td className="py-3">
                    <StackedBar
                      segments={[
                        { code: 'nouvelle', libelle: tf('admin.dashboard.nouvelles'), total: s.nouvelles ?? 0, color: SEG_COLORS.nouvelle },
                        { code: 'en_cours', libelle: tf('admin.dashboard.enCours'), total: s.en_cours ?? 0, color: SEG_COLORS.en_cours },
                        { code: 'resolue', libelle: tf('admin.dashboard.resolues'), total: s.resolues ?? 0, color: SEG_COLORS.resolue },
                        { code: 'autre', libelle: tf('admin.dashboard.autres'), total: s.autres ?? 0, color: SEG_COLORS.autre },
                      ]}
                    />
                  </td>
                  <td className="py-3 text-end font-mono">{s.a_traiter}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function DashboardService({ data, utilisateur, periode, onPeriode }) {
  const { t, tf, locale } = useLanguage()
  const { formatDate, formatRelatif } = useFormat()
  const navigate = useNavigate()
  const [idNouvelle, setIdNouvelle] = useState('')
  const [onglet, setOnglet] = useState('statut')

  useEffect(() => {
    adminApi
      .get('/admin/statuts')
      .then((res) => {
        const n = (res.data ?? []).find((s) => statutKey(s) === 'nouvelle')
        if (n) setIdNouvelle(String(n.id_statut))
      })
      .catch(() => {})
  }, [])

  const indicateurs = data?.indicateurs ?? {}
  const periodeInfo = data?.periode ?? {}
  const priorites = data?.priorites ?? {}
  const seuils = priorites.seuils ?? {}
  const nouvelleJours = Number(seuils.nouvelle_jours ?? 5)
  const informationJours = Number(seuils.information_jours ?? 15)
  const sousLibelle = periodeInfo.libelle || tf(`admin.dashboard.periodes.${periode}`)

  const lignesPriorite = [
    {
      n: Number(priorites.complements_a_examiner ?? 0),
      label: tf('admin.dashboard.complementsExaminer'),
      to: '/admin/doleances?a_examiner=1',
    },
    {
      n: Number(priorites.nouvelles_en_retard ?? 0),
      label: tf('admin.dashboard.nouvellesRetard', { n: nouvelleJours }),
      to: `/admin/doleances?${new URLSearchParams({
        ...(idNouvelle ? { statut: idNouvelle } : {}),
        age_min: String(nouvelleJours),
      })}`,
    },
    {
      n: Number(priorites.informations_sans_reponse ?? 0),
      label: tf('admin.dashboard.infoSansReponse', { n: informationJours }),
      to: `/admin/doleances?info_sans_reponse=1`,
    },
  ]
  const rienUrgent = lignesPriorite.every((l) => l.n === 0)

  const tendance = indicateurs.delai_moyen_tendance_jours
  const tendanceN = tendance == null || tendance === '' ? null : Number(tendance)
  const dernieres = data?.dernieres ?? []
  const reaffectations = (data?.mes_reaffectations ?? []).slice(0, 3)
  const attenteReaff = Number(data?.mes_reaffectations_en_attente ?? 0)

  const itemsStatut = (data?.repartition ?? []).map((i) => {
    const key = statutKey(i.code ?? i)
    const couleurs = COULEURS_STATUT[key] ?? COULEURS_STATUT.default
    return {
      ...i,
      libelle: t.admin.statuts[key] || i.libelle,
      bar: couleurs.bar,
      dot: couleurs.dot,
    }
  })

  const itemsNature = (data?.repartition_nature ?? []).map((i, index) => ({
    code: i.id_nature,
    libelle: i.libelle,
    total: i.total,
    bar: NATURE_BARS[index % NATURE_BARS.length],
    dot: NATURE_BARS[index % NATURE_BARS.length],
  }))

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={tf('admin.dashboard.bonjour', { prenom: utilisateur?.prenom ?? '' })}
        subtitle={
          <span className="whitespace-nowrap">
            {tf('admin.dashboard.activiteService', { service: nomService(utilisateur) })}
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <SelecteurPeriode valeur={periode} onChange={onPeriode} />
            <Link
              to="/admin/doleances"
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-[8px] bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover"
            >
              {tf('admin.dashboard.voirDoleances')}
              <span aria-hidden className="rtl:-scale-x-100">→</span>
            </Link>
          </div>
        }
      />

      <Card className="border-s-4 border-s-en-cours">
        <h2 className="mb-3 text-base font-bold text-gray-900">{tf('admin.dashboard.priorite')}</h2>
        {rienUrgent ? (
          <p className="flex items-center gap-2 text-sm text-success-text">
            <CheckCircle2 className="h-5 w-5" aria-hidden />
            {tf('admin.dashboard.rienUrgent')}
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {lignesPriorite.map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  className="flex items-center gap-3 py-2.5 text-sm text-gray-800 transition hover:text-institutional"
                >
                  <span className="inline-flex min-w-8 justify-center rounded-full bg-warning-bg px-2 py-0.5 font-mono text-xs font-bold text-warning-text">
                    {l.n}
                  </span>
                  <span className="flex-1">{l.label}</span>
                  <ChevronRight className="h-4 w-4 text-gray-400 rtl:-scale-x-100" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label={tf('admin.dashboard.nouvelles')} value={indicateurs.nouvelles ?? 0} hint={sousLibelle} dot="bg-nouvelle" />
        <KpiCard label={tf('admin.dashboard.enCours')} value={indicateurs.en_cours ?? 0} hint={sousLibelle} dot="bg-en-cours" />
        <KpiCard label={tf('admin.dashboard.resolues')} value={indicateurs.resolues ?? 0} hint={sousLibelle} dot="bg-institutional" />
        <KpiCard label={tf('admin.dashboard.totalRecues')} value={indicateurs.total ?? 0} hint={sousLibelle} dot="bg-gray-400" />
        <KpiCard label={tf('admin.dashboard.delaiMoyen')} value={formatDelai(indicateurs.delai_moyen_jours, locale)} hint={sousLibelle}>
          {tendanceN != null && !Number.isNaN(tendanceN) && (
            <p
              className={`mt-1 text-xs font-medium ${
                tendanceN < 0 ? 'text-success-text' : tendanceN > 0 ? 'text-danger-text' : 'text-gray-500'
              }`}
            >
              {tendanceN < 0 ? '↓' : tendanceN > 0 ? '↑' : '='}{' '}
              {tf('admin.dashboard.vsMois', { n: formatNombre(Math.abs(tendanceN), locale) })}
            </p>
          )}
        </KpiCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={tf('admin.dashboard.recuesParMois')}>
          <BarChart items={data?.par_mois ?? []} legend />
        </Card>
        <Card>
          <Tabs
            tabs={[
              { id: 'statut', label: tf('admin.dashboard.parStatut') },
              { id: 'nature', label: tf('admin.dashboard.parNature') },
            ]}
            value={onglet}
            onChange={setOnglet}
          />
          {onglet === 'statut' ? (
            <HorizontalBarList items={itemsStatut} total={Number(indicateurs.total) || 0} />
          ) : (
            <HorizontalBarList items={itemsNature} total={Number(indicateurs.total) || 0} />
          )}
        </Card>
      </div>

      <Card
        title={tf('admin.dashboard.dernieres')}
        extra={
          <Link to="/admin/doleances" className="text-sm font-semibold text-institutional hover:underline">
            {tf('admin.dashboard.toutVoir')}
          </Link>
        }
      >
        {dernieres.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">{tf('admin.dashboard.aucuneATraiter')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-xs uppercase text-gray-500">
                <tr>
                  <th className="py-2 text-start font-medium">{tf('admin.dashboard.colReference')}</th>
                  <th className="py-2 text-start font-medium">{tf('admin.dashboard.colDemandeur')}</th>
                  <th className="py-2 text-start font-medium">{tf('admin.dashboard.colNature')}</th>
                  <th className="py-2 text-start font-medium">{tf('admin.dashboard.colRecueLe')}</th>
                  <th className="py-2 text-start font-medium">{tf('admin.dashboard.colAge')}</th>
                  <th className="py-2 text-start font-medium">{tf('admin.dashboard.colStatut')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dernieres.map((d) => (
                  <tr
                    key={d.reference}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => navigate(`/admin/doleances/${d.reference}`)}
                  >
                    <td className="py-3">
                      <span className="ltr-isolate whitespace-nowrap font-mono text-xs font-semibold text-institutional">
                        {d.reference}
                      </span>
                    </td>
                    <td className="py-3">{nomComplet(d)}</td>
                    <td className="py-3">{typeof d.nature === 'string' ? d.nature : d.nature?.libelle ?? '—'}</td>
                    <td className="py-3 whitespace-nowrap font-mono text-xs">
                      {formatDate(d.date_depot)}
                    </td>
                    <td className="py-3">
                      <PastilleAge jours={d.age_jours} niveau={d.niveau_age} />
                    </td>
                    <td className="py-3">
                      <StatusBadge status={statutKey(d.statut)} label={d.statut?.libelle} showDot />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card
        title={tf('admin.dashboard.mesReaff')}
        badge={
          attenteReaff > 0 ? (
            <span className="rounded-full bg-warning-bg px-2 py-0.5 text-xs font-semibold text-warning-text">
              {tf('admin.dashboard.enAttenteN', { n: attenteReaff })}
            </span>
          ) : null
        }
        footer={<p className="text-xs text-gray-500">{tf('admin.dashboard.troisRecentes')}</p>}
      >
        {reaffectations.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">{tf('admin.dashboard.aucuneReaff')}</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {reaffectations.map((r) => {
              const etat = ETAT_REAFFECT[r.etat] ?? ETAT_REAFFECT.annulee
              const etatLabel = t.admin.dashboard.etatReaff[r.etat] || etat.label
              const date = r.date_decision || r.date_demande
              return (
                <li key={r.id_reaffectation ?? r.reference} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm">
                      <span className="ltr-isolate whitespace-nowrap font-mono text-xs font-semibold text-institutional">
                        {r.reference}
                      </span>
                      <span className="text-gray-500"> → </span>
                      <span className="text-gray-800">{r.service_propose || r.service_destination}</span>
                    </p>
                    {r.motif_refus && (
                      <p className="mt-1 text-xs italic text-gray-500">« {r.motif_refus} »</p>
                    )}
                  </div>
                  <div className="shrink-0 text-end">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${etat.cls}`}>
                      {etatLabel}
                    </span>
                    <p className="mt-1 text-xs text-gray-500">{formatRelatif(date)}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}

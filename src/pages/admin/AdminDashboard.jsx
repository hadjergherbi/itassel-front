import { Link } from 'react-router-dom'
import { ArrowRight, Building2, Users } from 'lucide-react'
import { useAdminAuth } from '../../admin/AdminAuthContext'
import useAdminQuery from '../../lib/useAdminQuery'
import { endpoints } from '../../lib/endpoints'
import { formatDate, nomComplet, statutKey } from '../../lib/statuts'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import AlertBanner from '../../components/ui/AlertBanner'
import KpiCard from '../../components/ui/KpiCard'
import BarChart from '../../components/ui/BarChart'
import Card from '../../components/ui/Card'
import StackedBar from '../../components/ui/StackedBar'
import StatusBadge from '../../components/StatusBadge'
import HorizontalBarList from '../../components/ui/HorizontalBarList'

const SEG_COLORS = {
  nouvelle: 'bg-nouvelle',
  en_cours: 'bg-en-cours',
  resolue: 'bg-institutional',
  autre: 'bg-gray-300',
}

function nomService(utilisateur) {
  return utilisateur?.service?.nom ?? utilisateur?.service?.nom_service ?? ''
}

export default function AdminDashboard() {
  const { utilisateur, estSuperAdmin } = useAdminAuth()
  const { data, loadState, erreur, reload } = useAdminQuery('/admin/tableau-de-bord', {
    fallback: 'Impossible de charger le tableau de bord.',
    fetcher: () => endpoints.tableauDeBord(),
  })

  if (loadState === 'loading' && !data) {
    return <p className="text-sm text-gray-500">Chargement du tableau de bord…</p>
  }
  if (loadState === 'error' && !data) {
    return (
      <div className="max-w-lg rounded-[8px] border border-gray-200 bg-white p-6 shadow-sm">
        <p className="mb-4 text-sm text-red-600">{erreur}</p>
        <Button onClick={reload}>Réessayer</Button>
      </div>
    )
  }

  const indicateurs = data?.indicateurs ?? {}
  const vue = data?.vue_globale ?? {}
  const attente = Number(vue.reaffectations_en_attente ?? data?.reaffectations_en_attente ?? 0)

  if (estSuperAdmin) {
    const parService = vue.par_service ?? []
    const kpi = {
      total: vue.total ?? indicateurs.total ?? 0,
      nouvelles: vue.nouvelles ?? indicateurs.nouvelles ?? 0,
      en_cours: vue.en_cours ?? indicateurs.en_cours ?? 0,
      resolues: vue.resolues ?? indicateurs.resolues ?? 0,
    }
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader title="Vue globale" subtitle="Tous services confondus" />
        {attente > 0 && (
          <AlertBanner
            action={
              <Link
                to="/admin/doleances?reaffectation=en_attente"
                className="inline-flex items-center gap-1 text-sm font-medium text-warning-text hover:underline"
              >
                Voir <ArrowRight className="h-4 w-4" />
              </Link>
            }
          >
            {attente} demande{attente > 1 ? 's' : ''} de réaffectation en attente, envoyée
            {attente > 1 ? 's' : ''} par des administrateurs de service.
          </AlertBanner>
        )}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Total des doléances"
            value={kpi.total}
            hint={vue.depuis ? `Depuis le ${formatDate(vue.depuis, { withTime: false })}` : undefined}
          />
          <KpiCard label="Nouvelles" value={kpi.nouvelles} hint="Non traitées" dot="bg-nouvelle" />
          <KpiCard label="En cours" value={kpi.en_cours} hint="En traitement" dot="bg-en-cours" />
          <KpiCard
            label="Résolues"
            value={kpi.resolues}
            hint={kpi.total ? `${Math.round((kpi.resolues / kpi.total) * 100)} % du total` : undefined}
            dot="bg-institutional"
          />
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <Card title="Doléances reçues par mois" extra={<span className="text-xs text-gray-500">6 derniers mois</span>}>
            <BarChart items={data?.par_mois ?? []} />
          </Card>
          <Card title="Utilisateurs et services">
            <div className="mb-4 flex justify-around text-center">
              <div>
                <p className="text-2xl font-bold">{vue.services ?? 0}</p>
                <p className="text-xs text-gray-500">Services</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{vue.utilisateurs_actifs ?? 0}</p>
                <p className="text-xs text-gray-500">Utilisateurs actifs</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{vue.comptes_desactives ?? 0}</p>
                <p className="text-xs text-gray-500">Compte désactivé</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link to="/admin/utilisateurs" className="inline-flex items-center gap-1 text-sm text-institutional">
                <Users className="h-4 w-4" /> Utilisateurs
              </Link>
              <Link to="/admin/services" className="inline-flex items-center gap-1 text-sm text-institutional">
                <Building2 className="h-4 w-4" /> Services
              </Link>
            </div>
          </Card>
        </div>
        <Card
          title="Doléances par service"
          extra={
            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-nouvelle" /> Nouvelles</span>
              <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-en-cours" /> En cours</span>
              <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-institutional" /> Résolues</span>
              <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-gray-300" /> Autres</span>
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="py-2 text-start font-medium">Service</th>
                  <th className="py-2 text-start font-medium">Total</th>
                  <th className="py-2 text-start font-medium">Répartition</th>
                  <th className="py-2 text-end font-medium">À traiter</th>
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
                          { code: 'nouvelle', libelle: 'Nouvelles', total: s.nouvelles ?? 0, color: SEG_COLORS.nouvelle },
                          { code: 'en_cours', libelle: 'En cours', total: s.en_cours ?? 0, color: SEG_COLORS.en_cours },
                          { code: 'resolue', libelle: 'Résolues', total: s.resolues ?? 0, color: SEG_COLORS.resolue },
                          { code: 'autre', libelle: 'Autres', total: s.autres ?? 0, color: SEG_COLORS.autre },
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

  const dernieres = data?.dernieres ?? []
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={`Bonjour ${utilisateur?.prenom ?? ''}`}
        subtitle={`Voici l'activité du service ${nomService(utilisateur)}.`}
        actions={
          <Link
            to="/admin/doleances"
            className="inline-flex items-center gap-2 rounded-[8px] bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover"
          >
            Voir les doléances <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Nouvelles" value={indicateurs.nouvelles ?? 0} dot="bg-nouvelle" />
        <KpiCard label="En cours" value={indicateurs.en_cours ?? 0} dot="bg-en-cours" />
        <KpiCard label="Traitées" value={indicateurs.resolues ?? 0} dot="bg-institutional" />
        <KpiCard
          label="Total"
          value={indicateurs.total ?? 0}
          hint={indicateurs.depuis ? `Depuis le ${formatDate(indicateurs.depuis, { withTime: false })}` : undefined}
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Volume des 6 derniers mois">
          <BarChart items={data?.par_mois ?? []} />
        </Card>
        <Card title="Répartition par statut">
          <HorizontalBarList
            items={(data?.repartition ?? []).map((i) => ({
              ...i,
              bar: 'bg-institutional',
              dot: 'bg-institutional',
            }))}
            total={Number(indicateurs.total) || 0}
          />
        </Card>
      </div>
      <Card title="Dernières doléances à traiter" extra={<Link to="/admin/doleances" className="text-sm text-institutional">Tout voir</Link>}>
        {dernieres.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">Aucune doléance à traiter.</p>
        ) : (
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-xs uppercase text-gray-500">
              <tr>
                <th className="py-2 text-start">Référence</th>
                <th className="py-2 text-start">Demandeur</th>
                <th className="py-2 text-start">Nature</th>
                <th className="py-2 text-start">Date</th>
                <th className="py-2 text-start">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dernieres.map((d) => (
                <tr key={d.reference}>
                  <td className="py-3">
                    <Link to={`/admin/doleances/${d.reference}`} className="font-mono text-xs font-semibold text-institutional">
                      {d.reference}
                    </Link>
                  </td>
                  <td className="py-3">{nomComplet(d)}</td>
                  <td className="py-3">{typeof d.nature === 'string' ? d.nature : d.nature?.libelle ?? '—'}</td>
                  <td className="py-3 font-mono text-xs">{formatDate(d.date_depot, { withTime: false })}</td>
                  <td className="py-3">
                    <StatusBadge status={statutKey(d.statut)} label={d.statut?.libelle} showDot />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}

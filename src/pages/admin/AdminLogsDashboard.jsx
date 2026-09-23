import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import useAdminQuery from '../../lib/useAdminQuery'
import { endpoints } from '../../lib/endpoints'
import { formatDate } from '../../lib/statuts'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import KpiCard from '../../components/ui/KpiCard'
import BarChart from '../../components/ui/BarChart'
import HorizontalBarList from '../../components/ui/HorizontalBarList'
import Card from '../../components/ui/Card'
import ResultBadge from '../../components/ui/ResultBadge'

const LIBELLES_CATEGORIE = {
  connexion: 'Connexions',
  connexions: 'Connexions',
  doleance: 'Doléances',
  doleances: 'Doléances',
  affectation: 'Affectations',
  affectations: 'Affectations',
  utilisateur: 'Utilisateurs',
  utilisateurs: 'Utilisateurs',
  parametre: 'Paramètres',
  parametres: 'Paramètres',
  export: 'Exports',
  exports: 'Exports',
}

function libelleJour(jour) {
  if (!jour) return ''
  const date = new Date(jour)
  if (Number.isNaN(date.getTime()) && String(jour).includes('-')) {
    const [, m, d] = String(jour).split('-')
    return `${d}/${m}`
  }
  if (Number.isNaN(date.getTime())) return String(jour)
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}`
}

export default function AdminLogsDashboard() {
  const { data, loadState, erreur, reload } = useAdminQuery('/admin/journaux/tableau-de-bord', {
    fallback: 'Impossible de charger le journal.',
    fetcher: () => endpoints.logsDashboard(),
  })

  if (loadState === 'loading' && !data) return <p className="text-sm text-gray-500">Chargement…</p>
  if (loadState === 'error' && !data) {
    return (
      <div className="max-w-lg rounded-[8px] border border-gray-200 bg-white p-6">
        <p className="mb-4 text-sm text-red-600">{erreur}</p>
        <Button onClick={reload}>Réessayer</Button>
      </div>
    )
  }

  const desactives = Number(data?.comptes_desactives ?? 0)
  const echecs = data?.echecs_recents ?? []
  const parJour = (data?.par_jour ?? []).map((j) => ({
    jour: j.jour,
    libelle: libelleJour(j.jour),
    total: j.total,
  }))
  const parCategorie = (data?.par_categorie ?? []).map((c) => ({
    code: c.categorie,
    libelle: LIBELLES_CATEGORIE[c.categorie] ?? c.categorie,
    total: c.total,
    bar: 'bg-institutional',
    dot: 'bg-institutional',
  }))

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Activité de la plateforme"
        subtitle="Depuis minuit"
        actions={
          <Link
            to="/admin/logs/journal"
            className="inline-flex items-center gap-2 rounded-[8px] border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700"
          >
            Ouvrir le journal <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Actions enregistrées" value={data?.actions_aujourdhui ?? 0} hint="Depuis minuit" />
        <KpiCard
          label="Connexions réussies"
          value={data?.connexions_reussies_aujourdhui ?? 0}
          dot="bg-institutional"
          hint={`Utilisateurs distincts : ${data?.utilisateurs_distincts_aujourdhui ?? 0}`}
        />
        <KpiCard
          label="Échecs de connexion"
          value={data?.echecs_connexion_aujourdhui ?? 0}
          dot="bg-danger-text"
          hint="À surveiller"
        />
        <KpiCard
          label="Utilisateurs actifs"
          value={data?.utilisateurs_actifs ?? 0}
          hint={`${desactives} compte${desactives > 1 ? 's' : ''} désactivé${desactives > 1 ? 's' : ''}`}
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Actions par jour" extra={<span className="text-xs text-gray-500">7 derniers jours</span>}>
          <BarChart items={parJour} />
        </Card>
        <Card title="Répartition par type d'action">
          <HorizontalBarList items={parCategorie} />
        </Card>
      </div>
      <Card
        title="Échecs de connexion récents"
        extra={
          <Link to="/admin/logs/journal?resultat=echec" className="text-sm font-medium text-institutional">
            Tout voir
          </Link>
        }
      >
        {echecs.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">Aucun échec récent.</p>
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-xs uppercase text-gray-500">
              <tr>
                <th className="py-2 text-start">Date</th>
                <th className="py-2 text-start">Compte</th>
                <th className="py-2 text-start">Adresse IP</th>
                <th className="py-2 text-start">Motif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {echecs.map((e, i) => (
                <tr key={i}>
                  <td className="py-3 font-mono text-xs">{formatDate(e.date_action)}</td>
                  <td className="py-3">{e.compte}</td>
                  <td className="py-3 font-mono text-xs">{e.adresse_ip}</td>
                  <td className="py-3">
                    <ResultBadge result="echec" />
                    <span className="ms-2 text-xs text-gray-600">{e.motif}</span>
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

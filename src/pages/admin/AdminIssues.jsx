import { ISSUES, LEGACY_MAPPING, statutKey } from '../../lib/statuts'
import useAdminQuery from '../../lib/useAdminQuery'
import { endpoints } from '../../lib/endpoints'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import KpiCard from '../../components/ui/KpiCard'
import Card from '../../components/ui/Card'

const NATURE_LIBELLES = {
  reclamation: 'Réclamation',
  signalement: 'Signalement',
  demande_information: "Demande d'information",
  suggestion: 'Suggestion',
}

function formatTaux(valeur) {
  if (valeur == null || Number.isNaN(Number(valeur))) return '—'
  const n = Number(valeur)
  const pct = n <= 1 ? n * 100 : n
  return `${Math.round(pct * 10) / 10} %`
}

export default function AdminIssues() {
  const { data, loadState, erreur, reload } = useAdminQuery('/admin/tableau-de-bord', {
    fetcher: () => endpoints.tableauDeBord(),
  })
  const { data: statuts } = useAdminQuery('/admin/parametres/statuts', {
    fetcher: () => endpoints.referentiel('statuts'),
  })

  const issues = ISSUES
  const mapping = LEGACY_MAPPING
  const k = data?.issues ?? {}
  const listeStatuts = Array.isArray(statuts) ? statuts : []

  const messageCitoyen = (issue) => {
    const found = listeStatuts.find((s) => statutKey(s) === issue.alias || String(s.code ?? '').toLowerCase() === issue.alias)
    return found?.message_citoyen ?? issue.message_citoyen
  }

  if (loadState === 'error' && !data) {
    return (
      <div className="max-w-lg rounded-[8px] border bg-white p-6">
        <p className="mb-4 text-sm text-red-600">{erreur}</p>
        <Button onClick={reload}>Réessayer</Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Issues du traitement"
        subtitle="Le Ministère ne doit pas laisser une demande sans fin. Cette proposition distingue cinq issues."
        actions={
          <span className="rounded-full bg-warning-bg px-3 py-1 text-xs font-medium text-warning-text">
            Proposition métier à valider
          </span>
        }
      />
      <Card title="Les cinq issues et ce que voit le citoyen">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-xs uppercase text-gray-500">
              <tr>
                <th className="py-2 text-start">Issue</th>
                <th className="py-2 text-start">Code</th>
                <th className="py-2 text-start">Définition</th>
                <th className="py-2 text-start">Natures</th>
                <th className="py-2 text-start">Condition</th>
                <th className="py-2 text-start">Message citoyen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {issues.map((i) => (
                <tr key={i.code}>
                  <td className="py-3 font-medium">{i.libelle}</td>
                  <td className="py-3 font-mono text-xs">{i.code}</td>
                  <td className="py-3 text-gray-600">{i.definition}</td>
                  <td className="py-3 text-gray-600">
                    {i.natures ? i.natures.map((n) => NATURE_LIBELLES[n] ?? n).join(', ') : 'Toutes'}
                  </td>
                  <td className="py-3 text-gray-600">{i.condition}</td>
                  <td className="py-3 italic text-gray-700">« {messageCitoyen(i)} »</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Correspondance anciens et nouveaux états">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-gray-500">
              <tr>
                <th className="py-2 text-start">Ancien code</th>
                <th className="py-2 text-start">Correspondance proposée</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mapping.map((m) => (
                <tr key={m.ancien}>
                  <td className="py-2 font-mono text-xs">{m.ancien}</td>
                  <td className="py-2">{m.propose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title="Transitions, filtres et indicateurs adaptés">
          <ul className="list-disc space-y-2 ps-5 text-sm text-gray-700">
            <li>Depuis « Nouvelle doléance » ou « En cours », les cinq issues sont possibles.</li>
            <li>« Information demandée » reste automatique.</li>
            <li>Un complément non examiné bloque les issues de conclusion.</li>
            <li>Maquette « Changer le statut » : choix d&apos;issue + suite (réponse, motif, dossier initial).</li>
          </ul>
        </Card>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Résolus" value={k.resolue ?? 0} dot="bg-institutional" />
        <KpiCard label="Réponses apportées" value={k.reponse_apportee ?? 0} dot="bg-institutional" />
        <KpiCard label="Hors compétence" value={k.hors_competence ?? 0} dot="bg-gray-500" />
        <KpiCard label="Non fondées" value={k.non_retenue ?? 0} dot="bg-danger-text" />
        <KpiCard label="Doubles" value={k.double ?? 0} dot="bg-double" />
        <KpiCard label="Terminés au total" value={k.termines_total ?? 0} />
        <KpiCard label="À reclasser" value={k.a_reclasser?.total ?? k.a_reclasser ?? 0} dot="bg-en-cours" />
        <KpiCard label="Taux de résolution" value={formatTaux(k.taux_resolution)} hint="Formule ci-dessous" />
      </div>
      <p className="text-xs leading-relaxed text-gray-500">
        Taux de résolution = (résolus + réponses apportées) / (réclamations + signalements + suggestions +
        demandes d&apos;information), hors doubles et hors compétence, et hors dossiers encore ouverts
        (Nouvelle, En cours, Information demandée). L&apos;indicateur ne compte pas les demandes minorées comme
        « résolues ».
      </p>
    </div>
  )
}

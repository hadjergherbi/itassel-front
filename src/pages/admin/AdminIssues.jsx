import { ISSUES, LEGACY_MAPPING, libelleStatut, statutKey } from '../../lib/statuts'
import useAdminQuery from '../../lib/useAdminQuery'
import { endpoints } from '../../lib/endpoints'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import KpiCard from '../../components/ui/KpiCard'
import Card from '../../components/ui/Card'
import { useLanguage } from '../../i18n/LanguageContext'
import { libelleTraduit } from '../../lib/libelles'

function formatTaux(valeur) {
  if (valeur == null || Number.isNaN(Number(valeur))) return '—'
  const n = Number(valeur)
  const pct = n <= 1 ? n * 100 : n
  return `${Math.round(pct * 10) / 10} %`
}

function natureLibelle(tf, lang, code) {
  const cle = `admin.issues.natures.${code}`
  const traduit = tf(cle)
  if (traduit !== cle) return traduit
  return libelleTraduit('natures', code, lang) || code
}

function issueChamp(tf, alias, champ, fallback) {
  const cle = `admin.issues.items.${alias}.${champ}`
  const traduit = tf(cle)
  return traduit !== cle ? traduit : fallback
}

export default function AdminIssues() {
  const { tf, t, lang } = useLanguage()
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
    const found = listeStatuts.find(
      (s) => statutKey(s) === issue.alias || String(s.code ?? '').toLowerCase() === issue.alias,
    )
    if (found?.message_citoyen) return found.message_citoyen
    return issueChamp(tf, issue.alias, 'messageCitoyen', issue.message_citoyen)
  }

  if (loadState === 'error' && !data) {
    return (
      <div className="max-w-lg rounded-[8px] border bg-white p-6">
        <p className="mb-4 text-sm text-red-600">{erreur}</p>
        <Button onClick={reload}>{tf('commun.retry')}</Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title={tf('admin.layout.issues')}
        subtitle={tf('admin.issues.sousTitre')}
        actions={
          <span className="rounded-full bg-warning-bg px-3 py-1 text-xs font-medium text-warning-text">
            {tf('admin.issues.badge')}
          </span>
        }
      />
      <Card title={tf('admin.issues.carteCinq')}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-xs uppercase text-gray-500">
              <tr>
                <th className="py-2 text-start">{tf('admin.issues.colIssue')}</th>
                <th className="py-2 text-start">{tf('admin.issues.colCode')}</th>
                <th className="py-2 text-start">{tf('admin.issues.colDefinition')}</th>
                <th className="py-2 text-start">{tf('admin.issues.colNatures')}</th>
                <th className="py-2 text-start">{tf('admin.issues.colCondition')}</th>
                <th className="py-2 text-start">{tf('admin.issues.colMessage')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {issues.map((i) => (
                <tr key={i.code}>
                  <td className="py-3 font-medium">{issueChamp(tf, i.alias, 'libelle', i.libelle)}</td>
                  <td className="py-3 font-mono text-xs">{i.code}</td>
                  <td className="py-3 text-gray-600">{issueChamp(tf, i.alias, 'definition', i.definition)}</td>
                  <td className="py-3 text-gray-600">
                    {i.natures
                      ? i.natures.map((n) => natureLibelle(tf, lang, n)).join(', ')
                      : tf('admin.issues.toutesNatures')}
                  </td>
                  <td className="py-3 text-gray-600">{issueChamp(tf, i.alias, 'condition', i.condition)}</td>
                  <td className="py-3 italic text-gray-700">« {messageCitoyen(i)} »</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={tf('admin.issues.carteCorrespondance')}>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-gray-500">
              <tr>
                <th className="py-2 text-start">{tf('admin.issues.colAncien')}</th>
                <th className="py-2 text-start">{tf('admin.issues.colPropose')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mapping.map((m) => (
                <tr key={m.ancien}>
                  <td className="py-2 font-mono text-xs">{m.ancien}</td>
                  <td className="py-2">{libelleStatut(m.propose, t)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title={tf('admin.issues.carteTransitions')}>
          <ul className="list-disc space-y-2 ps-5 text-sm text-gray-700">
            <li>{tf('admin.issues.transition1')}</li>
            <li>{tf('admin.issues.transition2')}</li>
            <li>{tf('admin.issues.transition3')}</li>
            <li>{tf('admin.issues.transition4')}</li>
          </ul>
        </Card>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={tf('admin.issues.kpi.resolus')} value={k.resolue ?? 0} dot="bg-institutional" />
        <KpiCard label={tf('admin.issues.kpi.reponses')} value={k.reponse_apportee ?? 0} dot="bg-institutional" />
        <KpiCard label={tf('admin.issues.kpi.horsCompetence')} value={k.hors_competence ?? 0} dot="bg-gray-500" />
        <KpiCard label={tf('admin.issues.kpi.nonFondees')} value={k.non_retenue ?? 0} dot="bg-danger-text" />
        <KpiCard label={tf('admin.issues.kpi.doubles')} value={k.double ?? 0} dot="bg-double" />
        <KpiCard label={tf('admin.issues.kpi.termines')} value={k.termines_total ?? 0} />
        <KpiCard
          label={tf('admin.issues.kpi.aReclasser')}
          value={k.a_reclasser?.total ?? k.a_reclasser ?? 0}
          dot="bg-en-cours"
        />
        <KpiCard
          label={tf('admin.issues.kpi.taux')}
          value={formatTaux(k.taux_resolution)}
          hint={tf('admin.issues.kpi.tauxHint')}
        />
      </div>
      <p className="text-xs leading-relaxed text-gray-500">{tf('admin.issues.formule')}</p>
    </div>
  )
}

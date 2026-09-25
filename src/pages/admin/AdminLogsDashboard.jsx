import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, ShieldAlert } from 'lucide-react'
import useAdminQuery from '../../lib/useAdminQuery'
import { endpoints } from '../../lib/endpoints'
import { formatDate } from '../../lib/statuts'
import { useLanguage } from '../../i18n/LanguageContext'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import KpiCard from '../../components/ui/KpiCard'
import BarChart from '../../components/ui/BarChart'
import HorizontalBarList from '../../components/ui/HorizontalBarList'
import Card from '../../components/ui/Card'
import ResultBadge from '../../components/ui/ResultBadge'
import EmptyState from '../../components/ui/EmptyState'

const PERIODES = ['aujourdhui', '7j', '30j']

const CATEGORIES = ['connexion', 'doleance', 'affectation', 'utilisateur', 'parametre', 'export']

const ALIAS_CATEGORIE = {
  connexions: 'connexion',
  doleances: 'doleance',
  affectations: 'affectation',
  utilisateurs: 'utilisateur',
  parametres: 'parametre',
  exports: 'export',
}

const COULEURS_CAT = {
  connexion: { bar: 'bg-nouvelle', dot: 'bg-nouvelle' },
  doleance: { bar: 'bg-en-cours', dot: 'bg-en-cours' },
  affectation: { bar: 'bg-info-demandee', dot: 'bg-info-demandee' },
  utilisateur: { bar: 'bg-resolue', dot: 'bg-resolue' },
  parametre: { bar: 'bg-double', dot: 'bg-double' },
  export: { bar: 'bg-reclasser', dot: 'bg-reclasser' },
}

function normaliserCategorie(code) {
  const brut = String(code ?? '').toLowerCase()
  return ALIAS_CATEGORIE[brut] || brut
}

function libelleJour(jour) {
  if (!jour) return ''
  const date = jour instanceof Date ? jour : new Date(jour)
  if (Number.isNaN(date.getTime()) && String(jour).includes('-')) {
    const parts = String(jour).split('-')
    return `${parts[2]}/${parts[1]}`
  }
  if (Number.isNaN(date.getTime())) return String(jour)
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}`
}

function isoJour(jour) {
  if (!jour) return ''
  const brut = String(jour)
  if (/^\d{4}-\d{2}-\d{2}/.test(brut)) return brut.slice(0, 10)
  const date = new Date(jour)
  if (Number.isNaN(date.getTime())) return brut
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function estVerrouillage(ligne) {
  const a = String(ligne.action ?? '').toLowerCase()
  return /verrouill|lock/.test(a)
}

function ipDe(ligne) {
  return ligne.ip ?? ligne.adresse_ip ?? ligne.adresse ?? ''
}

function SelecteurPeriode({ valeur, onChange, tf }) {
  return (
    <div
      role="group"
      aria-label={tf('admin.logsDashboard.periode')}
      className="inline-flex rounded-[8px] border border-gray-300 bg-white p-0.5"
    >
      {PERIODES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => onChange(code)}
          className={[
            'rounded-[6px] px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional/40',
            valeur === code ? 'bg-institutional text-white' : 'text-gray-600 hover:bg-gray-50',
          ].join(' ')}
        >
          {tf(`admin.logsDashboard.${code}`)}
        </button>
      ))}
    </div>
  )
}

export default function AdminLogsDashboard() {
  const { tf, locale } = useLanguage()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const brute = params.get('periode')
  const periode = PERIODES.includes(brute) ? brute : 'aujourdhui'
  const [majLe, setMajLe] = useState(null)

  const { data, loadState, erreur, reload } = useAdminQuery('/admin/journaux/tableau-de-bord', {
    params: { periode },
    fallback: tf('admin.logsDashboard.erreur'),
    fetcher: (p) => endpoints.logsDashboard(p),
  })

  useEffect(() => {
    if (data) setMajLe(new Date())
  }, [data])

  useEffect(() => {
    const rafraichir = () => {
      if (document.visibilityState === 'visible') reload()
    }
    const id = window.setInterval(rafraichir, 60000)
    return () => window.clearInterval(id)
  }, [reload])

  const setPeriode = (code) => {
    const next = new URLSearchParams(params)
    if (code === 'aujourdhui') next.delete('periode')
    else next.set('periode', code)
    setParams(next, { replace: true })
  }

  const lienJournal = (extra = {}) => {
    const q = new URLSearchParams()
    if (periode !== 'aujourdhui') q.set('periode', periode)
    Object.entries(extra).forEach(([k, v]) => {
      if (v != null && v !== '') q.set(k, String(v))
    })
    const s = q.toString()
    return s ? `/admin/logs/journal?${s}` : '/admin/logs/journal'
  }

  const sousTitre =
    periode === '7j'
      ? tf('admin.logsDashboard.derniers7j')
      : periode === '30j'
        ? tf('admin.logsDashboard.derniers30j')
        : tf('admin.logsDashboard.depuisMinuit')

  const heureMaj = majLe
    ? new Intl.DateTimeFormat(`${locale}-u-nu-latn`, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        numberingSystem: 'latn',
      }).format(majLe)
    : ''

  if (loadState === 'loading' && !data) {
    return <p className="text-sm text-gray-500">{tf('admin.logsDashboard.chargement')}</p>
  }
  if (loadState === 'error' && !data) {
    return (
      <div className="max-w-lg rounded-[8px] border border-gray-200 bg-white p-6">
        <p className="mb-4 text-sm text-red-600">{erreur}</p>
        <Button onClick={reload}>{tf('admin.logsDashboard.retry')}</Button>
      </div>
    )
  }

  const actions = data?.actions ?? data?.actions_aujourdhui ?? 0
  const exportsN = Number(data?.exports ?? 0)
  const connexions = data?.connexions_reussies ?? data?.connexions_reussies_aujourdhui ?? 0
  const distincts = data?.utilisateurs_distincts ?? data?.utilisateurs_distincts_aujourdhui ?? 0
  const echecsN = Number(data?.echecs_connexion ?? data?.echecs_connexion_aujourdhui ?? 0)
  const verrouilles = Number(data?.comptes_verrouilles ?? 0)
  const comptesActifs = data?.comptes_actifs ?? data?.utilisateurs_actifs ?? 0
  const desactives = Number(data?.comptes_desactives ?? 0)
  const echecs = data?.echecs_recents ?? []
  const ips = data?.ip_suspectes ?? []

  const parJour = (data?.par_jour ?? []).map((j) => ({
    jour: j.jour,
    libelle: libelleJour(j.jour),
    total: j.total,
    courant: j.courant ?? j.jour_en_cours,
  }))

  const recus = new Map(
    (data?.par_categorie ?? []).map((c) => [normaliserCategorie(c.categorie ?? c.code), Number(c.total) || 0]),
  )
  const parCategorie = CATEGORIES.map((code) => ({
    code,
    libelle: tf(`admin.logsDashboard.categories.${code}`),
    total: recus.has(code) ? recus.get(code) : 0,
    ...COULEURS_CAT[code],
    to: lienJournal({ categorie: code }),
  }))

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={tf('admin.logsDashboard.titre')}
        subtitle={
          <>
            {sousTitre}
            {heureMaj && (
              <span className="mt-0.5 block text-xs text-gray-400">
                {tf('admin.logsDashboard.misAJour', { heure: heureMaj })}
              </span>
            )}
          </>
        }
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <SelecteurPeriode valeur={periode} onChange={setPeriode} tf={tf} />
            <Link
              to="/admin/logs/journal"
              className="inline-flex items-center gap-2 rounded-[8px] border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700"
            >
              {tf('admin.logsDashboard.ouvrirJournal')}{' '}
              <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
            </Link>
          </div>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={tf('admin.logsDashboard.actions')}
          value={actions}
          hint={tf('admin.logsDashboard.dontExports', { n: exportsN })}
          to={lienJournal()}
        />
        <KpiCard
          label={tf('admin.logsDashboard.connexions')}
          value={connexions}
          dot="bg-institutional"
          hint={tf('admin.logsDashboard.utilisateursDistincts', { n: distincts })}
          to={lienJournal({ categorie: 'connexion', resultat: 'succes' })}
        />
        <KpiCard
          label={tf('admin.logsDashboard.echecs')}
          value={echecsN}
          danger={echecsN > 0}
          dot={echecsN > 0 ? 'bg-danger-text' : 'bg-resolue'}
          hint={
            echecsN > 0
              ? tf('admin.logsDashboard.dontVerrouillages', { n: verrouilles })
              : tf('admin.logsDashboard.aucuneTentative')
          }
          to={lienJournal({ categorie: 'connexion', resultat: 'echec' })}
        />
        <KpiCard
          label={tf('admin.logsDashboard.comptesActifs')}
          value={comptesActifs}
          hint={tf('admin.logsDashboard.desactives', { n: desactives })}
          to={lienJournal({ categorie: 'utilisateur' })}
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={tf('admin.logsDashboard.parJour')} extra={<span className="text-xs text-gray-500">{sousTitre}</span>}>
          <BarChart
            items={parJour}
            legend
            legendLabel={tf('admin.logsDashboard.journeeEnCours')}
            zeroAsLine
            dense={periode === '30j'}
            maxLibelles={periode === '30j' ? 5 : undefined}
            onBarClick={(item) => {
              const jour = isoJour(item.jour)
              if (jour) navigate(lienJournal({ date_debut: jour, date_fin: jour }))
            }}
          />
        </Card>
        <Card title={tf('admin.logsDashboard.parType')}>
          <HorizontalBarList items={parCategorie} afficherPourcent />
        </Card>
      </div>
      <div className={`grid gap-6 ${ips.length > 0 ? 'lg:grid-cols-2' : ''}`}>
        {ips.length > 0 && (
          <Card title={tf('admin.logsDashboard.ipSuspectes')}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead className="text-xs uppercase text-gray-500">
                  <tr>
                    <th className="py-2 text-start">{tf('admin.logsDashboard.colAdresseIp')}</th>
                    <th className="py-2 text-start">{tf('admin.logsDashboard.colNbEchecs')}</th>
                    <th className="py-2 text-start">{tf('admin.logsDashboard.colDerniere')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ips.map((ligne, i) => {
                    const ip = ipDe(ligne)
                    const n = ligne.echecs ?? ligne.nombre ?? ligne.total ?? 0
                    const derniere = ligne.derniere_tentative ?? ligne.derniere ?? ligne.date
                    return (
                      <tr key={ip || i}>
                        <td className="py-3">
                          <Link
                            to={lienJournal({ q: ip })}
                            className="ltr-isolate font-mono text-xs font-semibold text-institutional hover:underline"
                          >
                            {ip}
                          </Link>
                        </td>
                        <td className="py-3 font-mono text-xs">{n}</td>
                        <td className="py-3 font-mono text-xs">{formatDate(derniere)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
        <Card
          title={tf('admin.logsDashboard.echecsRecents')}
          extra={
            <Link
              to={lienJournal({ categorie: 'connexion', resultat: 'echec' })}
              className="text-sm font-medium text-institutional"
            >
              {tf('admin.logsDashboard.toutVoir')}
            </Link>
          }
        >
          {echecs.length === 0 ? (
            <EmptyState title={tf('admin.logsDashboard.videEchecs')} icon={ShieldAlert} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-xs uppercase text-gray-500">
                  <tr>
                    <th className="py-2 text-start">{tf('admin.logsDashboard.colDate')}</th>
                    <th className="py-2 text-start">{tf('admin.logsDashboard.colCompte')}</th>
                    <th className="py-2 text-start">{tf('admin.logsDashboard.colAdresseIp')}</th>
                    <th className="py-2 text-start">{tf('admin.logsDashboard.colMotif')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {echecs.map((e, i) => (
                    <tr key={e.id ?? `${e.date_action}-${i}`}>
                      <td className="py-3 font-mono text-xs">{formatDate(e.date_action)}</td>
                      <td className="py-3">{e.compte}</td>
                      <td className="py-3 font-mono text-xs">{e.adresse_ip ?? e.ip}</td>
                      <td className="py-3">
                        {estVerrouillage(e) ? (
                          <span className="inline-flex rounded-full bg-warning-bg px-2 py-0.5 text-xs font-medium text-warning-text">
                            {tf('admin.logsDashboard.compteVerrouille')}
                          </span>
                        ) : (
                          <ResultBadge result="echec" />
                        )}
                        {e.motif && <span className="ms-2 text-xs text-gray-600">{e.motif}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

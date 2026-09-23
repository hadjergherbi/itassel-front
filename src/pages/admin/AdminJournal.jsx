import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Download, RotateCcw } from 'lucide-react'
import useAdminQuery from '../../lib/useAdminQuery'
import { endpoints } from '../../lib/endpoints'
import { extractErrors } from '../../lib/adminApi'
import { formatDate, nomComplet } from '../../lib/statuts'
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

const CATEGORIES = [
  { value: '', label: 'Toutes' },
  { value: 'connexion', label: 'Connexions' },
  { value: 'doleance', label: 'Doléances' },
  { value: 'affectation', label: 'Affectations' },
  { value: 'utilisateur', label: 'Utilisateurs' },
  { value: 'parametre', label: 'Paramètres' },
  { value: 'export', label: 'Exports' },
  { value: 'echec', label: 'Échecs' },
]

export default function AdminJournal() {
  const [params, setParams] = useSearchParams()
  const [exportBusy, setExportBusy] = useState(false)
  const [exportErreur, setExportErreur] = useState('')

  const q = params.get('q') ?? ''
  const categorie = params.get('categorie') ?? ''
  const periode = params.get('periode') ?? ''
  const resultat = params.get('resultat') ?? ''
  const utilisateurId = params.get('utilisateur') ?? ''
  const page = Number(params.get('page') || 1)

  const { data: usersData } = useAdminQuery('/admin/utilisateurs', {
    fetcher: () => endpoints.utilisateurs(),
  })
  const utilisateurs = usersData?.data ?? []

  const set = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next)
  }

  const queryParams = useMemo(
    () => ({
      q: q || undefined,
      categorie: categorie || undefined,
      periode: periode || undefined,
      resultat: resultat || undefined,
      utilisateur: utilisateurId || undefined,
      page,
    }),
    [q, categorie, periode, resultat, utilisateurId, page],
  )

  const { data, loadState, erreur, reload } = useAdminQuery('/admin/journaux', {
    params: queryParams,
    fallback: 'Impossible de charger le journal.',
    fetcher: (p) => endpoints.journal(p),
  })

  const lignes = data?.data ?? []

  const exporter = async () => {
    setExportBusy(true)
    setExportErreur('')
    try {
      const res = await endpoints.exportJournal(queryParams)
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `journal-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setExportErreur(extractErrors(err, "L'export a échoué.").message)
    } finally {
      setExportBusy(false)
    }
  }

  const colonnes = [
    {
      id: 'date',
      header: 'Date et heure',
      className: 'whitespace-nowrap font-mono text-xs text-gray-600',
      cell: (r) => formatDate(r.date_action ?? r.date),
    },
    {
      id: 'user',
      header: 'Utilisateur',
      cell: (r) =>
        r.utilisateur ? (
          <div>
            <p className="font-medium">{nomComplet(r.utilisateur)}</p>
            <p className="text-xs text-gray-500">
              {r.utilisateur.libelle_role}
              {r.utilisateur.service ? ` · ${r.utilisateur.service}` : ''}
            </p>
          </div>
        ) : (
          <div>
            <p>{r.compte || r.email_tente || '—'}</p>
            <p className="text-xs text-gray-500">Compte inconnu ou désactivé</p>
          </div>
        ),
    },
    { id: 'action', header: 'Action', cell: (r) => r.action_libelle ?? r.action },
    { id: 'detail', header: 'Détail', className: 'text-gray-600', cell: (r) => r.detail },
    { id: 'ip', header: 'Adresse IP', className: 'font-mono text-xs', cell: (r) => r.adresse_ip ?? r.ip },
    { id: 'resultat', header: 'Résultat', cell: (r) => <ResultBadge result={r.resultat} /> },
  ]

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Journal des actions"
        subtitle="Connexions et actions effectuées sur la plateforme. Ce journal n'est pas modifiable."
        actions={
          <Button variant="secondary" onClick={exporter} loading={exportBusy}>
            <Download className="h-4 w-4" /> Exporter en CSV
          </Button>
        }
      />
      {exportErreur && <p className="mb-4 text-sm text-red-600">{exportErreur}</p>}
      <div className="mb-4">
        <FilterChips
          items={CATEGORIES}
          value={categorie}
          onChange={(v) => set('categorie', v)}
        />
      </div>
      <FilterBar>
        <SearchInput
          id="journal-q"
          value={q}
          onChange={(e) => set('q', e.target.value)}
          placeholder="Utilisateur, référence ou adresse IP"
        />
        <div className="lg:w-52">
          <SelectInput
            value={utilisateurId}
            onChange={(e) => set('utilisateur', e.target.value)}
            aria-label="Tous les utilisateurs"
          >
            <option value="">Tous les utilisateurs</option>
            {utilisateurs.map((u) => (
              <option key={u.id_utilisateur} value={String(u.id_utilisateur)}>
                {nomComplet(u)}
              </option>
            ))}
          </SelectInput>
        </div>
        <div className="lg:w-44">
          <SelectInput value={periode} onChange={(e) => set('periode', e.target.value)} aria-label="Période">
            <option value="">Toutes les dates</option>
            <option value="7j">7 derniers jours</option>
            <option value="30j">30 derniers jours</option>
          </SelectInput>
        </div>
        <div className="lg:w-44">
          <SelectInput value={resultat} onChange={(e) => set('resultat', e.target.value)} aria-label="Résultat">
            <option value="">Tous les résultats</option>
            <option value="succes">Succès</option>
            <option value="echec">Échecs</option>
          </SelectInput>
        </div>
        <Button
          variant="secondary"
          onClick={() => setParams({})}
          disabled={!q && !categorie && !periode && !resultat && !utilisateurId}
        >
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
            rowKey={(r) => r.id_journal ?? r.id}
            loading={loadState === 'loading'}
            emptyState={<EmptyState title="Aucune entrée pour ces critères." />}
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
    </div>
  )
}

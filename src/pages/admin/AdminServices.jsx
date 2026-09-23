import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Plus } from 'lucide-react'
import useAdminQuery from '../../lib/useAdminQuery'
import { endpoints } from '../../lib/endpoints'
import { extractErrors } from '../../lib/adminApi'
import { nomComplet } from '../../lib/statuts'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import AlertBanner from '../../components/ui/AlertBanner'
import Avatar from '../../components/ui/Avatar'
import Card from '../../components/ui/Card'
import Modal from '../../components/admin/Modal'
import { FieldError, FieldLabel, SelectInput, TextInput } from '../../components/FormFields'
import DataTable from '../../components/admin/DataTable'
import EmptyState from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/Toast'

export default function AdminServices() {
  const { data, loadState, erreur, reload } = useAdminQuery('/admin/services', {
    fetcher: () => endpoints.services(),
  })
  const toast = useToast()
  const services = data?.services ?? []
  const alertes = data?.alertes ?? []

  const [designation, setDesignation] = useState(null)
  const [idResp, setIdResp] = useState('')
  const [candidats, setCandidats] = useState([])
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState({})
  const [modalService, setModalService] = useState(null)
  const [nomService, setNomService] = useState('')

  useEffect(() => {
    if (!designation) {
      setCandidats([])
      return undefined
    }
    let cancelled = false
    endpoints
      .responsablesPossibles(designation.id_service)
      .then((res) => {
        if (!cancelled) setCandidats(Array.isArray(res.data) ? res.data : [])
      })
      .catch(() => {
        if (!cancelled) setCandidats([])
      })
    return () => {
      cancelled = true
    }
  }, [designation])

  const sauverResponsable = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await endpoints.designerResponsable(
        designation.id_service,
        idResp === '' ? null : Number(idResp),
      )
      toast.show('success', 'Responsable enregistré.')
      setDesignation(null)
      reload()
    } catch (err) {
      const { message, fields } = extractErrors(err)
      setErrors(fields)
      if (!Object.keys(fields).length) toast.show('error', message)
    } finally {
      setBusy(false)
    }
  }

  const sauverService = async (e) => {
    e.preventDefault()
    if (!nomService.trim()) {
      setErrors({ nom_service: 'Indiquez le nom du service.' })
      return
    }
    setBusy(true)
    try {
      if (modalService?.id_service) {
        await endpoints.modifierService(modalService.id_service, { nom_service: nomService.trim() })
      } else {
        await endpoints.creerService({ nom_service: nomService.trim() })
      }
      toast.show('success', 'Service enregistré.')
      setModalService(null)
      reload()
    } catch (err) {
      const { message, fields } = extractErrors(err)
      setErrors(fields)
      if (!Object.keys(fields).length) toast.show('error', message)
    } finally {
      setBusy(false)
    }
  }

  const colonnes = [
    { id: 'nom', header: 'Service', cell: (s) => s.nom_service ?? s.nom },
    {
      id: 'resp',
      header: 'Responsable',
      cell: (s) =>
        s.responsable ? (
          <span className="inline-flex items-center gap-2">
            <Avatar personne={s.responsable} size="sm" />
            {nomComplet(s.responsable)}
          </span>
        ) : (
          <span className="rounded-full bg-warning-bg px-2 py-0.5 text-xs font-medium text-warning-text">
            Aucun responsable
          </span>
        ),
    },
    { id: 'total', header: 'Doléances', className: 'font-mono', cell: (s) => s.total ?? 0 },
    {
      id: 'traiter',
      header: 'À traiter',
      cell: (s) => (
        <span className="inline-flex rounded-full bg-nouvelle-bg px-2 py-0.5 font-mono text-xs text-nouvelle">
          {s.a_traiter ?? 0}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (s) => (
        <button
          type="button"
          className="rounded-[8px] p-1.5 text-gray-500 hover:bg-gray-100"
          aria-label="Modifier"
          onClick={() => {
            setDesignation(s)
            setIdResp(s.responsable?.id_utilisateur ? String(s.responsable.id_utilisateur) : '')
            setErrors({})
          }}
        >
          <Pencil className="h-4 w-4" />
        </button>
      ),
    },
  ]

  if (loadState === 'error' && !data) {
    return (
      <div className="max-w-lg rounded-[8px] border bg-white p-6">
        <p className="mb-4 text-sm text-red-600">{erreur}</p>
        <Button onClick={reload}>Réessayer</Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Services"
        subtitle="Chaque service traite les doléances de son domaine. Un service affiché sans responsable ne peut pas transférer ses dossiers."
        actions={
          <Button
            onClick={() => {
              setModalService({})
              setNomService('')
              setErrors({})
            }}
          >
            <Plus className="h-4 w-4" /> Ajouter un service
          </Button>
        }
      />
      {alertes.map((a) => (
        <AlertBanner
          key={a.id_service}
          action={
            <Link
              to={`/admin/doleances?sans_responsable=1&service=${a.id_service}`}
              className="rounded-[8px] border border-warning-border bg-white px-3 py-1.5 text-sm font-medium text-warning-text"
            >
              Voir les dossiers
            </Link>
          }
        >
          Le service {a.nom_service ?? a.nom} n&apos;a pas de responsable. Les doléances restent en
          attente ; elles ne sont pas transférées vers un autre service.
        </AlertBanner>
      ))}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="overflow-hidden rounded-[8px] border border-gray-200 bg-white shadow-sm">
          <DataTable
            columns={colonnes}
            rows={services}
            rowKey="id_service"
            loading={loadState === 'loading'}
            emptyState={<EmptyState title="Aucun service." />}
          />
        </div>
        {designation && (
          <Card title="Désigner un responsable">
            <form onSubmit={sauverResponsable} className="space-y-4">
              <p className="text-sm text-gray-600">Service {designation.nom_service ?? designation.nom}</p>
              <div>
                <FieldLabel htmlFor="resp">Responsable</FieldLabel>
                <SelectInput
                  id="resp"
                  value={idResp}
                  onChange={(e) => setIdResp(e.target.value)}
                  error={errors.id_responsable}
                >
                  <option value="">Aucun responsable</option>
                  {candidats.map((u) => (
                    <option key={u.id_utilisateur} value={u.id_utilisateur}>
                      {nomComplet(u)}
                    </option>
                  ))}
                </SelectInput>
                <p className="mt-1.5 text-xs text-gray-500">
                  Seuls les utilisateurs actifs rattachés au service peuvent être désignés, jamais un
                  autre service.
                </p>
                <FieldError message={errors.id_responsable} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setDesignation(null)}>
                  Annuler
                </Button>
                <Button type="submit" loading={busy}>
                  Enregistrer
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>

      <Modal
        open={Boolean(modalService)}
        onClose={() => setModalService(null)}
        busy={busy}
        title={modalService?.id_service ? 'Modifier le service' : 'Ajouter un service'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalService(null)} disabled={busy}>
              Annuler
            </Button>
            <Button type="submit" form="form-service" loading={busy}>
              Enregistrer
            </Button>
          </>
        }
      >
        <form id="form-service" onSubmit={sauverService}>
          <FieldLabel htmlFor="nom-service" required>
            Nom du service
          </FieldLabel>
          <TextInput
            id="nom-service"
            value={nomService}
            onChange={(e) => setNomService(e.target.value)}
            error={errors.nom_service}
          />
          <FieldError message={errors.nom_service} />
          <p className="mt-2 text-xs text-gray-500">
            La création ou la modification d&apos;un service ne déplace jamais les doléances existantes.
          </p>
        </form>
      </Modal>
    </div>
  )
}

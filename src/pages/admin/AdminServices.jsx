import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Plus, Trash2 } from 'lucide-react'
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
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useLanguage } from '../../i18n/LanguageContext'
import { libelleService } from '../../lib/libelles'

function blocageSuppression(tf, raison) {
  const cle = `admin.services.blocage.${raison}`
  const traduit = tf(cle)
  return traduit !== cle ? traduit : raison
}

export default function AdminServices() {
  const { tf, lang } = useLanguage()
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
  const [aSupprimer, setASupprimer] = useState(null)

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
      toast.show('success', tf('admin.services.responsableEnregistre'))
      setDesignation(null)
      reload()
    } catch (err) {
      const { message, fields } = extractErrors(err, undefined, lang)
      setErrors(fields)
      if (!Object.keys(fields).length) toast.show('error', message)
    } finally {
      setBusy(false)
    }
  }

  const sauverService = async (e) => {
    e.preventDefault()
    if (!nomService.trim()) {
      setErrors({ nom_service: tf('admin.services.nomRequis') })
      return
    }
    setBusy(true)
    try {
      if (modalService?.id_service) {
        await endpoints.modifierService(modalService.id_service, { nom_service: nomService.trim() })
      } else {
        await endpoints.creerService({ nom_service: nomService.trim() })
      }
      toast.show('success', tf('admin.services.serviceEnregistre'))
      setModalService(null)
      reload()
    } catch (err) {
      const { message, fields } = extractErrors(err, undefined, lang)
      setErrors(fields)
      if (!Object.keys(fields).length) toast.show('error', message)
    } finally {
      setBusy(false)
    }
  }

  const supprimer = async () => {
    if (!aSupprimer || busy) return
    setBusy(true)
    try {
      await endpoints.supprimerService(aSupprimer.id_service)
      toast.show('success', tf('admin.services.serviceSupprime'))
      if (designation?.id_service === aSupprimer.id_service) setDesignation(null)
      setASupprimer(null)
      reload()
    } catch (err) {
      const { message } = extractErrors(err, undefined, lang)
      toast.show('error', message)
      setASupprimer(null)
      reload()
    } finally {
      setBusy(false)
    }
  }

  const nomDu = (s) => libelleService(s?.nom_service ?? s?.nom, lang) || (s?.nom_service ?? s?.nom ?? '')

  const colonnes = [
    { id: 'nom', header: tf('admin.monCompte.service'), cell: (s) => nomDu(s) },
    {
      id: 'resp',
      header: tf('admin.services.colResponsable'),
      cell: (s) =>
        s.responsable ? (
          <span className="inline-flex items-center gap-2">
            <Avatar personne={s.responsable} size="sm" />
            {nomComplet(s.responsable)}
          </span>
        ) : (
          <span className="rounded-full bg-warning-bg px-2 py-0.5 text-xs font-medium text-warning-text">
            {tf('admin.services.aucunResponsable')}
          </span>
        ),
    },
    { id: 'total', header: tf('admin.layout.doleances'), className: 'font-mono', cell: (s) => s.total ?? 0 },
    {
      id: 'traiter',
      header: tf('admin.services.colATraiter'),
      cell: (s) => (
        <span className="inline-flex rounded-full bg-nouvelle-bg px-2 py-0.5 font-mono text-xs text-nouvelle">
          {s.a_traiter ?? 0}
        </span>
      ),
    },
    {
      id: 'actions',
      header: tf('admin.services.colActions'),
      cell: (s) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded-[8px] p-1.5 text-gray-500 hover:bg-gray-100"
            aria-label={tf('admin.services.modifier')}
            onClick={() => {
              setDesignation(s)
              setIdResp(s.responsable?.id_utilisateur ? String(s.responsable.id_utilisateur) : '')
              setErrors({})
            }}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-[8px] px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
            onClick={() => {
              setModalService(s)
              setNomService(s.nom_service ?? s.nom ?? '')
              setErrors({})
            }}
          >
            {tf('admin.services.renommer')}
          </button>
          <button
            type="button"
            className={[
              'rounded-[8px] p-1.5',
              s.supprimable === false
                ? 'cursor-not-allowed text-gray-400 opacity-40'
                : 'text-gray-500 hover:bg-red-50 hover:text-red-600',
            ].join(' ')}
            aria-label={tf('admin.services.supprimer')}
            title={
              s.supprimable === false
                ? blocageSuppression(tf, s.raison_blocage) || s.raison_blocage || undefined
                : undefined
            }
            disabled={s.supprimable === false}
            onClick={() => setASupprimer(s)}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  if (loadState === 'error' && !data) {
    return (
      <div className="max-w-lg rounded-[8px] border bg-white p-6">
        <p className="mb-4 text-sm text-red-600">{erreur}</p>
        <Button onClick={reload}>{tf('commun.retry')}</Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={tf('admin.layout.services')}
        subtitle={tf('admin.services.sousTitre')}
        actions={
          <Button
            onClick={() => {
              setModalService({})
              setNomService('')
              setErrors({})
            }}
          >
            <Plus className="h-4 w-4" /> {tf('admin.services.ajouter')}
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
              {tf('admin.services.voirDossiers')}
            </Link>
          }
        >
          {tf('admin.services.alerteSansResp', { nom: nomDu(a) })}
        </AlertBanner>
      ))}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="overflow-hidden rounded-[8px] border border-gray-200 bg-white shadow-sm">
          <DataTable
            columns={colonnes}
            rows={services}
            rowKey="id_service"
            loading={loadState === 'loading'}
            emptyState={<EmptyState title={tf('admin.services.vide')} />}
          />
          <p className="border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
            {tf('admin.services.noteSuppression')}
          </p>
        </div>
        {designation && (
          <Card title={tf('admin.services.designerTitre')}>
            <form onSubmit={sauverResponsable} className="space-y-4">
              <p className="text-sm text-gray-600">{tf('admin.services.serviceLabel', { nom: nomDu(designation) })}</p>
              <div>
                <FieldLabel htmlFor="resp">{tf('admin.services.colResponsable')}</FieldLabel>
                <SelectInput
                  id="resp"
                  value={idResp}
                  onChange={(e) => setIdResp(e.target.value)}
                  error={errors.id_responsable}
                >
                  <option value="">{tf('admin.services.aucunResponsable')}</option>
                  {candidats.map((u) => (
                    <option key={u.id_utilisateur} value={u.id_utilisateur}>
                      {nomComplet(u)}
                    </option>
                  ))}
                </SelectInput>
                <p className="mt-1.5 text-xs text-gray-500">{tf('admin.services.aideResponsable')}</p>
                <FieldError message={errors.id_responsable} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setDesignation(null)}>
                  {tf('commun.cancel')}
                </Button>
                <Button type="submit" loading={busy}>
                  {tf('commun.save')}
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
        title={modalService?.id_service ? tf('admin.services.modifierTitre') : tf('admin.services.ajouter')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalService(null)} disabled={busy}>
              {tf('commun.cancel')}
            </Button>
            <Button type="submit" form="form-service" loading={busy}>
              {tf('commun.save')}
            </Button>
          </>
        }
      >
        <form id="form-service" onSubmit={sauverService}>
          <FieldLabel htmlFor="nom-service" required>
            {tf('admin.services.nomChamp')}
          </FieldLabel>
          <TextInput
            id="nom-service"
            value={nomService}
            onChange={(e) => setNomService(e.target.value)}
            error={errors.nom_service}
          />
          <FieldError message={errors.nom_service} />
          <p className="mt-2 text-xs text-gray-500">{tf('admin.services.noteCreation')}</p>
        </form>
      </Modal>
      <ConfirmDialog
        open={Boolean(aSupprimer)}
        title={tf('admin.services.confirmSupprimerTitre')}
        danger
        busy={busy}
        confirmLabel={tf('admin.services.supprimer')}
        onClose={() => setASupprimer(null)}
        onConfirm={supprimer}
      >
        {tf('admin.services.confirmSupprimerCorps', { nom: nomDu(aSupprimer) })}
      </ConfirmDialog>
    </div>
  )
}

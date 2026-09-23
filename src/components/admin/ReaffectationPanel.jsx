import { useCallback, useEffect, useState } from 'react'
import { Building2, Check, Mail, Users } from 'lucide-react'
import { FieldError, FieldLabel, TextArea } from '../FormFields'
import Modal from './Modal'
import Toggle from './Toggle'
import Button from '../ui/Button'
import adminApi, { extractErrors } from '../../lib/adminApi'
import api from '../../lib/api'
import { endpoints } from '../../lib/endpoints'
import { formatDate, message409, nomComplet } from '../../lib/statuts'
import { useAdminAuth } from '../../admin/AdminAuthContext'

const MESSAGES_409 = {
  demande_en_attente: 'Une demande de réaffectation est déjà en attente pour ce dossier.',
  dossier_conclu: "Ce dossier est conclu : une réaffectation n'est plus possible.",
  deja_acceptee: 'Cette demande a déjà été acceptée.',
  deja_refusee: 'Cette demande a déjà été refusée.',
  deja_annulee: 'Cette demande a déjà été annulée.',
  sans_suite: 'Cette demande a été classée sans suite.',
}

function messageReaffectation(err, fallback) {
  const code = err.response?.data?.code
  if (code && MESSAGES_409[code]) return MESSAGES_409[code]
  return extractErrors(err, fallback).message
}

function ServiceRadios({ services, value, onChange, excludeId, allowInconnu, disabled }) {
  const options = services.filter((s) => s.id_service !== excludeId)

  const carte = (selected, children, onPick) => (
    <label
      className={[
        'flex cursor-pointer items-center gap-3 rounded-[8px] border px-3 py-3 text-sm transition',
        selected
          ? 'border-institutional bg-[#e6f6ed] text-institutional'
          : 'border-gray-200 bg-white text-gray-800 hover:border-gray-300',
        disabled ? 'cursor-not-allowed opacity-60' : '',
      ].join(' ')}
    >
      <input
        type="radio"
        name="service-reaffectation"
        className="h-4 w-4 accent-[#006b3f]"
        checked={selected}
        disabled={disabled}
        onChange={onPick}
      />
      {children}
    </label>
  )

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map((s) =>
        carte(String(value) === String(s.id_service), s.nom_service, () => onChange(String(s.id_service))),
      )}
      {allowInconnu &&
        carte(value === '', <span className="font-medium">Je ne sais pas</span>, () => onChange(''))}
    </div>
  )
}

function BoutonSecondaire({ children, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center rounded-[8px] border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
    >
      {children}
    </button>
  )
}

function BoutonPrincipal({ children, form, disabled, danger }) {
  return (
    <button
      type="submit"
      form={form}
      disabled={disabled}
      className={[
        'inline-flex items-center justify-center rounded-[8px] px-4 py-2.5 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60',
        danger ? 'bg-[#b42318] hover:bg-[#9b1c1c]' : 'bg-action hover:bg-[#008040]',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function DemanderModal({ open, onClose, dossier, services, onDone }) {
  const [service, setService] = useState('')
  const [motif, setMotif] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setService('')
    setMotif('')
    setErrors({})
    setBusy(false)
  }, [open])

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    if (!motif.trim()) {
      setErrors({ motif: 'Indiquez le motif de la demande.' })
      return
    }
    setBusy(true)
    try {
      const res = await adminApi.post(`/admin/doleances/${dossier.reference}/reaffectation`, {
        id_service_propose: service === '' ? null : Number(service),
        motif: motif.trim(),
      })
      onDone(
        'success',
        res.data?.message ||
          'Votre demande de réaffectation a été enregistrée. Elle est en attente de décision du Super administrateur.',
      )
      onClose()
    } catch (err) {
      const { fields } = extractErrors(err)
      setErrors(fields)
      if (!fields.motif) onDone('error', messageReaffectation(err, "La demande n'a pas pu être envoyée."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      title="Demander une réaffectation"
      subtitle={dossier?.reference}
      footer={
        <>
          <BoutonSecondaire onClick={onClose} disabled={busy}>
            Annuler
          </BoutonSecondaire>
          <BoutonPrincipal form="form-demander-reaffectation" disabled={busy}>
            {busy ? 'Envoi…' : 'Envoyer la demande'}
          </BoutonPrincipal>
        </>
      }
    >
      <form id="form-demander-reaffectation" onSubmit={submit} noValidate className="space-y-5">
        <div>
          <p className="mb-3 text-sm font-medium text-gray-800">Service suggéré</p>
          <ServiceRadios
            services={services}
            value={service}
            onChange={setService}
            excludeId={dossier?.service?.id_service}
            allowInconnu
            disabled={busy}
          />
        </div>
        <div>
          <FieldLabel htmlFor="motif-demande" required>
            Motif
          </FieldLabel>
          <TextArea
            id="motif-demande"
            rows={3}
            className="min-h-[90px]"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            error={errors.motif}
          />
          <FieldError message={errors.motif} />
        </div>
        <div className="rounded-[8px] bg-gray-50 px-4 py-3 text-xs leading-relaxed text-gray-600">
          La demande est enregistrée avec l&apos;état « En attente ». Le Super administrateur décide
          du service de destination. Rien n&apos;est modifié tant que la demande n&apos;est pas
          acceptée.
        </div>
      </form>
    </Modal>
  )
}

function AnnulerModal({ open, onClose, demande, onDone }) {
  const [motif, setMotif] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setMotif('')
    setErrors({})
    setBusy(false)
  }, [open])

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    if (!motif.trim()) {
      setErrors({ motif: "Indiquez le motif de l'annulation." })
      return
    }
    setBusy(true)
    try {
      const res = await adminApi.post(`/admin/reaffectations/${demande.id_reaffectation}/annuler`, {
        motif: motif.trim(),
      })
      onDone('success', res.data?.message || 'Votre demande de réaffectation a été annulée.')
      onClose()
    } catch (err) {
      const { fields } = extractErrors(err)
      setErrors(fields)
      if (!fields.motif) onDone('error', messageReaffectation(err, "L'annulation a échoué."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      title="Annuler la demande"
      footer={
        <>
          <BoutonSecondaire onClick={onClose} disabled={busy}>
            Retour
          </BoutonSecondaire>
          <BoutonPrincipal form="form-annuler-reaffectation" disabled={busy} danger>
            {busy ? 'Envoi…' : 'Annuler la demande'}
          </BoutonPrincipal>
        </>
      }
    >
      <form id="form-annuler-reaffectation" onSubmit={submit} noValidate className="space-y-5">
        <div className="rounded-[8px] border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="mb-1 text-xs font-medium tracking-[0.08em] text-gray-500 uppercase">
            Votre demande du {formatDate(demande?.date_demande)}
          </p>
          <p className="text-sm text-gray-800">
            Service suggéré : {demande?.service_propose?.nom_service ?? 'Non précisé'}
          </p>
          {demande?.motif && <p className="mt-1 text-sm italic text-gray-700">« {demande.motif} »</p>}
        </div>
        <div>
          <FieldLabel htmlFor="motif-annulation" required>
            Motif de l&apos;annulation
          </FieldLabel>
          <TextArea
            id="motif-annulation"
            rows={3}
            className="min-h-[90px]"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            error={errors.motif}
          />
          <FieldError message={errors.motif} />
        </div>
      </form>
    </Modal>
  )
}

function RefuserModal({ open, onClose, demande, onDone }) {
  const [motif, setMotif] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setMotif('')
    setErrors({})
    setBusy(false)
  }, [open])

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    if (!motif.trim()) {
      setErrors({ motif: 'Indiquez le motif du refus.' })
      return
    }
    setBusy(true)
    try {
      const res = await adminApi.post(`/admin/reaffectations/${demande.id_reaffectation}/refuser`, {
        motif: motif.trim(),
      })
      onDone('success', res.data?.message || 'La demande de réaffectation a été refusée.')
      onClose()
    } catch (err) {
      const { fields } = extractErrors(err)
      setErrors(fields)
      if (!fields.motif) onDone('error', messageReaffectation(err, 'Le refus a échoué.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      title="Refuser la demande"
      footer={
        <>
          <BoutonSecondaire onClick={onClose} disabled={busy}>
            Retour
          </BoutonSecondaire>
          <BoutonPrincipal form="form-refuser-reaffectation" disabled={busy} danger>
            {busy ? 'Envoi…' : 'Refuser'}
          </BoutonPrincipal>
        </>
      }
    >
      <form id="form-refuser-reaffectation" onSubmit={submit} noValidate className="space-y-5">
        <p className="text-sm text-gray-600">
          Demande de {nomComplet(demande?.demandeur)} — service suggéré :{' '}
          {demande?.service_propose?.nom_service ?? 'non précisé'}.
        </p>
        <div>
          <FieldLabel htmlFor="motif-refus" required>
            Motif du refus
          </FieldLabel>
          <TextArea
            id="motif-refus"
            rows={3}
            className="min-h-[90px]"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            error={errors.motif}
          />
          <FieldError message={errors.motif} />
        </div>
      </form>
    </Modal>
  )
}

function AccepterModal({ open, onClose, demande, services, onDone }) {
  const preselect = demande?.service_propose?.id_service
    ? String(demande.service_propose.id_service)
    : ''
  const [service, setService] = useState(preselect)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setService(
      demande?.service_propose?.id_service ? String(demande.service_propose.id_service) : '',
    )
    setErrors({})
    setBusy(false)
  }, [open, demande])

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    if (!service) {
      setErrors({ id_service_destination: 'Choisissez le service de destination.' })
      return
    }
    setBusy(true)
    try {
      const res = await adminApi.post(`/admin/reaffectations/${demande.id_reaffectation}/accepter`, {
        id_service_destination: Number(service),
      })
      const dest = res.data?.doleance?.service ?? ''
      onDone(
        'success',
        res.data?.message ||
          `Le dossier a été réaffecté${dest ? ` au service ${typeof dest === 'string' ? dest : dest.nom_service}` : ''}.`,
      )
      onClose()
    } catch (err) {
      const { fields } = extractErrors(err)
      setErrors(fields)
      if (!Object.keys(fields).length) {
        onDone('error', messageReaffectation(err, "L'acceptation a échoué."))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      title="Réaffecter le dossier"
      footer={
        <>
          <BoutonSecondaire onClick={onClose} disabled={busy}>
            Retour
          </BoutonSecondaire>
          <BoutonPrincipal form="form-accepter-reaffectation" disabled={busy}>
            {busy ? 'Envoi…' : 'Réaffecter'}
          </BoutonPrincipal>
        </>
      }
    >
      <form id="form-accepter-reaffectation" onSubmit={submit} noValidate className="space-y-5">
        <div>
          <p className="mb-3 text-sm font-medium text-gray-800">Service de destination</p>
          <ServiceRadios
            services={services}
            value={service}
            onChange={(v) => {
              setService(v)
              setErrors({})
            }}
            disabled={busy}
          />
          <FieldError message={errors.id_service_destination} />
        </div>
      </form>
    </Modal>
  )
}

function formatDateHeure(iso) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const jour = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
  const heure = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false })
    .format(date)
    .replace(/\u202f/g, ' ')
  return `${jour} · ${heure}`
}

function ReaffecterDirectModal({ open, onClose, dossier, onDone }) {
  const reference = dossier?.reference
  const [detail, setDetail] = useState(null)
  const [services, setServices] = useState([])
  const [load, setLoad] = useState('idle')
  const [service, setService] = useState('')
  const [motif, setMotif] = useState('')
  const [notifier, setNotifier] = useState(true)
  const [errors, setErrors] = useState({})
  const [erreur, setErreur] = useState('')
  const [busy, setBusy] = useState(false)

  const charger = () => {
    if (!reference) return
    setLoad('loading')
    setErreur('')
    setErrors({})
    Promise.all([endpoints.doleance(reference), endpoints.services()])
      .then(([dRes, sRes]) => {
        const d = dRes.data
        const liste = Array.isArray(sRes.data) ? sRes.data : sRes.data?.services ?? []
        setDetail(d)
        setServices(liste)
        const propose = d.reaffectation_en_attente?.service_propose?.id_service
        setService(propose ? String(propose) : '')
        setMotif('')
        setNotifier(true)
        setLoad('ready')
      })
      .catch((err) => {
        setErreur(extractErrors(err, 'Impossible de charger le dossier.').message)
        setLoad('error')
      })
  }

  useEffect(() => {
    if (!open || !reference) return undefined
    setDetail(null)
    setBusy(false)
    charger()
    return undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reference])

  const actuelId = detail?.service?.id_service
  const proposeId = detail?.reaffectation_en_attente?.service_propose?.id_service
  const choisi = services.find((s) => String(s.id_service) === String(service))
  const complementOuvert = (detail?.complements ?? []).some(
    (c) => c.etat === 'en_attente' || c.etat === 'recu',
  )
  const attente = detail?.reaffectation_en_attente

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    const next = {}
    if (!service) next.id_service_destination = 'Choisissez le service de destination.'
    if (!motif.trim()) next.motif = 'Indiquez le motif de la réaffectation.'
    setErrors(next)
    if (Object.keys(next).length) return

    setBusy(true)
    setErreur('')
    try {
      const res = await endpoints.reaffecter(reference, {
        id_service_destination: Number(service),
        motif: motif.trim(),
        notifier_responsable: Boolean(notifier && choisi?.responsable),
      })
      const dest = res.data?.doleance?.service
      const nomDest = typeof dest === 'string' ? dest : dest?.nom_service ?? choisi?.nom_service ?? 'le service choisi'
      let texte = `Doléance réaffectée vers ${nomDest}.`
      if (res.data?.demande_reglee) texte += ' La demande en attente a été réglée.'
      onDone?.('success', texte)
      onClose()
    } catch (err) {
      const { fields, message } = extractErrors(err)
      setErrors(fields)
      if (!Object.keys(fields).length) {
        setErreur(
          err.response?.data?.code === 'dossier_conclu'
            ? 'Ce dossier est terminé : il ne peut plus être réaffecté.'
            : message409(err.response?.data?.code, messageReaffectation(err, message)),
        )
      }
    } finally {
      setBusy(false)
    }
  }

  const d = detail ?? dossier

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      title="Réaffecter la doléance"
      subtitle={
        d ? (
          <>
            <span className="font-mono">{d.reference}</span>
            {d.objet ? ` · ${d.objet}` : ''}
          </>
        ) : null
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button
            type="submit"
            form="form-reaffecter-direct"
            loading={busy}
            disabled={load !== 'ready' || !service}
          >
            <Check className="h-4 w-4" /> Confirmer la réaffectation
          </Button>
        </>
      }
    >
      {load === 'loading' && <p className="text-sm text-gray-500">Chargement…</p>}
      {load === 'error' && (
        <div>
          <p className="mb-3 text-sm text-red-600">{erreur}</p>
          <Button variant="secondary" onClick={charger}>
            Réessayer
          </Button>
        </div>
      )}
      {load === 'ready' && detail && (
        <form id="form-reaffecter-direct" onSubmit={submit} noValidate className="space-y-5">
          {erreur && (
            <p className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">
              {erreur}
            </p>
          )}

          <div className="flex items-center gap-2 rounded-[8px] bg-gray-50 px-4 py-3 text-sm text-gray-800">
            <Building2 className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
            <p>
              Affectation actuelle :{' '}
              <strong>{detail.service?.nom_service ?? '—'}</strong>
              {' · '}
              {detail.responsable ? nomComplet(detail.responsable) : 'Aucun responsable'}
            </p>
          </div>

          {attente && (
            <div className="rounded-[8px] bg-warning-bg px-4 py-3 text-sm leading-relaxed text-warning-text">
              <strong>Une demande de réaffectation est en attente</strong> (
              {nomComplet(attente.demandeur)}, {formatDateHeure(attente.date_demande)}) : « {attente.motif} ».
              Service proposé : <strong>{attente.service_propose?.nom_service ?? 'non précisé'}</strong>.
              Elle sera réglée dans cette même opération, avec la destination que vous choisissez ici.
            </div>
          )}

          <div>
            <p className="mb-3 text-sm font-medium text-gray-800">Nouveau service</p>
            <div className="space-y-2">
              {services.map((s) => {
                const estActuel = Number(s.id_service) === Number(actuelId)
                const estPropose = Number(s.id_service) === Number(proposeId)
                const selected = String(service) === String(s.id_service)
                return (
                  <label
                    key={s.id_service}
                    className={[
                      'flex items-center gap-3 rounded-[8px] border px-4 py-3 text-sm transition',
                      estActuel
                        ? 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-400'
                        : selected
                          ? 'cursor-pointer border-institutional bg-[#e6f6ed] text-gray-900'
                          : 'cursor-pointer border-gray-200 bg-white text-gray-800 hover:border-gray-300',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name="nouveau-service"
                      className="h-4 w-4 accent-[#006b3f]"
                      checked={selected}
                      disabled={estActuel || busy}
                      onChange={() => {
                        setService(String(s.id_service))
                        setErrors((prev) => ({ ...prev, id_service_destination: undefined }))
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900">{s.nom_service}</p>
                      <p className={s.responsable ? 'text-xs text-gray-500' : 'text-xs text-warning-text'}>
                        {s.responsable ? `Responsable : ${nomComplet(s.responsable)}` : 'Aucun responsable'}
                      </p>
                    </div>
                    {estActuel && (
                      <span className="shrink-0 text-xs text-gray-400">service actuel</span>
                    )}
                    {estPropose && !estActuel && (
                      <span className="shrink-0 text-xs text-institutional">proposé</span>
                    )}
                  </label>
                )
              })}
            </div>
            <FieldError message={errors.id_service_destination} />
          </div>

          <div>
            <FieldLabel htmlFor="motif-direct" required>
              Motif de la réaffectation
            </FieldLabel>
            <TextArea
              id="motif-direct"
              rows={3}
              className="min-h-[90px]"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              error={errors.motif}
            />
            <FieldError message={errors.motif} />
          </div>

          {choisi?.responsable ? (
            <div className="flex items-start gap-3 rounded-[8px] border border-gray-200 px-4 py-3">
              <Mail className="mt-1 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
              <div className="min-w-0 flex-1">
                <Toggle
                  id="notifier-responsable"
                  checked={notifier}
                  onChange={setNotifier}
                  label="Notifier le nouveau responsable"
                  hint={`Email interne à ${nomComplet(choisi.responsable)}`}
                />
              </div>
            </div>
          ) : choisi ? (
            <p className="rounded-[8px] bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Ce service n&apos;a pas de responsable : le dossier apparaîtra dans « Service sans responsable ».
            </p>
          ) : null}

          {complementOuvert && (
            <div className="rounded-[8px] border border-[#c5d9ee] bg-[#e8f1fb] px-4 py-3 text-sm text-[#1a5f9e]">
              Un complément est en cours : il est conservé et sera suivi par le service{' '}
              {choisi?.nom_service ?? 'de destination'}.
            </div>
          )}
        </form>
      )}
    </Modal>
  )
}

export { ReaffecterDirectModal }

export default function ReaffectationPanel({ dossier, onDone }) {
  const { estSuperAdmin } = useAdminAuth()
  const [services, setServices] = useState([])
  const [modal, setModal] = useState(null)

  useEffect(() => {
    api
      .get('/referentiels')
      .then((res) => setServices(res.data?.services ?? []))
      .catch(() => setServices([]))
  }, [])

  const fermer = useCallback(() => setModal(null), [])
  const enAttente = dossier.reaffectation_en_attente

  return (
    <>
      <section className="rounded-[8px] border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-gray-900">Affectation</h2>
          {estSuperAdmin && (
            <Button variant="secondary" size="sm" onClick={() => setModal('direct')}>
              <Users className="h-4 w-4" /> Réaffecter
            </Button>
          )}
        </div>

        {estSuperAdmin ? (
          <div className="space-y-3">
            <div>
              <p className="mb-0.5 text-xs text-gray-500">Service affecté</p>
              <p className="text-sm font-medium text-gray-900">{dossier.service?.nom_service || '—'}</p>
            </div>
            <div>
              <p className="mb-0.5 text-xs text-gray-500">Responsable</p>
              <p className="text-sm font-medium text-gray-900">
                {dossier.responsable ? nomComplet(dossier.responsable) : (
                  <span className="text-gray-400">Aucun responsable</span>
                )}
              </p>
            </div>
            <p className="text-xs text-gray-500">Seul le Super Admin peut modifier l&apos;affectation.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="mb-0.5 text-xs text-gray-500">Service</p>
              <p className="text-sm font-medium text-gray-900">{dossier.service?.nom_service || '—'}</p>
            </div>
            <div>
              <p className="mb-0.5 text-xs text-gray-500">Responsable du dossier</p>
              <p className="text-sm font-medium text-gray-900">
                {dossier.responsable ? nomComplet(dossier.responsable) : (
                  <span className="text-gray-400">Non affecté</span>
                )}
              </p>
            </div>
          </div>
        )}

        {!estSuperAdmin && !enAttente && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="mb-3 text-sm text-gray-600">Cette doléance ne concerne pas votre service ?</p>
            <button
              type="button"
              onClick={() => setModal('demander')}
              className="inline-flex rounded-[8px] border border-institutional px-3 py-2 text-sm font-medium text-institutional transition hover:bg-[#e6f6ed]"
            >
              Demander une réaffectation
            </button>
          </div>
        )}

        {!estSuperAdmin && enAttente && (
          <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
            <span className="inline-flex rounded-full bg-[#fff4e5] px-2.5 py-0.5 text-xs font-medium text-[#8a5a00]">
              Demande de réaffectation en attente
            </span>
            <p className="text-sm text-gray-700">
              Transfert suggéré vers{' '}
              <span className="font-medium">
                {enAttente.service_propose?.nom_service ?? 'un service à déterminer'}
              </span>
              , demandé le {formatDate(enAttente.date_demande)}.
            </p>
            {enAttente.motif && (
              <p className="text-sm italic text-gray-600">« {enAttente.motif} »</p>
            )}
            <button
              type="button"
              onClick={() => setModal('annuler')}
              className="inline-flex rounded-[8px] border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-400"
            >
              Annuler la demande
            </button>
          </div>
        )}
      </section>

      <DemanderModal
        open={modal === 'demander'}
        onClose={fermer}
        dossier={dossier}
        services={services}
        onDone={onDone}
      />
      <AnnulerModal
        open={modal === 'annuler' && Boolean(enAttente)}
        onClose={fermer}
        demande={enAttente}
        onDone={onDone}
      />
      <RefuserModal
        open={modal === 'refuser' && Boolean(enAttente)}
        onClose={fermer}
        demande={enAttente}
        onDone={onDone}
      />
      <AccepterModal
        open={modal === 'accepter' && Boolean(enAttente)}
        onClose={fermer}
        demande={enAttente}
        services={services}
        onDone={onDone}
      />
      <ReaffecterDirectModal
        open={modal === 'direct'}
        onClose={fermer}
        dossier={dossier}
        services={services}
        onDone={onDone}
      />
    </>
  )
}

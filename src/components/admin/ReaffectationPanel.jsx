import { useCallback, useEffect, useState } from 'react'
import { Building2, Check, Mail, Users } from 'lucide-react'
import { FieldError, FieldLabel, TextArea } from '../FormFields'
import Modal from './Modal'
import Toggle from './Toggle'
import Button from '../ui/Button'
import adminApi, { extractErrors } from '../../lib/adminApi'
import api from '../../lib/api'
import { endpoints } from '../../lib/endpoints'
import { formatDate, formatDateHeure, message409, nomComplet } from '../../lib/statuts'
import { useAdminAuth } from '../../admin/AdminAuthContext'
import { useLanguage } from '../../i18n/LanguageContext'

const CODES_409 = [
  'demande_en_attente',
  'dossier_conclu',
  'deja_acceptee',
  'deja_refusee',
  'deja_annulee',
  'sans_suite',
]

function messageReaffectation(err, tf, fallback, lang = 'fr') {
  const code = err.response?.data?.code
  if (code && CODES_409.includes(code)) return tf(`admin.reaffectation.codes.${code}`)
  return extractErrors(err, fallback, lang).message
}

function ServiceRadios({ services, value, onChange, excludeId, allowInconnu, disabled, labelInconnu }) {
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
        carte(value === '', <span className="font-medium">{labelInconnu}</span>, () => onChange(''))}
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
  const { tf, lang } = useLanguage()
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
      setErrors({ motif: tf('admin.reaffectation.motifRequis') })
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
        res.data?.message || tf('admin.reaffectation.demandeEnregistree'),
      )
      onClose()
    } catch (err) {
      const { fields } = extractErrors(err, undefined, lang)
      setErrors(fields)
      if (!fields.motif) {
        onDone(
          'error',
          messageReaffectation(err, tf, tf('admin.reaffectation.demandeEchec'), lang),
        )
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
      title={tf('admin.reaffectation.demanderTitre')}
      subtitle={dossier?.reference}
      footer={
        <>
          <BoutonSecondaire onClick={onClose} disabled={busy}>
            {tf('commun.cancel')}
          </BoutonSecondaire>
          <BoutonPrincipal form="form-demander-reaffectation" disabled={busy}>
            {busy ? tf('admin.ui.envoi') : tf('admin.reaffectation.envoyerDemande')}
          </BoutonPrincipal>
        </>
      }
    >
      <form id="form-demander-reaffectation" onSubmit={submit} noValidate className="space-y-5">
        <div>
          <p className="mb-3 text-sm font-medium text-gray-800">{tf('admin.reaffectation.serviceSuggere')}</p>
          <ServiceRadios
            services={services}
            value={service}
            onChange={setService}
            excludeId={dossier?.service?.id_service}
            allowInconnu
            disabled={busy}
            labelInconnu={tf('admin.reaffectation.jeNeSaisPas')}
          />
        </div>
        <div>
          <FieldLabel htmlFor="motif-demande" required>
            {tf('admin.reaffectation.motif')}
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
          {tf('admin.reaffectation.infoDemande')}
        </div>
      </form>
    </Modal>
  )
}

function AnnulerModal({ open, onClose, demande, onDone }) {
  const { tf, lang } = useLanguage()
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
      setErrors({ motif: tf('admin.reaffectation.motifAnnulationRequis') })
      return
    }
    setBusy(true)
    try {
      const res = await adminApi.post(`/admin/reaffectations/${demande.id_reaffectation}/annuler`, {
        motif: motif.trim(),
      })
      onDone('success', res.data?.message || tf('admin.reaffectation.demandeAnnulee'))
      onClose()
    } catch (err) {
      const { fields } = extractErrors(err, undefined, lang)
      setErrors(fields)
      if (!fields.motif) {
        onDone(
          'error',
          messageReaffectation(err, tf, tf('admin.reaffectation.annulationEchec'), lang),
        )
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
      title={tf('admin.reaffectation.annulerTitre')}
      footer={
        <>
          <BoutonSecondaire onClick={onClose} disabled={busy}>
            {tf('commun.back')}
          </BoutonSecondaire>
          <BoutonPrincipal form="form-annuler-reaffectation" disabled={busy} danger>
            {busy ? tf('admin.ui.envoi') : tf('admin.reaffectation.annulerDemande')}
          </BoutonPrincipal>
        </>
      }
    >
      <form id="form-annuler-reaffectation" onSubmit={submit} noValidate className="space-y-5">
        <div className="rounded-[8px] border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="mb-1 text-xs font-medium tracking-[0.08em] text-gray-500 uppercase">
            {tf('admin.reaffectation.votreDemandeDu', { date: formatDate(demande?.date_demande) })}
          </p>
          <p className="text-sm text-gray-800">
            {tf('admin.reaffectation.serviceSuggereLabel', {
              service: demande?.service_propose?.nom_service ?? tf('admin.reaffectation.nonPrecise'),
            })}
          </p>
          {demande?.motif && <p className="mt-1 text-sm italic text-gray-700">« {demande.motif} »</p>}
        </div>
        <div>
          <FieldLabel htmlFor="motif-annulation" required>
            {tf('admin.reaffectation.motifAnnulation')}
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
  const { tf, lang } = useLanguage()
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
      setErrors({ motif: tf('admin.reaffectation.motifRefusRequis') })
      return
    }
    setBusy(true)
    try {
      const res = await adminApi.post(`/admin/reaffectations/${demande.id_reaffectation}/refuser`, {
        motif: motif.trim(),
      })
      onDone('success', res.data?.message || tf('admin.reaffectation.demandeRefusee'))
      onClose()
    } catch (err) {
      const { fields } = extractErrors(err, undefined, lang)
      setErrors(fields)
      if (!fields.motif) {
        onDone('error', messageReaffectation(err, tf, tf('admin.reaffectation.refusEchec'), lang))
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
      title={tf('admin.reaffectation.refuserTitre')}
      footer={
        <>
          <BoutonSecondaire onClick={onClose} disabled={busy}>
            {tf('commun.back')}
          </BoutonSecondaire>
          <BoutonPrincipal form="form-refuser-reaffectation" disabled={busy} danger>
            {busy ? tf('admin.ui.envoi') : tf('admin.reaffectation.refuser')}
          </BoutonPrincipal>
        </>
      }
    >
      <form id="form-refuser-reaffectation" onSubmit={submit} noValidate className="space-y-5">
        <p className="text-sm text-gray-600">
          {tf('admin.reaffectation.demandeDe', {
            nom: nomComplet(demande?.demandeur),
            service: demande?.service_propose?.nom_service ?? tf('admin.reaffectation.nonPreciseMin'),
          })}
        </p>
        <div>
          <FieldLabel htmlFor="motif-refus" required>
            {tf('admin.reaffectation.motifRefus')}
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
  const { tf, lang } = useLanguage()
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
      setErrors({ id_service_destination: tf('admin.reaffectation.choisirService') })
      return
    }
    setBusy(true)
    try {
      const res = await adminApi.post(`/admin/reaffectations/${demande.id_reaffectation}/accepter`, {
        id_service_destination: Number(service),
      })
      const dest = res.data?.doleance?.service ?? ''
      const nomDest = dest ? (typeof dest === 'string' ? dest : dest.nom_service) : ''
      onDone(
        'success',
        res.data?.message ||
          (nomDest
            ? tf('admin.reaffectation.dossierReaffecteVers', { service: nomDest })
            : tf('admin.reaffectation.dossierReaffecte')),
      )
      onClose()
    } catch (err) {
      const { fields } = extractErrors(err, undefined, lang)
      setErrors(fields)
      if (!Object.keys(fields).length) {
        onDone('error', messageReaffectation(err, tf, tf('admin.reaffectation.acceptationEchec'), lang))
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
      title={tf('admin.reaffectation.accepterTitre')}
      footer={
        <>
          <BoutonSecondaire onClick={onClose} disabled={busy}>
            {tf('commun.back')}
          </BoutonSecondaire>
          <BoutonPrincipal form="form-accepter-reaffectation" disabled={busy}>
            {busy ? tf('admin.ui.envoi') : tf('admin.reaffectation.reaffecterAction')}
          </BoutonPrincipal>
        </>
      }
    >
      <form id="form-accepter-reaffectation" onSubmit={submit} noValidate className="space-y-5">
        <div>
          <p className="mb-3 text-sm font-medium text-gray-800">
            {tf('admin.reaffectation.serviceDestination')}
          </p>
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

function ReaffecterDirectModal({ open, onClose, dossier, onDone }) {
  const { tf, lang } = useLanguage()
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
        setErreur(extractErrors(err, tf('admin.reaffectation.chargementEchec'), lang).message)
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
    if (!service) next.id_service_destination = tf('admin.reaffectation.choisirService')
    if (!motif.trim()) next.motif = tf('admin.reaffectation.motifDirectRequis')
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
      const nomDest =
        typeof dest === 'string'
          ? dest
          : dest?.nom_service ?? choisi?.nom_service ?? tf('admin.reaffectation.serviceChoisi')
      let texte = tf('admin.reaffectation.reaffecteeVers', { service: nomDest })
      if (res.data?.demande_reglee) texte += tf('admin.reaffectation.demandeReglee')
      onDone?.('success', texte)
      onClose()
    } catch (err) {
      const { fields, message } = extractErrors(err, undefined, lang)
      setErrors(fields)
      if (!Object.keys(fields).length) {
        setErreur(
          err.response?.data?.code === 'dossier_conclu'
            ? tf('admin.reaffectation.dossierTermine')
            : message409(
                err.response?.data?.code,
                messageReaffectation(err, tf, message, lang),
              ),
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
      title={tf('admin.reaffectation.directTitre')}
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
            {tf('commun.cancel')}
          </Button>
          <Button
            type="submit"
            form="form-reaffecter-direct"
            loading={busy}
            disabled={load !== 'ready' || !service}
          >
            <Check className="h-4 w-4" /> {tf('admin.reaffectation.confirmer')}
          </Button>
        </>
      }
    >
      {load === 'loading' && (
        <p className="text-sm text-gray-500">{tf('commun.loading')}</p>
      )}
      {load === 'error' && (
        <div>
          <p className="mb-3 text-sm text-red-600">{erreur}</p>
          <Button variant="secondary" onClick={charger}>
            {tf('commun.retry')}
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
              {tf('admin.reaffectation.affectationActuelle')}{' '}
              <strong>{detail.service?.nom_service ?? '—'}</strong>
              {' · '}
              {detail.responsable
                ? nomComplet(detail.responsable)
                : tf('admin.reaffectation.aucunResponsable')}
            </p>
          </div>

          {attente && (
            <div className="rounded-[8px] bg-warning-bg px-4 py-3 text-sm leading-relaxed text-warning-text">
              {tf('admin.reaffectation.demandeEnAttenteBanner', {
                demandeur: nomComplet(attente.demandeur),
                date: formatDateHeure(attente.date_demande),
                motif: attente.motif,
                service:
                  attente.service_propose?.nom_service ?? tf('admin.reaffectation.nonPreciseMin'),
              })}
            </div>
          )}

          <div>
            <p className="mb-3 text-sm font-medium text-gray-800">
              {tf('admin.reaffectation.nouveauService')}
            </p>
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
                        {s.responsable
                          ? tf('admin.reaffectation.responsableLabel', {
                              nom: nomComplet(s.responsable),
                            })
                          : tf('admin.reaffectation.aucunResponsable')}
                      </p>
                    </div>
                    {estActuel && (
                      <span className="shrink-0 text-xs text-gray-400">
                        {tf('admin.reaffectation.serviceActuel')}
                      </span>
                    )}
                    {estPropose && !estActuel && (
                      <span className="shrink-0 text-xs text-institutional">
                        {tf('admin.reaffectation.propose')}
                      </span>
                    )}
                  </label>
                )
              })}
            </div>
            <FieldError message={errors.id_service_destination} />
          </div>

          <div>
            <FieldLabel htmlFor="motif-direct" required>
              {tf('admin.reaffectation.motifDirect')}
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
                  label={tf('admin.reaffectation.notifierResponsable')}
                  hint={tf('admin.reaffectation.emailInterne', {
                    nom: nomComplet(choisi.responsable),
                  })}
                />
              </div>
            </div>
          ) : choisi ? (
            <p className="rounded-[8px] bg-gray-50 px-4 py-3 text-sm text-gray-600">
              {tf('admin.reaffectation.sansResponsableHint')}
            </p>
          ) : null}

          {complementOuvert && (
            <div className="rounded-[8px] border border-[#c5d9ee] bg-[#e8f1fb] px-4 py-3 text-sm text-[#1a5f9e]">
              {tf('admin.reaffectation.complementEnCours', {
                service: choisi?.nom_service ?? tf('admin.reaffectation.deDestination'),
              })}
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
  const { tf } = useLanguage()
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
          <h2 className="text-base font-bold text-gray-900">{tf('admin.reaffectation.titre')}</h2>
          {estSuperAdmin && (
            <Button variant="secondary" size="sm" onClick={() => setModal('direct')}>
              <Users className="h-4 w-4" /> {tf('admin.reaffectation.reaffecter')}
            </Button>
          )}
        </div>

        {estSuperAdmin ? (
          <div className="space-y-3">
            <div>
              <p className="mb-0.5 text-xs text-gray-500">{tf('admin.reaffectation.serviceAffecte')}</p>
              <p className="text-sm font-medium text-gray-900">{dossier.service?.nom_service || '—'}</p>
            </div>
            <div>
              <p className="mb-0.5 text-xs text-gray-500">{tf('admin.reaffectation.responsable')}</p>
              <p className="text-sm font-medium text-gray-900">
                {dossier.responsable ? nomComplet(dossier.responsable) : (
                  <span className="text-gray-400">{tf('admin.reaffectation.aucunResponsable')}</span>
                )}
              </p>
            </div>
            <p className="text-xs text-gray-500">{tf('admin.reaffectation.seulSuperAdmin')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="mb-0.5 text-xs text-gray-500">{tf('admin.reaffectation.service')}</p>
              <p className="text-sm font-medium text-gray-900">{dossier.service?.nom_service || '—'}</p>
            </div>
            <div>
              <p className="mb-0.5 text-xs text-gray-500">{tf('admin.reaffectation.responsableDossier')}</p>
              <p className="text-sm font-medium text-gray-900">
                {dossier.responsable ? nomComplet(dossier.responsable) : (
                  <span className="text-gray-400">{tf('admin.reaffectation.nonAffecte')}</span>
                )}
              </p>
            </div>
          </div>
        )}

        {!estSuperAdmin && !enAttente && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="mb-3 text-sm text-gray-600">{tf('admin.reaffectation.pasVotreService')}</p>
            <button
              type="button"
              onClick={() => setModal('demander')}
              className="inline-flex rounded-[8px] border border-institutional px-3 py-2 text-sm font-medium text-institutional transition hover:bg-[#e6f6ed]"
            >
              {tf('admin.reaffectation.demander')}
            </button>
          </div>
        )}

        {!estSuperAdmin && enAttente && (
          <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
            <span className="inline-flex rounded-full bg-[#fff4e5] px-2.5 py-0.5 text-xs font-medium text-[#8a5a00]">
              {tf('admin.reaffectation.enAttente')}
            </span>
            <p className="text-sm text-gray-700">
              {tf('admin.reaffectation.transfertSuggere')}{' '}
              <span className="font-medium">
                {enAttente.service_propose?.nom_service ?? tf('admin.reaffectation.serviceADeterminer')}
              </span>
              {tf('admin.reaffectation.demandeLe', { date: formatDate(enAttente.date_demande) })}
            </p>
            {enAttente.motif && (
              <p className="text-sm italic text-gray-600">« {enAttente.motif} »</p>
            )}
            <button
              type="button"
              onClick={() => setModal('annuler')}
              className="inline-flex rounded-[8px] border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-400"
            >
              {tf('admin.reaffectation.annulerDemande')}
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

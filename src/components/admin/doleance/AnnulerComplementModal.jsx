import { useState } from 'react'
import { Mail } from 'lucide-react'
import Modal from '../Modal'
import { FieldError, FieldLabel, TextArea } from '../../FormFields'
import adminApi, { extractErrors } from '../../../lib/adminApi'
import { nomComplet, statutKey } from '../../../lib/statuts'
import StatusBadge from '../../StatusBadge'

const MAX_MOTIF = 1000

const MESSAGES_409 = {
  deja_repondu:
    'Le citoyen a déjà répondu : la demande ne peut plus être annulée. Consultez et examinez sa réponse.',
  deja_annule: 'Cette demande a déjà été annulée.',
  etat_invalide: "Cette demande n'est plus en cours.",
}

function formatDateHeure(iso) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const jour = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
  const heure = new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace(/\u202f/g, ' ')
  return `${jour} · ${heure}`
}

function suffixeEmail(emailEnvoye) {
  if (emailEnvoye === true) return ' Le demandeur a été prévenu par email.'
  if (emailEnvoye === false) return " Attention : l'email n'a pas pu être envoyé."
  return ''
}

export default function AnnulerComplementModal({
  open,
  onClose,
  complement,
  dossier,
  onDone,
  onReaffecte,
}) {
  const [motif, setMotif] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  const reset = () => {
    setMotif('')
    setErrors({})
    setFormError('')
    setBusy(false)
  }

  const fermer = () => {
    if (busy) return
    reset()
    onClose()
  }

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setFormError('')
    if (!motif.trim()) {
      setErrors({ motif: "Indiquez le motif de l'annulation." })
      return
    }
    setErrors({})
    setBusy(true)
    try {
      const res = await adminApi.post(`/admin/complements/${complement.id_complement}/annuler`, {
        motif: motif.trim(),
      })
      onClose()
      reset()
      onDone(
        'success',
        `Demande de complément annulée. Le dossier est repassé « En cours ».${suffixeEmail(res.data?.email_envoye)}`,
      )
    } catch (err) {
      const status = err.response?.status
      const code = err.response?.data?.code
      const { message, fields } = extractErrors(err, "L'annulation a échoué.")

      if (status === 403 && code === 'dossier_reaffecte') {
        onClose()
        reset()
        onReaffecte?.(err.response.data)
        return
      }

      if (status === 409 && MESSAGES_409[code]) {
        onClose()
        reset()
        onDone('info', MESSAGES_409[code])
        return
      }

      if (status === 422 || fields.motif) {
        setErrors({ motif: fields.motif || message })
        setBusy(false)
        return
      }

      setFormError(message)
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={fermer}
      busy={busy}
      title={<span className="whitespace-nowrap">Annuler la demande de complément</span>}
      subtitle={
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-medium text-institutional" dir="ltr">
            {dossier?.reference}
          </span>
          <StatusBadge status={statutKey(dossier?.statut)} label={dossier?.statut?.libelle} showDot />
        </div>
      }
      footer={
        <>
          <button
            type="button"
            onClick={fermer}
            disabled={busy}
            className="inline-flex items-center justify-center rounded-[8px] border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Retour
          </button>
          <button
            type="submit"
            form="form-annuler-complement"
            disabled={busy}
            aria-busy={busy}
            className="inline-flex items-center justify-center rounded-[8px] bg-action px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#008040] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Envoi…' : 'Annuler la demande de complément'}
          </button>
        </>
      }
    >
      <form id="form-annuler-complement" onSubmit={submit} noValidate className="space-y-5">
        <div className="rounded-[8px] border border-[#c4b5fd] bg-[#f5f3ff] px-4 py-3">
          <p className="mb-2 text-[11px] font-medium tracking-[0.08em] text-gray-500 uppercase">
            Demande ouverte le {formatDateHeure(complement?.date_demande)}
            {complement?.auteur ? ` par ${nomComplet(complement.auteur)}` : ''}
          </p>
          <p className="text-sm italic text-gray-800">« {complement?.question} »</p>
          {complement?.piece_exigee && (
            <p className="mt-2 text-sm text-gray-700">
              Pièce attendue : {complement.description_piece || 'fichier'} (fichier exigé)
            </p>
          )}
        </div>

        <div>
          <FieldLabel htmlFor="motif-annulation-complement" required>
            Motif de l&apos;annulation
          </FieldLabel>
          <TextArea
            id="motif-annulation-complement"
            rows={4}
            className="min-h-[110px]"
            maxLength={MAX_MOTIF}
            value={motif}
            onChange={(e) => setMotif(e.target.value.slice(0, MAX_MOTIF))}
            placeholder="Pourquoi cette demande n'est-elle plus nécessaire ?"
            error={errors.motif}
          />
          <div className="mt-1.5 flex items-start justify-between gap-3">
            <FieldError message={errors.motif} />
            <p className="ms-auto font-mono text-xs text-gray-400">
              {motif.length} / {MAX_MOTIF}
            </p>
          </div>
        </div>

        <div className="rounded-[8px] border border-action/20 bg-[#e6f6ed] px-4 py-3 text-sm leading-relaxed text-gray-700">
          <p className="flex items-start gap-2">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-institutional" aria-hidden />
            <span>
              Le dossier revient à « En cours » et le formulaire du citoyen se ferme. Le citoyen
              voit que son intervention n&apos;est plus nécessaire et{' '}
              <strong>un email lui est envoyé</strong>. La question, votre nom, la date et le motif
              restent dans l&apos;historique ; le motif n&apos;est pas montré au citoyen. Aucune
              réponse n&apos;est supprimée.
            </span>
          </p>
        </div>

        {formError && (
          <p className="text-sm text-red-600" role="alert">
            {formError}
          </p>
        )}
      </form>
    </Modal>
  )
}

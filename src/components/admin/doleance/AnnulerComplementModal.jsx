import { useState } from 'react'
import { Mail } from 'lucide-react'
import Modal from '../Modal'
import { FieldError, FieldLabel, TextArea } from '../../FormFields'
import adminApi, { extractErrors } from '../../../lib/adminApi'
import { nomComplet, statutKey } from '../../../lib/statuts'
import StatusBadge from '../../StatusBadge'
import { useLanguage, useFormat } from '../../../i18n/LanguageContext'
import { emailSuffix } from './helpers'

const MAX_MOTIF = 1000

const CODES_409 = {
  deja_repondu: 'admin.annulerComplement.dejaRepondu',
  deja_annule: 'admin.annulerComplement.dejaAnnule',
  etat_invalide: 'admin.annulerComplement.etatInvalide',
}

export default function AnnulerComplementModal({
  open,
  onClose,
  complement,
  dossier,
  onDone,
  onReaffecte,
}) {
  const { tf, lang } = useLanguage()
  const { formatDateHeure } = useFormat()
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
      setErrors({ motif: tf('admin.annulerComplement.motifRequis') })
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
        `${tf('admin.annulerComplement.annulee')}${emailSuffix(res.data?.email_envoye, tf)}`,
      )
    } catch (err) {
      const status = err.response?.status
      const code = err.response?.data?.code
      const { message, fields } = extractErrors(err, tf('admin.reaffectation.annulationEchec'), lang)

      if (status === 403 && code === 'dossier_reaffecte') {
        onClose()
        reset()
        onReaffecte?.(err.response.data)
        return
      }

      if (status === 409 && CODES_409[code]) {
        onClose()
        reset()
        onDone('info', tf(CODES_409[code]))
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
      title={<span className="whitespace-nowrap">{tf('admin.annulerComplement.titre')}</span>}
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
            {tf('commun.back')}
          </button>
          <button
            type="submit"
            form="form-annuler-complement"
            disabled={busy}
            aria-busy={busy}
            className="inline-flex items-center justify-center rounded-[8px] bg-action px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#008040] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? tf('admin.ui.envoi') : tf('admin.annulerComplement.annuler')}
          </button>
        </>
      }
    >
      <form id="form-annuler-complement" onSubmit={submit} noValidate className="space-y-5">
        <div className="rounded-[8px] border border-[#c4b5fd] bg-[#f5f3ff] px-4 py-3">
          <p className="mb-2 text-[11px] font-medium tracking-[0.08em] text-gray-500 uppercase">
            {tf('admin.annulerComplement.ouverteLe', {
              date: formatDateHeure(complement?.date_demande),
            })}
            {complement?.auteur
              ? ` ${tf('admin.annulerComplement.ouvertePar', { nom: nomComplet(complement.auteur) })}`
              : ''}
          </p>
          <p className="text-sm italic text-gray-800">« {complement?.question} »</p>
          {complement?.piece_exigee && (
            <p className="mt-2 text-sm text-gray-700">
              {tf('admin.annulerComplement.pieceAttendue', {
                piece: complement.description_piece || tf('admin.annulerComplement.fichier'),
              })}{' '}
              {tf('admin.annulerComplement.fichierExige')}
            </p>
          )}
        </div>

        <div>
          <FieldLabel htmlFor="motif-annulation-complement" required>
            {tf('admin.annulerComplement.motifLabel')}
          </FieldLabel>
          <TextArea
            id="motif-annulation-complement"
            rows={4}
            className="min-h-[110px]"
            maxLength={MAX_MOTIF}
            value={motif}
            onChange={(e) => setMotif(e.target.value.slice(0, MAX_MOTIF))}
            placeholder={tf('admin.annulerComplement.motifPlaceholder')}
            error={errors.motif}
          />
          <div className="mt-1.5 flex items-start justify-between gap-3">
            <FieldError message={errors.motif} />
            <p className="ms-auto font-mono text-xs text-gray-400">
              {tf('admin.annulerComplement.motifCompteur', { n: motif.length, max: MAX_MOTIF })}
            </p>
          </div>
        </div>

        <div className="rounded-[8px] border border-action/20 bg-[#e6f6ed] px-4 py-3 text-sm leading-relaxed text-gray-700">
          <p className="flex items-start gap-2">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-institutional" aria-hidden />
            <span>{tf('admin.annulerComplement.explication')}</span>
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

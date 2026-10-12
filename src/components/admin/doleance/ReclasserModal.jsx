import { useEffect, useState } from 'react'
import Modal from '../Modal'
import Button from '../../ui/Button'
import StatusBadge from '../../StatusBadge'
import { FieldError, FieldHelp, FieldLabel, TextArea } from '../../FormFields'
import { endpoints } from '../../../lib/endpoints'
import { extractErrors } from '../../../lib/adminApi'
import { statutKey } from '../../../lib/statuts'
import { useLanguage } from '../../../i18n/LanguageContext'

const MOTIF_MAX = 2000

export default function ReclasserModal({ open, onClose, dossier, transitions = [], onDone }) {
  const { tf, lang } = useLanguage()
  const [idStatut, setIdStatut] = useState('')
  const [motif, setMotif] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setIdStatut('')
    setMotif('')
    setErrors({})
    setBusy(false)
  }, [open])

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    const next = {}
    if (!idStatut) next.id_statut = tf('admin.reclasser.choisirIssue')
    const motifTrim = motif.trim()
    if (!motifTrim) next.motif = tf('admin.reclasser.motifRequis')
    else if (motifTrim.length > MOTIF_MAX) {
      next.motif = tf('admin.reclasser.motifTropLong', { max: MOTIF_MAX })
    }
    setErrors(next)
    if (Object.keys(next).length) return

    setBusy(true)
    try {
      const res = await endpoints.reclasser(dossier.reference, {
        id_statut: Number(idStatut),
        motif: motifTrim,
      })
      onDone('success', res.data?.message || tf('admin.reclasser.succes'))
      onClose()
    } catch (err) {
      const { message, fields } = extractErrors(err, tf('admin.reclasser.echec'), lang)
      setErrors(fields)
      if (!Object.keys(fields).length) onDone('error', message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      title={tf('admin.reclasser.titre')}
      subtitle={
        <span className="font-mono" dir="ltr">
          {dossier?.reference}
        </span>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {tf('commun.cancel')}
          </Button>
          <Button type="submit" form="form-reclasser" loading={busy}>
            {tf('admin.reclasser.reclasser')}
          </Button>
        </>
      }
    >
      <form id="form-reclasser" onSubmit={submit} noValidate className="space-y-4">
        <p className="text-sm text-gray-600">
          {tf('admin.reclasser.intro', { nature: dossier?.nature?.libelle ?? '—' })}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {transitions.map((s) => {
            const selected = String(s.id_statut) === String(idStatut)
            return (
              <label
                key={s.id_statut}
                className={[
                  'flex cursor-pointer items-center gap-3 rounded-[8px] border px-3 py-3',
                  selected ? 'border-institutional bg-[#e6f6ed]' : 'border-gray-200 bg-white',
                ].join(' ')}
              >
                <input
                  type="radio"
                  name="reclasser-issue"
                  className="h-4 w-4 accent-[#006b3f]"
                  checked={selected}
                  disabled={busy}
                  onChange={() => {
                    setIdStatut(String(s.id_statut))
                    if (errors.id_statut) setErrors((prev) => ({ ...prev, id_statut: '' }))
                  }}
                />
                <StatusBadge status={statutKey(s)} label={s.libelle} showDot />
              </label>
            )
          })}
        </div>
        <FieldError message={errors.id_statut} />

        <div>
          <FieldLabel htmlFor="reclasser-motif" required>
            {tf('admin.reclasser.motifLabel')}
          </FieldLabel>
          <TextArea
            id="reclasser-motif"
            rows={4}
            className="min-h-[100px]"
            maxLength={MOTIF_MAX}
            value={motif}
            disabled={busy}
            onChange={(e) => {
              setMotif(e.target.value.slice(0, MOTIF_MAX))
              if (errors.motif) setErrors((prev) => ({ ...prev, motif: '' }))
            }}
            error={errors.motif}
          />
          <FieldHelp>
            {tf('admin.reclasser.compteur', { n: motif.length, max: MOTIF_MAX })}
          </FieldHelp>
          <FieldError message={errors.motif} />
        </div>
      </form>
    </Modal>
  )
}

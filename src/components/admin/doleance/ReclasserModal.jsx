import { useEffect, useState } from 'react'
import Modal from '../Modal'
import Button from '../../ui/Button'
import StatusBadge from '../../StatusBadge'
import { FieldError } from '../../FormFields'
import { endpoints } from '../../../lib/endpoints'
import { extractErrors } from '../../../lib/adminApi'
import { CODES_CONCLUSION, issuesAutorisees, natureCode, statutKey } from '../../../lib/statuts'

export default function ReclasserModal({ open, onClose, dossier, transitions = [], onDone }) {
  const [idStatut, setIdStatut] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const autorisees = issuesAutorisees(natureCode(dossier?.nature)).map((i) => i.alias)
  const choix = transitions.filter((s) => {
    const key = statutKey(s)
    return CODES_CONCLUSION.includes(key) && (autorisees.length === 0 || autorisees.includes(key))
  })

  useEffect(() => {
    if (!open) return
    setIdStatut('')
    setErrors({})
    setBusy(false)
  }, [open])

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    if (!idStatut) {
      setErrors({ id_statut: 'Choisissez la nouvelle issue.' })
      return
    }
    setBusy(true)
    try {
      const res = await endpoints.reclasser(dossier.reference, { id_statut: Number(idStatut) })
      onDone('success', res.data?.message || 'Le dossier a été reclassé.')
      onClose()
    } catch (err) {
      const { message, fields } = extractErrors(err, 'Le reclassement a échoué.')
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
      title="Reclasser le dossier"
      subtitle={
        <span className="font-mono" dir="ltr">
          {dossier?.reference}
        </span>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button type="submit" form="form-reclasser" loading={busy}>
            Reclasser
          </Button>
        </>
      }
    >
      <form id="form-reclasser" onSubmit={submit} noValidate className="space-y-4">
        <p className="text-sm text-gray-600">
          Ancien classement en lecture seule. Choisissez l&apos;issue métier correspondant à la
          nature « {dossier?.nature?.libelle ?? '—'} ».
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {choix.map((s) => {
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
                  onChange={() => setIdStatut(String(s.id_statut))}
                />
                <StatusBadge status={statutKey(s)} label={s.libelle} showDot />
              </label>
            )
          })}
        </div>
        <FieldError message={errors.id_statut} />
      </form>
    </Modal>
  )
}

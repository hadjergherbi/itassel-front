import { useState } from 'react'
import { Lock } from 'lucide-react'
import { FieldError, FieldLabel, TextArea } from '../../FormFields'
import adminApi, { extractErrors } from '../../../lib/adminApi'
import { formatDate, nomComplet } from '../../../lib/statuts'
import Button from '../../ui/Button'
import { Card } from './shared'

export default function NotesInternes({ dossier, onDone }) {
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const notes = dossier.notes_internes ?? []

  const ajouterNote = async (e) => {
    e.preventDefault()
    if (busy) return
    if (!note.trim()) {
      setErrors({ note: 'Écrivez la note.' })
      return
    }
    setErrors({})
    setBusy(true)
    try {
      await adminApi.post(`/admin/doleances/${dossier.reference}/notes`, { contenu: note.trim() })
      setNote('')
      onDone('success', 'Note interne ajoutée.')
    } catch (err) {
      const { message: msg, fields } = extractErrors(err)
      setErrors({ note: fields.contenu })
      if (!fields.contenu) onDone('error', msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card
      title="Notes internes"
      badge={
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff4e5] px-2.5 py-0.5 text-xs font-medium text-[#8a5a00]">
          <Lock className="h-3.5 w-3.5" aria-hidden /> Jamais visibles du demandeur
        </span>
      }
    >
      <div className="space-y-4">
        {notes.length > 0 && (
          <ul className="space-y-3">
            {notes.map((n) => (
              <li key={n.id_note} className="rounded-[8px] border border-[#f5c77a]/60 bg-[#fffbf2] px-4 py-3">
                <p className="mb-1 text-xs text-gray-500">
                  <span className="font-semibold text-gray-700">{nomComplet(n.auteur)}</span> —{' '}
                  {formatDate(n.date_creation)}
                </p>
                <p className="whitespace-pre-line text-sm text-gray-800">{n.contenu}</p>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={ajouterNote} noValidate className="space-y-3">
          <FieldLabel htmlFor="note-contenu">Nouvelle note</FieldLabel>
          <TextArea
            id="note-contenu"
            rows={3}
            className="min-h-[90px]"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note réservée à l'équipe…"
            error={errors.note}
          />
          <FieldError message={errors.note} />
          <Button type="submit" variant="secondary" loading={busy}>
            Ajouter la note
          </Button>
        </form>
      </div>
    </Card>
  )
}

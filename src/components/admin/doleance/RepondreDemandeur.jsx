import { useState } from 'react'
import { Mail } from 'lucide-react'
import { FieldError, FieldLabel, SelectInput, TextArea } from '../../FormFields'
import adminApi, { extractErrors } from '../../../lib/adminApi'
import Button from '../../ui/Button'
import { Card, Checkbox } from './shared'
import { emailSuffix } from './helpers'

export default function RepondreDemandeur({ dossier, modeles, onDone }) {
  const [contenu, setContenu] = useState('')
  const [notifier, setNotifier] = useState(true)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const envoyerReponse = async (e) => {
    e.preventDefault()
    if (busy) return
    if (!contenu.trim()) {
      setErrors({ contenu: 'Écrivez votre réponse.' })
      return
    }
    setErrors({})
    setBusy(true)
    try {
      const res = await adminApi.post(`/admin/doleances/${dossier.reference}/reponses`, {
        contenu: contenu.trim(),
        notifier,
      })
      setContenu('')
      setNotifier(true)
      onDone('success', `Réponse publiée.${emailSuffix(res.data?.email_envoye)}`)
    } catch (err) {
      const { message: msg, fields } = extractErrors(err)
      setErrors(fields)
      if (!Object.keys(fields).length) onDone('error', msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card
      title="Répondre au demandeur"
      badge={
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e6f6ed] px-2.5 py-0.5 text-xs font-medium text-institutional">
          <Mail className="h-3.5 w-3.5" aria-hidden /> Visible du demandeur
        </span>
      }
      extra={
        modeles.length > 0 ? (
          <div className="min-w-[220px] sm:max-w-xs">
            <SelectInput
              id="modele-reponse"
              value=""
              aria-label="Modèle de réponse de conclusion"
              onChange={(e) => {
                const m = modeles.find((x) => String(x.id_modele) === e.target.value)
                if (m) setContenu(m.contenu)
              }}
            >
              <option value="">Modèle de réponse de conclusion</option>
              {modeles.map((m) => (
                <option key={m.id_modele} value={String(m.id_modele)}>
                  {m.titre}
                </option>
              ))}
            </SelectInput>
          </div>
        ) : null
      }
    >
      <form onSubmit={envoyerReponse} noValidate className="space-y-4">
        <div>
          <FieldLabel htmlFor="reponse-contenu" required>
            Votre réponse
          </FieldLabel>
          <TextArea
            id="reponse-contenu"
            rows={5}
            value={contenu}
            onChange={(e) => setContenu(e.target.value)}
            error={errors.contenu}
            placeholder="Rédigez votre réponse. Elle est visible dans le suivi du demandeur."
          />
          <FieldError message={errors.contenu} />
        </div>

        <Checkbox id="reponse-notifier" checked={notifier} onChange={setNotifier}>
          Envoyer la réponse par email au demandeur
        </Checkbox>

        <p className="text-xs leading-relaxed text-gray-500">
          Publier une réponse ne change pas le statut. Pour conclure le dossier, utilisez
          « Changer le statut » avec une réponse de conclusion.
        </p>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            Visible du demandeur
            {notifier ? (
              <>
                {' · '}email demandé à <span dir="ltr">{dossier.email}</span>
              </>
            ) : (
              ' · aucun email ne sera envoyé'
            )}
          </p>
          <Button type="submit" loading={busy}>
            Publier la réponse
          </Button>
        </div>
      </form>
    </Card>
  )
}

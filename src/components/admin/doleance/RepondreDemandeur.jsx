import { useState } from 'react'
import { Mail } from 'lucide-react'
import { FieldError, FieldLabel, TextArea } from '../../FormFields'
import adminApi, { extractErrors } from '../../../lib/adminApi'
import Button from '../../ui/Button'
import { useLanguage } from '../../../i18n/LanguageContext'
import ModeleMessageSelect from '../ModeleMessageSelect'
import { Card, Checkbox } from './shared'
import { emailSuffix } from './helpers'

export default function RepondreDemandeur({
  dossier,
  modeles = [],
  modelesState = 'ready',
  onRetryModeles,
  onDone,
}) {
  const { tf, lang } = useLanguage()
  const [contenu, setContenu] = useState('')
  const [notifier, setNotifier] = useState(true)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const envoyerReponse = async (e) => {
    e.preventDefault()
    if (busy) return
    if (!contenu.trim()) {
      setErrors({ contenu: tf('admin.repondreDemandeur.ecrireReponse') })
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
      onDone(
        'success',
        `${tf('admin.repondreDemandeur.reponsePubliee')}${emailSuffix(res.data?.email_envoye, tf)}`,
      )
    } catch (err) {
      const { message: msg, fields } = extractErrors(err, undefined, lang)
      setErrors(fields)
      if (!Object.keys(fields).length) onDone('error', msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card
      title={tf('admin.repondreDemandeur.titre')}
      badge={
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e6f6ed] px-2.5 py-0.5 text-xs font-medium text-institutional">
          <Mail className="h-3.5 w-3.5" aria-hidden /> {tf('admin.repondreDemandeur.visibleDemandeur')}
        </span>
      }
    >
      <form onSubmit={envoyerReponse} noValidate className="space-y-4">
        <ModeleMessageSelect
          id="modele-reponse"
          label={tf('admin.repondreDemandeur.modeleLabel')}
          modeles={modeles}
          loadState={modelesState}
          onRetry={onRetryModeles}
          valeurActuelle={contenu}
          onAppliquer={(texte) => {
            setContenu(texte ?? '')
            if (errors.contenu) setErrors((prev) => ({ ...prev, contenu: '' }))
          }}
          disabled={busy}
        />

        <div>
          <FieldLabel htmlFor="reponse-contenu" required>
            {tf('admin.repondreDemandeur.reponseLabel')}
          </FieldLabel>
          <TextArea
            id="reponse-contenu"
            rows={5}
            value={contenu}
            onChange={(e) => setContenu(e.target.value)}
            error={errors.contenu}
            placeholder={tf('admin.repondreDemandeur.reponsePlaceholder')}
          />
          <FieldError message={errors.contenu} />
        </div>

        <Checkbox id="reponse-notifier" checked={notifier} onChange={setNotifier}>
          {tf('admin.repondreDemandeur.notifierEmail')}
        </Checkbox>

        <p className="text-xs leading-relaxed text-gray-500">
          {tf('admin.repondreDemandeur.avertissement')}
        </p>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            {tf('admin.repondreDemandeur.visibleDemandeur')}
            {notifier ? (
              <>
                {' · '}
                {tf('admin.repondreDemandeur.emailDemande', { email: dossier.email })}
              </>
            ) : (
              <> · {tf('admin.repondreDemandeur.aucunEmail')}</>
            )}
          </p>
          <Button type="submit" loading={busy}>
            {tf('admin.repondreDemandeur.publier')}
          </Button>
        </div>
      </form>
    </Card>
  )
}

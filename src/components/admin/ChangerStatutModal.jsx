import { useMemo, useState } from 'react'
import { Check, Paperclip } from 'lucide-react'
import StatusBadge from '../StatusBadge'
import {
  FieldError,
  FieldLabel,
  SelectInput,
  TextArea,
  TextInput,
} from '../FormFields'
import adminApi, { extractErrors } from '../../lib/adminApi'
import {
  CODES_CONCLUSION,
  issuesAutorisees,
  natureCode,
  statutKey,
} from '../../lib/statuts'
import Modal from './Modal'
import Toggle from './Toggle'

function emailSuffix(emailEnvoye) {
  if (emailEnvoye === true) return ' Le demandeur a été prévenu par email.'
  if (emailEnvoye === false) return " Attention : l'email n'a pas pu être envoyé."
  return ''
}

export default function ChangerStatutModal({
  open,
  onClose,
  dossier,
  transitions = [],
  modelesComplement = [],
  modelesReponse = [],
  preset = null,
  onDone,
  onAnnulerComplement,
}) {
  const cibleInitiale = preset
    ? transitions.find((s) => statutKey(s) === preset)
    : null
  const [idStatut, setIdStatut] = useState(cibleInitiale ? String(cibleInitiale.id_statut) : '')
  const [question, setQuestion] = useState('')
  const [exigerPiece, setExigerPiece] = useState(false)
  const [descriptionPiece, setDescriptionPiece] = useState('')
  const [message, setMessage] = useState('')
  const [justification, setJustification] = useState('')
  const [organisme, setOrganisme] = useState('')
  const [referenceInitiale, setReferenceInitiale] = useState('')
  const [notifierDemandeur, setNotifierDemandeur] = useState(true)
  const [notifierResponsable, setNotifierResponsable] = useState(false)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const actuel = dossier?.statut
  const actuelKey = statutKey(actuel)
  const complementAExaminer = Boolean(dossier?.complement_a_examiner)
  const nature = natureCode(dossier?.nature)
  const issuesOk = useMemo(() => new Set(issuesAutorisees(nature).map((i) => i.alias)), [nature])

  const options = useMemo(
    () =>
      transitions.filter((s) => {
        const key = statutKey(s)
        if (actuelKey === 'information_demandee' && key === 'en_cours') return false
        if (CODES_CONCLUSION.includes(key) && issuesOk.size && !issuesOk.has(key)) return false
        return true
      }),
    [transitions, issuesOk, actuelKey],
  )

  const choisi = useMemo(
    () => options.find((s) => String(s.id_statut) === String(idStatut)),
    [options, idStatut],
  )
  const choisiKey = statutKey(choisi)
  const estInfo = choisiKey === 'information_demandee'
  const estConclusion = CODES_CONCLUSION.includes(choisiKey)
  const estDouble = choisiKey === 'double'
  const estHorsCompetence = choisiKey === 'hors_competence'
  const estReponseTexte = estConclusion && !estHorsCompetence && !estDouble

  const notifier = estInfo ? true : notifierDemandeur

  const statutBloque = (s) => complementAExaminer && CODES_CONCLUSION.includes(statutKey(s))

  const choisirStatut = (s) => {
    if (statutBloque(s) || busy) return
    setIdStatut(String(s.id_statut))
    setErrors((prev) => ({ ...prev, id_statut: '' }))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return

    const next = {}
    if (!idStatut) next.id_statut = 'Choisissez un statut.'
    if (choisi && statutBloque(choisi)) {
      next.id_statut =
        "Un complément reçu n'est pas encore examiné. Les issues de conclusion sont indisponibles."
    }
    if (estInfo && !question.trim()) next.question = 'Écrivez la question à poser au demandeur.'
    if (estInfo && exigerPiece && !descriptionPiece.trim()) {
      next.description_piece = 'Précisez la pièce attendue.'
    }
    if (estReponseTexte && !message.trim()) next.message = 'Rédigez la réponse de conclusion.'
    if (estHorsCompetence && !justification.trim()) {
      next.justification = 'Indiquez la justification (organisme compétent, motif).'
    }
    if (estDouble && !referenceInitiale.trim()) {
      next.reference_initiale = 'Indiquez la référence du dossier initial.'
    }
    setErrors(next)
    if (Object.keys(next).length) return

    setBusy(true)
    try {
      const res = await adminApi.post(`/admin/doleances/${dossier.reference}/statut`, {
        id_statut: Number(idStatut),
        message: estHorsCompetence ? justification.trim() : message.trim() || null,
        justification: estHorsCompetence ? justification.trim() : null,
        organisme: estHorsCompetence ? organisme.trim() || null : null,
        question: estInfo ? question.trim() : null,
        description_piece: estInfo && exigerPiece ? descriptionPiece.trim() : null,
        notifier_demandeur: notifier,
        notifier_responsable: notifierResponsable,
        reference_initiale: estDouble ? referenceInitiale.trim() : null,
      })
      onDone(
        'success',
        `${res.data?.message || `Statut changé : ${choisi?.libelle ?? ''}.`}${emailSuffix(res.data?.email_envoye)}`,
      )
      onClose()
    } catch (err) {
      const { message: msg, fields } = extractErrors(err)
      setErrors(fields)
      if (!Object.keys(fields).length) onDone('error', msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      wide
      title="Changer le statut"
      subtitle={
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-mono" dir="ltr">
            {dossier?.reference}
          </span>
          <span className="text-gray-400">·</span>
          <span>Statut actuel</span>
          <StatusBadge status={statutKey(actuel)} label={actuel?.libelle} showDot />
        </span>
      }
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex items-center justify-center rounded-[8px] border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            form="form-changer-statut"
            disabled={busy}
            aria-busy={busy}
            className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-action px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#008040] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Check className="h-4 w-4" aria-hidden />
            {busy ? 'Envoi…' : 'Appliquer'}
          </button>
        </>
      }
    >
      <form id="form-changer-statut" onSubmit={submit} noValidate className="space-y-5" dir="ltr">
        <div>
          <p className="mb-3 text-sm font-medium text-gray-800">
            Nouveau statut (transitions autorisées depuis « {actuel?.libelle ?? '—'} »)
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {options.map((s) => {
              const selected = String(s.id_statut) === String(idStatut)
              const bloque = statutBloque(s)
              return (
                <label
                  key={s.id_statut}
                  className={[
                    'flex cursor-pointer items-center gap-3 rounded-[8px] border px-3 py-3 transition',
                    bloque
                      ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-60'
                      : selected
                        ? 'border-institutional bg-[#e6f6ed]'
                        : 'border-gray-200 bg-white hover:border-gray-300',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="nouveau-statut"
                    className="h-4 w-4 accent-[#006b3f]"
                    checked={selected}
                    disabled={bloque || busy}
                    onChange={() => choisirStatut(s)}
                  />
                  <StatusBadge status={statutKey(s)} label={s.libelle} showDot />
                </label>
              )
            })}
          </div>
          {actuelKey === 'information_demandee' && (
            <p className="mt-3 text-sm text-gray-700">
              Pour revenir à « En cours »,{' '}
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onAnnulerComplement?.()
                }}
                className="font-medium text-institutional underline underline-offset-2"
              >
                annulez la demande de complément
              </button>
              .
            </p>
          )}
          {complementAExaminer && (
            <p className="mt-2 text-xs text-gray-500">
              Un complément reçu n&apos;est pas encore examiné. Toutes les issues de conclusion
              sont indisponibles tant que le complément n&apos;a pas été marqué comme examiné.
            </p>
          )}
          <FieldError message={errors.id_statut} />
        </div>

        {estInfo && (
          <>
            <div>
              <div className="mb-1.5 flex flex-wrap items-end justify-between gap-3">
                <FieldLabel htmlFor="statut-question" required>
                  Question au demandeur
                </FieldLabel>
                {modelesComplement.length > 0 && (
                  <div className="min-w-[220px] flex-1 sm:max-w-xs">
                    <SelectInput
                      id="modele-complement"
                      value=""
                      aria-label="Modèle prédéfini (Demande de complément)"
                      onChange={(e) => {
                        const m = modelesComplement.find((x) => String(x.id_modele) === e.target.value)
                        if (m) setQuestion(m.contenu)
                      }}
                    >
                      <option value="">Modèle prédéfini (Demande de complément)</option>
                      {modelesComplement.map((m) => (
                        <option key={m.id_modele} value={String(m.id_modele)}>
                          {m.titre}
                        </option>
                      ))}
                    </SelectInput>
                  </div>
                )}
              </div>
              <p className="mb-2 text-xs text-gray-500">Visible du demandeur · Obligatoire</p>
              <TextArea
                id="statut-question"
                rows={3}
                className="min-h-[90px]"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                error={errors.question}
              />
              <FieldError message={errors.question} />
            </div>

            <div className="rounded-[8px] border border-gray-200 bg-white p-4">
              <Toggle
                id="exiger-piece"
                checked={exigerPiece}
                onChange={setExigerPiece}
                disabled={busy}
                label="Pièce justificative nécessaire"
                hint="Si activé, le citoyen ne pourra pas répondre sans joindre un fichier."
              />
              {exigerPiece && (
                <div className="mt-4">
                  <FieldLabel htmlFor="description-piece" required>
                    Description de la pièce attendue
                  </FieldLabel>
                  <TextInput
                    id="description-piece"
                    maxLength={200}
                    value={descriptionPiece}
                    onChange={(e) => setDescriptionPiece(e.target.value)}
                    placeholder="Plan du terrain"
                    error={errors.description_piece}
                  />
                  <p className="mt-1.5 text-xs text-gray-500">
                    Affiché au citoyen. Formats acceptés : PDF, JPG ou PNG · 5 Mo maximum.
                  </p>
                  <FieldError message={errors.description_piece} />
                </div>
              )}
            </div>

            <div className="rounded-[8px] bg-gray-50 px-4 py-3">
              <p className="mb-2 text-xs font-medium tracking-[0.08em] text-gray-500 uppercase">
                Aperçu pour le demandeur (à relire avant d&apos;appliquer)
              </p>
              <p className="text-sm italic text-gray-800">
                {question.trim() ? `« ${question.trim()} »` : '« … »'}
              </p>
              {exigerPiece && descriptionPiece.trim() && (
                <p className="mt-2 flex items-start gap-1.5 text-xs text-gray-600">
                  <Paperclip className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  Pièce attendue : {descriptionPiece.trim()}
                </p>
              )}
            </div>
          </>
        )}

        {estReponseTexte && (
          <div>
            <div className="mb-1.5 flex flex-wrap items-end justify-between gap-3">
              <FieldLabel htmlFor="statut-message" required>
                Réponse de conclusion
              </FieldLabel>
              {modelesReponse.length > 0 && (
                <div className="min-w-[220px] flex-1 sm:max-w-xs">
                  <SelectInput
                    id="modele-reponse"
                    value=""
                    aria-label="Modèle de réponse de conclusion"
                    onChange={(e) => {
                      const m = modelesReponse.find((x) => String(x.id_modele) === e.target.value)
                      if (m) setMessage(m.contenu)
                    }}
                  >
                    <option value="">Choisir un modèle…</option>
                    {modelesReponse.map((m) => (
                      <option key={m.id_modele} value={String(m.id_modele)}>
                        {m.titre}
                      </option>
                    ))}
                  </SelectInput>
                </div>
              )}
            </div>
            <TextArea
              id="statut-message"
              rows={4}
              className="min-h-[100px]"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              error={errors.message}
            />
            <FieldError message={errors.message} />
          </div>
        )}

        {estHorsCompetence && (
          <div className="space-y-3">
            <div>
              <FieldLabel htmlFor="statut-justification" required>
                Justification
              </FieldLabel>
              <TextArea
                id="statut-justification"
                rows={3}
                className="min-h-[90px]"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                error={errors.justification}
              />
              <FieldError message={errors.justification} />
            </div>
            <div>
              <FieldLabel htmlFor="statut-organisme">Organisme compétent (facultatif)</FieldLabel>
              <TextInput
                id="statut-organisme"
                value={organisme}
                onChange={(e) => setOrganisme(e.target.value)}
                placeholder="Nom de l'organisme"
              />
            </div>
          </div>
        )}

        {estDouble && (
          <div>
            <FieldLabel htmlFor="ref-initiale" required>
              Référence du dossier initial
            </FieldLabel>
            <TextInput
              id="ref-initiale"
              dir="ltr"
              value={referenceInitiale}
              onChange={(e) => setReferenceInitiale(e.target.value)}
              placeholder="ITS-2026-0000"
              error={errors.reference_initiale}
            />
            <FieldError message={errors.reference_initiale} />
          </div>
        )}

        <div className="space-y-4 rounded-[8px] border border-gray-200 p-4">
          <Toggle
            id="notifier-demandeur"
            checked={notifier}
            onChange={setNotifierDemandeur}
            disabled={busy || estInfo}
            label="Notifier le demandeur par email"
            hint={
              estInfo
                ? 'Automatique : le demandeur doit être informé de la question.'
                : "Notification en plus de la visibilité dans le suivi. Décochez pour ne pas envoyer d'email."
            }
          />
          <Toggle
            id="notifier-responsable"
            checked={notifierResponsable}
            onChange={setNotifierResponsable}
            disabled={busy}
            label="Notifier le responsable du dossier"
            hint="Email interne au responsable du service, jamais au demandeur."
          />
        </div>

        <div className="rounded-[8px] bg-gray-50 px-4 py-3 text-xs leading-relaxed text-gray-600">
          Rien n&apos;est envoyé avant « Appliquer ». Visibilité et email sont deux mécanismes
          distincts : la question, la réponse de conclusion et la pièce exigée sont toujours
          visibles dans le suivi du demandeur (non modifiable) ; l&apos;email n&apos;est qu&apos;une
          notification en plus. Un seul appel au demandeur par opération ; si l&apos;envoi échoue,
          le message reste visible et l&apos;action est enregistrée.
        </div>
      </form>
    </Modal>
  )
}

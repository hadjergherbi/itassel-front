import { useMemo, useState } from 'react'
import { Check, Info, Mail, Paperclip, User } from 'lucide-react'
import StatusBadge from '../StatusBadge'
import Button from '../ui/Button'
import {
  FieldError,
  FieldHelp,
  FieldLabel,
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
import { useLanguage } from '../../i18n/LanguageContext'
import { emailSuffix } from './doleance/helpers'
import Modal from './Modal'
import Toggle from './Toggle'
import ModeleMessageSelect from './ModeleMessageSelect'

const QUESTION_MAX = 1000
const PIECE_MAX = 200

export default function ChangerStatutModal({
  open,
  onClose,
  dossier,
  transitions = [],
  modelesComplement = [],
  modelesReponse = [],
  modelesState = 'ready',
  onRetryModeles,
  preset = null,
  onDone,
  onAnnulerComplement,
}) {
  const { tf, lang } = useLanguage()
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

  const allerAuComplement = () => {
    onClose()
    window.setTimeout(() => {
      document.getElementById('complement-demandeur')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return

    const next = {}
    if (!idStatut) next.id_statut = tf('admin.changerStatut.choisirStatut')
    if (choisi && statutBloque(choisi)) {
      next.id_statut = tf('admin.changerStatut.complementBloque')
    }
    if (estInfo && !question.trim()) next.question = tf('admin.changerStatut.questionRequise')
    if (estInfo && question.trim().length > QUESTION_MAX) {
      next.question = tf('admin.changerStatut.questionTropLongue', { max: QUESTION_MAX })
    }
    if (estInfo && exigerPiece && !descriptionPiece.trim()) {
      next.description_piece = tf('admin.changerStatut.pieceRequise')
    }
    if (estReponseTexte && !message.trim()) next.message = tf('admin.changerStatut.messageRequis')
    if (estHorsCompetence && !justification.trim()) {
      next.justification = tf('admin.changerStatut.justificationRequise')
    }
    if (estDouble && !referenceInitiale.trim()) {
      next.reference_initiale = tf('admin.changerStatut.refRequise')
    }
    setErrors(next)
    if (Object.keys(next).length) return

    setBusy(true)
    try {
      const res = await adminApi.post(`/admin/doleances/${dossier.reference}/statut`, {
        id_statut: Number(idStatut),
        message: estHorsCompetence ? justification.trim() : message.trim() || null,
        organisme_competent: estHorsCompetence ? organisme.trim() || null : null,
        question: estInfo ? question.trim() : null,
        piece_exigee: estInfo ? exigerPiece : false,
        description_piece: estInfo && exigerPiece ? descriptionPiece.trim() : null,
        notifier_demandeur: notifier,
        notifier_responsable: notifierResponsable,
        reference_initiale: estDouble ? referenceInitiale.trim() : null,
      })
      onDone(
        'success',
        `${res.data?.message || tf('admin.changerStatut.statutChange', { libelle: choisi?.libelle ?? '' })}${emailSuffix(res.data?.email_envoye, tf)}`,
      )
      onClose()
    } catch (err) {
      const { message: msg, fields } = extractErrors(err, undefined, lang)
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
      title={tf('admin.changerStatut.titre')}
      subtitle={
        <span className="inline-flex items-center gap-2 whitespace-nowrap">
          <span className="font-mono" dir="ltr">
            {dossier?.reference}
          </span>
          <span className="text-gray-400">·</span>
          <span>{tf('admin.changerStatut.statutActuel')}</span>
          <StatusBadge status={statutKey(actuel)} label={actuel?.libelle} showDot />
        </span>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {tf('commun.cancel')}
          </Button>
          <Button type="submit" form="form-changer-statut" loading={busy} disabled={!idStatut}>
            <Check className="h-4 w-4" aria-hidden />
            {tf('admin.changerStatut.appliquer')}
          </Button>
        </>
      }
    >
      <form id="form-changer-statut" onSubmit={submit} noValidate className="space-y-5" dir="ltr">
        {complementAExaminer && (
          <div className="rounded-[8px] border border-warning-border bg-warning-bg px-4 py-3 text-sm leading-relaxed text-warning-text">
            {tf('admin.changerStatut.complementAExaminer')}{' '}
            <button
              type="button"
              onClick={allerAuComplement}
              className="font-medium underline underline-offset-2"
            >
              {tf('admin.changerStatut.allerAuComplement')}
            </button>
          </div>
        )}

        <div>
          <p className="mb-3 text-sm text-gray-800">
            <span className="font-medium">{tf('admin.changerStatut.nouveauStatut')}</span>
            <span className="font-normal">
              {' '}
              {tf('admin.changerStatut.transitionsDepuis', { libelle: actuel?.libelle ?? '—' })}
            </span>
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {options.map((s) => {
              const selected = String(s.id_statut) === String(idStatut)
              const bloque = statutBloque(s)
              return (
                <label
                  key={s.id_statut}
                  className={[
                    'flex items-center gap-3 rounded-[8px] border-2 px-3 py-3 transition',
                    bloque
                      ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-60'
                      : selected
                        ? 'cursor-pointer border-institutional bg-[#e6f6ed]'
                        : 'cursor-pointer border-gray-200 bg-white hover:border-gray-300',
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
              {tf('admin.changerStatut.pourRevenirEnCours')}{' '}
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onAnnulerComplement?.()
                }}
                className="font-medium text-institutional underline underline-offset-2"
              >
                {tf('admin.changerStatut.annulerComplementLien')}
              </button>
              .
            </p>
          )}
          <FieldError message={errors.id_statut} />
        </div>

        {estInfo && (
          <>
            <div>
              <FieldLabel htmlFor="statut-question" required>
                {tf('admin.changerStatut.questionLabel')}
              </FieldLabel>
              <div className="mb-2">
                <ModeleMessageSelect
                  id="modele-complement"
                  label={tf('admin.changerStatut.modeleComplement')}
                  modeles={modelesComplement}
                  loadState={modelesState}
                  onRetry={onRetryModeles}
                  valeurActuelle={question}
                  onAppliquer={(texte) => {
                    setQuestion(String(texte ?? '').slice(0, QUESTION_MAX))
                    if (errors.question) setErrors((prev) => ({ ...prev, question: '' }))
                  }}
                  disabled={busy}
                />
              </div>
              <TextArea
                id="statut-question"
                rows={3}
                className="min-h-[90px]"
                maxLength={QUESTION_MAX}
                value={question}
                onChange={(e) => {
                  setQuestion(e.target.value.slice(0, QUESTION_MAX))
                  if (errors.question) setErrors((prev) => ({ ...prev, question: '' }))
                }}
                error={errors.question}
              />
              <FieldHelp>
                {tf('admin.changerStatut.compteur', { n: question.length, max: QUESTION_MAX })}
              </FieldHelp>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full bg-[#e6f6ed] px-2 py-0.5 text-[10px] font-medium text-institutional">
                  {tf('admin.changerStatut.visibleDemandeur')}
                </span>
                <p className="text-xs text-gray-500">{tf('admin.changerStatut.questionAide')}</p>
              </div>
              <FieldError message={errors.question} />
            </div>

            <div className="rounded-[8px] border border-gray-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <Paperclip className="mt-1 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                <div className="min-w-0 flex-1">
                  <Toggle
                    id="exiger-piece"
                    checked={exigerPiece}
                    onChange={(v) => {
                      setExigerPiece(v)
                      if (!v) {
                        setDescriptionPiece('')
                        setErrors((prev) => ({ ...prev, description_piece: '' }))
                      }
                    }}
                    disabled={busy}
                    label={tf('admin.changerStatut.exigerPiece')}
                    hint={tf('admin.changerStatut.exigerPieceHint')}
                  />
                </div>
              </div>
              {exigerPiece && (
                <div className="mt-4">
                  <FieldLabel htmlFor="description-piece" required>
                    {tf('admin.changerStatut.descriptionPiece')}
                  </FieldLabel>
                  <TextInput
                    id="description-piece"
                    maxLength={PIECE_MAX}
                    value={descriptionPiece}
                    onChange={(e) => {
                      setDescriptionPiece(e.target.value.slice(0, PIECE_MAX))
                      if (errors.description_piece) {
                        setErrors((prev) => ({ ...prev, description_piece: '' }))
                      }
                    }}
                    placeholder={tf('admin.changerStatut.placeholderPiece')}
                    error={errors.description_piece}
                  />
                  <FieldHelp>
                    {tf('admin.changerStatut.compteur', {
                      n: descriptionPiece.length,
                      max: PIECE_MAX,
                    })}
                  </FieldHelp>
                  <p className="mt-1.5 text-xs text-gray-500">
                    {tf('admin.changerStatut.formatsPiece')}
                  </p>
                  <FieldError message={errors.description_piece} />
                </div>
              )}
            </div>

            <div className="rounded-[8px] bg-gray-50 px-4 py-3">
              <p className="mb-2 text-xs font-medium tracking-[0.08em] text-gray-500 uppercase">
                {tf('admin.changerStatut.apercuTitre')}
              </p>
              <p className="text-sm leading-relaxed text-gray-800">
                {question.trim() ? question.trim() : '…'}
              </p>
              {exigerPiece && (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-600">
                  <Paperclip className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>
                    {tf('admin.changerStatut.pieceAttendue', {
                      piece: descriptionPiece.trim() || '…',
                    })}
                  </span>
                </p>
              )}
            </div>
          </>
        )}

        {estReponseTexte && (
          <div>
            <FieldLabel htmlFor="statut-message" required>
              {tf('admin.changerStatut.reponseConclusion')}
            </FieldLabel>
            <div className="mb-2">
              <ModeleMessageSelect
                id="modele-reponse-statut"
                label={tf('admin.changerStatut.modeleReponse')}
                modeles={modelesReponse}
                loadState={modelesState}
                onRetry={onRetryModeles}
                valeurActuelle={message}
                onAppliquer={(texte) => {
                  setMessage(texte ?? '')
                  if (errors.message) setErrors((prev) => ({ ...prev, message: '' }))
                }}
                disabled={busy}
              />
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
                {tf('admin.changerStatut.justification')}
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
              <FieldLabel htmlFor="statut-organisme">{tf('admin.changerStatut.organisme')}</FieldLabel>
              <TextInput
                id="statut-organisme"
                value={organisme}
                onChange={(e) => setOrganisme(e.target.value)}
                placeholder={tf('admin.changerStatut.organismePlaceholder')}
              />
            </div>
          </div>
        )}

        {estDouble && (
          <div>
            <FieldLabel htmlFor="ref-initiale" required>
              {tf('admin.changerStatut.refInitiale')}
            </FieldLabel>
            <TextInput
              id="ref-initiale"
              dir="ltr"
              value={referenceInitiale}
              onChange={(e) => setReferenceInitiale(e.target.value)}
              placeholder="ITS-2026-004821"
              error={errors.reference_initiale}
            />
            <FieldError message={errors.reference_initiale} />
          </div>
        )}

        <div className="divide-y divide-gray-100 rounded-[8px] border border-gray-200">
          <div className="flex items-start gap-3 px-4 py-3">
            <Mail className="mt-1 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
            <div className="min-w-0 flex-1">
              <Toggle
                id="notifier-demandeur"
                checked={notifier}
                onChange={setNotifierDemandeur}
                disabled={busy || estInfo}
                label={tf('admin.changerStatut.notifierDemandeur')}
                hint={
                  estInfo
                    ? tf('admin.changerStatut.notifierDemandeurHintInfo')
                    : tf('admin.changerStatut.notifierDemandeurHint')
                }
              />
            </div>
          </div>
          <div className="flex items-start gap-3 px-4 py-3">
            <User className="mt-1 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
            <div className="min-w-0 flex-1">
              <Toggle
                id="notifier-responsable"
                checked={notifierResponsable}
                onChange={setNotifierResponsable}
                disabled={busy}
                label={tf('admin.changerStatut.notifierResponsable')}
                hint={tf('admin.changerStatut.notifierResponsableHint')}
              />
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-[8px] bg-gray-50 px-4 py-3 text-xs leading-relaxed text-gray-600">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
          <p>{tf('admin.changerStatut.infoVisibilite')}</p>
        </div>
      </form>
    </Modal>
  )
}

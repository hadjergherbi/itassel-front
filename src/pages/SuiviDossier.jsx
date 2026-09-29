import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CircleAlert, Lock, Mail, Paperclip, Send } from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import StatusBadge from '../components/StatusBadge'
import HistoryTimeline from '../components/HistoryTimeline'
import { FieldError, FieldHelp, FieldLabel, TextArea } from '../components/FormFields'
import { useLanguage } from '../i18n/LanguageContext'
import api from '../lib/api'
import { statutKey } from '../lib/statuts'

const ACCEPT = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_BYTES = 5 * 1024 * 1024
const MESSAGE_MAX = 2000

// Même clé que dans SuivreDemande.jsx.
const SUIVI_SESSION_KEY = 'itassel_suivi'

/* ------------------------------------------------------------------ */
/* Session de suivi (jeton reçu après vérification du code)            */
/* ------------------------------------------------------------------ */

function readStoredSession() {
  try {
    const raw = sessionStorage.getItem(SUIVI_SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw)
    if (!session?.jetonSession) return null
    if (session.expiresAt && Date.now() > session.expiresAt) {
      sessionStorage.removeItem(SUIVI_SESSION_KEY)
      return null
    }
    return session
  } catch {
    return null
  }
}

function clearStoredSession() {
  try {
    sessionStorage.removeItem(SUIVI_SESSION_KEY)
  } catch {
    // stockage indisponible : rien à nettoyer
  }
}

/* ------------------------------------------------------------------ */
/* Statuts et événements renvoyés par Laravel (libellés français)      */
/* ------------------------------------------------------------------ */

const STATUT_AR = {
  nouvelle: 'شكوى جديدة',
  en_cours: 'قيد المعالجة',
  information_demandee: 'معلومات مطلوبة',
  resolue: 'تم الحل',
  cloturee: 'مغلقة',
  non_retenue: 'غير مقبولة',
  non_fondee: 'غير مؤسسة',
  double: 'شكوى مكررة',
}

function statutLabel(statut, lang) {
  const key = statutKey(statut)
  if (lang === 'ar') return STATUT_AR[key] ?? statut?.libelle ?? ''
  return statut?.libelle ?? ''
}

const EVENTS = {
  depot: { fr: 'Doléance déposée', ar: 'تم إيداع الشكوى', dot: 'deposee' },
  complement_demande: {
    fr: 'Information demandée',
    ar: 'معلومات مطلوبة',
    dot: 'information_demandee',
    showDetail: true,
  },
  complement_recu: { fr: 'Votre réponse a été reçue', ar: 'تم استلام ردّكم', dot: 'en_cours' },
  complement_annule: {
    fr: "Demande d'information annulée",
    ar: 'تم إلغاء طلب المعلومات',
    dot: 'en_cours',
  },
  // Ancien nom de l'événement, gardé pour les dossiers de test déjà créés.
  complement: { fr: 'Votre réponse a été reçue', ar: 'تم استلام ردّكم', dot: 'en_cours' },
  affectation: { fr: 'Dossier transmis au service', ar: 'تمت إحالة الملف إلى المصلحة', dot: 'en_cours' },
  reaffectation: { fr: 'Dossier réorienté', ar: 'تمت إعادة توجيه الملف', dot: 'en_cours' },
  changement_statut: { fr: 'Changement de statut', ar: 'تغيير الحالة', dot: 'default', showDetail: true },
}

function formatDate(iso, lang) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-DZ' : 'fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace(/\u202f/g, ' ')
}

function buildHistory(dossier, lang) {
  if (!dossier) return []
  const ar = lang === 'ar'

  const events = (dossier.historique ?? []).map((h) => {
    const def = EVENTS[h.type_evenement]
    let title = def ? (ar ? def.ar : def.fr) : h.type_evenement
    let status = def?.dot ?? 'default'

    if (h.type_evenement === 'changement_statut' && h.statut_apres) {
      title = `${ar ? 'الحالة' : 'Statut'} : ${statutLabel(h.statut_apres, lang)}`
      status = statutKey(h.statut_apres)
    }

    return {
      ts: Date.parse(h.date_evenement) || 0,
      status,
      title,
      detail: def?.showDetail ? h.detail ?? '' : '',
      date: formatDate(h.date_evenement, lang),
    }
  })

  const answers = (dossier.reponses ?? []).map((r) => ({
    ts: Date.parse(r.date_publication) || 0,
    status: 'resolue',
    title: ar ? 'ردّ المصلحة' : 'Réponse du service',
    detail: r.contenu ?? '',
    date: formatDate(r.date_publication, lang),
  }))

  return [...events, ...answers]
    .sort((a, b) => b.ts - a.ts)
    .map((item) => {
      const rest = { ...item }
      delete rest.ts
      return rest
    })
}

/* ------------------------------------------------------------------ */

export default function SuiviDossier() {
  const { t, tf, lang } = useLanguage()
  const location = useLocation()
  const fileRef = useRef(null)

  // Texte traduit, avec une version de secours si la clé n'existe pas.
  const tx = (key, fr, ar) => t.dossier?.[key] || (lang === 'ar' ? ar : fr)

  // Jeton : d'abord celui transmis par SuivreDemande, sinon celui gardé
  // dans le navigateur (utile si la page est rechargée).
  const session = useMemo(() => {
    const state = location.state
    if (state?.jetonSession) {
      return { reference: state.reference ?? '', jetonSession: state.jetonSession }
    }
    return readStoredSession()
  }, [location.state])

  const jetonSession = session?.jetonSession ?? null
  const initialReference = session?.reference ?? ''

  // loading | ready | missing | expired | network
  const [loadState, setLoadState] = useState(jetonSession ? 'loading' : 'missing')
  const [dossier, setDossier] = useState(null)

  const [message, setMessage] = useState('')
  const [file, setFile] = useState(null)
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState(null) // { type: 'success'|'error'|'info', text }
  const [answeredId, setAnsweredId] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadDossier = useCallback(
    async ({ silent = false } = {}) => {
      if (!jetonSession) {
        setLoadState('missing')
        return
      }
      if (!silent) setLoadState('loading')

      try {
        const res = await api.get('/suivi/dossier', {
          headers: { 'X-Suivi-Token': jetonSession },
        })
        setDossier(res.data)
        setLoadState('ready')
      } catch (err) {
        const status = err.response?.status
        if (status === 401 || status === 403) {
          clearStoredSession()
          setDossier(null)
          setLoadState('expired')
        } else if (!silent) {
          setDossier(null)
          setLoadState('network')
        }
      }
    },
    [jetonSession],
  )

  useEffect(() => {
    loadDossier()
  }, [loadDossier])

  const pendingComplement = useMemo(() => {
    const list = dossier?.complements
    if (!Array.isArray(list)) return null
    return list.find((c) => c.etat === 'en_attente') ?? null
  }, [dossier])

  const attachmentRequired = Boolean(pendingComplement?.piece_exigee)
  const attachmentName = pendingComplement?.description_piece || ''
  const showAttachmentHint = Boolean(attachmentName) || attachmentRequired
  const showForm =
    Boolean(pendingComplement) && pendingComplement.id_complement !== answeredId

  const historyItems = useMemo(() => buildHistory(dossier, lang), [dossier, lang])

  const reference = dossier?.reference ?? initialReference
  const badgeKey = statutKey(dossier?.statut)
  const badgeLabel = statutLabel(dossier?.statut, lang)

  const validateFile = (next) => {
    if (!next) {
      return attachmentRequired ? t.dossier.errors.fileRequired : ''
    }
    if (next.type === 'application/zip' || /\.zip$/i.test(next.name)) {
      return t.dossier.errors.zipRejected
    }
    if (next.size > MAX_BYTES) return t.dossier.errors.fileSize
    if (!ACCEPT.includes(next.type) && !/\.(pdf|jpe?g|png)$/i.test(next.name)) {
      return t.dossier.errors.fileType
    }
    return ''
  }

  const onPickFile = (next) => {
    setFile(next)
    setErrors((prev) => ({ ...prev, file: validateFile(next) }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!showForm || isSubmitting) return

    const nextErrors = {}
    const msg = message.trim()
    if (!msg) nextErrors.message = t.dossier.errors.message
    else if (msg.length > MESSAGE_MAX) nextErrors.message = t.dossier.errors.messageTropLong
    const fileErr = validateFile(file)
    if (fileErr) nextErrors.file = fileErr
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    const body = new FormData()
    body.append('message', msg)
    if (file instanceof File) body.append('piece_jointe', file)

    setIsSubmitting(true)
    setNotice(null)
    try {
      await api.post('/suivi/repondre-complement', body, {
        headers: { 'X-Suivi-Token': jetonSession },
      })

      setAnsweredId(pendingComplement.id_complement)
      setMessage('')
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      setNotice({
        type: 'success',
        text: tx(
          'sentOk',
          'Votre réponse a bien été transmise au service concerné.',
          'تم إرسال ردّكم إلى المصلحة المعنية.',
        ),
      })
      // Recharge le dossier : nouveau statut et nouvel événement dans l'historique.
      loadDossier({ silent: true })
    } catch (err) {
      const status = err.response?.status

      if (status === 401 || status === 403) {
        clearStoredSession()
        setDossier(null)
        setLoadState('expired')
        return
      }

      if (status === 404 || status === 409) {
        setAnsweredId(pendingComplement?.id_complement ?? answeredId)
        setNotice({
          type: 'info',
          text:
            status === 409
              ? tx(
                  'plusEnAttente',
                  "Ce dossier n'attend plus d'information. Le suivi a été actualisé.",
                  'لم يعد هذا الملف في انتظار معلومات. تم تحديث المتابعة.',
                )
              : tx(
                  'noPending',
                  "Aucune information n'est plus demandée pour ce dossier.",
                  'لم تعد هناك أي معلومات مطلوبة لهذا الملف.',
                ),
        })
        loadDossier({ silent: true })
        return
      }

      if (status === 422) {
        const apiErrors = err.response.data?.errors ?? {}
        const first = (v) => (Array.isArray(v) ? v[0] : v)
        setErrors((prev) => ({
          ...prev,
          ...(apiErrors.piece_jointe ? { file: first(apiErrors.piece_jointe) } : {}),
          ...(apiErrors.message ? { message: first(apiErrors.message) } : {}),
        }))
        return
      }

      setNotice({
        type: 'error',
        text: tx(
          'sendFailed',
          "L'envoi a échoué. Vérifiez votre connexion et réessayez.",
          'تعذّر الإرسال. تحقّق من اتصالك وأعد المحاولة.',
        ),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const noticeClass = {
    success: 'border-action/30 bg-[#e6f6ed] text-institutional',
    info: 'border-gray-200 bg-white text-gray-700',
    error: 'border-red-200 bg-red-50 text-red-700',
  }

  const blocked = ['missing', 'expired', 'network'].includes(loadState)

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <Header />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="mb-2 text-2xl font-bold text-institutional sm:text-3xl">
          {t.dossier.title}
        </h1>

        {blocked ? (
          <div className="mt-8 max-w-lg rounded-[8px] border border-red-200 bg-white p-6 shadow-sm">
            <p className="mb-4 text-sm leading-relaxed text-gray-700">
              {loadState === 'missing' &&
                tx(
                  'missingToken',
                  'Pour consulter un dossier, saisissez sa référence et le code reçu par email.',
                  'للاطلاع على ملف، أدخلوا مرجعه والرمز الذي وصلكم عبر البريد الإلكتروني.',
                )}
              {loadState === 'expired' &&
                tx(
                  'sessionExpired',
                  'Votre session a expiré. Demandez un nouveau code pour consulter votre dossier.',
                  'انتهت صلاحية الجلسة. اطلبوا رمزًا جديدًا للاطلاع على ملفكم.',
                )}
              {loadState === 'network' &&
                tx(
                  'networkError',
                  'Connexion au serveur impossible. Vérifiez votre connexion et réessayez.',
                  'تعذّر الاتصال بالخادم. تحقّق من اتصالك وأعد المحاولة.',
                )}
            </p>

            {loadState === 'network' ? (
              <button
                type="button"
                onClick={() => loadDossier()}
                className="inline-flex rounded-[8px] bg-action px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#008040]"
              >
                {tx('retry', 'Réessayer', 'إعادة المحاولة')}
              </button>
            ) : (
              <Link
                to="/suivre"
                state={reference ? { reference } : undefined}
                className="inline-flex rounded-[8px] bg-action px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#008040]"
              >
                {tx('restartTrack', 'Recommencer le suivi', 'إعادة المتابعة')}
              </Link>
            )}
          </div>
        ) : (
          <>
            <p className="mb-6 flex items-start gap-2 text-sm text-gray-600">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" aria-hidden />
              <span>
                {t.dossier.sessionPrefix}{' '}
                <span className="font-medium text-gray-800" dir="ltr">
                  {reference}
                </span>
                {`, ${t.dossier.sessionSuffix}`}
              </span>
            </p>

            {loadState === 'loading' ? (
              <p className="text-sm text-gray-500">
                {tx('loading', 'Chargement du dossier…', 'جارٍ تحميل الملف…')}
              </p>
            ) : (
              <>
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[8px] border border-gray-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-lg font-bold text-institutional sm:text-xl" dir="ltr">
                    {reference}
                  </p>
                  {badgeLabel && (
                    <StatusBadge status={badgeKey} label={badgeLabel} showDot />
                  )}
                </div>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_300px]">
                  <div className="space-y-5">
                    {showForm ? (
                      <section className="rounded-[8px] border border-[#e9d5ff] bg-[#faf5ff] p-5 shadow-sm sm:p-6">
                        <div className="mb-4 flex items-start gap-2.5 text-[#6b21a8]">
                          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                          <h2 className="text-base font-bold">{t.dossier.complementTitle}</h2>
                        </div>

                        <p className="mb-2 text-xs font-medium tracking-[0.08em] text-gray-500 uppercase">
                          {t.dossier.questionLabel}
                        </p>
                        <blockquote className="mb-4 text-sm leading-relaxed text-gray-800 italic">
                          « {pendingComplement.question} »
                        </blockquote>

                        {showAttachmentHint && (
                          <div className="rounded-[8px] border border-gray-200 bg-white px-4 py-3">
                            <div className="flex items-start gap-2.5">
                              <Paperclip className="mt-0.5 h-4 w-4 shrink-0 text-[#6b21a8]" aria-hidden />
                              <div>
                                {attachmentName ? (
                                  <p className="text-sm text-gray-800">
                                    {t.dossier.attachmentExpected}{' '}
                                    <span className="font-semibold">{attachmentName}</span>
                                  </p>
                                ) : (
                                  <p className="text-sm text-gray-800">
                                    {t.dossier.attachmentRequiredNote}
                                  </p>
                                )}
                                {attachmentRequired && attachmentName && (
                                  <p className="mt-1 text-xs text-gray-500">
                                    {t.dossier.attachmentRequiredNote}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </section>
                    ) : (
                      <section className="rounded-[8px] border border-gray-200 bg-white p-5 text-sm text-gray-700 shadow-sm">
                        {tx(
                          'noComplement',
                          "Aucune action n'est requise de votre part pour le moment. Vous serez informé(e) par email de l'avancement de votre dossier.",
                          'لا يُطلب منكم أي إجراء حاليًا. سيتم إعلامكم عبر البريد الإلكتروني بتقدّم ملفكم.',
                        )}
                      </section>
                    )}

                    {showForm && (
                      <form
                        onSubmit={handleSubmit}
                        noValidate
                        className="rounded-[8px] border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
                      >
                        <h2 className="mb-4 text-base font-bold text-gray-900">
                          {t.dossier.responseTitle}
                        </h2>

                        <div className="mb-4">
                          <FieldLabel htmlFor="reponse-message" required>
                            {t.dossier.messageLabel}
                          </FieldLabel>
                          <TextArea
                            id="reponse-message"
                            rows={5}
                            maxLength={MESSAGE_MAX}
                            value={message}
                            onChange={(e) => {
                              setMessage(e.target.value.slice(0, MESSAGE_MAX))
                              if (errors.message) setErrors((prev) => ({ ...prev, message: '' }))
                            }}
                            error={errors.message}
                          />
                          <FieldHelp>
                            {tf('dossier.messageCompteur', { n: message.length })}
                          </FieldHelp>
                          <FieldError message={errors.message} />
                        </div>

                        <div className="mb-5">
                          <FieldLabel htmlFor="reponse-file" required={attachmentRequired}>
                            {attachmentRequired
                              ? t.dossier.fileLabelRequired
                              : t.dossier.fileLabelOptional}
                          </FieldLabel>

                          <div className="flex flex-wrap items-center gap-3">
                            <label
                              htmlFor="reponse-file"
                              className={[
                                'inline-flex cursor-pointer items-center gap-2 rounded-[8px] border bg-white px-3 py-2.5 text-sm transition hover:bg-gray-50',
                                errors.file ? 'border-red-400' : 'border-gray-300',
                              ].join(' ')}
                            >
                              <Paperclip className="h-4 w-4 text-gray-500" aria-hidden />
                              <span className="text-gray-700">{file?.name || t.dossier.noFile}</span>
                            </label>
                            <input
                              ref={fileRef}
                              id="reponse-file"
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                              className="sr-only"
                              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                            />
                            <p className="text-xs text-gray-500">{t.dossier.fileHint}</p>
                          </div>
                          <FieldError message={errors.file} />
                        </div>

                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                          <p className="flex max-w-md items-start gap-2 text-xs leading-relaxed text-gray-500">
                            <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                            <span>{t.dossier.notify}</span>
                          </p>
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            aria-busy={isSubmitting}
                            className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-action px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#008040] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Send className="h-4 w-4" aria-hidden />
                            {t.dossier.send}
                          </button>
                        </div>
                      </form>
                    )}

                    {notice && (
                      <p
                        className={`rounded-[8px] border px-4 py-3 text-sm ${noticeClass[notice.type]}`}
                        role={notice.type === 'error' ? 'alert' : 'status'}
                      >
                        {notice.text}
                      </p>
                    )}
                  </div>

                  <HistoryTimeline title={t.dossier.history} items={historyItems} />
                </div>
              </>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  )
}
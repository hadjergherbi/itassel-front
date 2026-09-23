import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  CircleAlert,
  Info,
  Lock,
  Mail,
  Paperclip,
  Send,
} from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import StatusBadge from '../components/StatusBadge'
import HistoryTimeline from '../components/HistoryTimeline'
import {
  FieldError,
  FieldLabel,
  TextArea,
} from '../components/FormFields'
import { useLanguage } from '../i18n/LanguageContext'
import api from '../lib/api'

const ACCEPT = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_BYTES = 5 * 1024 * 1024

const SCENARIO_QUESTIONS = {
  fr: {
    default: "Pouvez-vous préciser l'adresse exacte du terrain ?",
    newQuestion: 'Pouvez-vous indiquer la date exacte des faits signalés ?',
  },
  ar: {
    default: 'هل يمكنكم تحديد العنوان الدقيق للملعب؟',
    newQuestion: 'هل يمكنكم تحديد التاريخ الدقيق للوقائع المبلّغ عنها؟',
  },
}

/** Normalise un code statut API → variante StatusBadge / timeline */
function mapStatutCode(raw) {
  if (!raw) return 'default'
  const s = String(raw).toLowerCase()
  if (s.includes('information') || s.includes('complement') || s === 'info_demandee') {
    return 'information_demandee'
  }
  if (s.includes('cours') || s === 'en_cours') return 'en_cours'
  if (s.includes('depos') || s === 'nouvelle' || s === 'deposee') return 'deposee'
  if (s.includes('resol') || s.includes('traite')) return 'resolue'
  if (s.includes('refus')) return 'refusee'
  return s
}

function mapHistoriqueItems(historique = []) {
  return historique.map((item, i) => ({
    status: mapStatutCode(
      item.statut_code ?? item.code ?? item.type ?? item.statut ?? item.status,
    ),
    title: item.titre ?? item.libelle ?? item.title ?? `Événement ${i + 1}`,
    detail: item.detail ?? item.description ?? item.message ?? '',
    date: item.date ?? item.created_at ?? item.horodatage ?? '',
  }))
}

export default function SuiviDossier() {
  const { t, lang } = useLanguage()
  const location = useLocation()
  const fileRef = useRef(null)

  const reference = location.state?.reference || 'ITS-2026-4821'
  const jetonSession = location.state?.jetonSession ?? null

  const [dossier, setDossier] = useState(null)
  const [loading, setLoading] = useState(Boolean(jetonSession))
  const [sessionError, setSessionError] = useState(
    jetonSession ? '' : 'missing',
  )

  const [scenario, setScenario] = useState('required')
  const [simFile, setSimFile] = useState(import.meta.env.DEV ? 'none' : null)
  const [message, setMessage] = useState('')
  const [file, setFile] = useState(null)
  const [errors, setErrors] = useState({})
  const [statusMsg, setStatusMsg] = useState('')
  const [answered, setAnswered] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!jetonSession) {
      setLoading(false)
      setSessionError('missing')
      return
    }

    let cancelled = false
    setLoading(true)
    setSessionError('')

    api
      .get('/suivi/dossier', { params: { jeton_session: jetonSession } })
      .then((res) => {
        if (cancelled) return
        setDossier(res.data)
        setSessionError('')
      })
      .catch((err) => {
        if (cancelled) return
        const status = err.response?.status
        if (status === 401 || status === 403) {
          setSessionError('expired')
        } else {
          setSessionError('expired')
        }
        setDossier(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [jetonSession])

  const pendingComplement = useMemo(() => {
    const list = dossier?.complements
    if (!Array.isArray(list)) return null
    return list.find((c) => c.etat === 'en_attente') ?? null
  }, [dossier])

  const pack = SCENARIO_QUESTIONS[lang] || SCENARIO_QUESTIONS.fr

  // DEV : scénarios fictifs pour prévisualiser des cas non couverts
  const cancelled = import.meta.env.DEV && scenario === 'cancel'
  const useDevOverride = import.meta.env.DEV && Boolean(scenario)

  const question = useMemo(() => {
    if (useDevOverride && (scenario === 'newQuestion' || !pendingComplement)) {
      return scenario === 'newQuestion' ? pack.newQuestion : pack.default
    }
    return (
      pendingComplement?.question ??
      pendingComplement?.message ??
      pendingComplement?.libelle ??
      ''
    )
  }, [useDevOverride, scenario, pack, pendingComplement])

  const attachmentRequired = useMemo(() => {
    if (useDevOverride) {
      if (scenario === 'optional') return false
      if (scenario === 'required' || scenario === 'newQuestion') return true
    }
    return Boolean(pendingComplement?.piece_exigee)
  }, [useDevOverride, scenario, pendingComplement])

  const attachmentName = useMemo(() => {
    if (useDevOverride && !pendingComplement?.description_piece) {
      return t.dossier.attachmentName
    }
    return (
      pendingComplement?.description_piece ??
      pendingComplement?.piece_description ??
      t.dossier.attachmentName
    )
  }, [useDevOverride, pendingComplement, t.dossier.attachmentName])

  const showComplementPanel =
    !cancelled && (Boolean(pendingComplement) || (import.meta.env.DEV && scenario !== 'cancel'))

  const statutLabel =
    dossier?.statut?.libelle ?? t.dossier.statusInfo
  const statutCode = mapStatutCode(
    dossier?.statut?.code ?? dossier?.statut?.slug ?? statutLabel,
  )

  const historyItems = useMemo(() => {
    if (Array.isArray(dossier?.historique) && dossier.historique.length > 0) {
      return mapHistoriqueItems(dossier.historique)
    }
    // Fallback DEV uniquement
    if (import.meta.env.DEV) {
      const items = [...t.dossier.historyItems]
      if (scenario === 'newQuestion') {
        items[0] = {
          ...items[0],
          title:
            lang === 'ar'
              ? 'معلومات مطلوبة (طلب رقم 2)'
              : 'Information demandée (demande n° 2)',
          detail: `« ${question} » — ${attachmentName}`,
        }
      }
      return items
    }
    return []
  }, [dossier, t.dossier.historyItems, scenario, lang, question, attachmentName])

  const applySimFile = (key) => {
    if (!import.meta.env.DEV) return
    setSimFile(key)
    setErrors((prev) => ({ ...prev, file: '' }))
    if (key === 'none') {
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      return
    }
    if (key === 'pdf') {
      setFile({
        name: 'plan-terrain.pdf',
        type: 'application/pdf',
        size: 120_000,
        simulated: true,
      })
      return
    }
    if (key === 'zip') {
      setFile({
        name: 'archive.zip',
        type: 'application/zip',
        size: 80_000,
        simulated: true,
      })
      return
    }
    if (key === 'oversized') {
      setFile({
        name: 'plan-terrain-hd.pdf',
        type: 'application/pdf',
        size: 12 * 1024 * 1024,
        simulated: true,
      })
    }
  }

  const validateFile = (next) => {
    if (!next) {
      if (attachmentRequired) return t.dossier.errors.fileRequired
      return ''
    }
    if (next.type === 'application/zip' || /\.zip$/i.test(next.name)) {
      return t.dossier.errors.zipRejected
    }
    if (next.size > MAX_BYTES) {
      return next.simulated
        ? t.dossier.errors.oversizedSim
        : t.dossier.errors.fileSize
    }
    if (!ACCEPT.includes(next.type) && !/\.(pdf|jpe?g|png)$/i.test(next.name)) {
      return t.dossier.errors.fileType
    }
    return ''
  }

  const onPickFile = (next) => {
    if (import.meta.env.DEV) setSimFile('none')
    setFile(next)
    setErrors((prev) => ({ ...prev, file: validateFile(next) }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (cancelled || answered || isSubmitting) return

    const nextErrors = {}
    if (!message.trim()) nextErrors.message = t.dossier.errors.message
    const fileErr = validateFile(file)
    if (fileErr) nextErrors.file = fileErr

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    if (!jetonSession) {
      setSessionError('missing')
      return
    }

    // Ne pas envoyer un fichier simulé DEV (objet plain) au backend
    const realFile = file && !file.simulated ? file : null

    const body = new FormData()
    body.append('jeton_session', jetonSession)
    body.append('message', message.trim())
    if (realFile) {
      body.append('piece_jointe', realFile)
    }

    setIsSubmitting(true)
    setStatusMsg('')
    try {
      const response = await api.post('/suivi/repondre-complement', body)

      if (response.status === 200) {
        setAnswered(true)
        setStatusMsg(response.data?.message || t.dossier.sentOk)
      }
    } catch (err) {
      const status = err.response?.status
      if (status === 401 || status === 403) {
        setSessionError('expired')
        setDossier(null)
        return
      }
      if (status === 422) {
        const apiErrors = err.response.data?.errors ?? {}
        const pieceMsg = Array.isArray(apiErrors.piece_jointe)
          ? apiErrors.piece_jointe[0]
          : apiErrors.piece_jointe
        const messageMsg = Array.isArray(apiErrors.message)
          ? apiErrors.message[0]
          : apiErrors.message

        setErrors((prev) => ({
          ...prev,
          ...(pieceMsg ? { file: pieceMsg } : {}),
          ...(messageMsg ? { message: messageMsg } : {}),
        }))
        return
      }
      setStatusMsg(
        err.response?.data?.message ||
          (lang === 'ar'
            ? 'تعذّر إرسال الرد. أعيدوا المحاولة.'
            : "Impossible d'envoyer la réponse. Réessayez."),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const sessionBlocked = Boolean(sessionError) && !loading

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <Header />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="mb-2 text-2xl font-bold text-institutional sm:text-3xl">
          {t.dossier.title}
        </h1>

        {sessionBlocked ? (
          <div className="mt-8 max-w-lg rounded-[8px] border border-red-200 bg-white p-6 shadow-sm">
            <p className="mb-4 text-sm leading-relaxed text-gray-700">
              {sessionError === 'missing'
                ? t.dossier.missingToken
                : t.dossier.sessionExpired}
            </p>
            <Link
              to="/suivre"
              state={{ reference }}
              className="inline-flex rounded-[8px] bg-action px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#008040]"
            >
              {t.dossier.restartTrack}
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-6 flex items-start gap-2 text-sm text-gray-600">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" aria-hidden />
              <span>
                {t.dossier.sessionPrefix}{' '}
                <span className="font-medium text-gray-800" dir="ltr">
                  {dossier?.reference ?? reference}
                </span>
                {`, ${t.dossier.sessionSuffix}`}
              </span>
            </p>

            {loading ? (
              <p className="text-sm text-gray-500">{t.dossier.loading}</p>
            ) : (
              <>
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[8px] border border-gray-200 bg-white px-4 py-3 shadow-sm">
                  <p
                    className="text-lg font-bold text-institutional sm:text-xl"
                    dir="ltr"
                  >
                    {dossier?.reference ?? reference}
                  </p>
                  <StatusBadge
                    status={statutCode}
                    label={statutLabel}
                    showDot
                  />
                </div>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_300px]">
                  <div className="space-y-5">
                    {cancelled ? (
                      <section className="rounded-[8px] border border-gray-200 bg-white p-5 text-sm text-gray-700 shadow-sm">
                        {t.dossier.cancelled}
                      </section>
                    ) : showComplementPanel && question ? (
                      <section className="rounded-[8px] border border-[#e9d5ff] bg-[#faf5ff] p-5 shadow-sm sm:p-6">
                        <div className="mb-4 flex items-start gap-2.5 text-[#6b21a8]">
                          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                          <h2 className="text-base font-bold">
                            {t.dossier.complementTitle}
                          </h2>
                        </div>

                        <p className="mb-2 text-xs font-medium tracking-[0.08em] text-gray-500 uppercase">
                          {t.dossier.questionLabel}
                        </p>
                        <blockquote className="mb-4 text-sm leading-relaxed text-gray-800 italic">
                          « {question} »
                        </blockquote>

                        {attachmentRequired && (
                          <div className="rounded-[8px] border border-gray-200 bg-white px-4 py-3">
                            <div className="flex items-start gap-2.5">
                              <Paperclip
                                className="mt-0.5 h-4 w-4 shrink-0 text-[#6b21a8]"
                                aria-hidden
                              />
                              <div>
                                <p className="text-sm text-gray-800">
                                  {t.dossier.attachmentExpected}{' '}
                                  <span className="font-semibold">
                                    {attachmentName}
                                  </span>
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                  {t.dossier.attachmentRequiredNote}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </section>
                    ) : (
                      <section className="rounded-[8px] border border-gray-200 bg-white p-5 text-sm text-gray-700 shadow-sm">
                        {t.dossier.noComplement}
                      </section>
                    )}

                    {!cancelled && !answered && question && (
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
                            value={message}
                            onChange={(e) => {
                              setMessage(e.target.value)
                              if (errors.message) {
                                setErrors((prev) => ({ ...prev, message: '' }))
                              }
                            }}
                            error={errors.message}
                          />
                          <FieldError message={errors.message} />
                        </div>

                        <div className="mb-5">
                          <FieldLabel
                            htmlFor="reponse-file"
                            required={attachmentRequired}
                          >
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
                              <Paperclip
                                className="h-4 w-4 text-gray-500"
                                aria-hidden
                              />
                              <span className="text-gray-700">
                                {file?.name || t.dossier.noFile}
                              </span>
                            </label>
                            <input
                              ref={fileRef}
                              id="reponse-file"
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                              className="sr-only"
                              onChange={(e) =>
                                onPickFile(e.target.files?.[0] ?? null)
                              }
                            />
                            <p className="text-xs text-gray-500">
                              {t.dossier.fileHint}
                            </p>
                          </div>
                          <FieldError message={errors.file} />
                        </div>

                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                          <p className="flex max-w-md items-start gap-2 text-xs leading-relaxed text-gray-500">
                            <Mail
                              className="mt-0.5 h-3.5 w-3.5 shrink-0"
                              aria-hidden
                            />
                            <span>{t.dossier.notify}</span>
                          </p>
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-action px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#008040] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Send className="h-4 w-4" aria-hidden />
                            {t.dossier.send}
                          </button>
                        </div>
                      </form>
                    )}

                    {statusMsg && (
                      <p
                        className="rounded-[8px] border border-action/30 bg-[#e6f6ed] px-4 py-3 text-sm text-institutional"
                        role="status"
                      >
                        {statusMsg}
                      </p>
                    )}
                  </div>

                  <HistoryTimeline
                    title={t.dossier.history}
                    items={historyItems}
                  />
                </div>
              </>
            )}
          </>
        )}

        {import.meta.env.DEV && !sessionBlocked && (
          <div className="mt-8 rounded-[8px] border border-dashed border-gray-300 bg-white/70 p-4">
            <div className="mb-4 flex items-start gap-2.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" aria-hidden />
              <p className="text-sm leading-relaxed text-gray-600">
                <span className="font-semibold text-gray-800">
                  {t.dossier.mockTitle}
                </span>{' '}
                {t.dossier.mockBody}
              </p>
            </div>

            <div className="mb-3">
              <p className="mb-2 text-xs font-medium text-gray-600">
                {t.dossier.mockFileLabel}
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(t.dossier.mockFiles).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applySimFile(key)}
                    className={[
                      'rounded-full border px-3 py-1 text-xs font-medium transition',
                      simFile === key
                        ? 'border-action bg-action text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400',
                    ].join(' ')}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-gray-600">
                {t.dossier.mockScenarioLabel}
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(t.dossier.mockScenarios).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setScenario(key)
                      setAnswered(false)
                      setStatusMsg(key === 'cancel' ? t.dossier.cancelled : '')
                      setErrors({})
                    }}
                    className={[
                      'rounded-full border px-3 py-1 text-xs font-medium transition',
                      scenario === key
                        ? 'border-action bg-action text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400',
                    ].join(' ')}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

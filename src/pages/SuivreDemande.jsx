import { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Info, Lock, Mail } from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { FieldError, FieldLabel, TextInput } from '../components/FormFields'
import { useLanguage } from '../i18n/LanguageContext'
import api from '../lib/api'

const REF_RE = /^ITS-\d{4}-\d{4}$/i
const MAX_REQUESTS = 3
const MAX_ATTEMPTS = 5
const OTP_LENGTH = 6

// Clé utilisée pour garder la session de suivi si l'utilisateur recharge
// la page du dossier (le state de react-router est perdu au rechargement).
export const SUIVI_SESSION_KEY = 'itassel_suivi'

const normalizeRef = (value) => value.trim().toUpperCase()

function OtpInput({ value, onChange, disabled, error }) {
  const inputsRef = useRef([])

  const digits = Array.from({ length: OTP_LENGTH }, (_, i) => value[i] || '')

  const focusAt = (index) => {
    const el = inputsRef.current[index]
    if (el) el.focus()
  }

  const setDigit = (index, char) => {
    const next = [...digits]
    next[index] = char
    onChange(next.join(''))
  }

  const handleChange = (index, raw) => {
    const cleaned = raw.replace(/\D/g, '')
    if (!cleaned) {
      setDigit(index, '')
      return
    }

    if (cleaned.length > 1) {
      const chars = cleaned.slice(0, OTP_LENGTH - index).split('')
      const next = [...digits]
      chars.forEach((c, i) => {
        next[index + i] = c
      })
      onChange(next.join(''))
      focusAt(Math.min(index + chars.length, OTP_LENGTH - 1))
      return
    }

    setDigit(index, cleaned)
    if (index < OTP_LENGTH - 1) focusAt(index + 1)
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        setDigit(index, '')
      } else if (index > 0) {
        focusAt(index - 1)
        setDigit(index - 1, '')
      }
      e.preventDefault()
    }
    if (e.key === 'ArrowLeft' && index > 0) focusAt(index - 1)
    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) focusAt(index + 1)
  }

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-2.5" dir="ltr">
      {digits.map((digit, index) => (
        <div key={index} className="contents">
          {index === 3 && (
            <span className="px-0.5 text-gray-300 select-none" aria-hidden>
              ·
            </span>
          )}
          <input
            id={index === 0 ? 'otp-0' : undefined}
            ref={(el) => {
              inputsRef.current[index] = el
            }}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            disabled={disabled}
            aria-label={`Chiffre ${index + 1} sur ${OTP_LENGTH}`}
            placeholder="0"
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onFocus={(e) => e.target.select()}
            className={[
              'h-12 w-10 rounded-[8px] border bg-white text-center text-lg font-medium text-gray-900 outline-none transition placeholder:text-gray-300 focus:ring-2 sm:h-14 sm:w-11',
              error
                ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                : 'border-gray-300 focus:border-institutional focus:ring-institutional/20',
              disabled ? 'cursor-not-allowed opacity-60' : '',
            ].join(' ')}
          />
        </div>
      ))}
    </div>
  )
}

/**
 * Bandeau réservé au développement (jamais affiché en production).
 * Le vrai code n'est plus connu du navigateur : en attendant l'envoi
 * d'emails réel, il est écrit dans le journal Laravel.
 */
function DevBanner({ t, onExpire, expireDisabled }) {
  if (!import.meta.env.DEV) return null

  return (
    <>
      <div className="mt-6 rounded-[8px] border border-dashed border-gray-300 bg-white/70 px-4 py-3">
        <div className="flex items-start gap-2.5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" aria-hidden />
          <p className="text-sm leading-relaxed text-gray-600" dir="ltr">
            <span className="font-semibold text-gray-800">Mode développement.</span>{' '}
            Le code à 6 chiffres est écrit dans le fichier{' '}
            <code className="rounded bg-gray-100 px-1">storage/logs/laravel.log</code>{' '}
            du projet Laravel (dernière ligne « Code de vérification (TEST) »).
            Ce bandeau n'apparaît pas en production.
          </p>
        </div>
      </div>

      {onExpire && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onExpire}
            disabled={expireDisabled}
            className="rounded-[8px] border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-gray-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t.track.demoExpire}
          </button>
        </div>
      )}
    </>
  )
}

export default function SuivreDemande() {
  const { t, lang } = useLanguage()
  const location = useLocation()
  const navigate = useNavigate()

  const [step, setStep] = useState('demande')
  // Pré-rempli seulement si on arrive depuis l'écran de confirmation.
  const [reference, setReference] = useState(
    () => location.state?.reference || '',
  )
  const [refError, setRefError] = useState('')
  const [codeRequestCount, setCodeRequestCount] = useState(0)
  const [verifyAttempts, setVerifyAttempts] = useState(0)
  const [otp, setOtp] = useState('')
  const [codeError, setCodeError] = useState('')
  const [codeExpired, setCodeExpired] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [isRequesting, setIsRequesting] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [networkError, setNetworkError] = useState('')

  const requestsExhausted = codeRequestCount >= MAX_REQUESTS
  const attemptsExhausted = verifyAttempts >= MAX_ATTEMPTS

  const networkErrorText =
    t.track.networkError ||
    (lang === 'ar'
      ? 'تعذّر الاتصال بالخادم. تحقّق من اتصالك وأعد المحاولة.'
      : 'Connexion au serveur impossible. Vérifiez votre connexion et réessayez.')

  const validateRef = (value) => {
    const trimmed = value.trim()
    if (!trimmed) return t.track.errors.required
    if (!REF_RE.test(trimmed)) return t.track.errors.invalid
    return ''
  }

  /**
   * Demande un code au backend. La réponse est volontairement la même
   * que la référence existe ou non : on passe donc toujours à l'étape
   * de vérification en cas de succès.
   */
  const requestCode = async () => {
    if (requestsExhausted) {
      setStatusMsg(t.track.maxRequests)
      return
    }

    setIsRequesting(true)
    setNetworkError('')
    try {
      await api.post('/suivi/demander-code', {
        reference: normalizeRef(reference),
      })
      setCodeRequestCount((n) => n + 1)
      setVerifyAttempts(0)
      setOtp('')
      setCodeError('')
      setCodeExpired(false)
      setStatusMsg('')
      setStep('verification')
    } catch (err) {
      if (err.response?.status === 422) {
        setRefError(t.track.errors.invalid)
      } else {
        setNetworkError(networkErrorText)
      }
    } finally {
      setIsRequesting(false)
    }
  }

  const handleRequestSubmit = (e) => {
    e.preventDefault()
    if (isRequesting) return
    const msg = validateRef(reference)
    setRefError(msg)
    if (msg) return
    requestCode()
  }

  const handleResend = () => {
    if (isRequesting) return
    if (requestsExhausted) {
      setStatusMsg(t.track.maxRequests)
      return
    }
    requestCode()
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    if (isVerifying) return
    setStatusMsg('')
    setNetworkError('')

    if (codeExpired) {
      setCodeError(t.track.codeExpired)
      return
    }
    if (attemptsExhausted) {
      setCodeError(t.track.maxAttempts)
      return
    }

    const code = otp.replace(/\s/g, '')
    if (code.length !== OTP_LENGTH) {
      setCodeError(t.track.codeRequired)
      return
    }

    setIsVerifying(true)
    try {
      const res = await api.post('/suivi/verifier-code', {
        reference: normalizeRef(reference),
        code,
      })

      const jetonSession = res.data?.jeton_session
      if (!jetonSession) {
        setCodeError(t.track.codeInvalid)
        return
      }

      const session = {
        reference: normalizeRef(reference),
        jetonSession,
        expiresAt: Date.now() + (res.data.expire_dans_min ?? 30) * 60 * 1000,
      }

      try {
        sessionStorage.setItem(SUIVI_SESSION_KEY, JSON.stringify(session))
      } catch {
        // Stockage indisponible (navigation privée stricte) : le state suffit.
      }

      setCodeError('')
      navigate('/suivre/dossier', { state: { ...session, fromVerify: true } })
    } catch (err) {
      if (err.response?.status === 422) {
        // Code faux, expiré ou déjà utilisé : même message côté backend.
        const nextAttempts = verifyAttempts + 1
        setVerifyAttempts(nextAttempts)
        setCodeError(
          nextAttempts >= MAX_ATTEMPTS ? t.track.maxAttempts : t.track.codeInvalid,
        )
      } else {
        setNetworkError(networkErrorText)
      }
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <Header />

      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="mb-3 text-2xl font-bold text-institutional sm:text-3xl">
          {t.track.title}
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-gray-600 sm:text-base">
          {t.track.subtitle}
        </p>

        {step === 'demande' && (
          <form
            onSubmit={handleRequestSubmit}
            noValidate
            className="rounded-[8px] border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
          >
            <div className="mb-4">
              <FieldLabel htmlFor="track-ref">{t.track.refLabel}</FieldLabel>
              <TextInput
                id="track-ref"
                name="reference"
                dir="ltr"
                autoComplete="off"
                maxLength={20}
                placeholder={t.track.refPlaceholder}
                value={reference}
                onChange={(e) => {
                  setReference(e.target.value)
                  if (refError) setRefError(validateRef(e.target.value))
                }}
                onBlur={() => setRefError(validateRef(reference))}
                error={refError}
              />
              <FieldError message={refError} />
            </div>

            <button
              type="submit"
              disabled={requestsExhausted || isRequesting}
              aria-busy={isRequesting}
              className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-action px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#008040] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Mail className="h-4 w-4" aria-hidden />
              {t.track.submit}
            </button>

            <p className="flex items-start gap-2 text-xs leading-relaxed text-gray-500">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{t.track.validity}</span>
            </p>

            {requestsExhausted && (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {t.track.maxRequests}
              </p>
            )}

            {networkError && (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {networkError}
              </p>
            )}
          </form>
        )}

        {step === 'verification' && (
          <form
            onSubmit={handleVerify}
            noValidate
            className="rounded-[8px] border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
          >
            <div className="mb-5 flex items-start gap-3 rounded-[8px] bg-[#e6f6ed] px-4 py-3 text-sm text-institutional">
              <Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <p className="leading-relaxed">{t.track.sentBanner}</p>
            </div>

            <div className="mb-5">
              <FieldLabel htmlFor="otp-0">{t.track.codeLabel}</FieldLabel>
              <OtpInput
                value={otp}
                onChange={(next) => {
                  setOtp(next)
                  if (codeError) setCodeError('')
                }}
                disabled={attemptsExhausted || codeExpired || isVerifying}
                error={!!codeError}
              />
              <FieldError message={codeError} />
            </div>

            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={attemptsExhausted || codeExpired || isVerifying}
                aria-busy={isVerifying}
                className="inline-flex flex-1 items-center justify-center rounded-[8px] bg-action px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#008040] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t.track.verify}
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={requestsExhausted || isRequesting}
                aria-busy={isRequesting}
                className="inline-flex flex-1 items-center justify-center rounded-[8px] border border-action bg-white px-4 py-2.5 text-sm font-medium text-action transition hover:bg-[#e6f6ed] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t.track.resend}
              </button>
            </div>

            <p className="text-xs leading-relaxed text-gray-500">{t.track.rules}</p>

            {requestsExhausted && (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {t.track.maxRequests}
              </p>
            )}

            {networkError && (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {networkError}
              </p>
            )}

            {statusMsg && (
              <p
                className="mt-4 rounded-[8px] border border-action/30 bg-[#e6f6ed] px-4 py-3 text-sm text-institutional"
                role="status"
              >
                {statusMsg}
              </p>
            )}
          </form>
        )}

        <DevBanner
          t={t}
          onExpire={
            step === 'verification'
              ? () => {
                  setCodeExpired(true)
                  setCodeError(t.track.codeExpired)
                  setStatusMsg('')
                }
              : undefined
          }
          expireDisabled={codeExpired}
        />
      </main>

      <Footer />
    </div>
  )
}
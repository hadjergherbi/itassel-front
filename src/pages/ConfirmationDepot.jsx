import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Copy,
  Mail,
} from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import StatusBadge from '../components/StatusBadge'
import { useLanguage } from '../i18n/LanguageContext'

function formatDepositDate(iso, lang) {
  const date = iso ? new Date(iso) : new Date('2026-09-04T10:24:00')
  if (Number.isNaN(date.getTime())) return '—'

  const formatted = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-DZ' : 'fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)

  return formatted.replace(/\u202f/g, ' ').replace(',', ',')
}

export default function ConfirmationDepot() {
  const { t, lang, isRtl } = useLanguage()
  const location = useLocation()
  const Arrow = isRtl ? ArrowLeft : ArrowRight
  const [copyState, setCopyState] = useState('idle')

  const data = location.state ?? {}

  const reference = data.reference || 'ITS-2026-004821'
  const email = data.email || 'nom@exemple.dz'
  const domaineValue = data.domaine || 'sport'
  const depositedAt = data.depositedAt

  const domaineLabel = useMemo(() => {
    if (data.domaineLabel) return data.domaineLabel
    const found = t.deposit.request.domaines.find((d) => d.value === domaineValue)
    return found?.label ?? domaineValue
  }, [data.domaineLabel, domaineValue, t.deposit.request.domaines])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reference)
      setCopyState('copied')
      window.setTimeout(() => setCopyState('idle'), 2000)
    } catch {
      setCopyState('fail')
      window.setTimeout(() => setCopyState('idle'), 2000)
    }
  }

  const copyLabel =
    copyState === 'copied'
      ? t.confirmation.copied
      : copyState === 'fail'
        ? t.confirmation.copyFail
        : t.confirmation.copy

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <Header />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-institutional text-white shadow-sm">
          <Check className="h-8 w-8" strokeWidth={3} aria-hidden />
        </div>

        <h1 className="mb-3 text-center text-2xl font-bold text-institutional sm:text-3xl">
          {t.confirmation.title}
        </h1>

        <p className="mb-8 max-w-xl text-center text-sm leading-relaxed text-gray-600 sm:text-base">
          {t.confirmation.emailPrefix}{' '}
          <span className="font-medium text-gray-800" dir="ltr">
            {email}
          </span>
          {`. ${t.confirmation.emailSuffix}`}
        </p>

        {/* Référence */}
        <section className="mb-5 w-full rounded-[8px] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="mb-2 text-xs font-medium tracking-[0.08em] text-gray-500 uppercase">
            {t.confirmation.refLabel}
          </p>

          <div className="mb-5 flex flex-wrap items-center gap-3">
            <p
              className="text-3xl font-bold tracking-wide text-institutional sm:text-4xl"
              dir="ltr"
            >
              {reference}
            </p>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-[8px] border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:border-institutional hover:text-institutional"
            >
              {copyState === 'copied' ? (
                <Check className="h-4 w-4 text-action" aria-hidden />
              ) : (
                <Copy className="h-4 w-4" aria-hidden />
              )}
              {copyLabel}
            </button>
          </div>

          <div className="grid gap-4 border-t border-gray-100 pt-4 sm:grid-cols-3">
            <div>
              <p className="mb-1 text-xs text-gray-500">{t.confirmation.depositedOn}</p>
              <p className="text-sm font-medium text-gray-900">
                {formatDepositDate(depositedAt, lang)}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs text-gray-500">{t.confirmation.domain}</p>
              <p className="text-sm font-medium text-gray-900">{domaineLabel}</p>
            </div>
            <div>
              <p className="mb-1 text-xs text-gray-500">{t.confirmation.status}</p>
              <StatusBadge status="nouvelle" label={t.confirmation.statusNew} />
            </div>
          </div>
        </section>

        {/* Suite */}
        <section className="mb-8 w-full rounded-[8px] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-4 text-base font-bold text-gray-900">
            {t.confirmation.nextTitle}
          </h2>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#e6f6ed] text-institutional">
                <Building2 className="h-4 w-4" aria-hidden />
              </span>
              <p className="text-sm leading-relaxed text-gray-700">
                {t.confirmation.nextItems[0]}
              </p>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#e6f6ed] text-institutional">
                <Mail className="h-4 w-4" aria-hidden />
              </span>
              <p className="text-sm leading-relaxed text-gray-700">
                {t.confirmation.nextItems[1]}
              </p>
            </li>
          </ul>
        </section>

        <div className="flex w-full flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link
            to="/suivre"
            state={{ reference }}
            className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-institutional px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#005a35]"
          >
            {t.confirmation.track}
            <Arrow className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-[8px] border border-institutional bg-white px-5 py-2.5 text-sm font-medium text-institutional transition hover:bg-[#e6f6ed]"
          >
            {t.confirmation.home}
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  )
}

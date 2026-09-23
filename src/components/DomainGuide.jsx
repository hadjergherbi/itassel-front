import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CircleCheck } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'

const TAB_KEYS = ['sport', 'jeunesse', 'rh']

export default function DomainGuide() {
  const { t } = useLanguage()
  const [active, setActive] = useState('sport')
  const domain = t.domain.domains[active]

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <h2 className="mb-2 text-2xl font-bold text-gray-900 sm:text-3xl">
        {t.domain.title}
      </h2>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-gray-600 sm:text-base">
        {t.domain.subtitle}
      </p>

      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label={t.domain.title}>
        {TAB_KEYS.map((key) => {
          const selected = active === key
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(key)}
              className={[
                'rounded-[8px] border px-4 py-2 text-sm font-medium transition',
                selected
                  ? 'border-action bg-action text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-institutional hover:text-institutional',
              ].join(' ')}
            >
              {t.domain.tabs[key]}
            </button>
          )
        })}
      </div>

      <div
        role="tabpanel"
        className="rounded-[8px] border border-gray-200 bg-white p-5 shadow-sm sm:p-7"
      >
        <h3 className="mb-4 text-lg font-bold text-gray-900">{domain.title}</h3>

        <p className="mb-3 text-sm font-medium text-gray-800">
          {t.domain.examplesTitle}
        </p>
        <ul className="mb-5 space-y-2.5">
          {domain.examples.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm text-gray-700">
              <CircleCheck
                className="mt-0.5 h-4 w-4 shrink-0 text-action"
                aria-hidden
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="mb-5 flex items-start gap-2.5 rounded-[8px] border border-warning-border bg-warning-bg px-4 py-3 text-sm text-warning-text">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>{domain.warning}</p>
        </div>

        <Link
          to={`/deposer?domaine=${active}`}
          className="inline-flex items-center justify-center rounded-[8px] bg-action px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#008040]"
        >
          {t.domain.depositForDomain}
        </Link>
      </div>
    </section>
  )
}

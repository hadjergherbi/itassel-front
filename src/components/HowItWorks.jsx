import { Building2, FileText, Mail } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'

const icons = [FileText, Building2, Mail]

export default function HowItWorks() {
  const { t } = useLanguage()

  return (
    <section className="border-y border-gray-200/60 bg-page">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <h2 className="mb-8 text-center text-2xl font-bold text-gray-900 sm:mb-10 sm:text-3xl">
          {t.how.title}
        </h2>

        <div className="grid gap-5 md:grid-cols-3">
          {t.how.steps.map((step, i) => {
            const Icon = icons[i]
            return (
              <article
                key={step.title}
                className="flex flex-col rounded-[8px] border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[8px] bg-institutional/10 text-institutional">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mb-2 text-base font-bold text-gray-900">
                  <span className="me-1 text-institutional">{i + 1}.</span>
                  {step.title}
                </h3>
                <p className="mb-5 flex-1 text-sm leading-relaxed text-gray-600">
                  {step.text}
                </p>
                <span className="inline-flex w-fit rounded-full bg-[#e6f6ed] px-3 py-1 text-xs font-medium text-institutional">
                  {step.badge}
                </span>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

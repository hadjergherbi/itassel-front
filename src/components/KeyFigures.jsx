import { useLanguage } from '../i18n/LanguageContext'

export default function KeyFigures() {
  const { t } = useLanguage()

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">{t.stats.title}</h2>
        <p className="mt-1 text-xs text-gray-500 sm:text-sm">{t.stats.note}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {t.stats.items.map((item) => (
          <div
            key={item.label}
            className="rounded-[8px] border border-gray-200 bg-white px-5 py-6 text-center shadow-sm"
          >
            <div className="mb-1 text-3xl font-bold text-institutional sm:text-4xl">
              {item.value}
            </div>
            <p className="text-sm text-gray-600">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'

const CATEGORY_KEYS = ['depot', 'suivi', 'delais', 'confidentialite']

export default function FAQ() {
  const { t } = useLanguage()
  const [category, setCategory] = useState('depot')
  const [openIndex, setOpenIndex] = useState(0)

  const items = useMemo(
    () => t.faq.items.filter((item) => item.category === category),
    [t.faq.items, category],
  )

  const handleCategory = (key) => {
    setCategory(key)
    setOpenIndex(0)
  }

  return (
    <section id="faq" className="border-t border-gray-200/80 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <h2 className="mb-6 text-2xl font-bold text-gray-900 sm:mb-8 sm:text-3xl">
          {t.faq.title}
        </h2>

        <div className="mb-6 flex flex-wrap gap-2">
          {CATEGORY_KEYS.map((key) => {
            const active = category === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleCategory(key)}
                className={[
                  'rounded-full px-4 py-1.5 text-sm font-medium transition',
                  active
                    ? 'bg-institutional text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                ].join(' ')}
              >
                {t.faq.categories[key]}
              </button>
            )
          })}
        </div>

        <div className="divide-y divide-gray-200 rounded-[8px] border border-gray-200 bg-page">
          {items.map((item, i) => {
            const open = openIndex === i
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(open ? -1 : i)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-4 text-start sm:px-5"
                  aria-expanded={open}
                >
                  <span className="text-sm font-medium text-gray-900 sm:text-base">
                    {item.q}
                  </span>
                  {open ? (
                    <ChevronUp className="h-5 w-5 shrink-0 text-institutional" />
                  ) : (
                    <ChevronDown className="h-5 w-5 shrink-0 text-gray-400" />
                  )}
                </button>
                {open && (
                  <div className="px-4 pb-4 text-sm leading-relaxed text-gray-600 sm:px-5">
                    {item.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

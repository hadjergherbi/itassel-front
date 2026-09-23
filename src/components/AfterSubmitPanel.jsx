import {
  Bell,
  Building2,
  Lock,
  Mail,
} from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'

const icons = [Mail, Building2, Bell, Lock]

export default function AfterSubmitPanel() {
  const { t } = useLanguage()

  return (
    <aside className="lg:sticky lg:top-24">
      <div className="rounded-[8px] border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-institutional">
          {t.deposit.after.title}
        </h2>
        <ul className="space-y-4">
          {t.deposit.after.items.map((text, i) => {
            const Icon = icons[i]
            return (
              <li key={text} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#e6f6ed] text-institutional">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <p className="text-sm leading-relaxed text-gray-700">{text}</p>
              </li>
            )
          })}
        </ul>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        {t.deposit.after.privacy}
      </p>
    </aside>
  )
}

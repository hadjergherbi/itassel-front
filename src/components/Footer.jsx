import { useLanguage } from '../i18n/LanguageContext'

export default function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="bg-institutional text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-start gap-3">
          <img
            src="/logo-seal.svg"
            alt=""
            className="h-10 w-10 shrink-0 brightness-110"
            width={40}
            height={40}
          />
          <p className="max-w-xl text-sm leading-relaxed text-white/95">{t.footer.text}</p>
        </div>
        <p className="max-w-sm text-xs leading-relaxed text-white/75 sm:text-end">
          {t.footer.privacy}
        </p>
      </div>
    </footer>
  )
}

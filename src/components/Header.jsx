import { NavLink } from 'react-router-dom'
import { Globe } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'

export default function Header() {
  const { t, lang, toggleLang } = useLanguage()

  const linkClass = ({ isActive }) =>
    [
      'relative px-1 py-2 text-sm font-medium transition-colors',
      isActive
        ? 'text-institutional after:absolute after:bottom-0 after:start-0 after:end-0 after:h-0.5 after:rounded-full after:bg-institutional'
        : 'text-gray-600 hover:text-institutional',
    ].join(' ')

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/80 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <NavLink to="/" className="flex min-w-0 items-center gap-3 no-underline">
          <img
            src="/logo-seal.svg"
            alt=""
            className="h-11 w-11 shrink-0"
            width={44}
            height={44}
          />
          <div className="min-w-0 leading-tight">
            <div className="text-base font-bold tracking-wide text-institutional">
              {t.brand}
            </div>
            <div className="truncate text-xs text-gray-500">{t.brandSubtitle}</div>
          </div>
        </NavLink>

        <div className="flex shrink-0 items-center gap-5 sm:gap-7">
          <nav className="hidden items-center gap-6 md:flex" aria-label="Navigation principale">
            <NavLink to="/" end className={linkClass}>
              {t.nav.home}
            </NavLink>
            <NavLink to="/deposer" className={linkClass}>
              {t.nav.deposit}
            </NavLink>
            <NavLink to="/suivre" className={linkClass}>
              {t.nav.track}
            </NavLink>
          </nav>

          <button
            type="button"
            onClick={toggleLang}
            className="inline-flex items-center gap-1.5 rounded-[8px] border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:border-institutional hover:text-institutional"
            aria-label={lang === 'fr' ? 'Passer en arabe' : 'Passer en français'}
          >
            <Globe className="h-4 w-4" aria-hidden />
            {t.lang}
          </button>
        </div>
      </div>
    </header>
  )
}

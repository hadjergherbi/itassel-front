import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'
import LanguageSwitcher from './LanguageSwitcher'

export default function Header() {
  const { t } = useLanguage()
  const [menuOuvert, setMenuOuvert] = useState(false)

  const linkClass = ({ isActive }) =>
    [
      'relative px-1 py-2 text-sm font-medium transition-colors',
      isActive
        ? 'text-institutional after:absolute after:bottom-0 after:start-0 after:end-0 after:h-0.5 after:rounded-full after:bg-institutional'
        : 'text-gray-600 hover:text-institutional',
    ].join(' ')

  const mobileLinkClass = ({ isActive }) =>
    [
      'block rounded-[8px] px-3 py-2 text-sm font-medium',
      isActive ? 'bg-success-bg text-institutional' : 'text-gray-700 hover:bg-gray-50',
    ].join(' ')

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/80 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <NavLink to="/" className="flex min-w-0 items-center gap-3 no-underline">
          <img
            src="/logoo.png"
            alt=""
            className="h-11 w-11 shrink-0"
            width={56}
            height={56}
          />
          <div className="min-w-0 leading-tight">
            <div className="text-base font-bold tracking-wide text-institutional">
              {t.brand}
            </div>
            <div className="truncate text-xs text-gray-500">{t.brandSubtitle}</div>
          </div>
        </NavLink>

        <div className="flex shrink-0 items-center gap-3 sm:gap-5">
          <nav className="hidden items-center gap-6 md:flex" aria-label={t.commun.navPrincipale}>
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

          <div className="hidden md:block">
            <LanguageSwitcher variante="claire" />
          </div>

          <button
            type="button"
            className="rounded-[8px] p-1.5 text-gray-600 hover:bg-gray-100 md:hidden"
            aria-expanded={menuOuvert}
            aria-controls="menu-public"
            aria-label={menuOuvert ? t.commun.fermerMenu : t.commun.ouvrirMenu}
            onClick={() => setMenuOuvert((v) => !v)}
          >
            {menuOuvert ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOuvert && (
        <div id="menu-public" className="border-t border-gray-100 bg-white px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1" aria-label={t.commun.navPrincipale}>
            <NavLink to="/" end className={mobileLinkClass} onClick={() => setMenuOuvert(false)}>
              {t.nav.home}
            </NavLink>
            <NavLink to="/deposer" className={mobileLinkClass} onClick={() => setMenuOuvert(false)}>
              {t.nav.deposit}
            </NavLink>
            <NavLink to="/suivre" className={mobileLinkClass} onClick={() => setMenuOuvert(false)}>
              {t.nav.track}
            </NavLink>
          </nav>
          <div className="mt-3 flex justify-end">
            <LanguageSwitcher variante="claire" />
          </div>
        </div>
      )}
    </header>
  )
}

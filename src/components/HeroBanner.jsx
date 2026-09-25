import { Link } from 'react-router-dom'
import {
  Lock,
  Plus,
  ShieldCheck,
  CircleCheck,
} from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'
import QuickTrackCard from './QuickTrackCard'

const badgeIcons = [ShieldCheck, CircleCheck, Lock]

export default function HeroBanner() {
  const { t } = useLanguage()

  return (
    <section className="bg-institutional">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-10 lg:py-14">
        <div className="text-white">
          <p className="mb-3 text-xs font-medium tracking-[0.12em] text-white/85 uppercase">
            {t.hero.eyebrow}
          </p>
          <h1 className="mb-4 text-3xl font-bold leading-tight sm:text-4xl lg:text-[2.5rem]">
            {t.hero.title}
          </h1>
          <p className="mb-7 max-w-xl text-sm leading-relaxed text-white/90 sm:text-base">
            {t.hero.subtitle}
          </p>

          <div className="mb-8 flex flex-wrap gap-3">
            <Link
              to="/deposer"
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-[8px] bg-white px-4 py-2.5 text-sm font-medium text-institutional transition hover:bg-white/95"
            >
              <Plus className="h-4 w-4" aria-hidden />
              {t.hero.ctaDeposit}
            </Link>
            <Link
              to="/suivre"
              className="inline-flex items-center gap-2 rounded-[8px] border border-white/80 bg-transparent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
            >
              {t.hero.ctaTrack}
            </Link>
          </div>

          <ul className="flex flex-wrap gap-2">
            {t.hero.badges.map((label, i) => {
              const Icon = badgeIcons[i]
              return (
                <li
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs text-white backdrop-blur-sm"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {label}
                </li>
              )
            })}
          </ul>
        </div>

        <QuickTrackCard />
      </div>
    </section>
  )
}

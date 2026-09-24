import { useId } from 'react'
import { Inbox, Lock, Pencil, Send, ShieldCheck } from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext'
import LanguageSwitcher from '../LanguageSwitcher'

const ETAPE_CLES = [
  { icon: Inbox, cle: 'etapeReception' },
  { icon: Pencil, cle: 'etapeTraitement' },
  { icon: Send, cle: 'etapeReponse' },
]

function DecorAuth({ uid }) {
  return (
    <>
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden
      >
        <defs>
          <pattern id={`${uid}-dots`} width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="1.2" cy="1.2" r="1.1" fill="white" fillOpacity="0.1" />
          </pattern>
        </defs>
        <rect x="50%" y="0" width="50%" height="100%" fill={`url(#${uid}-dots)`} />
      </svg>

      <svg
        className="pointer-events-none absolute -end-2 top-10 h-44 w-52"
        viewBox="0 0 208 176"
        fill="none"
        aria-hidden
      >
        <g stroke="white" strokeOpacity="0.25" strokeWidth="1">
          <line x1="96" y1="78" x2="36" y2="28" />
          <line x1="96" y1="78" x2="168" y2="18" />
          <line x1="96" y1="78" x2="196" y2="88" />
          <line x1="96" y1="78" x2="150" y2="150" />
          <line x1="96" y1="78" x2="24" y2="118" />
          <line x1="168" y1="18" x2="196" y2="88" />
        </g>
        <circle cx="96" cy="78" r="22" stroke="white" strokeOpacity="0.35" />
        <g fill="white" fillOpacity="0.55">
          <circle cx="96" cy="78" r="4" />
          <circle cx="36" cy="28" r="3" />
          <circle cx="168" cy="18" r="2.5" />
          <circle cx="196" cy="88" r="3" />
          <circle cx="150" cy="150" r="2.5" />
          <circle cx="24" cy="118" r="2.5" />
        </g>
      </svg>

      <svg
        className="pointer-events-none absolute -bottom-24 -end-20 h-[28rem] w-[28rem]"
        viewBox="0 0 448 448"
        fill="none"
        aria-hidden
      >
        <g stroke="white" strokeOpacity="0.1" strokeWidth="1.25">
          <circle cx="360" cy="360" r="70" />
          <circle cx="360" cy="360" r="120" />
          <circle cx="360" cy="360" r="170" />
          <circle cx="360" cy="360" r="220" />
          <circle cx="360" cy="360" r="270" />
        </g>
      </svg>
    </>
  )
}

export default function AuthLayout({ children, sousTitre }) {
  const reactId = useId()
  const uid = `auth${reactId.replace(/[^a-zA-Z0-9]/g, '')}`
  const { t } = useLanguage()
  const a = t.admin.auth
  const texteSousTitre = sousTitre ?? a.sousTitreDefaut

  return (
    <div className="grid min-h-screen bg-page lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-gradient-to-b from-[#3a9470] to-[#0b4a31] p-12 text-white lg:flex lg:flex-col xl:p-16">
        <DecorAuth uid={uid} />

        <header className="relative z-10">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_8px_24px_rgba(0,0,0,0.18)] ring-1 ring-white/30">
              <img src="/logoo.png" alt="" className="h-12 w-12 object-contain" width={48} height={48} />
            </div>
            <div className="leading-tight">
              <div className="text-2xl font-bold tracking-[0.15em]">{t.brand}</div>
              <div className="mt-0.5 text-white/85">{t.brandSubtitle}</div>
            </div>
          </div>
          <div className="mt-6 h-px w-full bg-white/20" />
        </header>

        <div className="relative z-10 flex flex-1 flex-col justify-center py-6">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3.5 py-1.5 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            {a.administration}
          </span>

          <h1 className="mt-5 max-w-lg text-4xl font-bold leading-tight xl:text-5xl">
            {a.titre}
          </h1>

          <div className="mt-5 h-1 w-14 rounded bg-white/60" />

          <p className="mt-5 max-w-lg text-lg text-white/85">{texteSousTitre}</p>

          <p className="mt-5 max-w-md border-s border-white/30 ps-4 text-sm leading-relaxed text-white/80">
            {a.plateforme}
          </p>

          <div className="mt-10 grid max-w-md grid-cols-3">
            {ETAPE_CLES.map(({ icon: Icon, cle }, index) => (
              <div key={cle} className="flex flex-col items-center">
                <div className="flex w-full items-center">
                  {index > 0 ? (
                    <div className="h-px flex-1 border-t border-dashed border-white/30" />
                  ) : (
                    <div className="flex-1" />
                  )}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/10">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  {index < ETAPE_CLES.length - 1 ? (
                    <div className="h-px flex-1 border-t border-dashed border-white/30" />
                  ) : (
                    <div className="flex-1" />
                  )}
                </div>
                <span className="mt-2.5 text-sm text-white/90">{a[cle]}</span>
              </div>
            ))}
          </div>
        </div>

        <footer className="relative z-10 border-t border-white/20 pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
              <Lock className="h-4 w-4" aria-hidden />
            </div>
            <p className="text-sm text-white/80">{a.accesSecurise}</p>
          </div>
        </footer>
      </aside>

      <div className="flex min-h-screen flex-col bg-page">
        <header className="flex items-center justify-between gap-3 px-6 pt-6">
          <div className="flex items-center gap-3 lg:invisible">
            <img src="/logoo.png" alt="" className="h-10 w-10 object-contain" width={40} height={40} />
            <p className="text-sm font-semibold text-institutional">{a.bandeauMobile}</p>
          </div>
          <LanguageSwitcher variante="claire" />
        </header>

        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  )
}

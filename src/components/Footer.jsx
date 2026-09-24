import { ExternalLink, Globe, Mail, ShieldCheck } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'
import { institution } from '../config/institution'
import LanguageSwitcher from './LanguageSwitcher'
import {
  IconeFacebook,
  IconeInstagram,
  IconeLinkedin,
  IconeX,
  IconeYoutube,
} from './icons/ReseauxSociaux'

const RESEAUX = [
  { id: 'facebook', nom: 'Facebook', Icone: IconeFacebook },
  { id: 'instagram', nom: 'Instagram', Icone: IconeInstagram },
  { id: 'x', nom: 'X', Icone: IconeX },
  { id: 'youtube', nom: 'YouTube', Icone: IconeYoutube },
  { id: 'linkedin', nom: 'LinkedIn', Icone: IconeLinkedin },
]

const classeLien =
  'inline-flex items-center gap-2 text-sm text-white/75 underline-offset-2 transition hover:text-white hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'

function LienExterne({ href, icon: Icon, children }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={classeLien}>
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span>{children}</span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 rtl:-scale-x-100" aria-hidden />
    </a>
  )
}

export default function Footer() {
  const { t, tf } = useLanguage()
  const annee = new Date().getFullYear()

  const extras = [
    institution.siteOfficiel && {
      href: institution.siteOfficiel,
      label: t.footer.siteOfficiel,
      icon: Globe,
    },
    institution.portailServices && {
      href: institution.portailServices,
      label: t.footer.portail,
      icon: Globe,
    },
    institution.email && {
      href: `mailto:${institution.email}`,
      label: t.footer.nousEcrire,
      icon: Mail,
      mailto: true,
    },
  ].filter(Boolean)

  const infos = [
    institution.adresse && { texte: institution.adresse },
    institution.telephone && { texte: institution.telephone, ltr: true },
  ].filter(Boolean)

  const reseaux = RESEAUX.filter((r) => institution.reseaux?.[r.id])

  return (
    <footer className="bg-institutional text-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white">
                <img src="/logoo.png" alt="" className="h-9 w-9 object-contain" width={36} height={36} />
              </div>
              <div className="leading-tight">
                <p className="text-base font-bold tracking-wide">{t.brand}</p>
                <p className="text-sm text-white/75">{t.footer.tagline}</p>
              </div>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/75">
              {t.footer.presentation}
            </p>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white">{t.footer.liensUtiles}</h2>
            {extras.length > 0 && (
              <ul className="mt-3 space-y-2">
                {extras.map((lien) => (
                  <li key={lien.href}>
                    {lien.mailto ? (
                      <a href={lien.href} className={classeLien}>
                        <lien.icon className="h-4 w-4 shrink-0" aria-hidden />
                        <span>{lien.label}</span>
                      </a>
                    ) : (
                      <LienExterne href={lien.href} icon={lien.icon}>
                        {lien.label}
                      </LienExterne>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white">{t.footer.informations}</h2>
            {infos.length > 0 && (
              <ul className="mt-3 space-y-2 text-sm text-white/75">
                {infos.map((info) => (
                  <li key={info.texte}>
                    <span className={info.ltr ? 'ltr-isolate' : undefined}>{info.texte}</span>
                  </li>
                ))}
              </ul>
            )}

            {reseaux.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-white">{t.footer.suivezNous}</h3>
                <ul
                  className="mt-3 flex flex-wrap justify-center gap-2 md:justify-start"
                  dir="ltr"
                >
                  {reseaux.map(({ id, nom, Icone }) => (
                    <li key={id}>
                      <a
                        href={institution.reseaux[id]}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={tf('footer.reseauAria', {
                          reseau: nom,
                          onglet: t.footer.nouvelOnglet,
                        })}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white hover:text-institutional focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                      >
                        <Icone className="h-4 w-4" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 flex justify-center md:justify-start">
              <LanguageSwitcher variante="sombre" compact />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/15">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 text-xs text-white/75 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-start">{tf('footer.copyright', { annee })}</p>
          <p className="inline-flex items-start gap-1.5 text-start sm:text-end">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{t.footer.privacy}</span>
          </p>
        </div>
      </div>
    </footer>
  )
}

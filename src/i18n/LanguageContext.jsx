import { createContext, useContext, useLayoutEffect, useMemo, useState } from 'react'
import { formatDate, formatDateHeure, formatNombre, formatRelatif } from './format'
import { CLE_LANGUE, LANGUES, LOCALES, translations } from './translations'

const LanguageContext = createContext(null)

function lireLangueEnregistree() {
  try {
    const enregistree = localStorage.getItem(CLE_LANGUE)
    if (LANGUES.includes(enregistree)) return enregistree
  } catch {
    // stockage indisponible
  }
  return null
}

function langueNavigateur() {
  const nav = (typeof navigator !== 'undefined' ? navigator.language : 'fr')
    .slice(0, 2)
    .toLowerCase()
  return LANGUES.includes(nav) ? nav : 'fr'
}

function langueInitiale() {
  return lireLangueEnregistree() || langueNavigateur()
}

function valeurAuChemin(objet, chemin) {
  return chemin.split('.').reduce((acc, cle) => (acc == null ? undefined : acc[cle]), objet)
}

function interpoler(texte, variables) {
  if (typeof texte !== 'string') return texte
  if (!variables) return texte
  return texte.replace(/\{(\w+)\}/g, (_, cle) =>
    variables[cle] == null ? `{${cle}}` : String(variables[cle]),
  )
}

function choisirPluriel(valeur, variables) {
  if (!valeur || typeof valeur !== 'object' || Array.isArray(valeur)) return valeur
  if (!('one' in valeur) && !('other' in valeur)) return valeur
  const n = Number(variables?.n ?? variables?.count ?? 1)
  return n === 1 ? (valeur.one ?? valeur.other) : (valeur.other ?? valeur.one)
}

function resoudre(lang, chemin, variables) {
  const brut = valeurAuChemin(translations[lang], chemin)
  if (brut !== undefined) return interpoler(choisirPluriel(brut, variables), variables)

  if (lang !== 'fr') {
    if (import.meta.env.DEV) {
      console.warn(`[i18n] clé absente « ${chemin} » pour « ${lang} », repli sur fr`)
    }
    const fr = valeurAuChemin(translations.fr, chemin)
    if (fr !== undefined) return interpoler(choisirPluriel(fr, variables), variables)
  }
  return chemin
}

function appliquerHtml(lang) {
  const root = document.documentElement
  root.lang = lang
  root.dir = lang === 'ar' ? 'rtl' : 'ltr'
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(langueInitiale)

  useLayoutEffect(() => {
    appliquerHtml(lang)
  }, [lang])

  const value = useMemo(() => {
    const setLang = (suivante) => {
      if (!LANGUES.includes(suivante) || suivante === lang) return
      setLangState(suivante)
      try {
        localStorage.setItem(CLE_LANGUE, suivante)
      } catch {
        // stockage indisponible
      }
    }

    const tf = (chemin, variables) => resoudre(lang, chemin, variables)

    return {
      lang,
      setLang,
      t: translations[lang] ?? translations.fr,
      tf,
      isRtl: lang === 'ar',
      locale: LOCALES[lang] ?? LOCALES.fr,
    }
  }, [lang])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFormat() {
  const { locale } = useLanguage()
  return useMemo(
    () => ({
      locale,
      formatDate: (iso) => formatDate(iso, locale),
      formatDateHeure: (iso) => formatDateHeure(iso, locale),
      formatNombre: (n) => formatNombre(n, locale),
      formatRelatif: (iso) => formatRelatif(iso, locale),
    }),
    [locale],
  )
}

import frPublic from './locales/fr/public.js'
import frCommun from './locales/fr/commun.js'
import frAdmin from './locales/fr/admin.js'
import enPublic from './locales/en/public.js'
import enCommun from './locales/en/commun.js'
import enAdmin from './locales/en/admin.js'
import arPublic from './locales/ar/public.js'
import arCommun from './locales/ar/commun.js'
import arAdmin from './locales/ar/admin.js'

function fusionner(a, b) {
  if (b === undefined) return a
  if (a === undefined) return b
  if (Array.isArray(a) || Array.isArray(b)) return b
  if (a && typeof a === 'object' && b && typeof b === 'object') {
    const out = { ...a }
    for (const cle of Object.keys(b)) {
      out[cle] = fusionner(a[cle], b[cle])
    }
    return out
  }
  return b
}

function assembler(public_, commun, admin) {
  return fusionner(fusionner(public_, commun), { admin })
}

export const translations = {
  fr: assembler(frPublic, frCommun, frAdmin),
  en: assembler(enPublic, enCommun, enAdmin),
  ar: assembler(arPublic, arCommun, arAdmin),
}

export const LANGUES = ['fr', 'en', 'ar']
export const LOCALES = { fr: 'fr-DZ', en: 'en-GB', ar: 'ar-DZ' }
export const CLE_LANGUE = 'itassel-lang'

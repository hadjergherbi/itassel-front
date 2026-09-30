/**
 * Traduction des libellés issus de la base (natures, qualités, services, statuts)
 * sans modifier le back. Clés = libellés français tels que renvoyés par l'API.
 * Valeur inconnue → renvoyée telle quelle.
 */
import { translations } from '../i18n/translations'

function normaliser(texte) {
  return String(texte ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function texteSource(valeur) {
  if (valeur == null || valeur === '') return ''
  if (typeof valeur === 'object') {
    return String(
      valeur.libelle ??
        valeur.nom_service ??
        valeur.nom ??
        valeur.label ??
        valeur.code ??
        '',
    ).trim()
  }
  return String(valeur).trim()
}

/**
 * @param {'statuts'|'natures'|'qualites'|'services'} type
 * @param {string|object} valeur — libellé FR ou objet API
 * @param {string} lang — 'fr' | 'en' | 'ar'
 */
export function libelleTraduit(type, valeur, lang = 'fr') {
  const source = texteSource(valeur)
  if (!source) return ''

  const table = translations[lang]?.referentiels?.[type]
  if (!table || typeof table !== 'object') return source

  if (table[source] != null) return table[source]

  const cible = normaliser(source)
  for (const [cleFr, traduit] of Object.entries(table)) {
    if (normaliser(cleFr) === cible) return traduit
  }

  return source
}

export function libelleNature(valeur, lang) {
  return libelleTraduit('natures', valeur, lang)
}

export function libelleQualite(valeur, lang) {
  return libelleTraduit('qualites', valeur, lang)
}

export function libelleService(valeur, lang) {
  return libelleTraduit('services', valeur, lang)
}

export function libelleStatutRef(valeur, lang) {
  return libelleTraduit('statuts', valeur, lang)
}

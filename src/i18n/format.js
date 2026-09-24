import { LOCALES } from './translations'

function localeAvecLatn(locale) {
  const base = locale || 'fr-DZ'
  return base.includes('-u-nu-') ? base : `${base}-u-nu-latn`
}

export function localeCourante(locale) {
  if (locale) return locale
  if (typeof document === 'undefined') return 'fr-DZ'
  const lang = document.documentElement.lang || 'fr'
  return LOCALES[lang] || 'fr-DZ'
}

function dateValide(iso) {
  if (!iso) return null
  const date = iso instanceof Date ? iso : new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(iso, locale) {
  const date = dateValide(iso)
  if (!date) return '—'
  return new Intl.DateTimeFormat(localeAvecLatn(localeCourante(locale)), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    numberingSystem: 'latn',
  }).format(date)
}

export function formatDateHeure(iso, locale) {
  const date = dateValide(iso)
  if (!date) return '—'
  const loc = localeCourante(locale)
  const jour = formatDate(date, loc)
  const heure = new Intl.DateTimeFormat(localeAvecLatn(loc), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    numberingSystem: 'latn',
  }).format(date)
  if (loc.startsWith('fr')) return `${jour} à ${heure}`
  if (loc.startsWith('ar')) return `${jour} ${heure}`
  return `${jour}, ${heure}`
}

export function formatNombre(n, locale) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return new Intl.NumberFormat(localeAvecLatn(localeCourante(locale)), {
    numberingSystem: 'latn',
  }).format(Number(n))
}

export function formatRelatif(iso, locale) {
  const date = dateValide(iso)
  if (!date) return '—'
  const loc = localeCourante(locale)
  const diffMs = Date.now() - date.getTime()
  const rtf = new Intl.RelativeTimeFormat(localeAvecLatn(loc), {
    numeric: 'auto',
    style: 'short',
  })
  const minutes = Math.round(Math.abs(diffMs) / 60000)
  const signe = diffMs >= 0 ? -1 : 1
  if (minutes < 1) return rtf.format(0, 'minute')
  if (minutes < 60) return rtf.format(signe * minutes, 'minute')
  const heures = Math.round(minutes / 60)
  if (heures < 24) return rtf.format(signe * heures, 'hour')
  const jours = Math.round(heures / 24)
  if (jours < 7) return rtf.format(signe * jours, 'day')
  return formatDate(date, loc)
}

import { translations } from '../src/i18n/translations.js'

function cles(objet, prefixe = '') {
  if (objet == null || typeof objet !== 'object') {
    return prefixe ? [prefixe] : []
  }
  if (Array.isArray(objet)) {
    return objet.flatMap((item, i) => cles(item, `${prefixe}[${i}]`))
  }
  return Object.keys(objet).flatMap((cle) =>
    cles(objet[cle], prefixe ? `${prefixe}.${cle}` : cle),
  )
}

const fr = new Set(cles(translations.fr))
const manquantes = { en: [], ar: [] }

for (const cle of fr) {
  if (!valeurExiste(translations.en, cle)) manquantes.en.push(cle)
  if (!valeurExiste(translations.ar, cle)) manquantes.ar.push(cle)
}

function valeurExiste(objet, chemin) {
  const parties = []
  chemin.replace(/([^[.\]]+)|\[(\d+)\]/g, (_, nom, idx) => {
    parties.push(idx !== undefined ? Number(idx) : nom)
    return ''
  })
  let cur = objet
  for (const p of parties) {
    if (cur == null || typeof cur !== 'object' || !(p in cur)) return false
    cur = cur[p]
  }
  return cur !== undefined
}

const total = manquantes.en.length + manquantes.ar.length
if (total === 0) {
  console.log(`i18n:check OK — ${fr.size} clés présentes en fr, en et ar.`)
  process.exit(0)
}

for (const lang of ['en', 'ar']) {
  if (manquantes[lang].length === 0) continue
  console.error(`\nClés présentes en fr absentes en ${lang} (${manquantes[lang].length}) :`)
  for (const cle of manquantes[lang]) console.error(`  - ${cle}`)
}

process.exit(1)

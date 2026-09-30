import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { translations } from '../src/i18n/translations.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.join(__dirname, '..', 'src')

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

function valeurAuChemin(objet, chemin) {
  const parties = []
  chemin.replace(/([^[.\]]+)|\[(\d+)\]/g, (_, nom, idx) => {
    parties.push(idx !== undefined ? Number(idx) : nom)
    return ''
  })
  let cur = objet
  for (const p of parties) {
    if (cur == null || typeof cur !== 'object' || !(p in cur)) return undefined
    cur = cur[p]
  }
  return cur
}

function valeurExiste(objet, chemin) {
  return valeurAuChemin(objet, chemin) !== undefined
}

/** Identiques FR/cible acceptés : marques, codes, termes invariables. */
const IDENTIQUES_OK = new Set([
  'ITASSEL',
  'Sport',
  'Suggestion',
  'association',
  'djalia',
  'PDF',
  'JPG',
  'PNG',
  'CSV',
  'OK',
  'Email',
  'email',
  'Wilaya',
  'wilaya',
  'Total',
  'Date',
  'Actions',
  'Action',
  'Export',
  'Format',
  'Logs',
  'Administration',
  'Confirmation',
  'Notifications',
  'Information',
  'Urgent',
  'Message',
  'Description',
  'Question',
  'Benali',
  'Yasmine',
  'Ctrl+Entrée',
  'Ctrl+Enter',
  '⌘+Enter',
  'Français',
  'English',
  'العربية',
  'ع',
])

/** Chemins techniques (placeholders, codes statut, valeurs machine). */
function cleTechnique(chemin) {
  return (
    /\.(value|placeholder|compteur|status|code|demoCode|demoHint|secondes|page|position|meta|metaOrigine|resumeLabel|raccourci|raccourciMac|nomPlaceholder|prenomPlaceholder|telephonePlaceholder)(\.|$)/i.test(
      chemin,
    ) ||
    /\.code\./i.test(chemin) ||
    /language\.(fr|en|ar)$/.test(chemin) ||
    /historyItems\[\d+\]\.status$/.test(chemin) ||
    /natures\[\d+\]\.(value|label)$/.test(chemin) ||
    /qualites\[\d+\]\.value$/.test(chemin) ||
    /domaines\[\d+\]\.value$/.test(chemin) ||
    /categories\.export$/.test(chemin)
  )
}

function estCodeOuMarque(texte) {
  const t = String(texte ?? '').trim()
  if (!t) return true
  if (IDENTIQUES_OK.has(t)) return true
  if (/^ITASSEL\b/i.test(t)) return true
  if (/^ITS-\d/i.test(t)) return true
  if (/^[A-Z0-9_./-]{1,16}$/.test(t)) return true
  if (/^\{[a-zA-Z0-9_]+\}(\s*\/\s*\{[a-zA-Z0-9_]+\})?$/.test(t)) return true
  // Compteurs du type "{n} / 18" ou "Page {n} / {total}"
  if (/^[\d\s./|{}\w-]+$/.test(t) && /\{[a-zA-Z_]+\}/.test(t)) return true
  // Emails / URLs d'exemple
  if (/@|\.dz\b|\.gov\b|https?:/i.test(t)) return true
  return false
}

function contientArabe(texte) {
  return /[\u0600-\u06FF]/.test(String(texte ?? ''))
}

/** Chaîne AR sans arabe acceptable (code, compteur, marque). */
function arLatinAcceptable(texte) {
  if (estCodeOuMarque(texte)) return true
  const sansVars = String(texte)
    .replace(/\{[^}]+\}/g, '')
    .replace(/[0-9\s.,;:!?/\\|@#\-–—()[\]'"%°●]+/g, '')
  return sansVars.length < 3
}

function walkFichiers(dir, acc = []) {
  for (const entree of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entree.name)
    if (entree.isDirectory()) {
      if (entree.name === 'locales' || entree.name === 'node_modules') continue
      walkFichiers(p, acc)
    } else if (/\.(jsx?|tsx?)$/.test(entree.name)) {
      acc.push(p)
    }
  }
  return acc
}

/** Extrait les clés littérales passées à tf('…') / t('…'). Ignore les templates dynamiques. */
function extraireAppelsTf(contenu) {
  const trouvees = []
  const re = /\b(?:tf|t)\(\s*(['"`])([^'"`]+)\1/g
  let m
  while ((m = re.exec(contenu))) {
    const cle = m[2]
    // Ignorer interpolations / chemins dynamiques (contiennent ${ ou se terminent par .)
    if (cle.includes('${') || cle.endsWith('.')) continue
    // Préfixe double suspect (commun.commun., admin.admin., …)
    trouvees.push(cle)
  }
  return trouvees
}

const frSet = new Set(cles(translations.fr))
const manquantes = { en: [], ar: [] }
const copiesFr = { en: [], ar: [] }
const arSansArabe = []

for (const cle of frSet) {
  if (!valeurExiste(translations.en, cle)) manquantes.en.push(cle)
  if (!valeurExiste(translations.ar, cle)) manquantes.ar.push(cle)

  const vFr = valeurAuChemin(translations.fr, cle)
  const vEn = valeurAuChemin(translations.en, cle)
  const vAr = valeurAuChemin(translations.ar, cle)

  if (typeof vFr !== 'string' || !vFr.trim()) continue
  if (cleTechnique(cle) || estCodeOuMarque(vFr)) continue

  if (typeof vEn === 'string' && vEn === vFr) {
    copiesFr.en.push(cle)
  }
  if (typeof vAr === 'string' && vAr === vFr) {
    copiesFr.ar.push(cle)
  }
  if (typeof vAr === 'string' && vAr.trim() && !contientArabe(vAr) && !arLatinAcceptable(vAr)) {
    arSansArabe.push(cle)
  }
}

let exitCode = 0

const totalManquantes = manquantes.en.length + manquantes.ar.length
if (totalManquantes === 0) {
  console.log(`i18n:check — ${frSet.size} clés présentes en fr, en et ar.`)
} else {
  exitCode = 1
  for (const lang of ['en', 'ar']) {
    if (manquantes[lang].length === 0) continue
    console.error(`\nClés présentes en fr absentes en ${lang} (${manquantes[lang].length}) :`)
    for (const cle of manquantes[lang]) console.error(`  - ${cle}`)
  }
}

for (const lang of ['en', 'ar']) {
  if (copiesFr[lang].length === 0) continue
  exitCode = 1
  console.error(
    `\nValeurs ${lang} identiques au français (${copiesFr[lang].length}) — traduisez ou marquez comme code/marque :`,
  )
  for (const cle of copiesFr[lang].slice(0, 80)) console.error(`  - ${cle}`)
  if (copiesFr[lang].length > 80) {
    console.error(`  … et ${copiesFr[lang].length - 80} autres`)
  }
}

if (arSansArabe.length) {
  exitCode = 1
  console.error(
    `\nValeurs ar sans caractère arabe (${arSansArabe.length}) — vérifiez la traduction :`,
  )
  for (const cle of arSansArabe.slice(0, 80)) console.error(`  - ${cle}`)
  if (arSansArabe.length > 80) {
    console.error(`  … et ${arSansArabe.length - 80} autres`)
  }
}

/* --- Appels tf()/t() dans le code vs clés fr --- */
const appelsAbsents = []
const prefixesDoubles = []
const PREFIXE_DOUBLE = /^(commun|admin|public|erreurs|referentiels)\.\1\./

for (const fichier of walkFichiers(SRC)) {
  const contenu = fs.readFileSync(fichier, 'utf8')
  const relatif = path.relative(path.join(__dirname, '..'), fichier).replace(/\\/g, '/')
  for (const cle of extraireAppelsTf(contenu)) {
    if (PREFIXE_DOUBLE.test(cle)) {
      prefixesDoubles.push(`${relatif} → ${cle}`)
    }
    // Clés dynamiques du type admin.parametres.usages.${code} déjà filtrées
    // Accepter les clés dont un parent objet/pluriel existe (ex. notes.personnesNotifiees)
    if (!valeurExiste(translations.fr, cle)) {
      appelsAbsents.push(`${relatif} → ${cle}`)
    }
  }
}

if (prefixesDoubles.length) {
  exitCode = 1
  console.error(
    `\nPréfixes de clé doublés (ex. commun.commun.*) (${prefixesDoubles.length}) :`,
  )
  for (const ligne of prefixesDoubles.slice(0, 80)) console.error(`  - ${ligne}`)
  if (prefixesDoubles.length > 80) {
    console.error(`  … et ${prefixesDoubles.length - 80} autres`)
  }
}

if (appelsAbsents.length) {
  exitCode = 1
  console.error(
    `\nAppels tf()/t() vers une clé absente de fr (${appelsAbsents.length}) :`,
  )
  for (const ligne of appelsAbsents.slice(0, 100)) console.error(`  - ${ligne}`)
  if (appelsAbsents.length > 100) {
    console.error(`  … et ${appelsAbsents.length - 100} autres`)
  }
}

if (exitCode === 0) {
  console.log(
    `i18n:check OK — ${frSet.size} clés ; pas de copie FR ni d'AR latin suspect ; appels tf() valides.`,
  )
}

process.exit(exitCode)

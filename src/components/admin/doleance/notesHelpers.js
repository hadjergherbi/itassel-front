import { nomComplet } from '../../../lib/statuts'

export const LIMITE_NOTE = 2000
export const SEUIL_ORANGE = 1800
export const MAX_MENTIONS = 5

export const ETIQUETTES = [
  { id: '', key: 'etiquetteAucune' },
  { id: 'information', key: 'etiquetteInformation' },
  { id: 'a_verifier', key: 'etiquetteVerifier' },
  { id: 'urgent', key: 'etiquetteUrgent' },
]

const ETIQUETTE_ALIAS = {
  information: 'information',
  info: 'information',
  a_verifier: 'a_verifier',
  'à vérifier': 'a_verifier',
  'a verifier': 'a_verifier',
  to_check: 'a_verifier',
  'to check': 'a_verifier',
  urgent: 'urgent',
}

export const ETIQUETTE_STYLE = {
  information: 'bg-gray-100 text-gray-700',
  a_verifier: 'bg-[#fff4e5] text-[#b45309]',
  urgent: 'bg-danger-bg text-danger-text',
}

export function etiquetteKey(valeur) {
  if (valeur == null || valeur === '') return ''
  return ETIQUETTE_ALIAS[String(valeur).trim().toLowerCase()] ?? ''
}

export function nomAuteur(auteur) {
  return nomComplet(auteur)
}

export function texteMention(personne) {
  const nom = [personne?.prenom, personne?.nom].filter(Boolean).join(' ').trim()
  return nom ? `@${nom}` : ''
}

export function dateNote(note) {
  return note?.created_at || note?.date_creation
}

export function minutesRestantes(iso, maintenant = Date.now()) {
  if (!iso) return 0
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return 0
  return Math.max(0, Math.ceil((t - maintenant) / 60000))
}

export function estModifiable(note, maintenant = Date.now()) {
  if (!note?.modifiable_jusqu_a) return false
  return Date.parse(note.modifiable_jusqu_a) > maintenant
}

export function mentionsConservees(texte, mentions = []) {
  return mentions.filter((m) => {
    const token = texteMention(m)
    return token && String(texte ?? '').includes(token)
  })
}

export function trouverDeclencheur(texte, curseur) {
  const avant = String(texte ?? '').slice(0, curseur)
  const match = avant.match(/(^|[\s\n])@([^\s@]*)$/)
  if (!match) return null
  return { debut: match.index + match[1].length, query: match[2] }
}

export function insererMention(texte, curseur, personne) {
  const source = String(texte ?? '')
  const token = `${texteMention(personne)} `
  const decl = trouverDeclencheur(source, curseur)
  if (!decl) {
    const avant = source.slice(0, curseur)
    const apres = source.slice(curseur)
    return { texte: `${avant}${token}${apres}`, curseur: avant.length + token.length }
  }
  const avant = source.slice(0, decl.debut)
  const apres = source.slice(curseur)
  return { texte: `${avant}${token}${apres}`, curseur: avant.length + token.length }
}

export function decouperContenu(contenu, mentions = []) {
  const texte = String(contenu ?? '')
  const motifs = mentions
    .map((m) => texteMention(m))
    .filter((token) => token.length > 1)
    .sort((a, b) => b.length - a.length)
  if (!texte || !motifs.length) return [{ type: 'text', value: texte }]

  const escaped = motifs.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const re = new RegExp(`(${escaped.join('|')})`, 'g')
  const parts = []
  let last = 0
  let match
  while ((match = re.exec(texte)) !== null) {
    if (match.index > last) parts.push({ type: 'text', value: texte.slice(last, match.index) })
    parts.push({ type: 'mention', value: match[0] })
    last = match.index + match[0].length
  }
  if (last < texte.length) parts.push({ type: 'text', value: texte.slice(last) })
  return parts.length ? parts : [{ type: 'text', value: texte }]
}

export function idsMentions(mentions = []) {
  return mentions.map((m) => m.id_utilisateur).filter((id) => id != null)
}

export function allerALaNote(idNote) {
  const hash = idNote == null ? '#notes-internes' : `#note-${idNote}`
  if (window.location.hash === hash) {
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    return
  }
  window.location.hash = hash
}

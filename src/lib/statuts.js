// Codes canoniques (minuscules) + alias métier / revue UX.
import {
  formatDate as formatDateI18n,
  formatDateHeure as formatDateHeureI18n,
  formatRelatif as formatRelatifI18n,
} from '../i18n/format'

const CODES = [
  'nouvelle',
  'en_cours',
  'information_demandee',
  'resolue',
  'reponse_apportee',
  'answered',
  'cloturee',
  'hors_competence',
  'non_retenue',
  'non_fondee',
  'double',
  'a_reclasser',
]

const ALIAS = {
  resolved: 'resolue',
  answered: 'answered',
  reponse_apportee: 'reponse_apportee',
  out_of_scope: 'hors_competence',
  hors_competence: 'hors_competence',
  cloturee: 'cloturee',
  unfounded: 'non_fondee',
  duplicate: 'double',
  newly_received: 'nouvelle',
  new: 'nouvelle',
  in_progress: 'en_cours',
  info_requested: 'information_demandee',
  info_requested_duplicate: 'information_demandee',
}

const STATUT_KEYS = {
  nouvelle: 'nouvelle',
  'en cours': 'en_cours',
  'en cours de traitement': 'en_cours',
  'information demandée': 'information_demandee',
  traitée: 'resolue',
  'réponse apportée': 'answered',
  clôturée: 'cloturee',
  'hors compétence': 'hors_competence',
  'non fondée': 'non_fondee',
  'double doléance': 'double',
  'à reclasser': 'a_reclasser',
}

export const STATUT_META = {
  nouvelle: { libelle: 'Nouvelle doléance', color: 'nouvelle', final: false },
  en_cours: { libelle: 'En cours', color: 'en_cours', final: false },
  information_demandee: { libelle: 'Information demandée', color: 'information_demandee', final: false },
  resolue: { libelle: 'Résolue', color: 'resolue', final: true },
  answered: { libelle: 'Réponse apportée', color: 'resolue', final: true },
  reponse_apportee: { libelle: 'Réponse apportée', color: 'resolue', final: true },
  cloturee: { libelle: 'Clôturée', color: 'hors_competence', final: true },
  non_retenue: { libelle: 'Non retenue', color: 'hors_competence', final: true },
  hors_competence: { libelle: 'Hors compétence', color: 'hors_competence', final: true },
  non_fondee: { libelle: 'Non fondée', color: 'non_fondee', final: true },
  double: { libelle: 'Double doléance', color: 'double', final: true },
  a_reclasser: { libelle: 'À reclasser', color: 'a_reclasser', final: false },
}

export const ISSUES = [
  {
    code: 'RESOLVED',
    alias: 'resolue',
    libelle: 'Résolu',
    definition: 'Problème résolu selon les règles métier.',
    natures: ['reclamation', 'signalement'],
    condition: 'Réponse de conclusion',
    message_citoyen: 'Une réponse est disponible.',
  },
  {
    code: 'ANSWERED',
    alias: 'answered',
    libelle: 'Réponse apportée',
    definition: "Demande d'information ou suggestion à laquelle le service a répondu.",
    natures: ['demande_information', 'suggestion'],
    condition: 'Réponse de conclusion',
    message_citoyen: 'Une réponse à votre demande est disponible.',
  },
  {
    code: 'OUT_OF_SCOPE',
    alias: 'hors_competence',
    libelle: 'Hors compétence',
    definition: "Demande relevant d'un autre organisme.",
    natures: null,
    condition: 'Justification, organisme à renseigner',
    message_citoyen: "Votre demande relève d'un autre organisme.",
  },
  {
    code: 'UNFOUNDED',
    alias: 'non_fondee',
    libelle: 'Non fondée',
    definition: "Réclamation non retenue après examen.",
    natures: ['reclamation'],
    condition: 'Justification',
    message_citoyen: "Votre réclamation n'a pas été retenue.",
  },
  {
    code: 'DUPLICATE',
    alias: 'double',
    libelle: 'Double doléance',
    definition: 'Dépôt déjà enregistré pour le même dossier.',
    natures: null,
    condition: 'Dossier initial',
    message_citoyen: 'Votre demande a déjà été enregistrée.',
  },
]

export const LEGACY_MAPPING = [
  { ancien: 'NEWLY_RECEIVED', propose: 'nouvelle', echangeable: true },
  { ancien: 'IN_PROGRESS', propose: 'en_cours', echangeable: true },
  { ancien: 'INFO_REQUESTED', propose: 'information_demandee', echangeable: true },
  { ancien: 'RESOLVED', propose: 'resolue', echangeable: false },
  { ancien: 'ANSWERED', propose: 'answered', echangeable: false },
  { ancien: 'OUT_OF_SCOPE', propose: 'hors_competence', echangeable: false },
  { ancien: 'UNFOUNDED', propose: 'non_fondee', echangeable: false },
  { ancien: 'DUPLICATE', propose: 'double', echangeable: false },
]

export function libelleStatut(statut, t) {
  const key = statutKey(statut)
  const table = t?.admin?.statuts ?? t?.statuts
  if (table?.[key]) return table[key]
  if (key === 'answered' && table?.reponse_apportee) return table.reponse_apportee
  if (typeof statut === 'object') return statut.libelle || statut.code || '—'
  return STATUT_META[key]?.libelle || (statut ? String(statut) : '—')
}

export function libelleEvenement(code, t, fallback) {
  const key = String(code ?? '').toLowerCase()
  return t?.admin?.evenements?.[key] || fallback || code || '—'
}

export function statutKey(statut) {
  if (statut == null || statut === '') return 'default'
  if (typeof statut === 'object') {
    const code = String(statut.code ?? '').trim().toLowerCase()
    if (code && CODES.includes(code)) return code
    if (ALIAS[code]) return ALIAS[code]
    const fromLibelle = STATUT_KEYS[String(statut.libelle ?? '').trim().toLowerCase()]
    if (fromLibelle) return fromLibelle
    return code || 'default'
  }
  const raw = String(statut).trim().toLowerCase()
  if (CODES.includes(raw)) return raw
  if (ALIAS[raw]) return ALIAS[raw]
  return STATUT_KEYS[raw] ?? 'default'
}

export function estIssueFinale(code) {
  const key = statutKey(code)
  return Boolean(STATUT_META[key]?.final)
}

export const STATUTS_FINAUX = ['resolue', 'answered', 'cloturee', 'hors_competence', 'non_fondee', 'double']

export const CODES_CONCLUSION = ['resolue', 'answered', 'hors_competence', 'cloturee', 'non_fondee', 'double']

const NATURE_CODES = {
  réclamation: 'reclamation',
  reclamation: 'reclamation',
  suggestion: 'suggestion',
  signalement: 'signalement',
  "demande d'information": 'demande_information',
  demande_information: 'demande_information',
}

export function natureCode(nature) {
  if (!nature) return ''
  if (typeof nature === 'object') {
    const code = String(nature.code ?? '').trim().toLowerCase()
    if (NATURE_CODES[code]) return NATURE_CODES[code]
    const fromLibelle = NATURE_CODES[String(nature.libelle ?? '').trim().toLowerCase()]
    return fromLibelle || code
  }
  return NATURE_CODES[String(nature).trim().toLowerCase()] || String(nature).toLowerCase()
}

export function issuesAutorisees(nature) {
  const n = natureCode(nature)
  return ISSUES.filter((i) => !i.natures || i.natures.includes(n))
}

export const COULEURS_STATUT = {
  nouvelle: { bar: 'bg-nouvelle', dot: 'bg-nouvelle' },
  en_cours: { bar: 'bg-en-cours', dot: 'bg-en-cours' },
  information_demandee: { bar: 'bg-info-demandee', dot: 'bg-info-demandee' },
  resolue: { bar: 'bg-resolue', dot: 'bg-resolue' },
  answered: { bar: 'bg-resolue', dot: 'bg-resolue' },
  cloturee: { bar: 'bg-hors-competence', dot: 'bg-hors-competence' },
  hors_competence: { bar: 'bg-hors-competence', dot: 'bg-hors-competence' },
  non_fondee: { bar: 'bg-non-fondee', dot: 'bg-non-fondee' },
  double: { bar: 'bg-double', dot: 'bg-double' },
  a_reclasser: { bar: 'bg-reclasser', dot: 'bg-reclasser' },
  default: { bar: 'bg-gray-400', dot: 'bg-gray-400' },
}

export function formatDate(iso, { withTime = true } = {}) {
  if (!iso) return '—'
  return withTime ? formatDateHeureI18n(iso) : formatDateI18n(iso)
}

export function formatDateNumeric(valeur) {
  return formatDateI18n(valeur)
}

export function formatDateHeure(iso) {
  return formatDateHeureI18n(iso)
}

export function formatRelatif(iso) {
  return formatRelatifI18n(iso)
}

export function isoDate(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function datesPourPeriode(code) {
  const fin = new Date()
  const debut = new Date()
  debut.setHours(0, 0, 0, 0)
  fin.setHours(0, 0, 0, 0)
  if (code === '30j') debut.setDate(debut.getDate() - 30)
  else if (code === '3m') debut.setMonth(debut.getMonth() - 3)
  else if (code === '6m') debut.setMonth(debut.getMonth() - 6)
  else if (code === 'annee') debut.setFullYear(debut.getFullYear() - 1)
  else debut.setMonth(debut.getMonth() - 6)
  return { date_debut: isoDate(debut), date_fin: isoDate(fin) }
}

export function periodeTropLongue(debut, fin) {
  const a = parseDate(debut)
  const b = parseDate(fin)
  if (!a || !b) return false
  const limite = new Date(a)
  limite.setMonth(limite.getMonth() + 12)
  return b > limite
}

export function nomService(utilisateur) {
  return utilisateur?.service?.nom ?? utilisateur?.service?.nom_service ?? ''
}

export function lignesDoleances(payload) {
  if (!payload) return []
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload.data)) return payload.data
  if (Array.isArray(payload.doleances?.data)) return payload.doleances.data
  if (Array.isArray(payload.doleances)) return payload.doleances
  return []
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function parseDate(iso) {
  if (!iso) return null
  if (iso instanceof Date) return Number.isNaN(iso.getTime()) ? null : iso
  const brute = String(iso)
  const date = brute.length === 10 ? new Date(`${brute}T00:00:00`) : new Date(brute)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatTaille(octets) {
  const n = Number(octets) || 0
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} Ko`
  return `${(n / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`
}

function normaliserLibelleRef(valeur) {
  return String(valeur ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function estToutesNatures(nature) {
  if (!nature || typeof nature !== 'object') return false
  if (nature.toutes_natures || nature.transversal || nature.est_transversal) return true
  const n = normaliserLibelleRef(nature.code ?? nature.slug ?? nature.libelle)
  return (
    n === 'toutes natures' ||
    n === 'toutes les natures' ||
    n === 'toutes_natures' ||
    n === 'all types' ||
    n === 'كل الانواع'
  )
}

export function estTousDomaines(service) {
  if (!service || typeof service !== 'object') return false
  if (service.tous_domaines || service.transversal || service.est_transversal) return true
  const n = normaliserLibelleRef(service.code ?? service.slug ?? service.nom_service ?? service.libelle)
  return (
    n === 'tous les domaines' ||
    n === 'tous domaines' ||
    n === 'tous_les_domaines' ||
    n === 'tous_domaines' ||
    n === 'all domains' ||
    n === 'كل المجالات'
  )
}

export function nomComplet(personne) {
  if (!personne) return '—'
  return [personne.prenom, personne.nom].filter(Boolean).join(' ') || '—'
}

export function initiales(personne) {
  if (!personne) return '?'
  const p = String(personne.prenom ?? '').trim().charAt(0)
  const n = String(personne.nom ?? '').trim().charAt(0)
  return ((p + n) || '?').toUpperCase()
}

export function message409(code, fallback) {
  const map = {
    demande_en_attente: 'Une demande de réaffectation est déjà en attente.',
    dossier_conclu: "Ce dossier est conclu : l'opération n'est plus possible.",
    utilisateur_affecte: 'Ce compte est encore responsable de dossiers ou d’un service.',
    deja_acceptee: 'Cette demande a déjà été acceptée.',
    deja_refusee: 'Cette demande a déjà été refusée.',
    deja_annulee: 'Cette demande a déjà été annulée.',
    sans_suite: 'Cette demande a été classée sans suite.',
    etat_invalide: "L'état actuel ne permet pas cette action.",
    complement_deja_repondu: 'Le citoyen a déjà répondu à cette demande.',
    complement_deja_annule: 'Cette demande de complément a déjà été annulée.',
    dossier_reaffecte: 'Ce dossier a été réaffecté à un autre service.',
    deja_transmis: 'Cet email a déjà été transmis.',
    dernier_super_admin: 'Impossible : c\'est le dernier Super administrateur actif.',
    utilisateur_utilise: 'Ce compte a déjà été utilisé : désactivez-le plutôt que de le supprimer.',
    dossiers_en_cours: 'Ce compte est responsable de dossiers en cours dans son service.',
    parametre_utilise: 'Cette valeur est utilisée par des doléances : elle ne peut pas être supprimée.',
  }
  return map[code] || fallback
}

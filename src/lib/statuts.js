// Codes canoniques (minuscules) + alias métier / revue UX.
const CODES = [
  'nouvelle',
  'en_cours',
  'information_demandee',
  'resolue',
  'answered',
  'cloturee',
  'hors_competence',
  'non_fondee',
  'double',
  'a_reclasser',
]

const ALIAS = {
  resolved: 'resolue',
  answered: 'answered',
  reponse_apportee: 'answered',
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
  cloturee: { libelle: 'Clôturée', color: 'hors_competence', final: true },
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

export function formatDate(iso, { withTime = true } = {}) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
  })
    .format(date)
    .replace(/\u202f/g, ' ')
}

export function formatTaille(octets) {
  const n = Number(octets) || 0
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} Ko`
  return `${(n / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`
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

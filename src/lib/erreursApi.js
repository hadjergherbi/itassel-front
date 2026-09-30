/**
 * Traduit les messages d'erreur français renvoyés par le back
 * par correspondance exacte. Inconnu → message serveur inchangé.
 */
import { translations } from '../i18n/translations'

/** Message FR exact → chemin de clé i18n (sous erreurs.*) */
const CARTE_MESSAGES = {
  "L'opération a échoué. Réessayez.": 'operationEchouee',
  'Connexion au serveur impossible. Vérifiez votre connexion.': 'connexionImpossible',
  'Trop de tentatives. Réessayez dans une minute.': 'tropTentatives',
  "Votre demande n'a pas pu être envoyée. Rechargez la page et réessayez.": 'depotEchec',
  "L'envoi a échoué. Vérifiez votre connexion et réessayez.": 'envoiEchec',
  'Impossible de charger le dossier.': 'chargementDossier',
  "Ce dossier n'existe pas, ou vous n'y avez pas accès.": 'dossierIntrouvable',
  'Identifiants incorrects.': 'identifiantsIncorrects',
  'Email ou mot de passe incorrect.': 'identifiantsIncorrects',
  'Session expirée. Veuillez vous reconnecter.': 'sessionExpiree',
  'Accès non autorisé.': 'accesRefuse',
  'Statut changé.': 'statutChange',
  'Complément marqué comme examiné.': 'complementExamine',
  "Ce complément n'est plus en attente d'examen.": 'complementPlusEnAttente',
  'Impossible de marquer ce complément comme examiné.': 'complementExamineImpossible',
  'Une demande de réaffectation est déjà en attente.': 'reaffectationEnAttente',
  "Ce dossier est conclu : l'opération n'est plus possible.": 'dossierConclu',
  'Écrivez la question à poser au demandeur.': 'questionObligatoire',
  'Précisez la pièce attendue.': 'pieceAttendue',
  'Rédigez la réponse de conclusion.': 'reponseConclusion',
  'Mot de passe mis à jour.': 'mdpMisAJour',
  'Le code est invalide ou a expiré.': 'codeInvalide',
  'Référence invalide.': 'referenceInvalide',
}

function valeurAuChemin(objet, chemin) {
  return chemin.split('.').reduce((acc, cle) => (acc == null ? undefined : acc[cle]), objet)
}

/**
 * @param {string|undefined|null} message — message brut du serveur
 * @param {string} lang
 * @param {string} [fallback]
 */
export function traduireMessageApi(message, lang = 'fr', fallback) {
  const brut = message == null ? '' : String(message).trim()
  if (!brut) {
    const fb = fallback || valeurAuChemin(translations[lang], 'erreurs.operationEchouee')
    return fb || fallback || brut
  }

  const cle = CARTE_MESSAGES[brut]
  if (cle) {
    const traduit = valeurAuChemin(translations[lang], `erreurs.${cle}`)
    if (traduit) return traduit
    const fr = valeurAuChemin(translations.fr, `erreurs.${cle}`)
    if (fr) return fr
  }

  return brut
}

/**
 * Traduit un objet errors Laravel { champ: [msg] | msg }.
 */
export function traduireChampsApi(errors, lang = 'fr') {
  if (!errors || typeof errors !== 'object') return {}
  const out = {}
  for (const [champ, messages] of Object.entries(errors)) {
    const premier = Array.isArray(messages) ? messages[0] : messages
    out[champ] = traduireMessageApi(premier, lang, premier)
  }
  return out
}

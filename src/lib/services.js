import { libelleService } from './libelles'

/**
 * Services rattachés à un utilisateur.
 * `services` (nouveau contrat) prime ; sinon repli sur l'ancien objet `service`.
 */
export function servicesDe(utilisateur) {
  if (!utilisateur || typeof utilisateur !== 'object') return []
  if (Array.isArray(utilisateur.services)) {
    return utilisateur.services.filter((s) => s && s.id_service != null)
  }
  const unique = utilisateur.service
  if (unique && typeof unique === 'object' && unique.id_service != null) {
    return [{ ...unique, principal: true }]
  }
  if (typeof unique === 'string' && unique.trim()) {
    return [{ nom_service: unique.trim(), principal: true }]
  }
  return []
}

export function servicePrincipal(utilisateur) {
  const liste = servicesDe(utilisateur)
  return liste.find((s) => s.principal) ?? liste[0] ?? null
}

/** Principal d'abord, puis les autres dans l'ordre reçu. */
export function servicesOrdonnes(utilisateur) {
  const liste = servicesDe(utilisateur)
  const principal = servicePrincipal(utilisateur)
  const idPrincipal = principal?.id_service
  return [
    ...(principal ? [principal] : []),
    ...liste.filter((s) => s.id_service !== idPrincipal),
  ]
}

/** Noms traduits, service principal en premier. */
export function nomsServices(utilisateur, lang) {
  return servicesOrdonnes(utilisateur)
    .map((s) => libelleService(s, lang))
    .filter(Boolean)
}

/** Ex. « Sport, Jeunesse +1 » lorsque la liste dépasse `max`. */
export function libelleServices(utilisateur, lang, max = 2) {
  const noms = nomsServices(utilisateur, lang)
  if (!noms.length) return ''
  if (noms.length <= max) return noms.join(', ')
  return `${noms.slice(0, max).join(', ')} +${noms.length - max}`
}

/**
 * Liste journalisée (objets service, noms ou identifiants) en libellés traduits,
 * service principal en premier.
 */
export function formaterListeServices(liste, lang) {
  if (!Array.isArray(liste) || !liste.length) return ''
  const services = liste
    .map((service, index) => {
      if (typeof service === 'string' && service.trim()) {
        return { id_service: `nom-${index}`, nom_service: service.trim() }
      }
      if (typeof service === 'number') {
        return { id_service: service, nom_service: String(service) }
      }
      if (service && typeof service === 'object') {
        return service.id_service != null ? service : { ...service, id_service: `nom-${index}` }
      }
      return null
    })
    .filter((service) => service && (service.nom_service || service.nom || service.id_service != null))
  return libelleServices({ services }, lang, services.length || 1)
}

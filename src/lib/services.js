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
  return []
}

export function servicePrincipal(utilisateur) {
  const liste = servicesDe(utilisateur)
  return liste.find((s) => s.principal) ?? liste[0] ?? null
}

/** Noms traduits, service principal en premier. */
export function nomsServices(utilisateur, lang) {
  const liste = servicesDe(utilisateur)
  const principal = servicePrincipal(utilisateur)
  const idPrincipal = principal?.id_service
  const ordonnes = [
    ...(principal ? [principal] : []),
    ...liste.filter((s) => s.id_service !== idPrincipal),
  ]
  return ordonnes.map((s) => libelleService(s, lang)).filter(Boolean)
}

/** Ex. « Sport, Jeunesse +1 » lorsque la liste dépasse `max`. */
export function libelleServices(utilisateur, lang, max = 2) {
  const noms = nomsServices(utilisateur, lang)
  if (!noms.length) return ''
  if (noms.length <= max) return noms.join(', ')
  return `${noms.slice(0, max).join(', ')} +${noms.length - max}`
}

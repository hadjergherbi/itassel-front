import adminApi from './adminApi'
import { endpoints } from './endpoints'

/** @type {null | Promise<ModeleNormalise[]>} */
let enCours = null
/** @type {null | ModeleNormalise[]} */
let cache = null

/**
 * @typedef {{ id: string|number, titre: string, contenu: string, type_usage: string }} ModeleNormalise
 */

function listeDepuis(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.modeles)) return payload.modeles
  return []
}

/** Normalise les formes API possibles vers un objet stable. */
export function normaliserModele(brut) {
  if (!brut || typeof brut !== 'object') return null
  const id = brut.id_modele ?? brut.id ?? brut.id_message
  const titre = String(brut.titre ?? brut.libelle ?? '').trim()
  const contenu = String(brut.contenu ?? brut.corps ?? brut.message ?? '')
  const type_usage = String(brut.type_usage ?? brut.usage ?? brut.code_usage ?? '').trim()
  if (id == null || !titre) return null
  return { id, titre, contenu, type_usage }
}

export function filtrerModelesParUsages(modeles, usages) {
  const autorises = new Set((usages ?? []).map(String))
  return (modeles ?? []).filter((m) => autorises.has(m.type_usage))
}

/**
 * Charge la liste une seule fois (cache module). Relance avec { force: true }.
 * Essaie /admin/messages-predefinis puis /admin/parametres/modeles-message puis /admin/modeles-message.
 */
export async function chargerMessagesPredefinis({ force = false } = {}) {
  if (!force && cache) return cache
  if (!force && enCours) return enCours

  enCours = (async () => {
    const essais = [
      () => endpoints.messagesPredefinis(),
      () => endpoints.referentiel('modeles-message'),
      () => adminApi.get('/admin/modeles-message'),
    ]
    let dernierErreur = null
    for (const essai of essais) {
      try {
        const res = await essai()
        const normalises = listeDepuis(res.data)
          .map(normaliserModele)
          .filter(Boolean)
        cache = normalises
        return cache
      } catch (err) {
        dernierErreur = err
      }
    }
    throw dernierErreur ?? new Error('modeles_indisponibles')
  })()

  try {
    return await enCours
  } finally {
    enCours = null
  }
}

export function invaliderCacheMessagesPredefinis() {
  cache = null
  enCours = null
}

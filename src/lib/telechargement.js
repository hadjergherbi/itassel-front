import { nomDepuisDisposition } from './adminApi'

/** Nom de fichier lu dans Content-Disposition, sinon le repli fourni. */
export function nomFichierReponse(headers, fallback) {
  const brut = headers?.['content-disposition'] ?? headers?.get?.('content-disposition')
  return nomDepuisDisposition(brut, fallback)
}

/**
 * Déclenche le téléchargement d'un Blob via un lien temporaire.
 * Révoque l'URL objet après le clic.
 */
export function telechargerBlob(blob, nom) {
  const url = URL.createObjectURL(blob)
  const lien = document.createElement('a')
  lien.href = url
  lien.download = nom
  document.body.appendChild(lien)
  lien.click()
  lien.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return nom
}

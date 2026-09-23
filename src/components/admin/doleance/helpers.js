import adminApi from '../../../lib/adminApi'

export function emailSuffix(emailEnvoye) {
  if (emailEnvoye === true) return ' Le demandeur a été prévenu par email.'
  if (emailEnvoye === false) return " Attention : l'email n'a pas pu être envoyé."
  return ''
}

export async function telecharger(piece, onError) {
  try {
    const res = await adminApi.get(`/admin/pieces-jointes/${piece.id_piece}/telecharger`, {
      responseType: 'blob',
    })
    const url = URL.createObjectURL(res.data)
    const lien = document.createElement('a')
    lien.href = url
    lien.download = piece.nom_fichier
    document.body.appendChild(lien)
    lien.click()
    lien.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (err) {
    onError(
      err.response?.status === 404
        ? 'Fichier introuvable sur le serveur.'
        : 'Le téléchargement a échoué.',
    )
  }
}

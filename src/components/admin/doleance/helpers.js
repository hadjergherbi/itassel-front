import adminApi, { extractBlobErrors } from '../../../lib/adminApi'

export function emailSuffix(emailEnvoye) {
  if (emailEnvoye === true) return ' Le demandeur a été prévenu par email.'
  if (emailEnvoye === false) return " Attention : l'email n'a pas pu être envoyé."
  return ''
}

export function typePiece(piece) {
  const brut = String(piece?.type ?? '').toLowerCase().replace(/^\./, '')
  if (brut === 'jpeg') return 'jpg'
  return brut
}

export function estImage(piece) {
  const t = typePiece(piece)
  return t === 'jpg' || t === 'png'
}

export function estPdf(piece) {
  return typePiece(piece) === 'pdf'
}

export function estPrevisualisable(piece) {
  return estImage(piece) || estPdf(piece)
}

export function mimeDepuisType(piece) {
  const t = typePiece(piece)
  if (t === 'pdf') return 'application/pdf'
  if (t === 'jpg') return 'image/jpeg'
  if (t === 'png') return 'image/png'
  return ''
}

export function typeAffiche(piece) {
  return typePiece(piece).toUpperCase() || '—'
}

export function tronquerNomFichier(nom, max = 40) {
  const s = String(nom ?? '')
  if (s.length <= max) return s
  const extMatch = s.match(/(\.[A-Za-z0-9]{1,8})$/)
  const ext = extMatch ? extMatch[1] : ''
  const base = ext ? s.slice(0, -ext.length) : s
  const suffixe = Math.min(10, Math.max(4, Math.floor((max - ext.length - 1) / 3)))
  const prefixe = max - ext.length - suffixe - 1
  if (prefixe < 4) return `${s.slice(0, Math.max(1, max - 1))}…`
  return `${base.slice(0, prefixe)}…${base.slice(-suffixe)}${ext}`
}

export function rassemblerPieces(dossier) {
  const vus = new Map()
  for (const p of dossier?.pieces_jointes ?? []) {
    if (p?.id_piece != null) vus.set(p.id_piece, p)
  }
  for (const c of dossier?.complements ?? []) {
    for (const p of c?.pieces_jointes ?? []) {
      if (p?.id_piece != null) vus.set(p.id_piece, p)
    }
  }
  return [...vus.values()]
}

export async function telecharger(piece, onError, messages = {}) {
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
    const { message } = await extractBlobErrors(
      err,
      err.response?.status === 404
        ? (messages.introuvable ?? 'Fichier introuvable sur le serveur.')
        : (messages.echec ?? 'Le téléchargement a échoué.'),
    )
    onError?.(message)
  }
}

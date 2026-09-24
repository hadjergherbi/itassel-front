import { useCallback, useState } from 'react'
import VisionneusePieceJointe from './VisionneusePieceJointe'

export default function useVisionneuse(pieces = []) {
  const [index, setIndex] = useState(null)
  const [declencheur, setDeclencheur] = useState(null)

  const ouvrir = useCallback(
    (cible, el) => {
      const i =
        typeof cible === 'number'
          ? cible
          : pieces.findIndex((p) => p.id_piece === cible?.id_piece)
      if (i < 0 || !pieces[i]) return
      setDeclencheur(el ?? document.activeElement)
      setIndex(i)
    },
    [pieces],
  )

  const fermer = useCallback(() => {
    setIndex(null)
    const el = declencheur
    setDeclencheur(null)
    requestAnimationFrame(() => el?.focus?.())
  }, [declencheur])

  const visionneuse =
    index != null && pieces[index] ? (
      <VisionneusePieceJointe pieces={pieces} index={index} onIndex={setIndex} onClose={fermer} />
    ) : null

  return { ouvrir, visionneuse }
}

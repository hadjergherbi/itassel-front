import { formatTaille } from '../../../lib/statuts'
import { useLanguage } from '../../../i18n/LanguageContext'
import { Card, PieceLigne } from './shared'
import useVisionneuse from './useVisionneuse'

export default function PiecesJointes({ pieces, onError, onOuvrir }) {
  const { tf } = useLanguage()
  const interne = useVisionneuse(pieces ?? [])
  if (!pieces?.length) return null

  const ouvrir = onOuvrir ?? interne.ouvrir

  return (
    <Card title={tf('admin.piecesJointes.titre')}>
      <ul className="divide-y divide-gray-100">
        {pieces.map((p) => {
          const origine =
            String(p.origine ?? '').toUpperCase() === 'COMPLEMENT'
              ? tf('admin.piecesJointes.reponseComplement')
              : tf('admin.piecesJointes.depotInitial')
          return (
            <PieceLigne
              key={p.id_piece}
              piece={p}
              onError={onError}
              onOuvrir={ouvrir}
              meta={tf('admin.piecesJointes.metaOrigine', {
                origine,
                type: String(p.type ?? '').toUpperCase(),
                taille: formatTaille(p.taille),
              })}
            />
          )
        })}
      </ul>
      {!onOuvrir && interne.visionneuse}
    </Card>
  )
}

import { formatTaille } from '../../../lib/statuts'
import { Card } from './shared'
import { telecharger } from './helpers'
import { Download, Paperclip } from 'lucide-react'

export default function PiecesJointes({ pieces, onError }) {
  if (!pieces?.length) return null
  return (
    <Card title="Pièces jointes">
      <ul className="divide-y divide-gray-100">
        {pieces.map((p) => (
          <li key={p.id_piece} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <Paperclip className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{p.nom_fichier}</p>
                <p className="text-xs text-gray-500">
                  {p.origine === 'COMPLEMENT' ? 'Réponse à un complément' : 'Dépôt initial'} ·{' '}
                  {String(p.type).toUpperCase()} · {formatTaille(p.taille)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => telecharger(p, onError)}
              className="inline-flex items-center gap-1.5 rounded-[8px] border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-institutional hover:text-institutional"
            >
              <Download className="h-3.5 w-3.5" aria-hidden /> Télécharger
            </button>
          </li>
        ))}
      </ul>
    </Card>
  )
}

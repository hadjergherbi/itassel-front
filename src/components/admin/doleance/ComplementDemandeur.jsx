import { Eye } from 'lucide-react'
import StatusBadge from '../../StatusBadge'
import { formatDate } from '../../../lib/statuts'
import { Card, PieceLigne } from './shared'

export default function ComplementDemandeur({ complement, consulte, onConsulter, onError, onOuvrir }) {
  const pieces = complement.pieces_jointes ?? []

  return (
    <Card
      id="complement-demandeur"
      title="Complément du demandeur"
      badge={<StatusBadge status="en_cours" label="Complément reçu" showDot />}
    >
      <div className="mb-4">
        <p className="mb-1 text-xs text-gray-500">En réponse à</p>
        <p className="text-sm italic text-gray-800">« {complement.question} »</p>
      </div>

      {complement.piece_exigee && (
        <div className="mb-4">
          <p className="mb-1 text-xs text-gray-500">Pièce attendue</p>
          <p className="text-sm text-gray-800">{complement.description_piece || '—'}</p>
        </div>
      )}

      {!consulte ? (
        <div className="rounded-[8px] border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center">
          <p className="mb-4 text-sm text-gray-600">
            La réponse et les pièces du demandeur restent masquées jusqu&apos;à consultation.
          </p>
          <button
            type="button"
            onClick={onConsulter}
            className="inline-flex items-center gap-2 rounded-[8px] bg-institutional px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#005a35]"
          >
            <Eye className="h-4 w-4" aria-hidden />
            Consulter le complément
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-[8px] border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="mb-1 text-xs text-gray-500">
              Réponse du demandeur — {formatDate(complement.date_reponse)}
            </p>
            <p className="whitespace-pre-line text-sm text-gray-800">{complement.reponse || '—'}</p>
          </div>
          {pieces.length > 0 && (
            <ul className="divide-y divide-gray-100 rounded-[8px] border border-gray-200">
              {pieces.map((p) => (
                <PieceLigne key={p.id_piece} piece={p} onError={onError} onOuvrir={onOuvrir} />
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  )
}

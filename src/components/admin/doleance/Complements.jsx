import StatusBadge from '../../StatusBadge'
import { formatDate, nomComplet } from '../../../lib/statuts'
import { Card, PieceLigne } from './shared'

const ETAT_COMPLEMENT = {
  en_attente: { label: 'En attente', key: 'information_demandee' },
  recu: { label: 'Réponse reçue', key: 'en_cours' },
  examine: { label: 'Examiné', key: 'resolue' },
  annule: { label: 'Annulé', key: 'cloturee' },
}

export default function Complements({ complements, onError, onOuvrir }) {
  if (!complements?.length) return null
  return (
    <Card title="Compléments d'information">
      <ul className="space-y-4">
        {complements.map((c) => {
          const etat = ETAT_COMPLEMENT[c.etat] ?? { label: c.etat, key: 'default' }
          const annulePar = c.annule_par ?? c.auteur
          return (
            <li key={c.id_complement} className="rounded-[8px] border border-gray-200 p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-gray-500">
                  {c.etat === 'annule' ? (
                    <>
                      Annulée par {nomComplet(annulePar)} le{' '}
                      <span className="font-mono">{formatDate(c.date_annulation ?? c.date_demande)}</span>
                    </>
                  ) : (
                    <>
                      Demandé par {nomComplet(c.auteur)} le {formatDate(c.date_demande)}
                    </>
                  )}
                </p>
                <StatusBadge status={etat.key} label={etat.label} />
              </div>
              <p className="mb-2 text-sm italic text-gray-800">« {c.question} »</p>
              {c.piece_exigee && (
                <p className="mb-2 text-xs text-gray-600">Pièce exigée : {c.description_piece}</p>
              )}
              {c.reponse && (
                <div className="mt-3 rounded-[8px] bg-gray-50 px-3 py-2.5">
                  <p className="mb-1 text-xs text-gray-500">
                    Réponse du demandeur — {formatDate(c.date_reponse)}
                  </p>
                  <p className="whitespace-pre-line text-sm text-gray-800">{c.reponse}</p>
                </div>
              )}
              {(c.pieces_jointes ?? []).length > 0 && (
                <ul className="mt-3 divide-y divide-gray-100 rounded-[8px] border border-gray-200">
                  {c.pieces_jointes.map((p) => (
                    <PieceLigne key={p.id_piece} piece={p} onError={onError} onOuvrir={onOuvrir} />
                  ))}
                </ul>
              )}
              {c.etat === 'annule' && c.motif_annulation && (
                <p className="mt-2 text-sm text-gray-700">
                  <StatusBadge status="cloturee" label="Interne" />{' '}
                  <span className="italic">« {c.motif_annulation} »</span>
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

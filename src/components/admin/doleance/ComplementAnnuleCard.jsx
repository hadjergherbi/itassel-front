import { X } from 'lucide-react'
import { formatDate, nomComplet } from '../../../lib/statuts'
import Button from '../../ui/Button'
import StatusBadge from '../../StatusBadge'

export default function ComplementAnnuleCard({ complement, onDemanderInfos }) {
  if (!complement || complement.etat !== 'annule') return null

  return (
    <section className="rounded-[8px] border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <X className="h-4 w-4 text-gray-500" aria-hidden />
          <h2 className="text-base font-bold text-gray-900">Demande de complément annulée</h2>
        </div>
        <StatusBadge status="information_demandee" label="Visible du demandeur" />
      </div>
      <p className="mb-3 text-sm italic text-gray-800">
        « {complement.question} » — annulée par {nomComplet(complement.annule_par ?? complement.auteur)} le{' '}
        {formatDate(complement.date_annulation ?? complement.updated_at)}
      </p>
      {complement.motif_annulation && (
        <p className="mb-4 text-sm text-gray-700">
          <StatusBadge status="cloturee" label="Interne" />{' '}
          <span className="ms-1">Motif : {complement.motif_annulation}</span>
          <span className="text-gray-500"> (le motif n&apos;est pas montré)</span>
        </p>
      )}
      <Button variant="secondary" onClick={onDemanderInfos}>
        Demander des informations
      </Button>
    </section>
  )
}

import { X } from 'lucide-react'
import { formatDate, nomComplet } from '../../../lib/statuts'
import Button from '../../ui/Button'
import StatusBadge from '../../StatusBadge'
import { useLanguage } from '../../../i18n/LanguageContext'

export default function ComplementAnnuleCard({ complement, onDemanderInfos }) {
  const { tf } = useLanguage()
  if (!complement || complement.etat !== 'annule') return null

  return (
    <section className="rounded-[8px] border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <X className="h-4 w-4 text-gray-500" aria-hidden />
          <h2 className="text-base font-bold text-gray-900">{tf('admin.complementAnnule.titre')}</h2>
        </div>
        <StatusBadge status="information_demandee" label={tf('admin.complementAnnule.visibleDemandeur')} />
      </div>
      <p className="mb-3 text-sm italic text-gray-800">
        {tf('admin.complementAnnule.annuleePar', {
          question: complement.question,
          nom: nomComplet(complement.annule_par ?? complement.auteur),
          date: formatDate(complement.date_annulation ?? complement.updated_at),
        })}
      </p>
      {complement.motif_annulation && (
        <p className="mb-4 text-sm text-gray-700">
          <StatusBadge status="cloturee" label={tf('admin.complementAnnule.motifInterne')} />{' '}
          <span className="ms-1">
            {tf('admin.complementAnnule.motifLabel', { motif: complement.motif_annulation })}
          </span>
          <span className="text-gray-500"> {tf('admin.complementAnnule.motifNonMontre')}</span>
        </p>
      )}
      <Button variant="secondary" onClick={onDemanderInfos}>
        {tf('admin.complementAnnule.demanderInfos')}
      </Button>
    </section>
  )
}

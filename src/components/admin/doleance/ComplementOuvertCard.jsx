import { Info } from 'lucide-react'
import { nomComplet } from '../../../lib/statuts'
import { useLanguage } from '../../../i18n/LanguageContext'

function formatOuverture(iso, locale) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const jour = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
  const heure = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace(/\u202f/g, ' ')
  return `${jour} · ${heure}`
}

export default function ComplementOuvertCard({ complement, onAnnuler }) {
  const { tf, locale } = useLanguage()
  if (!complement || complement.etat !== 'en_attente') return null

  return (
    <section className="rounded-[8px] border border-[#c4b5fd] bg-[#f5f3ff] p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Info className="h-4 w-4 shrink-0 text-[#6b21a8]" aria-hidden />
          <h2 className="text-base font-bold text-gray-900">{tf('admin.complementOuvert.titre')}</h2>
          <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-medium text-gray-600">
            {tf('admin.complementOuvert.visibleDemandeur')}
          </span>
        </div>
        <p className="font-mono text-xs text-gray-500">
          {tf('admin.complementOuvert.ouvertLe', {
            date: formatOuverture(complement.date_demande, locale),
          })}
          {complement.auteur
            ? ` ${tf('admin.complementOuvert.ouvertPar', { nom: nomComplet(complement.auteur) })}`
            : ''}
        </p>
      </div>

      <p className="mb-3 text-sm italic text-gray-800">« {complement.question} »</p>

      {complement.piece_exigee && (
        <p className="mb-3 text-sm text-gray-700">
          {tf('admin.complementOuvert.pieceAttendue')}{' '}
          <span className="font-semibold">
            {complement.description_piece || tf('admin.complementOuvert.fichier')}
          </span>{' '}
          {tf('admin.complementOuvert.fichierExige')}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">{tf('admin.complementOuvert.enAttente')}</p>
        <button
          type="button"
          onClick={onAnnuler}
          className="inline-flex items-center justify-center rounded-[8px] border border-institutional bg-white px-4 py-2 text-sm font-medium text-institutional transition hover:bg-[#e6f6ed]"
        >
          {tf('admin.complementOuvert.annulerDemande')}
        </button>
      </div>
    </section>
  )
}

import { useLanguage } from '../i18n/LanguageContext'
import { libelleStatut } from '../lib/statuts'

// Couleurs des 7 statuts (cahier de refonte UX, §3) :
// Nouvelle = bleu, En cours = orange, Information demandée = violet,
// Traitée = vert, Clôturée = gris, Non fondée = rouge, Double doléance = turquoise.
const variants = {
  nouvelle: 'bg-[#e8f1fb] text-[#1a5f9e]',
  en_cours: 'bg-[#fff4e5] text-[#8a5a00]',
  information_demandee: 'bg-[#f3e8ff] text-[#6b21a8]',
  resolue: 'bg-[#e6f6ed] text-institutional',
  deposee: 'bg-[#e6f6ed] text-institutional',
  cloturee: 'bg-gray-100 text-gray-700',
  hors_competence: 'bg-gray-100 text-gray-700',
  answered: 'bg-[#e6f6ed] text-institutional',
  reponse_apportee: 'bg-[#e6f6ed] text-institutional',
  non_retenue: 'bg-gray-100 text-gray-700',
  non_fondee: 'bg-[#fde8e8] text-[#b42318]',
  refusee: 'bg-[#fde8e8] text-[#b42318]',
  double: 'bg-[#e0f5f3] text-[#0f766e]',
  a_reclasser: 'bg-[#fff4e5] text-[#8a5a00]',
  default: 'bg-gray-100 text-gray-700',
}

const dots = {
  nouvelle: 'bg-[#1a5f9e]',
  en_cours: 'bg-[#d97706]',
  information_demandee: 'bg-[#7c3aed]',
  resolue: 'bg-institutional',
  deposee: 'bg-institutional',
  cloturee: 'bg-gray-500',
  hors_competence: 'bg-gray-500',
  answered: 'bg-institutional',
  reponse_apportee: 'bg-institutional',
  non_retenue: 'bg-gray-500',
  non_fondee: 'bg-[#b42318]',
  refusee: 'bg-[#b42318]',
  double: 'bg-[#0d9488]',
  a_reclasser: 'bg-[#d97706]',
  default: 'bg-gray-500',
}

export default function StatusBadge({
  status = 'nouvelle',
  label,
  showDot = false,
  className = '',
}) {
  const { t } = useLanguage()
  const tone = variants[status] ?? variants.default
  const dot = dots[status] ?? dots.default
  const texte = t.admin?.statuts?.[status] || label || libelleStatut(status, t)

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        tone,
        className,
      ].join(' ')}
    >
      {showDot && (
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden />
      )}
      {texte}
    </span>
  )
}
const variants = {
  nouvelle: 'bg-[#e8f1fb] text-[#1a5f9e]',
  en_cours: 'bg-[#fff4e5] text-[#8a5a00]',
  information_demandee: 'bg-[#f3e8ff] text-[#6b21a8]',
  resolue: 'bg-[#e6f6ed] text-institutional',
  deposee: 'bg-[#e6f6ed] text-institutional',
  refusee: 'bg-[#fde8e8] text-[#b42318]',
  default: 'bg-gray-100 text-gray-700',
}

const dots = {
  nouvelle: 'bg-[#1a5f9e]',
  en_cours: 'bg-[#d97706]',
  information_demandee: 'bg-[#7c3aed]',
  resolue: 'bg-institutional',
  deposee: 'bg-institutional',
  refusee: 'bg-[#b42318]',
  default: 'bg-gray-500',
}

export default function StatusBadge({
  status = 'nouvelle',
  label,
  showDot = false,
  className = '',
}) {
  const tone = variants[status] ?? variants.default
  const dot = dots[status] ?? dots.default

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
      {label}
    </span>
  )
}

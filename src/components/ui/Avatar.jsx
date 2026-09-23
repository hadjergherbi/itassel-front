import { initiales } from '../../lib/statuts'

export default function Avatar({ personne, initials, size = 'md' }) {
  const text = initials || initiales(personne)
  const sizes = { sm: 'h-7 w-7 text-[10px]', md: 'h-8 w-8 text-xs', lg: 'h-10 w-10 text-sm' }
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[#e6f6ed] font-semibold text-institutional ${sizes[size]}`}
    >
      {text}
    </span>
  )
}

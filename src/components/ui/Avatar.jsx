import { initiales } from '../../lib/statuts'

const PALETTE = [
  ['bg-[#d8efe3]', 'text-[#006b3f]'],
  ['bg-[#d6e6f5]', 'text-[#1a5f9e]'],
  ['bg-[#f3e6c8]', 'text-[#8a5a00]'],
  ['bg-[#e8dff3]', 'text-[#5b3d8a]'],
  ['bg-[#f5ddd6]', 'text-[#9b2c2c]'],
  ['bg-[#d4ecec]', 'text-[#0d6b6b]'],
  ['bg-[#f0e0d6]', 'text-[#9a4d1a]'],
  ['bg-[#dde4f0]', 'text-[#334e8a]'],
]

function couleurDepuisId(id) {
  const s = String(id ?? '')
  let h = 0
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

export default function Avatar({ personne, initials, size = 'md', seed }) {
  const text = initials || personne?.initiales || initiales(personne)
  const id = seed ?? personne?.id_utilisateur ?? personne?.id ?? text
  const [bg, fg] = couleurDepuisId(id)
  const sizes = { sm: 'h-7 w-7 text-[10px]', md: 'h-8 w-8 text-xs', lg: 'h-10 w-10 text-sm' }
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${bg} ${fg} ${sizes[size]}`}
    >
      {text}
    </span>
  )
}

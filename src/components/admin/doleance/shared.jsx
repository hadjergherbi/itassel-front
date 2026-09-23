import { Download, Paperclip } from 'lucide-react'
import { formatTaille } from '../../../lib/statuts'
import { telecharger } from './helpers'

export function Card({ id, title, badge, extra, className = '', children }) {
  return (
    <section id={id} className={`rounded-[8px] border border-gray-200 bg-white p-5 shadow-sm ${className}`}>
      {(title || extra) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {title && <h2 className="text-base font-bold text-gray-900">{title}</h2>}
            {badge}
          </div>
          {extra}
        </div>
      )}
      {children}
    </section>
  )
}

export function Info({ label, children }) {
  return (
    <div>
      <p className="mb-0.5 text-xs text-gray-500">{label}</p>
      <div className="text-sm font-medium text-gray-900">{children || '—'}</div>
    </div>
  )
}

export function Checkbox({ id, checked, onChange, children }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-2 text-sm text-gray-700">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[#00984a]"
      />
      <span>{children}</span>
    </label>
  )
}

export function PieceLigne({ piece, onError }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <Paperclip className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-900">{piece.nom_fichier}</p>
          <p className="text-xs text-gray-500">
            {String(piece.type ?? '').toUpperCase()}
            {piece.taille != null ? ` · ${formatTaille(piece.taille)}` : ''}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => telecharger(piece, onError)}
        className="inline-flex items-center gap-1.5 rounded-[8px] border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-institutional hover:text-institutional"
      >
        <Download className="h-3.5 w-3.5" aria-hidden /> Télécharger
      </button>
    </li>
  )
}

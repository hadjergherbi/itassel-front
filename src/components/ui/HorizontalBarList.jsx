import { Link } from 'react-router-dom'
import { useLanguage } from '../../i18n/LanguageContext'

export default function HorizontalBarList({ items = [], total, afficherPourcent = false }) {
  const { tf } = useLanguage()
  if (!items.length) {
    return <p className="py-8 text-center text-sm text-gray-500">{tf('admin.dashboard.aucuneDonnee')}</p>
  }
  const base = total > 0 ? total : items.reduce((s, i) => s + (Number(i.total) || 0), 0)
  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const n = Number(item.total) || 0
        const pct = base > 0 ? Math.round((n / base) * 100) : 0
        const vide = n === 0
        const valeur = afficherPourcent
          ? tf('admin.logsDashboard.nPct', { n, pct })
          : String(n)
        const ligne = (
          <>
            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
              <span className={`inline-flex items-center gap-2 ${vide ? 'text-gray-400' : 'text-gray-700'}`}>
                {item.dot && (
                  <span className={`h-2 w-2 rounded-full ${vide ? 'bg-gray-300' : item.dot}`} />
                )}
                {item.libelle}
              </span>
              <span className={`font-mono ${vide ? 'text-gray-400' : 'text-gray-500'}`}>{valeur}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full ${vide ? 'bg-gray-200' : (item.bar ?? 'bg-institutional')}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </>
        )
        return (
          <li key={item.code ?? item.libelle}>
            {item.to ? (
              <Link to={item.to} className="block rounded-[8px] no-underline transition hover:bg-gray-50">
                {ligne}
              </Link>
            ) : (
              ligne
            )}
          </li>
        )
      })}
    </ul>
  )
}

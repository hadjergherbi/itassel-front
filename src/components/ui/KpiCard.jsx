import { Link } from 'react-router-dom'

export default function KpiCard({ label, value, hint, dot, children, to, danger = false }) {
  const classe = [
    'rounded-[8px] border bg-white p-4 shadow-sm',
    danger ? 'border-danger-text' : 'border-gray-200',
    to ? 'block no-underline transition hover:bg-gray-50' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const contenu = (
    <>
      <div className="mb-2 flex items-center gap-2">
        {dot && <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden />}
        <p className="text-sm text-gray-600">{label}</p>
      </div>
      <p className={`text-3xl font-bold tabular-nums ${danger ? 'text-danger-text' : 'text-gray-900'}`}>
        {value}
      </p>
      {hint && <p className={`mt-1 text-xs ${danger ? 'text-danger-text/80' : 'text-gray-500'}`}>{hint}</p>}
      {children}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={classe}>
        {contenu}
      </Link>
    )
  }

  return <article className={classe}>{contenu}</article>
}

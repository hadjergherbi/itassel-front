export default function HorizontalBarList({ items = [], total }) {
  if (!items.length) {
    return <p className="py-8 text-center text-sm text-gray-500">Aucune donnée.</p>
  }
  const base = total > 0 ? total : items.reduce((s, i) => s + (Number(i.total) || 0), 0)
  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const n = Number(item.total) || 0
        const pct = base > 0 ? Math.round((n / base) * 100) : 0
        return (
          <li key={item.code ?? item.libelle}>
            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
              <span className="inline-flex items-center gap-2 text-gray-700">
                {item.dot && <span className={`h-2 w-2 rounded-full ${item.dot}`} />}
                {item.libelle}
              </span>
              <span className="font-mono text-gray-500">{n}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full ${item.bar ?? 'bg-institutional'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

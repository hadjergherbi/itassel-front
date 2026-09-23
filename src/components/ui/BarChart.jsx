export default function BarChart({ items = [], highlightLast = true }) {
  if (!items.length) {
    return <p className="py-10 text-center text-sm text-gray-500">Aucune donnée.</p>
  }
  const max = Math.max(1, ...items.map((i) => Number(i.total) || 0))
  return (
    <div className="flex items-end gap-3">
      {items.map((item, index) => {
        const total = Number(item.total) || 0
        const actif = highlightLast && index === items.length - 1
        const hauteur = Math.max(total === 0 ? 4 : (total / max) * 100, 6)
        return (
          <div key={item.mois ?? item.libelle ?? index} className="flex min-w-0 flex-1 flex-col items-center">
            <span className="mb-1 font-mono text-xs font-semibold text-gray-700">{total}</span>
            <div className="flex h-40 w-full max-w-12 items-end">
              <div
                className={`w-full rounded-t-[6px] ${actif ? 'bg-action' : 'bg-institutional'}`}
                style={{ height: `${hauteur}%` }}
                title={`${item.libelle} : ${total}`}
              />
            </div>
            <span className={`mt-2 text-xs ${actif ? 'font-semibold text-institutional' : 'text-gray-500'}`}>
              {item.libelle}
            </span>
          </div>
        )
      })}
    </div>
  )
}

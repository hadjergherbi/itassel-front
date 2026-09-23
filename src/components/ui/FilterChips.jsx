export default function FilterChips({ items, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const actif = String(item.value) === String(value)
        return (
          <button
            key={String(item.value)}
            type="button"
            onClick={() => onChange(item.value)}
            className={[
              'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition',
              item.tone === 'warning'
                ? actif
                  ? 'border-[#d97706] bg-warning-bg text-warning-text ring-1 ring-[#d97706]/30'
                  : 'border-warning-border bg-warning-bg text-warning-text'
                : actif
                  ? 'border-institutional bg-institutional text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400',
            ].join(' ')}
          >
            {item.label}
            {item.count != null && <span className="opacity-75">({item.count})</span>}
          </button>
        )
      })}
    </div>
  )
}

export default function Tabs({ tabs, value, onChange }) {
  return (
    <div className="mb-6 flex flex-wrap gap-1 border-b border-gray-200">
      {tabs.map((tab) => {
        const actif = tab.id === value
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={[
              'whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition',
              actif
                ? 'border-institutional text-institutional'
                : 'border-transparent text-gray-500 hover:text-gray-800',
            ].join(' ')}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

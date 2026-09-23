const DOT = {
  information_demandee: 'bg-[#7c3aed]',
  en_cours: 'bg-[#d97706]',
  deposee: 'bg-institutional',
  resolue: 'bg-institutional',
  nouvelle: 'bg-[#1a5f9e]',
  cloturee: 'bg-gray-500',
  non_fondee: 'bg-[#b42318]',
  double: 'bg-[#0d9488]',
  default: 'bg-gray-400',
}

export default function HistoryTimeline({ title, items }) {
  return (
    <aside className="rounded-[8px] border border-gray-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
      <h2 className="mb-5 text-base font-bold text-gray-900">{title}</h2>
      <ol className="relative space-y-5 border-s border-gray-200 ps-5">
        {items.map((item, i) => {
          const dot = DOT[item.status] ?? DOT.default
          return (
            <li key={`${item.title}-${i}`} className="relative">
              <span
                className={`absolute -start-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white ${dot}`}
                aria-hidden
              />
              <p className="text-sm font-semibold text-gray-900">{item.title}</p>
              {item.detail ? (
                <p className="mt-1 text-xs leading-relaxed text-gray-600">{item.detail}</p>
              ) : null}
              <p className="mt-1.5 text-xs text-gray-400">{item.date}</p>
            </li>
          )
        })}
      </ol>
    </aside>
  )
}
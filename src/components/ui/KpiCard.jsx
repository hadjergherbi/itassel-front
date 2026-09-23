export default function KpiCard({ label, value, hint, dot, children }) {
  return (
    <article className="rounded-[8px] border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        {dot && <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden />}
        <p className="text-sm text-gray-600">{label}</p>
      </div>
      <p className="text-3xl font-bold tabular-nums text-gray-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      {children}
    </article>
  )
}

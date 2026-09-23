export default function StackedBar({ segments = [] }) {
  const total = segments.reduce((s, i) => s + (Number(i.total) || 0), 0) || 1
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
      {segments.map((seg) => (
        <div
          key={seg.code ?? seg.libelle}
          className={seg.color}
          style={{ width: `${((Number(seg.total) || 0) / total) * 100}%` }}
          title={`${seg.libelle} : ${seg.total}`}
        />
      ))}
    </div>
  )
}

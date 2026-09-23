export default function InfoField({ label, children }) {
  return (
    <div>
      <p className="mb-0.5 text-xs text-gray-500">{label}</p>
      <div className="text-sm font-medium text-gray-900">{children || '—'}</div>
    </div>
  )
}

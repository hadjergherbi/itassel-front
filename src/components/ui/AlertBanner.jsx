export default function AlertBanner({ tone = 'warning', children, action }) {
  const styles =
    tone === 'info'
      ? 'border-[#c5d9ee] bg-nouvelle-bg text-nouvelle'
      : 'border-warning-border bg-warning-bg text-warning-text'
  return (
    <div className={`mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[8px] border px-4 py-3 text-sm ${styles}`}>
      <div className="min-w-0">{children}</div>
      {action}
    </div>
  )
}

export default function ResultBadge({ result }) {
  const ok = result === 'succes' || result === 'success' || result === true
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 text-xs font-medium',
        ok ? 'text-success-text' : 'text-danger-text',
      ].join(' ')}
    >
      <span className={`h-2 w-2 rounded-full ${ok ? 'bg-success-text' : 'bg-danger-text'}`} />
      {ok ? 'Succès' : 'Échec'}
    </span>
  )
}

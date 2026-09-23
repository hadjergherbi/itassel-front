export default function Toggle({
  id,
  checked,
  onChange,
  disabled = false,
  label,
  hint,
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        {label && (
          <p id={`${id}-label`} className="text-sm font-medium text-gray-900">
            {label}
          </p>
        )}
        {hint && <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{hint}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={label ? `${id}-label` : undefined}
        disabled={disabled}
        onClick={() => {
          if (!disabled) onChange(!checked)
        }}
        className={[
          'relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition',
          checked ? 'bg-action' : 'bg-gray-300',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 start-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0',
          ].join(' ')}
          aria-hidden
        />
      </button>
    </div>
  )
}

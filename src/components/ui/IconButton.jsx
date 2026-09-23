export default function IconButton({ label, className = '', children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={[
        'inline-flex h-9 w-9 items-center justify-center rounded-[8px] text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </button>
  )
}

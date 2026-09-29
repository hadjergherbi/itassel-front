export function FieldLabel({ htmlFor, children, required }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-gray-800">
      {children}
      {required && (
        <span className="ms-0.5 text-red-600" aria-hidden>
          *
        </span>
      )}
    </label>
  )
}

const baseControl =
  'w-full rounded-[8px] border bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:ring-2'

export function TextInput({
  id,
  error,
  className = '',
  ref,
  ...props
}) {
  return (
    <input
      ref={ref}
      id={id}
      className={[
        baseControl,
        error
          ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
          : 'border-gray-300 focus:border-institutional focus:ring-institutional/20',
        className,
      ].join(' ')}
      aria-invalid={error ? 'true' : undefined}
      {...props}
    />
  )
}

export function SelectInput({ id, error, children, className = '', ...props }) {
  return (
    <select
      id={id}
      className={[
        baseControl,
        'appearance-none bg-[length:1rem] bg-no-repeat pe-9 [background-position:right_0.75rem_center] rtl:[background-position:left_0.75rem_center]',
        "bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 24 24%27 stroke=%27%236b7280%27%3E%3Cpath stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%272%27 d=%27M19 9l-7 7-7-7%27/%3E%3C/svg%3E')]",
        error
          ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
          : 'border-gray-300 focus:border-institutional focus:ring-institutional/20',
        props.value === '' ? 'text-gray-400' : 'text-gray-900',
        className,
      ].join(' ')}
      aria-invalid={error ? 'true' : undefined}
      {...props}
    >
      {children}
    </select>
  )
}

export function TextArea({ id, error, className = '', autoSize = false, ref, ...props }) {
  return (
    <textarea
      ref={ref}
      id={id}
      className={[
        baseControl,
        autoSize ? 'resize-none overflow-y-auto' : 'min-h-[140px] resize-y',
        error
          ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
          : 'border-gray-300 focus:border-institutional focus:ring-institutional/20',
        className,
      ].join(' ')}
      aria-invalid={error ? 'true' : undefined}
      {...props}
    />
  )
}

export function FieldError({ message, id }) {
  if (!message) return null
  return (
    <p id={id} className="mt-1.5 text-xs text-red-600" role="alert">
      {message}
    </p>
  )
}

export function FieldHelp({ children, id }) {
  return (
    <p id={id} className="mt-1.5 text-xs leading-relaxed text-gray-500">
      {children}
    </p>
  )
}

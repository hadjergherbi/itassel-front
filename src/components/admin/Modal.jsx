import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'

export default function Modal({
  open,
  title,
  subtitle,
  onClose,
  footer,
  busy = false,
  children,
  wide = false,
}) {
  const titleId = useId()
  const panelRef = useRef(null)
  const bodyRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusable = bodyRef.current?.querySelector(
      'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])',
    )
    focusable?.focus()

    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onClose()
    }
    document.addEventListener('keydown', onKey)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open, busy, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4 sm:p-8" dir="ltr">
      <div
        className="absolute inset-0"
        aria-hidden
        onClick={() => {
          if (!busy) onClose()
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={[
          'relative z-10 my-auto w-full rounded-[8px] bg-white shadow-xl',
          wide ? 'max-w-3xl' : 'max-w-2xl',
        ].join(' ')}
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold text-gray-900">
              {title}
            </h2>
            {subtitle && <div className="mt-1 text-sm text-gray-600">{subtitle}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex rounded-[8px] p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div ref={bodyRef} className="px-5 py-5 sm:px-6">
          {children}
        </div>

        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 px-5 py-4 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

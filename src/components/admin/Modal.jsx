import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'

const SELECTEUR_FOCUS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function Modal({
  open,
  title,
  subtitle,
  icon,
  onClose,
  footer,
  busy = false,
  children,
  wide = false,
  viewer = false,
  headerActions,
  closeLabel = 'Fermer',
  bodyClassName = '',
  initialFocusRef,
}) {
  const titleId = useId()
  const panelRef = useRef(null)
  const bodyRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const cible =
      initialFocusRef?.current ||
      bodyRef.current?.querySelector(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])',
      )
    cible?.focus()

    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return
      const nodes = [...panelRef.current.querySelectorAll(SELECTEUR_FOCUS)]
      if (!nodes.length) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open, busy, onClose, initialFocusRef])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4 sm:p-8">
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
          'relative z-10 my-auto flex w-full flex-col rounded-[8px] bg-white shadow-xl',
          viewer ? 'h-[90vh] max-h-[90vh] w-[90vw] max-w-none' : wide ? 'max-w-3xl' : 'max-w-2xl',
        ].join(' ')}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            {icon && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-success-bg text-institutional">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h2 id={titleId} className="truncate text-lg font-bold text-gray-900" title={typeof title === 'string' ? title : undefined}>
                {title}
              </h2>
              {subtitle && <div className="mt-1 text-sm text-gray-600">{subtitle}</div>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {headerActions}
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="inline-flex rounded-[8px] p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50"
              aria-label={closeLabel}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div ref={bodyRef} className={viewer ? `flex min-h-0 flex-1 flex-col overflow-hidden ${bodyClassName}` : `px-5 py-5 sm:px-6 ${bodyClassName}`}>
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

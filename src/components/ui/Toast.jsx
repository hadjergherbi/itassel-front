import { createContext, useCallback, useContext, useState } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const show = useCallback((type, text) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, type, text }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed end-4 bottom-4 z-[70] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.type === 'error' ? 'alert' : 'status'}
            className={[
              'pointer-events-auto rounded-[8px] border px-4 py-3 text-sm shadow-lg',
              t.type === 'error'
                ? 'border-red-200 bg-danger-bg text-danger-text'
                : 'border-action/30 bg-success-bg text-success-text',
            ].join(' ')}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext)
  return ctx ?? { show: () => {} }
}

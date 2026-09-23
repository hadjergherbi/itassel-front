export default function Card({ id, title, badge, extra, footer, className = '', children }) {
  return (
    <section id={id} className={`rounded-[8px] border border-gray-200 bg-white p-5 shadow-sm ${className}`}>
      {(title || extra) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {title && <h2 className="text-base font-bold text-gray-900">{title}</h2>}
            {badge}
          </div>
          {extra}
        </div>
      )}
      {children}
      {footer && <div className="mt-4 border-t border-gray-100 pt-3">{footer}</div>}
    </section>
  )
}

import { ChevronLeft, ChevronRight } from 'lucide-react'
import Button from './Button'
import { useLanguage } from '../../i18n/LanguageContext'

export default function Pagination({ paginator }) {
  const { tf } = useLanguage()
  if (!paginator || paginator.last_page <= 1) return null
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
      <p>
        {tf('admin.ui.sur', {
          from: paginator.from,
          to: paginator.to,
          total: paginator.total,
        })}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={paginator.current_page <= 1}
          onClick={() => paginator.onPage(Math.max(1, paginator.current_page - 1))}
        >
          <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" /> {tf('admin.ui.precedent')}
        </Button>
        <span>
          {tf('admin.ui.page', { n: paginator.current_page, total: paginator.last_page })}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={paginator.current_page >= paginator.last_page}
          onClick={() => paginator.onPage(paginator.current_page + 1)}
        >
          {tf('admin.ui.suivant')} <ChevronRight className="h-4 w-4 rtl:-scale-x-100" />
        </Button>
      </div>
    </div>
  )
}

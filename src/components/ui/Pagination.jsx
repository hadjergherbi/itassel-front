import { ChevronLeft, ChevronRight } from 'lucide-react'
import Button from './Button'

export default function Pagination({ paginator }) {
  if (!paginator || paginator.last_page <= 1) return null
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
      <p>
        {paginator.from}–{paginator.to} sur {paginator.total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={paginator.current_page <= 1}
          onClick={() => paginator.onPage(Math.max(1, paginator.current_page - 1))}
        >
          <ChevronLeft className="h-4 w-4" /> Précédent
        </Button>
        <span>
          Page {paginator.current_page} / {paginator.last_page}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={paginator.current_page >= paginator.last_page}
          onClick={() => paginator.onPage(paginator.current_page + 1)}
        >
          Suivant <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

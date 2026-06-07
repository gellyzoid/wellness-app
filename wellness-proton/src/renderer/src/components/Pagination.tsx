import { ChevronLeft, ChevronRight } from 'lucide-react'

export const PAGE_SIZE = 15

export function usePagination<T>(items: T[], page: number): { page: T[]; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const clamped = Math.min(page, totalPages - 1)
  return { page: items.slice(clamped * PAGE_SIZE, clamped * PAGE_SIZE + PAGE_SIZE), totalPages }
}

export default function Pagination({
  page,
  totalPages,
  onChange
}: {
  page: number
  totalPages: number
  onChange: (p: number) => void
}): React.JSX.Element | null {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-2 pt-2">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 0}
        className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {Array.from({ length: totalPages }, (_, i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          className={
            'w-7 h-7 rounded text-xs font-medium ' +
            (i === page
              ? 'bg-brand-600 text-white'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700')
          }
        >
          {i + 1}
        </button>
      ))}

      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages - 1}
        className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, X, Plus, Dumbbell, ChevronDown, ChevronUp } from 'lucide-react'
import type { WgerExercise } from '../../../shared/types'

interface Props {
  onSelect: (exercise: WgerExercise) => void
  onClose: () => void
}

export default function WgerBrowser({ onSelect, onClose }: Props): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined)
  const [search, setSearch] = useState({ q: '', cat: undefined as number | undefined })
  const [expanded, setExpanded] = useState<number | null>(null)

  const categories = useQuery({
    queryKey: ['wger', 'categories'],
    queryFn: () => window.api.wger.categories(),
    staleTime: Infinity
  })

  const results = useQuery({
    queryKey: ['wger', 'search', search.q, search.cat],
    queryFn: () => window.api.wger.search(search.q, search.cat),
    enabled: search.q.length >= 2 || search.cat !== undefined,
    staleTime: 5 * 60 * 1000
  })

  const trigger = useCallback(() => {
    setSearch({ q: query, cat: categoryId })
  }, [query, categoryId])

  // Auto-search when category changes
  useEffect(() => {
    setSearch({ q: query, cat: categoryId })
  }, [categoryId])

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') trigger()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-brand-600" />
            <h2 className="text-base font-semibold text-slate-900">Exercise library</h2>
            <span className="text-xs text-slate-400">powered by WGER</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-3 flex gap-2 border-b border-slate-100">
          <div className="flex-1 flex items-center gap-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-md px-3 py-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search exercises (e.g. squat, bench press…)"
              className="flex-1 text-sm outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
              autoFocus
            />
          </div>
          <select
            value={categoryId ?? ''}
            onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : undefined)}
            className="border border-slate-200 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="">All categories</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={trigger}
            className="px-4 py-2 bg-brand-600 text-white rounded-md text-sm font-medium hover:bg-brand-700"
          >
            Search
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {results.isFetching && (
            <div className="p-8 text-center space-y-2">
              <div className="inline-block w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-500">
                Loading exercise library… (first load may take a few seconds)
              </p>
            </div>
          )}
          {!results.isFetching && results.data?.length === 0 && (
            <p className="p-5 text-sm text-slate-500 text-center">No exercises found. Try a different term or category.</p>
          )}
          {!results.isFetching && !results.data && search.q.length < 2 && search.cat === undefined && (
            <p className="p-5 text-sm text-slate-500 text-center">
              Type at least 2 characters or pick a category to search.
            </p>
          )}
          {results.data?.map((ex) => (
            <ExerciseRow
              key={ex.id}
              exercise={ex}
              expanded={expanded === ex.id}
              onToggle={() => setExpanded(expanded === ex.id ? null : ex.id)}
              onSelect={() => onSelect(ex)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ExerciseRow({
  exercise,
  expanded,
  onToggle,
  onSelect
}: {
  exercise: WgerExercise
  expanded: boolean
  onToggle: () => void
  onSelect: () => void
}): React.JSX.Element {
  return (
    <div className="px-5 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-sm font-medium text-slate-900">{exercise.name}</span>
            <span className="text-xs text-slate-400">{exercise.category}</span>
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {exercise.muscles.map((m) => (
              <Tag key={m} label={m} color="blue" />
            ))}
            {exercise.equipment.map((e) => (
              <Tag key={e} label={e} color="slate" />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {exercise.description && (
            <button
              onClick={onToggle}
              className="text-slate-400 hover:text-slate-600"
              aria-label="Toggle description"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={onSelect}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-600 text-white rounded-md text-xs font-medium hover:bg-brand-700"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
      </div>
      {expanded && exercise.description && (
        <p className="mt-2 text-xs text-slate-600 leading-relaxed">{exercise.description}</p>
      )}
    </div>
  )
}

function Tag({ label, color }: { label: string; color: 'blue' | 'slate' }): React.JSX.Element {
  return (
    <span
      className={
        'text-[10px] px-1.5 py-0.5 rounded font-medium ' +
        (color === 'blue'
          ? 'bg-sky-50 text-sky-700'
          : 'bg-slate-100 text-slate-600')
      }
    >
      {label}
    </span>
  )
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { Droplet, Trash2 } from 'lucide-react'
import PageHeader from '../components/PageHeader'

const QUICK_ADDS = [200, 250, 330, 500]

export default function Water(): React.JSX.Element {
  const qc = useQueryClient()
  const today = format(new Date(), 'yyyy-MM-dd')
  const summary = useQuery({
    queryKey: ['water', 'todaySummary', today],
    queryFn: () => window.api.water.todaySummary()
  })

  const invalidate = (): void => { qc.invalidateQueries({ queryKey: ['water'] }) }

  const add = useMutation({
    mutationFn: (ml: number) => window.api.water.add(ml),
    onSuccess: (_data, ml) => {
      invalidate()
      toast.success(`+${ml} ml logged.`, { duration: 3000 })
    }
  })

  const remove = useMutation({
    mutationFn: (id: number) => window.api.water.delete(id),
    onSuccess: (_data, id) => {
      const entry = summary.data?.logs.find((l) => l.id === id)
      invalidate()
      if (entry) toast(`−${entry.amount_ml} ml removed.`, { icon: '🗑️', duration: 3000 })
    }
  })

  const total = summary.data?.total_ml ?? 0
  const goal = summary.data?.goal_ml ?? 2000
  const pct = Math.min(100, Math.round((total / goal) * 100))

  return (
    <>
      <PageHeader title="Water" subtitle="Track your hydration through the day" />
      <div className="p-8 max-w-3xl space-y-6">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Today</div>
              <div className="text-4xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
                {total} <span className="text-xl text-slate-400">/ {goal} ml</span>
              </div>
            </div>
            <div className="text-2xl font-medium text-brand-600">{pct}%</div>
          </div>
          <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mt-4">
            <div className="h-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex flex-wrap gap-2 mt-6">
            {QUICK_ADDS.map((ml) => (
              <button
                key={ml}
                onClick={() => add.mutate(ml)}
                disabled={add.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900 disabled:opacity-50 text-sm font-medium"
              >
                <Droplet className="w-4 h-4" />+{ml} ml
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
          <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">Today&apos;s log</h3>
          {summary.data && summary.data.logs.length === 0 && (
            <p className="text-sm text-slate-500">No entries yet — add a drink above.</p>
          )}
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {summary.data?.logs.map((l) => (
              <li key={l.id} className="py-2 flex items-center justify-between text-sm gap-3">
                <span className="text-slate-700 dark:text-slate-300">{l.amount_ml} ml</span>
                <span className="text-slate-400 dark:text-slate-500 flex-1 text-right">
                  {format(new Date(l.logged_at.replace(' ', 'T')), 'h:mm a')}
                </span>
                <button
                  onClick={() => remove.mutate(l.id)}
                  disabled={remove.isPending}
                  title="Remove entry"
                  className="p-1 rounded text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  )
}

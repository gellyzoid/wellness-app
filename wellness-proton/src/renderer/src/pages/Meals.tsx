import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import type { Meal } from '../../../shared/types'

const SLOTS: Meal['slot'][] = ['breakfast', 'lunch', 'dinner', 'snack']
const DAYS_TO_FETCH = 7

function dayLabel(dateStr: string): string {
  const d = parseISO(dateStr)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'EEEE, MMM d')
}

type EditState = { id: number; name: string; slot: Meal['slot']; time: string; calories: string }

export default function Meals(): React.JSX.Element {
  const today = format(new Date(), 'yyyy-MM-dd')
  const qc = useQueryClient()
  const invalidate = (): void => { qc.invalidateQueries({ queryKey: ['meals'] }) }

  const meals = useQuery({
    queryKey: ['meals', 'recent', DAYS_TO_FETCH],
    queryFn: () => window.api.meals.recent(DAYS_TO_FETCH)
  })

  const create = useMutation({
    mutationFn: (input: Omit<Meal, 'id' | 'eaten'>) => window.api.meals.create(input),
    onSuccess: invalidate
  })
  const update = useMutation({
    mutationFn: ({ id, input }: { id: number; input: { name: string; slot: Meal['slot']; calories: number | null; time: string } }) =>
      window.api.meals.update(id, input),
    onSuccess: () => { invalidate(); setEdit(null); toast.success('Meal updated.') }
  })
  const remove = useMutation({
    mutationFn: (id: number) => window.api.meals.delete(id),
    onSuccess: () => { invalidate(); toast('Meal deleted.', { icon: '🗑️' }) }
  })
  const toggle = useMutation({
    mutationFn: (id: number) => window.api.meals.toggleEaten(id),
    onSuccess: invalidate
  })

  // Add modal state
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [slot, setSlot] = useState<Meal['slot']>('breakfast')
  const [time, setTime] = useState('08:00')
  const [calories, setCalories] = useState('')

  // Edit state
  const [edit, setEdit] = useState<EditState | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  const startEdit = (m: Meal): void => {
    const t = m.scheduled_at.replace(' ', 'T')
    setEdit({
      id: m.id,
      name: m.name,
      slot: m.slot,
      time: format(new Date(t), 'HH:mm'),
      calories: m.calories != null ? String(m.calories) : ''
    })
  }

  const submitAdd = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!name.trim()) return
    create.mutate(
      { name: name.trim(), slot, calories: calories ? Number(calories) : null, scheduled_at: `${today}T${time}:00` },
      { onSuccess: () => { setName(''); setCalories(''); setShowAdd(false) } }
    )
  }

  const submitEdit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!edit || !edit.name.trim()) return
    update.mutate({
      id: edit.id,
      input: { name: edit.name.trim(), slot: edit.slot, calories: edit.calories ? Number(edit.calories) : null, time: edit.time }
    })
  }

  const grouped = useMemo(() => {
    const byDate: Record<string, Meal[]> = {}
    for (const m of meals.data ?? []) {
      const day = m.scheduled_at.slice(0, 10)
      if (!byDate[day]) byDate[day] = []
      byDate[day].push(m)
    }
    return Object.entries(byDate).sort(([a], [b]) => b.localeCompare(a))
  }, [meals.data])

  return (
    <>
      <PageHeader title="Meals" subtitle="Plan and track your meals" />
      <div className="p-8 max-w-3xl space-y-6">

        {/* Add button */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-md text-sm font-medium hover:bg-brand-700"
          >
            <Plus className="w-4 h-4" /> Add meal
          </button>
        </div>

        {/* Add modal */}
        {showAdd && (
          <Modal title="Add meal" onClose={() => setShowAdd(false)}>
            <form onSubmit={submitAdd} className="space-y-4">
              <div className="space-y-3">
                <input
                  placeholder="Meal name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm outline-none"
                />
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={slot}
                    onChange={(e) => setSlot(e.target.value as Meal['slot'])}
                    className="px-3 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm"
                  >
                    {SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="px-3 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm"
                  />
                </div>
                <input
                  placeholder="Calories (kcal)"
                  type="number"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-md text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700">
                  Cancel
                </button>
                <button type="submit" disabled={create.isPending} className="px-4 py-2 bg-brand-600 text-white rounded-md text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
                  Add meal
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* Edit modal */}
        {edit && (
          <Modal title="Edit meal" onClose={() => setEdit(null)}>
            <form onSubmit={submitEdit} className="space-y-4">
              <div className="space-y-3">
                <input
                  placeholder="Meal name"
                  value={edit.name}
                  onChange={(e) => setEdit((v) => v && ({ ...v, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm outline-none"
                />
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={edit.slot}
                    onChange={(e) => setEdit((v) => v && ({ ...v, slot: e.target.value as Meal['slot'] }))}
                    className="px-3 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm"
                  >
                    {SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input
                    type="time"
                    value={edit.time}
                    onChange={(e) => setEdit((v) => v && ({ ...v, time: e.target.value }))}
                    className="px-3 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm"
                  />
                </div>
                <input
                  placeholder="Calories (kcal)"
                  type="number"
                  value={edit.calories}
                  onChange={(e) => setEdit((v) => v && ({ ...v, calories: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEdit(null)} className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-md text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700">
                  Cancel
                </button>
                <button type="submit" disabled={update.isPending} className="px-4 py-2 bg-brand-600 text-white rounded-md text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
                  Save changes
                </button>
              </div>
            </form>
          </Modal>
        )}

        {grouped.length === 0 && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-5">
            <p className="text-sm text-slate-500">No meals logged yet.</p>
          </div>
        )}

        {grouped.map(([day, dayMeals]) => (
          <div key={day} className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 px-1">
              {dayLabel(day)}
            </h3>
            {SLOTS.filter((s) => dayMeals.some((m) => m.slot === s)).map((s) => (
              <div key={s} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <div className="px-5 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {s}
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {dayMeals.filter((m) => m.slot === s).map((m) => (
                    <div key={m.id} className="px-5 py-3 flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={m.eaten === 1}
                        onChange={() => toggle.mutate(m.id)}
                        className="w-4 h-4 accent-emerald-600 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className={m.eaten ? 'line-through text-slate-400 dark:text-slate-500 text-sm' : 'text-slate-900 dark:text-slate-100 text-sm'}>
                          {m.name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {format(new Date(m.scheduled_at.replace(' ', 'T')), 'h:mm a')}
                          {m.calories ? ` · ${m.calories} kcal` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => startEdit(m)}
                          title="Edit"
                          className="p-1.5 rounded text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {confirmDeleteId === m.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => { remove.mutate(m.id); setConfirmDeleteId(null) }}
                              disabled={remove.isPending}
                              className="px-2 py-1 text-xs rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(m.id)}
                            title="Delete"
                            className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  )
}

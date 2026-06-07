import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, PowerOff, Power } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import Pagination, { usePagination, PAGE_SIZE } from '../components/Pagination'
import Modal from '../components/Modal'
import type { Medication } from '../../../shared/types'

type MedInput = Omit<Medication, 'id' | 'active' | 'taken_today'>

const emptyInput = (): MedInput => ({ name: '', dose: null, frequency: 'daily', time_of_day: '08:00' })

const fmtTime = (t: string | null): string => {
  if (!t) return '—'
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

export default function Medications(): React.JSX.Element {
  const qc = useQueryClient()
  const invalidateMeds = (): void => { qc.invalidateQueries({ queryKey: ['medications'] }) }
  const invalidateAll = (): void => {
    qc.invalidateQueries({ queryKey: ['medications'] })
    qc.invalidateQueries({ queryKey: ['achievements'] })
  }

  const [showAdd, setShowAdd] = useState(false)
  const [activePage, setActivePage] = useState(0)
  const [inactivePage, setInactivePage] = useState(0)

  const meds = useQuery({ queryKey: ['medications'], queryFn: () => window.api.medications.list() })

  const create = useMutation({ mutationFn: (i: MedInput) => window.api.medications.create(i), onSuccess: invalidateMeds })
  const update = useMutation({ mutationFn: ({ id, i }: { id: number; i: MedInput }) => window.api.medications.update(id, i), onSuccess: invalidateMeds })
  const remove = useMutation({
    mutationFn: (id: number) => window.api.medications.delete(id),
    onSuccess: (result) => {
      invalidateAll()
      if (!result.ok && result.reason) toast(result.reason, { icon: '⚠️', duration: 6000 })
    }
  })
  const toggleActive = useMutation({ mutationFn: (id: number) => window.api.medications.toggleActive(id), onSuccess: invalidateAll })
  const logTaken = useMutation({
    mutationFn: (id: number) => window.api.medications.logTaken(id),
    onSuccess: (_data, id) => {
      invalidateMeds()
      qc.invalidateQueries({ queryKey: ['achievements'] })
      const name = meds.data?.find((m) => m.id === id)?.name ?? 'Medication'
      toast.success(`${name} marked as taken. Reminder resets tomorrow.`, { duration: 4000 })
    }
  })

  const unlogTaken = useMutation({
    mutationFn: (id: number) => window.api.medications.unlogTaken(id),
    onSuccess: invalidateMeds
  })

  const [form, setForm] = useState<MedInput>(emptyInput())
  const [editId, setEditId] = useState<number | null>(null)

  const setField = (k: keyof MedInput, v: string): void =>
    setForm((f) => ({ ...f, [k]: v || null }))

  const startEdit = (m: Medication): void => {
    setEditId(m.id)
    setForm({ name: m.name, dose: m.dose, frequency: m.frequency, time_of_day: m.time_of_day })
  }

  const cancelEdit = (): void => { setEditId(null); setForm(emptyInput()) }

  const submit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!form.name?.trim()) return
    const input: MedInput = { ...form, name: form.name.trim(), dose: form.dose?.trim() || null }
    if (editId !== null) {
      update.mutate({ id: editId, i: input }, { onSuccess: cancelEdit })
    } else {
      create.mutate(input, { onSuccess: () => { setForm(emptyInput()); setActivePage(0); setShowAdd(false) } })
    }
  }

  const allActive = meds.data?.filter((m) => m.active === 1) ?? []
  const allInactive = meds.data?.filter((m) => m.active === 0) ?? []

  const { page: activeItems, totalPages: activeTotalPages } = usePagination(allActive, activePage)
  const { page: inactiveItems, totalPages: inactiveTotalPages } = usePagination(allInactive, inactivePage)

  const busy = logTaken.isPending || unlogTaken.isPending || remove.isPending || toggleActive.isPending

  return (
    <>
      <PageHeader title="Medications & Vitamins" subtitle="Schedule and log doses" />
      <div className="p-8 max-w-3xl space-y-6">

        {/* Add button */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-md text-sm font-medium hover:bg-brand-700"
          >
            <Plus className="w-4 h-4" /> Add medication
          </button>
        </div>

        {/* Add modal */}
        {showAdd && (
          <Modal title="Add medication" onClose={() => { setShowAdd(false); setForm(emptyInput()) }}>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-3">
                <input
                  placeholder="Name (e.g. Vitamin D)"
                  value={form.name ?? ''}
                  onChange={(e) => setField('name', e.target.value)}
                  autoFocus
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm outline-none"
                />
                <input
                  placeholder="Dose (e.g. 500 mg)"
                  value={form.dose ?? ''}
                  onChange={(e) => setField('dose', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm outline-none"
                />
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Reminder time</label>
                  <input
                    type="time"
                    value={form.time_of_day ?? '08:00'}
                    onChange={(e) => setField('time_of_day', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setShowAdd(false); setForm(emptyInput()) }} className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-md text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700">
                  Cancel
                </button>
                <button type="submit" disabled={create.isPending} className="px-4 py-2 bg-brand-600 text-white rounded-md text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
                  Add medication
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* Edit modal */}
        {editId !== null && (
          <Modal title="Edit medication" onClose={cancelEdit}>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-3">
                <input
                  placeholder="Name (e.g. Vitamin D)"
                  value={form.name ?? ''}
                  onChange={(e) => setField('name', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm outline-none"
                />
                <input
                  placeholder="Dose (e.g. 500 mg)"
                  value={form.dose ?? ''}
                  onChange={(e) => setField('dose', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm outline-none"
                />
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Reminder time</label>
                  <input
                    type="time"
                    value={form.time_of_day ?? '08:00'}
                    onChange={(e) => setField('time_of_day', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={cancelEdit} className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-md text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700">
                  Cancel
                </button>
                <button type="submit" disabled={update.isPending} className="px-4 py-2 bg-brand-600 text-white rounded-md text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
                  Save changes
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* List */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 grid grid-cols-[1fr_auto_auto_auto] gap-4 text-xs uppercase tracking-wide text-slate-400 font-medium">
            <span>Medication {allActive.length >= PAGE_SIZE && <span className="normal-case">({allActive.length})</span>}</span>
            <span>Schedule</span>
            <span>Today</span>
            <span>Actions</span>
          </div>

          {allActive.length === 0 && (
            <p className="p-5 text-sm text-slate-500">No medications yet.</p>
          )}

          {activeItems.map((m) => (
            <MedRow
              key={m.id}
              med={m}
              onLog={() => logTaken.mutate(m.id)}
              onUnlog={() => unlogTaken.mutate(m.id)}
              onEdit={() => startEdit(m)}
              onDelete={() => remove.mutate(m.id)}
              onToggleActive={() => { toggleActive.mutate(m.id); setActivePage(0) }}
              busy={busy}
            />
          ))}

          {allActive.length >= PAGE_SIZE && (
            <div className="px-5 pb-4">
              <Pagination page={activePage} totalPages={activeTotalPages} onChange={setActivePage} />
            </div>
          )}

          {allInactive.length > 0 && (
            <>
              <div className="px-5 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-400 uppercase tracking-wide font-medium">
                Inactive {allInactive.length >= PAGE_SIZE && <span className="normal-case">({allInactive.length})</span>}
              </div>
              {inactiveItems.map((m) => (
                <MedRow
                  key={m.id}
                  med={m}
                  onLog={() => logTaken.mutate(m.id)}
                  onUnlog={() => unlogTaken.mutate(m.id)}
                  onEdit={() => startEdit(m)}
                  onDelete={() => remove.mutate(m.id)}
                  onToggleActive={() => { toggleActive.mutate(m.id); setInactivePage(0) }}
                  busy={busy}
                />
              ))}
              {allInactive.length >= PAGE_SIZE && (
                <div className="px-5 pb-4">
                  <Pagination page={inactivePage} totalPages={inactiveTotalPages} onChange={setInactivePage} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

    </>
  )
}

function MedRow({
  med,
  onLog,
  onUnlog,
  onEdit,
  onDelete,
  onToggleActive,
  busy
}: {
  med: Medication
  onLog: () => void
  onUnlog: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleActive: () => void
  busy: boolean
}): React.JSX.Element {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const takenToday = med.taken_today === 1

  return (
    <div className={
      'px-5 py-3 grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center border-b border-slate-50 dark:border-slate-700/50 last:border-0 ' +
      (med.active === 0 ? 'opacity-50' : '')
    }>
      <div>
        <div className="text-sm text-slate-900 dark:text-slate-100">{med.name}</div>
        {med.dose && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{med.dose}</div>}
      </div>

      <div className="text-xs text-slate-500 dark:text-slate-400 text-right">
        {fmtTime(med.time_of_day)}
      </div>

      {/* Taken checkbox */}
      <div className="flex justify-end">
        <label className={
          'flex items-center gap-2 cursor-pointer select-none ' +
          (busy || med.active === 0 ? 'pointer-events-none opacity-50' : '')
        }>
          <input
            type="checkbox"
            checked={takenToday}
            onChange={() => takenToday ? onUnlog() : onLog()}
            className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
          />
          <span className={
            'text-xs font-medium ' +
            (takenToday ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500')
          }>
            {takenToday ? 'Taken' : 'Not taken'}
          </span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={onEdit}
          title="Edit"
          className="p-1.5 rounded text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onToggleActive}
          disabled={busy}
          title={med.active === 1 ? 'Deactivate' : 'Activate'}
          className="p-1.5 rounded text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
        >
          {med.active === 1 ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
        </button>
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => { onDelete(); setConfirmDelete(false) }}
              disabled={busy}
              className="px-2 py-1 text-xs rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
            >
              Delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            title="Delete"
            className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

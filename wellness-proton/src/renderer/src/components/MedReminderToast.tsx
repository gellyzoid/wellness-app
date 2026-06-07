import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Pill, Check } from 'lucide-react'

interface MedRemind {
  id: number
  title: string
  body: string
}

export default function MedReminderToast(): null {
  const qc = useQueryClient()

  useEffect(() => {
    const handler = (_e: unknown, data: MedRemind): void => {
      toast.custom(
        (t) => {
          const markTaken = async (): Promise<void> => {
            await window.api.medications.logTaken(data.id)
            qc.invalidateQueries({ queryKey: ['medications'] })
            qc.invalidateQueries({ queryKey: ['achievements'] })
            const audio = document.querySelector<HTMLAudioElement>('audio')
            if (audio) { audio.pause(); audio.currentTime = 0 }
            toast.dismiss(t.id)
          }

          return (
            <div
              className={
                'bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-700 shadow-lg rounded-lg p-4 flex items-start gap-3 min-w-70 max-w-sm transition-all ' +
                (t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2')
              }
            >
              <div className="w-9 h-9 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-500 flex items-center justify-center shrink-0">
                <Pill className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs uppercase tracking-wide text-rose-600 dark:text-rose-400 font-semibold">
                  Medication reminder
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{data.body}</div>
                <button
                  onClick={markTaken}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-md hover:bg-emerald-700"
                >
                  <Check className="w-3.5 h-3.5" />
                  I already took it
                </button>
              </div>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0 text-lg leading-none"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          )
        },
        { duration: Infinity, id: `med-${data.id}`, position: 'top-right' }
      )
    }

    window.electron.ipcRenderer.on('med:remind', handler)
    return () => { window.electron.ipcRenderer.removeAllListeners('med:remind') }
  }, [qc])

  return null
}

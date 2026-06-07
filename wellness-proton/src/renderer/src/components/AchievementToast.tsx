import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Trophy } from 'lucide-react'

interface Unlock {
  id: string
  title: string
  description: string
}

export default function AchievementToast(): null {
  const qc = useQueryClient()

  useEffect(() => {
    const handler = (_e: unknown, unlocks: Unlock[]): void => {
      if (!Array.isArray(unlocks) || unlocks.length === 0) return
      qc.invalidateQueries({ queryKey: ['achievements'] })
      qc.invalidateQueries({ queryKey: ['streaks'] })
      unlocks.forEach((u) =>
        toast.custom(
          (t) => (
            <div
              className={
                'bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 shadow-lg rounded-lg p-4 flex items-start gap-3 min-w-70 max-w-sm transition-all ' +
                (t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2')
              }
            >
              <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-500 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs uppercase tracking-wide text-amber-600 dark:text-amber-400 font-semibold">
                  Achievement unlocked
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{u.title}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{u.description}</div>
              </div>
            </div>
          ),
          { duration: 5000, position: 'top-right' }
        )
      )
    }
    window.electron.ipcRenderer.on('achievements:unlocked', handler)
    return () => { window.electron.ipcRenderer.removeAllListeners('achievements:unlocked') }
  }, [qc])

  return null
}

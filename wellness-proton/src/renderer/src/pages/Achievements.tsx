import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Trophy, Lock, Droplet, Dumbbell, Moon, UtensilsCrossed, Pill, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import type { AchievementCategory, AchievementState } from '../../../shared/types'

type Filter = 'all' | 'unlocked' | 'locked'

const CATEGORY_ORDER: AchievementCategory[] = ['water', 'exercise', 'sleep', 'meals', 'medication', 'meta']

const CATEGORY_META: Record<AchievementCategory, { label: string; icon: React.ReactNode; tint: string; iconBig: React.ReactNode }> = {
  water:      { label: 'Hydration',   icon: <Droplet className="w-4 h-4" />,        iconBig: <Droplet className="w-5 h-5" />,        tint: 'text-sky-600 bg-sky-50 border-sky-100 dark:text-sky-400 dark:bg-sky-950 dark:border-sky-800' },
  exercise:   { label: 'Exercise',    icon: <Dumbbell className="w-4 h-4" />,        iconBig: <Dumbbell className="w-5 h-5" />,        tint: 'text-emerald-600 bg-emerald-50 border-emerald-100 dark:text-emerald-400 dark:bg-emerald-950 dark:border-emerald-800' },
  sleep:      { label: 'Sleep',       icon: <Moon className="w-4 h-4" />,            iconBig: <Moon className="w-5 h-5" />,            tint: 'text-indigo-600 bg-indigo-50 border-indigo-100 dark:text-indigo-400 dark:bg-indigo-950 dark:border-indigo-800' },
  meals:      { label: 'Meals',       icon: <UtensilsCrossed className="w-4 h-4" />, iconBig: <UtensilsCrossed className="w-5 h-5" />, tint: 'text-amber-600 bg-amber-50 border-amber-100 dark:text-amber-400 dark:bg-amber-950 dark:border-amber-800' },
  medication: { label: 'Medication',  icon: <Pill className="w-4 h-4" />,            iconBig: <Pill className="w-5 h-5" />,            tint: 'text-rose-600 bg-rose-50 border-rose-100 dark:text-rose-400 dark:bg-rose-950 dark:border-rose-800' },
  meta:       { label: 'Milestones',  icon: <Sparkles className="w-4 h-4" />,        iconBig: <Sparkles className="w-5 h-5" />,        tint: 'text-violet-600 bg-violet-50 border-violet-100 dark:text-violet-400 dark:bg-violet-950 dark:border-violet-800' }
}

export default function Achievements(): React.JSX.Element {
  const [filter, setFilter] = useState<Filter>('all')
  const [collapsed, setCollapsed] = useState<Set<AchievementCategory>>(new Set())

  const list = useQuery({
    queryKey: ['achievements'],
    queryFn: () => window.api.achievements.list()
  })

  const grouped = useMemo(() => {
    const all = list.data ?? []
    const isUnlocked = (a: AchievementState): boolean => a.unlocked || a.progress >= a.target
    const filtered = filter === 'unlocked'
      ? all.filter(isUnlocked)
      : filter === 'locked'
        ? all.filter((a) => !isUnlocked(a))
        : all

    return CATEGORY_ORDER.map((cat) => ({
      category: cat,
      items: filtered.filter((a) => a.category === cat)
    })).filter((g) => g.items.length > 0)
  }, [list.data, filter])

  const unlockedCount = list.data?.filter((a) => a.unlocked || a.progress >= a.target).length ?? 0
  const totalCount = list.data?.length ?? 0
  const pct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0

  const toggleCollapse = (cat: AchievementCategory): void => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  return (
    <>
      <PageHeader
        title="Achievements"
        subtitle={`${unlockedCount} of ${totalCount} unlocked · ${pct}%`}
      />
      <div className="p-8 max-w-5xl space-y-5">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-5">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-amber-500 shrink-0" />
            <div className="flex-1">
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 shrink-0">{unlockedCount} / {totalCount}</span>
          </div>
        </div>

        <div className="inline-flex rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5">
          {(['all', 'unlocked', 'locked'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={
                'px-3 py-1.5 text-xs rounded capitalize ' +
                (filter === f ? 'bg-brand-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100')
              }
            >
              {f}
            </button>
          ))}
        </div>

        {grouped.length === 0 && (
          <p className="text-sm text-slate-500">No achievements match this filter.</p>
        )}

        {grouped.map(({ category, items }) => {
          const meta = CATEGORY_META[category]
          const isCollapsed = collapsed.has(category)
          const unlockedInCat = items.filter((a) => a.unlocked || a.progress >= a.target).length

          return (
            <div key={category} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleCollapse(category)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${meta.tint}`}>
                    {meta.iconBig}
                  </div>
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{meta.label}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {unlockedInCat} / {items.length}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 transition-all"
                      style={{ width: `${items.length > 0 ? Math.round((unlockedInCat / items.length) * 100) : 0}%` }}
                    />
                  </div>
                  {isCollapsed
                    ? <ChevronDown className="w-4 h-4 text-slate-400" />
                    : <ChevronUp className="w-4 h-4 text-slate-400" />
                  }
                </div>
              </button>

              {!isCollapsed && (
                <div className="px-5 pb-5 pt-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 border-t border-slate-100 dark:border-slate-700">
                  {items.map((a) => (
                    <AchievementCard key={a.id} achievement={a} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

function AchievementCard({ achievement }: { achievement: AchievementState }): React.JSX.Element {
  const meta = CATEGORY_META[achievement.category]
  const isUnlocked = achievement.unlocked || achievement.progress >= achievement.target
  const pct = Math.min(100, Math.round((achievement.progress / achievement.target) * 100))

  return (
    <div
      className={
        'border rounded-lg p-4 transition ' +
        (isUnlocked
          ? 'bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-800 shadow-sm'
          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 opacity-75')
      }
    >
      <div className="flex items-start gap-3">
        <div
          className={
            'w-9 h-9 rounded-full flex items-center justify-center shrink-0 ' +
            (isUnlocked ? meta.tint : 'text-slate-400 bg-slate-100 dark:bg-slate-700')
          }
        >
          {isUnlocked ? meta.icon : <Lock className="w-3.5 h-3.5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">{achievement.title}</h3>
            {achievement.unlocked && achievement.unlocked_at && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 shrink-0">
                {format(new Date(achievement.unlocked_at.replace(' ', 'T')), 'MMM d')}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{achievement.description}</p>
          <div className="mt-2.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 mb-1">
              <span>{achievement.progress} / {achievement.target}</span>
              <span>{pct}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={'h-full transition-all ' + (isUnlocked ? 'bg-amber-400' : 'bg-slate-300 dark:bg-slate-600')}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

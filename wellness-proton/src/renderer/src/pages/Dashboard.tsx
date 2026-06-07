import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Flame, Droplet, Dumbbell, Moon, Quote } from 'lucide-react'
import PageHeader from '../components/PageHeader'

export default function Dashboard(): React.JSX.Element {
  const today = format(new Date(), 'yyyy-MM-dd')

  const water = useQuery({
    queryKey: ['water', 'todaySummary'],
    queryFn: () => window.api.water.todaySummary()
  })

  const meals = useQuery({
    queryKey: ['meals', today],
    queryFn: () => window.api.meals.forDate(today)
  })

  const exercise = useQuery({
    queryKey: ['exercise', today],
    queryFn: () => window.api.exercise.forDate(today)
  })

  const sleep = useQuery({
    queryKey: ['sleep', 'recent', 1],
    queryFn: () => window.api.sleep.recent(1)
  })

  const streaks = useQuery({
    queryKey: ['streaks'],
    queryFn: () => window.api.achievements.streaks()
  })

  const quote = useQuery({
    queryKey: ['quote', 'today'],
    queryFn: () => window.api.quote.today(),
    staleTime: 24 * 60 * 60 * 1000
  })

  const waterPct =
    water.data && water.data.goal_ml
      ? Math.min(100, Math.round((water.data.total_ml / water.data.goal_ml) * 100))
      : 0

  const exerciseMin = exercise.data?.reduce((s, e) => s + e.duration_min, 0) ?? 0
  const mealsEaten = meals.data?.filter((m) => m.eaten === 1).length ?? 0
  const mealsTotal = meals.data?.length ?? 0

  return (
    <>
      <PageHeader title="Dashboard" subtitle={format(new Date(), 'EEEE, MMMM d')} />
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Tile label="Hydration" value={`${water.data?.total_ml ?? 0} ml`} sub={`${waterPct}% of goal`}>
            <ProgressBar pct={waterPct} />
          </Tile>
          <Tile
            label="Meals"
            value={`${mealsEaten} / ${mealsTotal}`}
            sub={mealsTotal === 0 ? 'No meals scheduled' : 'eaten today'}
          />
          <Tile
            label="Exercise"
            value={`${exerciseMin} min`}
            sub={`${exercise.data?.length ?? 0} sessions`}
          />
          <Tile
            label="Last sleep"
            value={sleep.data?.[0] ? formatHours(sleep.data[0].bedtime, sleep.data[0].wake_time) : '—'}
            sub={sleep.data?.[0] ? format(new Date(sleep.data[0].wake_time.replace(' ', 'T')), 'MMM d') : 'No data'}
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-900">Goal streaks</h3>
            <span className="text-xs text-slate-500">
              Days in a row at 90%+ of your goal
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StreakTile
              label="Hydration"
              days={streaks.data?.water ?? 0}
              icon={<Droplet className="w-5 h-5" />}
              color="text-sky-600 bg-sky-50"
            />
            <StreakTile
              label="Exercise"
              days={streaks.data?.exercise ?? 0}
              icon={<Dumbbell className="w-5 h-5" />}
              color="text-emerald-600 bg-emerald-50"
            />
            <StreakTile
              label="Sleep"
              days={streaks.data?.sleep ?? 0}
              icon={<Moon className="w-5 h-5" />}
              color="text-indigo-600 bg-indigo-50"
            />
          </div>
        </div>

        {quote.data?.q && (
          <div className="bg-linear-to-br from-brand-600 to-brand-700 rounded-lg p-5 text-white">
            <div className="flex items-start gap-3">
              <Quote className="w-5 h-5 text-brand-200 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm leading-relaxed font-medium">{quote.data.q}</p>
                <p className="text-xs text-brand-200 mt-2">— {quote.data.a}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function Tile({
  label,
  value,
  sub,
  children
}: {
  label: string
  value: string
  sub?: string
  children?: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">{label}</div>
      <div className="text-3xl font-semibold text-slate-900 mt-2">{value}</div>
      {sub && <div className="text-sm text-slate-500 mt-1">{sub}</div>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  )
}

function StreakTile({
  label,
  days,
  icon,
  color
}: {
  label: string
  days: number
  icon: React.ReactNode
  color: string
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 border border-slate-100">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">
          {label}
        </div>
        <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          {days < 2 ? <span className="text-slate-400">—</span> : (
            <>
              {days}
              <span className="text-sm text-slate-500 font-normal">
                {days === 1 ? 'day' : 'days'}
              </span>
              {days >= 3 && <Flame className="w-5 h-5 text-orange-500" />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ProgressBar({ pct }: { pct: number }): React.JSX.Element {
  return (
    <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
      <div className="h-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
    </div>
  )
}

function formatHours(bedtime: string, wakeTime: string): string {
  const ms = new Date(wakeTime.replace(' ', 'T')).getTime() - new Date(bedtime.replace(' ', 'T')).getTime()
  if (Number.isNaN(ms) || ms <= 0) return '—'
  const hours = ms / 3_600_000
  return `${hours.toFixed(1)}h`
}

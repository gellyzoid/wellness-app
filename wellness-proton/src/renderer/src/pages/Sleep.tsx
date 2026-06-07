import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { Trash2 } from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import PageHeader from '../components/PageHeader'
import type { SleepLog } from '../../../shared/types'

const RANGE_DAYS = 7

export default function Sleep(): React.JSX.Element {
  const qc = useQueryClient()
  const today = new Date().toISOString().slice(0, 10)

  const logs = useQuery({
    queryKey: ['sleep', 'recent', 14, today],
    queryFn: () => window.api.sleep.recent(14)
  })

  const stats = useQuery({
    queryKey: ['sleep', 'dailyStats', RANGE_DAYS, today],
    queryFn: () => window.api.sleep.dailyStats(RANGE_DAYS)
  })

  const settings = useQuery({
    queryKey: ['settings'],
    queryFn: () => window.api.settings.get()
  })

  const invalidate = (): void => {
    qc.invalidateQueries({ queryKey: ['sleep'] })
    qc.invalidateQueries({ queryKey: ['analytics'] })
  }

  const create = useMutation({
    mutationFn: (input: Omit<SleepLog, 'id'>) => window.api.sleep.create(input),
    onSuccess: invalidate
  })

  const remove = useMutation({
    mutationFn: (id: number) => window.api.sleep.delete(id),
    onSuccess: invalidate
  })

  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
  const [bedtime, setBedtime] = useState(`${yesterday}T23:00`)
  const [wake, setWake] = useState(`${today}T07:00`)
  const [quality, setQuality] = useState(4)

  const submit = (e: React.FormEvent): void => {
    e.preventDefault()
    create.mutate({
      bedtime: `${bedtime}:00`,
      wake_time: `${wake}:00`,
      quality
    })
  }

  const goalHours = settings.data?.sleep_goal_hours ?? 8
  const recentNights = stats.data?.filter((d) => d.hours > 0) ?? []
  const avgHours =
    recentNights.length > 0
      ? recentNights.reduce((s, d) => s + d.hours, 0) / recentNights.length
      : 0
  const sleepDebt = recentNights.reduce((s, d) => s + Math.max(0, goalHours - d.hours), 0)
  const lastNightHours = stats.data?.[stats.data.length - 1]?.hours ?? 0

  const chartData =
    stats.data?.map((d) => ({
      label: format(parseISO(d.date), 'EEE'),
      hours: d.hours
    })) ?? []

  return (
    <>
      <PageHeader title="Sleep" subtitle="Log your sleep schedule" />
      <div className="p-8 max-w-5xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Last night"
            value={`${lastNightHours.toFixed(1)}h`}
            sub={`Goal: ${goalHours}h`}
          />
          <StatCard
            label="7-day average"
            value={`${avgHours.toFixed(1)}h`}
            sub={`${recentNights.length} nights logged`}
          />
          <StatCard
            label="Sleep debt"
            value={`${sleepDebt.toFixed(1)}h`}
            sub="Total hours below goal"
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-900">Last 7 nights</h3>
            <span className="text-xs text-slate-500">Goal: {goalHours}h/night</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="sleepFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 12]}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}
                  formatter={(v) => [`${v}h`, 'Sleep']}
                />
                <ReferenceLine y={goalHours} stroke="#0ea5e9" strokeDasharray="4 4" />
                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#sleepFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="bg-white border border-slate-200 rounded-lg p-5 grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
        >
          <label className="text-xs text-slate-600">
            Bedtime
            <input
              type="datetime-local"
              value={bedtime}
              onChange={(e) => setBedtime(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md text-sm"
            />
          </label>
          <label className="text-xs text-slate-600">
            Wake time
            <input
              type="datetime-local"
              value={wake}
              onChange={(e) => setWake(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md text-sm"
            />
          </label>
          <label className="text-xs text-slate-600">
            Quality (1–5)
            <input
              type="number"
              min={1}
              max={5}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={create.isPending}
            className="px-4 py-2 bg-brand-600 text-white rounded-md text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            Log sleep
          </button>
        </form>

        {logs.data?.length === 0 && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-5">
            <p className="text-sm text-slate-500">No sleep logged yet.</p>
          </div>
        )}
        {Object.entries(
          (logs.data ?? []).reduce<Record<string, typeof logs.data>>((acc, l) => {
            const day = format(new Date(l.wake_time.replace(' ', 'T')), 'yyyy-MM-dd')
            if (!acc[day]) acc[day] = []
            acc[day]!.push(l)
            return acc
          }, {})
        )
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([day, entries]) => (
            <div key={day} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <div className="px-5 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {format(new Date(day + 'T12:00:00'), 'EEEE, MMM d')}
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {entries!.map((l) => {
                  const hours =
                    (new Date(l.wake_time.replace(' ', 'T')).getTime() - new Date(l.bedtime.replace(' ', 'T')).getTime()) / 3_600_000
                  return (
                    <div key={l.id} className="px-5 py-3 flex justify-between items-center text-sm">
                      <div>
                        <div className="text-slate-900 dark:text-slate-100 font-medium">{hours.toFixed(1)}h</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {format(new Date(l.bedtime.replace(' ', 'T')), 'h:mm a')} → {format(new Date(l.wake_time.replace(' ', 'T')), 'h:mm a')}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 dark:text-slate-500">★ {l.quality ?? '—'}</span>
                        <button
                          onClick={() => remove.mutate(l.id)}
                          disabled={remove.isPending}
                          className="text-slate-400 hover:text-rose-600 disabled:opacity-50"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        }
      </div>
    </>
  )
}

function StatCard({
  label,
  value,
  sub
}: {
  label: string
  value: string
  sub?: string
}): React.JSX.Element {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">{label}</div>
      <div className="text-2xl font-semibold text-slate-900 mt-2">{value}</div>
      {sub && <div className="text-sm text-slate-500 mt-1">{sub}</div>}
    </div>
  )
}

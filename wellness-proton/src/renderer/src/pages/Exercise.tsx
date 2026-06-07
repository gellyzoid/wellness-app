import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { Trash2, BookOpen, Zap } from 'lucide-react'
import { estimateCalories } from '../../../shared/met'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import PageHeader from '../components/PageHeader'
import WgerBrowser from '../components/WgerBrowser'
import type { ExerciseLog, WgerExercise } from '../../../shared/types'

const INTENSITIES: ExerciseLog['intensity'][] = ['light', 'moderate', 'vigorous']
const RANGE_DAYS = 7

export default function Exercise(): React.JSX.Element {
  const today = format(new Date(), 'yyyy-MM-dd')
  const qc = useQueryClient()

  const logs = useQuery({
    queryKey: ['exercise', today],
    queryFn: () => window.api.exercise.forDate(today)
  })

  const stats = useQuery({
    queryKey: ['exercise', 'dailyStats', RANGE_DAYS, today],
    queryFn: () => window.api.exercise.dailyStats(RANGE_DAYS)
  })

  const settings = useQuery({
    queryKey: ['settings'],
    queryFn: () => window.api.settings.get()
  })

  const invalidate = (): void => {
    qc.invalidateQueries({ queryKey: ['exercise'] })
    qc.invalidateQueries({ queryKey: ['analytics'] })
  }

  const create = useMutation({
    mutationFn: (input: Omit<ExerciseLog, 'id' | 'logged_at'>) =>
      window.api.exercise.create(input),
    onSuccess: invalidate
  })

  const remove = useMutation({
    mutationFn: (id: number) => window.api.exercise.delete(id),
    onSuccess: invalidate
  })

  const [activity, setActivity] = useState('')
  const [duration, setDuration] = useState('30')
  const [intensity, setIntensity] = useState<ExerciseLog['intensity']>('moderate')
  const [calories, setCalories] = useState('')
  const [caloriesEstimated, setCaloriesEstimated] = useState(false)
  const [exerciseCategory, setExerciseCategory] = useState<string | undefined>(undefined)
  const [showBrowser, setShowBrowser] = useState(false)

  const weightKg = settings.data?.weight_kg ?? 70

  // Recalculate calories whenever duration, intensity, or category changes (if currently estimated)
  useEffect(() => {
    if (!caloriesEstimated) return
    const dur = Number(duration)
    if (!dur) return
    setCalories(String(estimateCalories(dur, intensity, weightKg, exerciseCategory)))
  }, [duration, intensity, exerciseCategory, weightKg, caloriesEstimated])

  const handleSelectExercise = (ex: WgerExercise): void => {
    setActivity(ex.name)
    setExerciseCategory(ex.category)
    const dur = Number(duration) || 30
    const est = estimateCalories(dur, intensity, weightKg, ex.category)
    setCalories(String(est))
    setCaloriesEstimated(true)
    setShowBrowser(false)
  }

  const handleCaloriesChange = (val: string): void => {
    setCalories(val)
    setCaloriesEstimated(false) // user took over
  }

  const handleEstimate = (): void => {
    const dur = Number(duration) || 30
    const est = estimateCalories(dur, intensity, weightKg, exerciseCategory)
    setCalories(String(est))
    setCaloriesEstimated(true)
  }

  const submit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!activity.trim() || !duration) return
    create.mutate(
      {
        activity: activity.trim(),
        duration_min: Number(duration),
        intensity,
        calories: calories ? Number(calories) : null
      },
      {
        onSuccess: () => {
          setActivity('')
          setCalories('')
          setCaloriesEstimated(false)
          setExerciseCategory(undefined)
        }
      }
    )
  }

  const totalMin = logs.data?.reduce((s, l) => s + l.duration_min, 0) ?? 0
  const totalKcal = logs.data?.reduce((s, l) => s + (l.calories ?? 0), 0) ?? 0
  const goalMin = settings.data?.exercise_goal_min ?? 30
  const goalPct = Math.min(100, Math.round((totalMin / goalMin) * 100))

  const weeklyTotal = stats.data?.reduce((s, d) => s + d.total_min, 0) ?? 0
  const weeklyAvg = stats.data ? Math.round(weeklyTotal / RANGE_DAYS) : 0
  const chartData =
    stats.data?.map((d) => ({
      label: format(parseISO(d.date), 'EEE'),
      minutes: d.total_min
    })) ?? []

  return (
    <>
      {showBrowser && (
        <WgerBrowser onSelect={handleSelectExercise} onClose={() => setShowBrowser(false)} />
      )}
      <PageHeader title="Exercise" subtitle={`${totalMin} minutes today`} />
      <div className="p-8 max-w-5xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Today" value={`${totalMin} min`} sub={`${goalPct}% of ${goalMin} min goal`}>
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-brand-500 transition-all"
                style={{ width: `${goalPct}%` }}
              />
            </div>
          </StatCard>
          <StatCard label="Calories today" value={`${totalKcal} kcal`} sub={`${logs.data?.length ?? 0} sessions`} />
          <StatCard label="7-day average" value={`${weeklyAvg} min`} sub={`${weeklyTotal} min total`} />
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-900">Last 7 days</h3>
            <span className="text-xs text-slate-500">Goal: {goalMin} min/day</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}
                  formatter={(v) => [`${v} min`, 'Exercise']}
                />
                <ReferenceLine y={goalMin} stroke="#0ea5e9" strokeDasharray="4 4" />
                <Bar dataKey="minutes" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="bg-white border border-slate-200 rounded-lg p-5 grid grid-cols-1 md:grid-cols-6 gap-3"
        >
          <div className="md:col-span-2 flex gap-2">
            <input
              placeholder="Activity"
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-md text-sm min-w-0"
            />
            <button
              type="button"
              onClick={() => setShowBrowser(true)}
              className="px-2 py-2 border border-slate-200 rounded-md text-slate-500 hover:bg-slate-50 hover:text-brand-600"
              title="Browse exercise library"
            >
              <BookOpen className="w-4 h-4" />
            </button>
          </div>
          <input
            type="number"
            placeholder="min"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-md text-sm"
          />
          <select
            value={intensity}
            onChange={(e) => setIntensity(e.target.value as ExerciseLog['intensity'])}
            className="px-3 py-2 border border-slate-200 rounded-md text-sm"
          >
            {INTENSITIES.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
          <div className="flex gap-1">
            <input
              type="number"
              placeholder="kcal"
              value={calories}
              onChange={(e) => handleCaloriesChange(e.target.value)}
              className={
                'flex-1 px-3 py-2 border rounded-md text-sm min-w-0 ' +
                (caloriesEstimated
                  ? 'border-brand-300 bg-brand-50 text-brand-800'
                  : 'border-slate-200')
              }
            />
            <button
              type="button"
              onClick={handleEstimate}
              className="px-2 py-2 border border-slate-200 rounded-md text-slate-500 hover:bg-slate-50 hover:text-brand-600"
              title="Estimate calories from duration & intensity"
            >
              <Zap className="w-4 h-4" />
            </button>
          </div>
          <button
            type="submit"
            disabled={create.isPending}
            className="px-4 py-2 bg-brand-600 text-white rounded-md text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            Log
          </button>
        </form>

        <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
          {logs.data?.length === 0 && (
            <p className="p-5 text-sm text-slate-500">No exercise logged today.</p>
          )}
          {logs.data?.map((l) => (
            <div key={l.id} className="px-5 py-3 flex items-center justify-between">
              <div>
                <div className="text-slate-900">{l.activity}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {l.duration_min} min · {l.intensity}
                  {l.calories ? ` · ${l.calories} kcal` : ''}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">
                  {format(new Date(l.logged_at.replace(' ', 'T')), 'h:mm a')}
                </span>
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
          ))}
        </div>
      </div>
    </>
  )
}

function StatCard({
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
      <div className="text-2xl font-semibold text-slate-900 mt-2">{value}</div>
      {sub && <div className="text-sm text-slate-500 mt-1">{sub}</div>}
      {children}
    </div>
  )
}

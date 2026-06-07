import { useMemo, useRef, useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { Sparkles, Square, ChevronDown, ChevronUp } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useAiStore } from '../store/aiStore'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import PageHeader from '../components/PageHeader'
import type { AnalyticsSummary } from '../../../shared/types'

const RANGES = [
  { label: '7 days', value: 7 },
  { label: '14 days', value: 14 },
  { label: '30 days', value: 30 }
]

export default function Analytics(): React.JSX.Element {
  const [days, setDays] = useState(7)
  const [aiOpen, setAiOpen] = useState(false)
  const [aiStreaming, setAiStreaming] = useState(false)
  const aiSessionRef = useRef<string | null>(null)

  const [recStreaming, setRecStreaming] = useState(false)
  const recSessionRef = useRef<string | null>(null)

  const { overviewText: aiText, recText, appendOverview, appendRec, clearOverview, clearRec } = useAiStore()

  const data = useQuery({
    queryKey: ['analytics', 'summary', days],
    queryFn: () => window.api.analytics.summary(days)
  })

  const requestOverview = (summary: AnalyticsSummary): void => {
    if (aiStreaming) return
    clearOverview(days)
    setAiOpen(true)
    setAiStreaming(true)

    const sessionId = crypto.randomUUID()
    aiSessionRef.current = sessionId
    const ipc = window.electron.ipcRenderer

    const prompt =
      `Give me a concise wellness overview for the last ${days} days based on this analytics data. ` +
      `Highlight what's going well, what needs attention, and 2-3 specific actionable suggestions. ` +
      `Data:\n\`\`\`json\n${JSON.stringify(summary, null, 2)}\n\`\`\``

    const chunkCh = `assistant:chunk:${sessionId}`
    const doneCh = `assistant:done:${sessionId}`
    const errCh = `assistant:error:${sessionId}`

    const cleanup = (): void => {
      ipc.removeAllListeners(chunkCh)
      ipc.removeAllListeners(doneCh)
      ipc.removeAllListeners(errCh)
      setAiStreaming(false)
      aiSessionRef.current = null
    }

    ipc.on(chunkCh, (_e: unknown, text: string) => appendOverview(text))
    ipc.on(doneCh, () => cleanup())
    ipc.on(errCh, (_e: unknown, msg: string) => {
      if (msg !== 'cancelled') appendOverview(`\n\n_Error: ${msg}_`)
      cleanup()
    })

    window.api.assistant.chat({
      sessionId,
      history: [{ role: 'user', content: prompt }]
    })
  }

  const cancelOverview = (): void => {
    if (aiSessionRef.current) window.api.assistant.cancel(aiSessionRef.current)
  }

  const requestRecommendations = useCallback((summary: AnalyticsSummary): void => {
    if (recStreaming) return
    clearRec(days)
    setRecStreaming(true)

    const sessionId = crypto.randomUUID()
    recSessionRef.current = sessionId
    const ipc = window.electron.ipcRenderer

    const prompt =
      `Based on my wellness data for the last ${days} days, give me exactly 3 personalized, actionable recommendations — one for the area I'm struggling most, one to maintain what's going well, and one habit I could add this week. Be specific and practical.\n\nData:\n\`\`\`json\n${JSON.stringify(summary, null, 2)}\n\`\`\``

    const chunkCh = `assistant:chunk:${sessionId}`
    const doneCh = `assistant:done:${sessionId}`
    const errCh = `assistant:error:${sessionId}`

    const cleanup = (): void => {
      ipc.removeAllListeners(chunkCh)
      ipc.removeAllListeners(doneCh)
      ipc.removeAllListeners(errCh)
      setRecStreaming(false)
      recSessionRef.current = null
    }

    ipc.on(chunkCh, (_e: unknown, text: string) => appendRec(text))
    ipc.on(doneCh, () => cleanup())
    ipc.on(errCh, (_e: unknown, msg: string) => {
      if (msg !== 'cancelled') appendRec(`\n\n_Error: ${msg}_`)
      cleanup()
    })

    window.api.assistant.chat({ sessionId, history: [{ role: 'user', content: prompt }] })
  }, [recStreaming, days, clearRec, appendRec])

  const cancelRecommendations = (): void => {
    if (recSessionRef.current) window.api.assistant.cancel(recSessionRef.current)
  }

  const tickFormat = days > 14 ? 'd' : 'EEE'
  const fmtLabel = (d: string): string => format(parseISO(d), tickFormat)

  const waterChart = useMemo(
    () =>
      data.data?.water.map((d) => ({
        label: fmtLabel(d.date),
        ml: d.total_ml
      })) ?? [],
    [data.data, days]
  )
  const exerciseChart = useMemo(
    () =>
      data.data?.exercise.map((d) => ({
        label: fmtLabel(d.date),
        minutes: d.total_min,
        calories: d.total_calories
      })) ?? [],
    [data.data, days]
  )
  const sleepChart = useMemo(
    () =>
      data.data?.sleep.map((d) => ({
        label: fmtLabel(d.date),
        hours: d.hours
      })) ?? [],
    [data.data, days]
  )
  const mealsChart = useMemo(
    () =>
      data.data?.meals.map((d) => ({
        label: fmtLabel(d.date),
        eaten: d.eaten,
        scheduled: d.scheduled,
        calories: d.calories
      })) ?? [],
    [data.data, days]
  )

  const goals = data.data?.goals

  const hasAnyData = useMemo(() => {
    if (!data.data) return false
    const { exercise, sleep, water, meals } = data.data
    return (
      exercise.some((d) => d.total_min > 0) ||
      sleep.some((d) => d.hours > 0) ||
      water.some((d) => d.total_ml > 0) ||
      meals.some((d) => d.scheduled > 0)
    )
  }, [data.data])

  const totals = useMemo(() => {
    if (!data.data) return null
    const ex = data.data.exercise
    const sl = data.data.sleep.filter((d) => d.hours > 0)
    const wa = data.data.water
    const ml = data.data.meals
    return {
      exerciseMin: ex.reduce((s, d) => s + d.total_min, 0),
      exerciseAvg: ex.length ? Math.round(ex.reduce((s, d) => s + d.total_min, 0) / days) : 0,
      sleepAvg: sl.length ? sl.reduce((s, d) => s + d.hours, 0) / sl.length : 0,
      sleepNights: sl.length,
      waterAvg: wa.length ? Math.round(wa.reduce((s, d) => s + d.total_ml, 0) / days) : 0,
      mealsAdherence:
        ml.reduce((s, d) => s + d.scheduled, 0) > 0
          ? Math.round(
              (ml.reduce((s, d) => s + d.eaten, 0) /
                ml.reduce((s, d) => s + d.scheduled, 0)) *
                100
            )
          : 0
    }
  }, [data.data, days])

  return (
    <>
      <PageHeader title="Analytics" subtitle="Trends across all wellness metrics" />
      <div className="p-8 max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setDays(r.value)}
                className={
                  'px-3 py-1.5 text-xs rounded ' +
                  (days === r.value
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-600 hover:text-slate-900')
                }
              >
                {r.label}
              </button>
            ))}
          </div>
          {data.isLoading && <span className="text-xs text-slate-400">Loading…</span>}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-600" />
              <span className="text-sm font-medium text-slate-900">AI overview</span>
              {aiStreaming && (
                <span className="text-xs text-slate-400 animate-pulse">Generating…</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {aiStreaming ? (
                <button
                  onClick={cancelOverview}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-rose-600 text-white rounded-md hover:bg-rose-700"
                >
                  <Square className="w-3 h-3" /> Stop
                </button>
              ) : (
                <button
                  onClick={() => data.data && requestOverview(data.data)}
                  disabled={!hasAnyData}
                  title={!hasAnyData ? 'No data logged yet for this period' : undefined}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-3 h-3" />
                  {aiText ? 'Regenerate' : 'Get AI overview'}
                </button>
              )}
              {aiText && !aiStreaming && (
                <button
                  onClick={() => setAiOpen((o) => !o)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  {aiOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
          {aiOpen && aiText && (
            <div className="px-5 pb-4 border-t border-slate-100">
              <div className="markdown pt-3 text-sm text-slate-800 leading-relaxed">
                <ReactMarkdown>{aiText}</ReactMarkdown>
                {aiStreaming && (
                  <span className="inline-block w-1.5 h-4 bg-slate-400 ml-0.5 align-middle animate-pulse" />
                )}
              </div>
            </div>
          )}
        </div>

        {totals && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryTile
              label="Avg hydration"
              value={`${totals.waterAvg} ml`}
              sub={`Goal: ${goals?.water_ml ?? 0} ml`}
            />
            <SummaryTile
              label="Avg sleep"
              value={`${totals.sleepAvg.toFixed(1)}h`}
              sub={`${totals.sleepNights} nights · goal ${goals?.sleep_hours ?? 0}h`}
            />
            <SummaryTile
              label="Avg exercise"
              value={`${totals.exerciseAvg} min`}
              sub={`${totals.exerciseMin} min total`}
            />
            <SummaryTile
              label="Meal adherence"
              value={`${totals.mealsAdherence}%`}
              sub="Eaten vs scheduled"
            />
          </div>
        )}

        <ChartCard title="Hydration" subtitle={`Daily intake · goal ${goals?.water_ml ?? 0} ml`}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={waterChart} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}
                formatter={(v) => [`${v} ml`, 'Water']}
              />
              {goals?.water_ml ? (
                <ReferenceLine y={goals.water_ml} stroke="#0ea5e9" strokeDasharray="4 4" />
              ) : null}
              <Bar dataKey="ml" radius={[4, 4, 0, 0]}>
                {waterChart.map((d, i) => (
                  <Cell
                    key={i}
                    fill={
                      goals?.water_ml && d.ml >= goals.water_ml ? '#0ea5e9' : '#7dd3fc'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Sleep" subtitle={`Hours per night · goal ${goals?.sleep_hours ?? 0}h`}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={sleepChart} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
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
              {goals?.sleep_hours ? (
                <ReferenceLine y={goals.sleep_hours} stroke="#0ea5e9" strokeDasharray="4 4" />
              ) : null}
              <Line
                type="monotone"
                dataKey="hours"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Exercise" subtitle={`Minutes per day · goal ${goals?.exercise_min ?? 0} min`}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={exerciseChart} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}
                formatter={(v, name) =>
                  name === 'minutes' ? [`${v} min`, 'Exercise'] : [`${v} kcal`, 'Calories']
                }
              />
              {goals?.exercise_min ? (
                <ReferenceLine y={goals.exercise_min} stroke="#0ea5e9" strokeDasharray="4 4" />
              ) : null}
              <Bar dataKey="minutes" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Meals" subtitle="Eaten vs scheduled per day">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={mealsChart} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}
              />
              <Bar dataKey="scheduled" fill="#cbd5e1" radius={[4, 4, 0, 0]} name="Scheduled" />
              <Bar dataKey="eaten" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Eaten" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Personalized recommendations */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Personalized recommendations</span>
              {recStreaming && (
                <span className="text-xs text-slate-400 animate-pulse">Generating…</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {recStreaming ? (
                <button
                  onClick={cancelRecommendations}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-rose-600 text-white rounded-md hover:bg-rose-700"
                >
                  <Square className="w-3 h-3" /> Stop
                </button>
              ) : (
                <button
                  onClick={() => data.data && requestRecommendations(data.data)}
                  disabled={!hasAnyData}
                  title={!hasAnyData ? 'No data logged yet for this period' : undefined}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-3 h-3" />
                  {recText ? 'Refresh' : 'Get recommendations'}
                </button>
              )}
            </div>
          </div>
          {recText && (
            <div className="px-5 pb-5 border-t border-slate-100 dark:border-slate-700">
              <div className="markdown pt-3 text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                <ReactMarkdown>{recText}</ReactMarkdown>
                {recStreaming && (
                  <span className="inline-block w-1.5 h-4 bg-slate-400 ml-0.5 align-middle animate-pulse" />
                )}
              </div>
            </div>
          )}
          {!recText && !recStreaming && (
            <div className="px-5 pb-5 border-t border-slate-100 dark:border-slate-700">
              <p className="pt-3 text-sm text-slate-400 dark:text-slate-500">
                Click "Get recommendations" to receive 3 personalized suggestions based on your {days}-day data.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function SummaryTile({
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
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  )
}

function ChartCard({
  title,
  subtitle,
  children
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-900">{title}</h3>
        {subtitle && <span className="text-xs text-slate-500">{subtitle}</span>}
      </div>
      {children}
    </div>
  )
}

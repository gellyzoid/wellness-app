import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Download, Upload, AlertTriangle, Sparkles, CheckCircle2, XCircle, Power, RefreshCw } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import type { UserSettings, UpdaterStatus } from '../../../shared/types'

const GROQ_MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant'
]

type UpdateInput = Partial<Omit<UserSettings, 'id'>>

export default function Settings(): React.JSX.Element {
  const qc = useQueryClient()
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => window.api.settings.get() })

  const invalidateEverything = (): void => {
    qc.invalidateQueries()
  }

  const update = useMutation({
    mutationFn: (input: UpdateInput) => window.api.settings.update(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      qc.invalidateQueries({ queryKey: ['water'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
      qc.invalidateQueries({ queryKey: ['achievements'] })
      qc.invalidateQueries({ queryKey: ['streaks'] })
      toast.success('Settings saved.')
    }
  })

  const exportBackup = useMutation({
    mutationFn: () => window.api.backup.export(),
    onSuccess: (data) => {
      if (data?.saved) toast.success(`Backup saved to ${data.path}`)
    }
  })

  const testKey = useMutation({
    mutationFn: () => window.api.assistant.testKey()
  })

  const importBackup = useMutation({
    mutationFn: () => window.api.backup.import(),
    onSuccess: (data) => {
      invalidateEverything()
      if (data?.imported) toast.success(`Restored from ${data.path}`)
      else if (data?.error) toast.error(data.error)
    }
  })

  const reset = useMutation({
    mutationFn: () => window.api.backup.reset(),
    onSuccess: () => { invalidateEverything(); toast.success('All data cleared.') }
  })

  const [form, setForm] = useState<UpdateInput>({})
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    if (settings.data) {
      setForm({
        name: settings.data.name,
        daily_water_goal_ml: settings.data.daily_water_goal_ml,
        sleep_goal_hours: settings.data.sleep_goal_hours,
        exercise_goal_min: settings.data.exercise_goal_min,
        weight_kg: settings.data.weight_kg,
        theme: settings.data.theme,
        groq_api_key: settings.data.groq_api_key,
        ai_model: settings.data.ai_model,
        reminders_enabled: settings.data.reminders_enabled,
        water_reminder_enabled: settings.data.water_reminder_enabled,
        water_reminder_interval_min: settings.data.water_reminder_interval_min,
        water_reminder_start_hour: settings.data.water_reminder_start_hour,
        water_reminder_end_hour: settings.data.water_reminder_end_hour
      })
    }
  }, [settings.data])

  const set = <K extends keyof UpdateInput>(key: K, value: UpdateInput[K]): void =>
    setForm((f) => ({ ...f, [key]: value }))

  const submit = (e: React.FormEvent): void => {
    e.preventDefault()
    update.mutate(form)
  }

  const handleReset = (): void => {
    if (!confirmReset) {
      setConfirmReset(true)
      return
    }
    reset.mutate(undefined, { onSettled: () => setConfirmReset(false) })
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Personalize your wellness targets and reminders" />
      <div className="p-8 max-w-xl space-y-4">
        <form onSubmit={submit} className="space-y-4">
          <Section title="Profile">
            <Field label="Name">
              <input
                value={form.name ?? ''}
                onChange={(e) => set('name', e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md"
              />
            </Field>
            <Field label="Daily water goal (ml)">
              <input
                type="number"
                value={form.daily_water_goal_ml ?? 0}
                onChange={(e) => set('daily_water_goal_ml', Number(e.target.value))}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md"
              />
            </Field>
            <Field label="Sleep goal (hours)">
              <input
                type="number"
                step="0.5"
                value={form.sleep_goal_hours ?? 0}
                onChange={(e) => set('sleep_goal_hours', Number(e.target.value))}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md"
              />
            </Field>
            <Field label="Daily exercise goal (min)">
              <input
                type="number"
                min={0}
                value={form.exercise_goal_min ?? 0}
                onChange={(e) => set('exercise_goal_min', Number(e.target.value))}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md"
              />
            </Field>
            <Field label="Body weight (kg)">
              <input
                type="number"
                min={1}
                step={0.5}
                value={form.weight_kg ?? 70}
                onChange={(e) => set('weight_kg', Number(e.target.value))}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md"
              />
            </Field>
          </Section>

          <Section title="Appearance">
            <Field label="Theme">
              <select
                value={form.theme ?? 'light'}
                onChange={(e) => set('theme', e.target.value as 'light' | 'dark')}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md bg-white"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </Field>
          </Section>

          <Section title="AI assistant">
            <p className="text-xs text-slate-500 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
              <span>
                Powered by Groq. Your wellness data is sent only as part of each request — never
                stored externally. Get a free key at{' '}
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-brand-700"
                >
                  console.groq.com/keys
                </a>
                .
              </span>
            </p>
            <Field label="Groq API key">
              <input
                type="password"
                placeholder="gsk_…"
                value={form.groq_api_key ?? ''}
                onChange={(e) => set('groq_api_key', e.target.value || null)}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md font-mono text-xs"
              />
            </Field>
            <Field label="Model">
              <select
                value={form.ai_model ?? 'openai/gpt-oss-120b'}
                onChange={(e) => set('ai_model', e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md bg-white"
              >
                {GROQ_MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => testKey.mutate()}
                disabled={testKey.isPending}
                className="px-3 py-2 border border-slate-200 rounded-md text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                {testKey.isPending ? 'Testing…' : 'Test connection'}
              </button>
              {testKey.data?.ok && (
                <span className="text-xs text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Connected
                </span>
              )}
              {testKey.data && !testKey.data.ok && (
                <span className="text-xs text-rose-600 flex items-center gap-1">
                  <XCircle className="w-4 h-4" /> {testKey.data.error}
                </span>
              )}
            </div>
          </Section>

          <Section title="Reminders">
            <Toggle
              label="Enable all reminders"
              checked={form.reminders_enabled === 1}
              onChange={(v) => set('reminders_enabled', v ? 1 : 0)}
            />
            <Toggle
              label="Water reminders"
              checked={form.water_reminder_enabled === 1}
              onChange={(v) => set('water_reminder_enabled', v ? 1 : 0)}
            />
            <div className="grid grid-cols-3 gap-3">
              <Field label="Every (min)">
                <input
                  type="number"
                  min={15}
                  step={5}
                  value={form.water_reminder_interval_min ?? 60}
                  onChange={(e) => set('water_reminder_interval_min', Number(e.target.value))}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md"
                />
              </Field>
              <Field label="From (hour)">
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={form.water_reminder_start_hour ?? 9}
                  onChange={(e) => set('water_reminder_start_hour', Number(e.target.value))}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md"
                />
              </Field>
              <Field label="Until (hour)">
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={form.water_reminder_end_hour ?? 21}
                  onChange={(e) => set('water_reminder_end_hour', Number(e.target.value))}
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md"
                />
              </Field>
            </div>
          </Section>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={update.isPending}
              className="px-4 py-2 bg-brand-600 text-white rounded-md text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
            >
              Save changes
            </button>
          </div>
        </form>

        <StartOnBootSection />

        <UpdatesSection />

        <Section title="Backup & restore">
          <p className="text-xs text-slate-500">
            Export your data as a JSON file or restore from a previous backup. Import replaces all
            existing data.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => exportBackup.mutate()}
              disabled={exportBackup.isPending}
              className="inline-flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-md text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Export backup
            </button>
            <button
              type="button"
              onClick={() => importBackup.mutate()}
              disabled={importBackup.isPending}
              className="inline-flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-md text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              Import backup
            </button>
          </div>
        </Section>

        <div className="bg-white border border-rose-200 rounded-lg p-5 space-y-3">
          <h3 className="text-sm font-semibold text-rose-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Danger zone
          </h3>
          <p className="text-xs text-slate-500">
            Deletes all logs, meals, medications, and achievements. Your profile and goals are
            preserved.
          </p>
          <button
            type="button"
            onClick={handleReset}
            disabled={reset.isPending}
            className="px-3 py-2 border border-rose-300 text-rose-700 rounded-md text-sm font-medium hover:bg-rose-50 disabled:opacity-50"
          >
            {confirmReset ? 'Click again to confirm' : 'Reset all data'}
          </button>
        </div>
      </div>
    </>
  )
}

function Section({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {children}
    </div>
  )
}

function Field({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <label className="block text-sm">
      <span className="text-slate-700 font-medium">{label}</span>
      {children}
    </label>
  )
}

function Toggle({
  label,
  checked,
  onChange
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}): React.JSX.Element {
  return (
    <label className="flex items-center justify-between text-sm cursor-pointer">
      <span className="text-slate-700 font-medium">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4"
      />
    </label>
  )
}

function UpdatesSection(): React.JSX.Element {
  const [status, setStatus] = useState<UpdaterStatus>({ phase: 'idle' })

  useEffect(() => {
    window.api.updater.getStatus().then(setStatus)
    const unsub = window.api.updater.onStatus(setStatus)
    return unsub
  }, [])

  const check = useMutation({
    mutationFn: () => window.api.updater.checkForUpdates(),
    onSuccess: (res) => {
      if (!res.updateAvailable) toast('Already on the latest version.')
    },
    onError: () => toast.error('Could not check for updates.')
  })

  const download = useMutation({
    mutationFn: () => window.api.updater.downloadUpdate(),
    onError: () => toast.error('Download failed.')
  })

  const install = useMutation({
    mutationFn: () => window.api.updater.installUpdate()
  })

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
      <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
        <RefreshCw className="w-4 h-4 text-slate-500" />
        Updates
      </h3>

      {status.phase === 'error' && (
        <p className="text-xs text-rose-600">{status.message}</p>
      )}
      {status.phase === 'not-available' && (
        <p className="text-xs text-slate-500">You&apos;re on the latest version.</p>
      )}
      {status.phase === 'available' && (
        <p className="text-xs text-emerald-700">
          Version {status.version} is available.
        </p>
      )}
      {status.phase === 'downloading' && (
        <div className="space-y-1">
          <p className="text-xs text-slate-600">Downloading… {status.percent}%</p>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 transition-all"
              style={{ width: `${status.percent}%` }}
            />
          </div>
        </div>
      )}
      {status.phase === 'ready' && (
        <p className="text-xs text-emerald-700">Update downloaded — restart to apply.</p>
      )}

      <div className="flex flex-wrap gap-2">
        {(status.phase === 'idle' || status.phase === 'not-available' || status.phase === 'error') && (
          <button
            type="button"
            onClick={() => check.mutate()}
            disabled={check.isPending}
            className="inline-flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-md text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${check.isPending ? 'animate-spin' : ''}`} />
            {check.isPending ? 'Checking…' : 'Check for updates'}
          </button>
        )}
        {status.phase === 'available' && (
          <button
            type="button"
            onClick={() => download.mutate()}
            disabled={download.isPending}
            className="inline-flex items-center gap-2 px-3 py-2 bg-brand-600 text-white rounded-md text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {download.isPending ? 'Starting…' : 'Download update'}
          </button>
        )}
        {status.phase === 'ready' && (
          <button
            type="button"
            onClick={() => install.mutate()}
            className="inline-flex items-center gap-2 px-3 py-2 bg-brand-600 text-white rounded-md text-sm font-medium hover:bg-brand-700"
          >
            <RefreshCw className="w-4 h-4" />
            Restart &amp; install
          </button>
        )}
      </div>
    </div>
  )
}

function StartOnBootSection(): React.JSX.Element {
  const startupQuery = useQuery({
    queryKey: ['startup'],
    queryFn: () => window.api.startup.get()
  })

  const setStartup = useMutation({
    mutationFn: (enable: boolean) => window.api.startup.set(enable),
    onSuccess: () => startupQuery.refetch()
  })

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
      <h3 className="text-sm font-semibold text-slate-900">System</h3>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Power className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
          <div>
            <div className="text-sm font-medium text-slate-700">Start on boot</div>
            <div className="text-xs text-slate-500 mt-0.5">
              Automatically opens Wellness Proton when you turn on your PC, so your reminders
              and tracking are always running in the background.
            </div>
          </div>
        </div>
        <button
          type="button"
          disabled={startupQuery.isLoading || setStartup.isPending}
          onClick={() => setStartup.mutate(!startupQuery.data)}
          className={
            'shrink-0 w-10 h-6 rounded-full transition-colors relative ' +
            (startupQuery.data ? 'bg-brand-600' : 'bg-slate-200')
          }
          aria-label="Toggle start on boot"
        >
          <span
            className={
              'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ' +
              (startupQuery.data ? 'translate-x-5' : 'translate-x-1')
            }
          />
        </button>
      </div>
    </div>
  )
}

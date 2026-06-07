import { BrowserWindow, Notification } from 'electron'
import { getDb } from './db'

const USER_ID = 1
const TICK_MS = 60_000

let timer: NodeJS.Timeout | null = null
let mainWindow: BrowserWindow | null = null

export function startScheduler(window: BrowserWindow): void {
  mainWindow = window
  if (timer) return
  tick()
  timer = setInterval(tick, TICK_MS)
}

export function checkPastDueOnStartup(window: BrowserWindow): void {
  mainWindow = window
  const db = getDb()
  if (!Notification.isSupported()) return
  const user = db
    .prepare(`SELECT reminders_enabled FROM users WHERE id = ?`)
    .get(USER_ID) as { reminders_enabled: number } | undefined
  if (!user || user.reminders_enabled === 0) return

  const now = new Date()
  const todayDate = isoDate(now)
  const meds = db
    .prepare(
      `SELECT id, name, dose, time_of_day FROM medications
       WHERE user_id = ? AND active = 1 AND time_of_day IS NOT NULL`
    )
    .all(USER_ID) as { id: number; name: string; dose: string | null; time_of_day: string }[]

  for (const m of meds) {
    if (!isTimePast(now, m.time_of_day)) continue
    const takenToday = db
      .prepare(
        `SELECT 1 FROM medication_logs WHERE medication_id = ?
         AND date(taken_at, 'localtime') = date(?)`
      )
      .get(m.id, todayDate)
    if (takenToday) continue
    // Fire immediately without the fireOnce dedup so startup always reminds for missed doses
    const notification = new Notification({
      title: 'Missed medication reminder',
      body: m.dose ? `${m.name} (${m.dose}) was due at ${m.time_of_day}` : `${m.name} was due at ${m.time_of_day}`,
      silent: true
    })
    notification.on('click', () => {
      if (!mainWindow) return
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
      mainWindow.webContents.send('navigate', '/medications')
    })
    notification.show()
    if (!window.isDestroyed()) {
      window.webContents.send('play-chime')
      window.webContents.send('med:remind', {
        id: m.id,
        title: 'Missed medication reminder',
        body: m.dose ? `${m.name} (${m.dose}) — due at ${m.time_of_day}` : `${m.name} — due at ${m.time_of_day}`
      })
    }
  }
}

export function stopScheduler(): void {
  if (timer) clearInterval(timer)
  timer = null
}

function tick(): void {
  if (!Notification.isSupported()) return
  const db = getDb()
  const user = db
    .prepare(
      `SELECT reminders_enabled, water_reminder_enabled, water_reminder_interval_min,
              water_reminder_start_hour, water_reminder_end_hour
       FROM users WHERE id = ?`
    )
    .get(USER_ID) as {
    reminders_enabled: number
    water_reminder_enabled: number
    water_reminder_interval_min: number
    water_reminder_start_hour: number
    water_reminder_end_hour: number
  } | undefined
  if (!user || user.reminders_enabled === 0) return

  checkMedications()
  checkMeals()
  if (user.water_reminder_enabled === 1) {
    checkWater(
      user.water_reminder_interval_min,
      user.water_reminder_start_hour,
      user.water_reminder_end_hour
    )
  }
}

function checkMedications(): void {
  const db = getDb()
  const now = new Date()
  const todayDate = isoDate(now)
  const meds = db
    .prepare(
      `SELECT id, name, dose, time_of_day FROM medications
       WHERE user_id = ? AND active = 1 AND time_of_day IS NOT NULL`
    )
    .all(USER_ID) as { id: number; name: string; dose: string | null; time_of_day: string }[]

  for (const m of meds) {
    if (!isTimePast(now, m.time_of_day)) continue
    const takenToday = db
      .prepare(
        `SELECT 1 FROM medication_logs WHERE medication_id = ?
         AND date(taken_at) = date(?)`
      )
      .get(m.id, todayDate)
    if (takenToday) continue
    fireOnce(`med:${m.id}:${todayDate}`, 'medication', m.id, {
      title: 'Time for your medication',
      body: m.dose ? `${m.name} (${m.dose})` : m.name,
      route: '/medications'
    })
  }
}

function checkMeals(): void {
  const db = getDb()
  const now = new Date()
  const todayDate = isoDate(now)
  const meals = db
    .prepare(
      `SELECT id, name, slot, scheduled_at FROM meals
       WHERE user_id = ? AND eaten = 0 AND date(scheduled_at) = date(?)`
    )
    .all(USER_ID, todayDate) as {
    id: number
    name: string
    slot: string
    scheduled_at: string
  }[]

  for (const m of meals) {
    if (new Date(m.scheduled_at).getTime() > now.getTime()) continue
    fireOnce(`meal:${m.id}:${todayDate}`, 'meal', m.id, {
      title: `Time for ${m.slot}`,
      body: m.name,
      route: '/meals'
    })
  }
}

function checkWater(intervalMin: number, startHour: number, endHour: number): void {
  const now = new Date()
  const hour = now.getHours()
  if (hour < startHour || hour >= endHour) return

  const minutesSinceStart = (hour - startHour) * 60 + now.getMinutes()
  const slot = Math.floor(minutesSinceStart / intervalMin)
  const slotMinutes = slot * intervalMin
  const slotHour = startHour + Math.floor(slotMinutes / 60)
  const slotMin = slotMinutes % 60
  const slotKey = `water:${isoDate(now)}T${pad(slotHour)}:${pad(slotMin)}`

  if (slot === 0 && now.getMinutes() < 1 && hour === startHour) return

  fireOnce(slotKey, 'water', null, {
    title: 'Hydration check',
    body: 'Time for a glass of water.',
    route: '/water'
  })
}

function fireOnce(
  key: string,
  kind: string,
  targetId: number | null,
  payload: { title: string; body: string; route: string }
): void {
  const db = getDb()
  const existing = db
    .prepare('SELECT 1 FROM reminder_dispatches WHERE dispatch_key = ?')
    .get(key)
  if (existing) return
  db.prepare(
    'INSERT INTO reminder_dispatches (kind, target_id, dispatch_key) VALUES (?, ?, ?)'
  ).run(kind, targetId, key)

  const notification = new Notification({
    title: payload.title,
    body: payload.body,
    silent: true
  })
  notification.on('click', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
    mainWindow.webContents.send('navigate', payload.route)
  })
  notification.show()

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('play-chime')
    if (kind === 'medication' && targetId !== null) {
      mainWindow.webContents.send('med:remind', {
        id: targetId,
        title: payload.title,
        body: payload.body
      })
    }
  }
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function isTimePast(now: Date, hhmm: string): boolean {
  const [h, m] = hhmm.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return false
  return now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m)
}

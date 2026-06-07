import { app, BrowserWindow, ipcMain } from 'electron'
import { getDb } from './db'
import {
  evaluateAndUnlock,
  getAllAchievementStates,
  getStreaks,
  ACHIEVEMENTS
} from './achievements'
import { exportBackup, importBackup, resetAllData } from './backup'
import { buildSystemPrompt, buildWellnessContext } from './assistant/context'
import { streamChat, testKey, type ChatMessage as GroqChatMessage } from './assistant/groq'
import { searchExercises, getCategories, prefetchExercises, type WgerExercise, type WgerCategory } from './wger'
import { getQuoteOfTheDay } from '../shared/quotes'
import type {
  AchievementState,
  AnalyticsSummary,
  DailyExerciseStat,
  DailyMealStat,
  DailySleepStat,
  DailyWaterStat,
  ExerciseLog,
  ChatMessage,
  ChatSession,
  Meal,
  Medication,
  SleepLog,
  Streaks,
  UserSettings,
  WaterLog,
  WaterSummary
} from '../shared/types'

const USER_ID = 1

function triggerAchievements(): void {
  const newlyUnlocked = evaluateAndUnlock(getDb())
  if (newlyUnlocked.length === 0) return
  const defs = ACHIEVEMENTS.filter((a) => newlyUnlocked.includes(a.id))
  for (const w of BrowserWindow.getAllWindows()) {
    w.webContents.send(
      'achievements:unlocked',
      defs.map((d) => ({ id: d.id, title: d.title, description: d.description }))
    )
  }
}

export function registerIpcHandlers(): void {
  const db = getDb()

  ipcMain.handle('water:todaySummary', (): WaterSummary => {
    const logs = db
      .prepare(
        `SELECT id, amount_ml, datetime(logged_at, 'localtime') AS logged_at FROM water_logs
         WHERE user_id = ? AND date(logged_at) = date('now','localtime')
         ORDER BY logged_at DESC`
      )
      .all(USER_ID) as WaterLog[]
    const total_ml = logs.reduce((s, l) => s + l.amount_ml, 0)
    const goal = db
      .prepare('SELECT daily_water_goal_ml FROM users WHERE id = ?')
      .get(USER_ID) as { daily_water_goal_ml: number }
    return { total_ml, goal_ml: goal.daily_water_goal_ml, logs }
  })

  ipcMain.handle('water:add', (_e, amountMl: number) => {
    db.prepare('INSERT INTO water_logs (user_id, amount_ml) VALUES (?, ?)').run(USER_ID, amountMl)
    triggerAchievements()
  })

  ipcMain.handle('water:delete', (_e, id: number) => {
    db.prepare('DELETE FROM water_logs WHERE id = ? AND user_id = ?').run(id, USER_ID)
  })

  ipcMain.handle('meals:forDate', (_e, date: string): Meal[] => {
    return db
      .prepare(
        `SELECT id, name, slot, calories, scheduled_at, eaten FROM meals
         WHERE user_id = ? AND date(scheduled_at) = date(?)
         ORDER BY scheduled_at`
      )
      .all(USER_ID, date) as Meal[]
  })

  ipcMain.handle('meals:recent', (_e, days: number): Meal[] => {
    return db
      .prepare(
        `SELECT id, name, slot, calories, scheduled_at, eaten FROM meals
         WHERE user_id = ? AND date(scheduled_at) >= date('now','localtime',?)
         ORDER BY scheduled_at DESC`
      )
      .all(USER_ID, `-${days} days`) as Meal[]
  })

  ipcMain.handle('meals:create', (_e, input: Omit<Meal, 'id' | 'eaten'>): number => {
    const r = db
      .prepare(
        `INSERT INTO meals (user_id, name, slot, calories, scheduled_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(USER_ID, input.name, input.slot, input.calories, input.scheduled_at)
    triggerAchievements()
    return r.lastInsertRowid as number
  })

  ipcMain.handle('meals:toggleEaten', (_e, id: number) => {
    db.prepare('UPDATE meals SET eaten = 1 - eaten WHERE id = ? AND user_id = ?').run(id, USER_ID)
    triggerAchievements()
  })

  ipcMain.handle(
    'meals:update',
    (_e, id: number, input: { name: string; slot: string; calories: number | null; time: string }): void => {
      db.prepare(
        `UPDATE meals SET name = ?, slot = ?, calories = ?,
         scheduled_at = substr(scheduled_at, 1, 10) || 'T' || ? || ':00'
         WHERE id = ? AND user_id = ?`
      ).run(input.name, input.slot, input.calories, input.time, id, USER_ID)
    }
  )

  ipcMain.handle('meals:delete', (_e, id: number): void => {
    db.prepare('DELETE FROM meals WHERE id = ? AND user_id = ?').run(id, USER_ID)
  })

  ipcMain.handle('medications:list', (): Medication[] => {
    return db
      .prepare(
        `SELECT m.id, m.name, m.dose, m.frequency, m.time_of_day, m.active,
                CASE WHEN EXISTS (
                  SELECT 1 FROM medication_logs ml
                  WHERE ml.medication_id = m.id
                    AND date(ml.taken_at, 'localtime') = date('now','localtime')
                ) THEN 1 ELSE 0 END AS taken_today
         FROM medications m
         WHERE m.user_id = ? ORDER BY m.active DESC, m.name`
      )
      .all(USER_ID) as Medication[]
  })

  ipcMain.handle(
    'medications:create',
    (_e, input: Omit<Medication, 'id' | 'active' | 'taken_today'>): number => {
      const r = db
        .prepare(
          `INSERT INTO medications (user_id, name, dose, frequency, time_of_day)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(USER_ID, input.name, input.dose, input.frequency, input.time_of_day)
      return r.lastInsertRowid as number
    }
  )

  ipcMain.handle('medications:logTaken', (_e, id: number) => {
    const already = db
      .prepare(
        `SELECT 1 FROM medication_logs WHERE medication_id = ?
         AND date(taken_at, 'localtime') = date('now','localtime')`
      )
      .get(id)
    if (!already) {
      db.prepare('INSERT INTO medication_logs (medication_id) VALUES (?)').run(id)
      triggerAchievements()
    }
  })

  ipcMain.handle('medications:unlogTaken', (_e, id: number) => {
    db.prepare(
      `DELETE FROM medication_logs WHERE medication_id = ?
       AND date(taken_at, 'localtime') = date('now','localtime')`
    ).run(id)
  })

  ipcMain.handle(
    'medications:update',
    (_e, id: number, input: Omit<Medication, 'id' | 'active' | 'taken_today'>): void => {
      db.prepare(
        `UPDATE medications SET name = ?, dose = ?, frequency = ?, time_of_day = ? WHERE id = ? AND user_id = ?`
      ).run(input.name, input.dose, input.frequency, input.time_of_day, id, USER_ID)
    }
  )

  ipcMain.handle('medications:delete', (_e, id: number): { ok: boolean; reason?: string } => {
    const hasLogs = db
      .prepare('SELECT 1 FROM medication_logs WHERE medication_id = ? LIMIT 1')
      .get(id)
    if (hasLogs) {
      // Preserve logs so achievement progress is not lost — deactivate instead
      db.prepare('UPDATE medications SET active = 0 WHERE id = ? AND user_id = ?').run(id, USER_ID)
      return { ok: false, reason: 'This medication has logged doses. It has been deactivated to preserve your achievement progress.' }
    }
    db.prepare('DELETE FROM medications WHERE id = ? AND user_id = ?').run(id, USER_ID)
    return { ok: true }
  })

  ipcMain.handle('medications:toggleActive', (_e, id: number): void => {
    db.prepare(
      'UPDATE medications SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END WHERE id = ? AND user_id = ?'
    ).run(id, USER_ID)
  })

  ipcMain.handle('exercise:forDate', (_e, date: string): ExerciseLog[] => {
    return db
      .prepare(
        `SELECT id, activity, duration_min, intensity, calories, datetime(logged_at, 'localtime') AS logged_at FROM exercise_logs
         WHERE user_id = ? AND date(logged_at, 'localtime') = date(?)
         ORDER BY logged_at DESC`
      )
      .all(USER_ID, date) as ExerciseLog[]
  })

  ipcMain.handle(
    'exercise:create',
    (_e, input: Omit<ExerciseLog, 'id' | 'logged_at'>): number => {
      const r = db
        .prepare(
          `INSERT INTO exercise_logs (user_id, activity, duration_min, intensity, calories)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(USER_ID, input.activity, input.duration_min, input.intensity, input.calories)
      triggerAchievements()
      return r.lastInsertRowid as number
    }
  )

  ipcMain.handle('exercise:delete', (_e, id: number) => {
    db.prepare('DELETE FROM exercise_logs WHERE id = ? AND user_id = ?').run(id, USER_ID)
  })

  ipcMain.handle('exercise:dailyStats', (_e, days: number): DailyExerciseStat[] => {
    return exerciseDailyStats(db, days)
  })

  ipcMain.handle('sleep:recent', (_e, limit: number): SleepLog[] => {
    return db
      .prepare(
        `SELECT id, bedtime, wake_time, quality FROM sleep_logs
         WHERE user_id = ? ORDER BY bedtime DESC LIMIT ?`
      )
      .all(USER_ID, limit) as SleepLog[]
  })

  ipcMain.handle('sleep:create', (_e, input: Omit<SleepLog, 'id'>): number => {
    const r = db
      .prepare(
        `INSERT INTO sleep_logs (user_id, bedtime, wake_time, quality)
         VALUES (?, ?, ?, ?)`
      )
      .run(USER_ID, input.bedtime, input.wake_time, input.quality)
    triggerAchievements()
    return r.lastInsertRowid as number
  })

  ipcMain.handle('sleep:delete', (_e, id: number) => {
    db.prepare('DELETE FROM sleep_logs WHERE id = ? AND user_id = ?').run(id, USER_ID)
  })

  ipcMain.handle('sleep:dailyStats', (_e, days: number): DailySleepStat[] => {
    return sleepDailyStats(db, days)
  })

  ipcMain.handle('analytics:summary', (_e, days: number): AnalyticsSummary => {
    const goals = db
      .prepare(
        `SELECT daily_water_goal_ml, sleep_goal_hours, exercise_goal_min FROM users WHERE id = ?`
      )
      .get(USER_ID) as {
      daily_water_goal_ml: number
      sleep_goal_hours: number
      exercise_goal_min: number
    }
    return {
      exercise: exerciseDailyStats(db, days),
      sleep: sleepDailyStats(db, days),
      water: waterDailyStats(db, days),
      meals: mealDailyStats(db, days),
      goals: {
        water_ml: goals.daily_water_goal_ml,
        sleep_hours: goals.sleep_goal_hours,
        exercise_min: goals.exercise_goal_min
      }
    }
  })

  ipcMain.handle('settings:get', (): UserSettings => {
    return db
      .prepare(
        `SELECT id, name, daily_water_goal_ml, sleep_goal_hours, exercise_goal_min,
                weight_kg, theme, groq_api_key, ai_model,
                reminders_enabled, water_reminder_enabled,
                water_reminder_interval_min, water_reminder_start_hour, water_reminder_end_hour
         FROM users WHERE id = ?`
      )
      .get(USER_ID) as UserSettings
  })

  const ALLOWED_SETTINGS_COLUMNS = new Set([
    'name',
    'daily_water_goal_ml',
    'sleep_goal_hours',
    'exercise_goal_min',
    'weight_kg',
    'theme',
    'groq_api_key',
    'ai_model',
    'reminders_enabled',
    'water_reminder_enabled',
    'water_reminder_interval_min',
    'water_reminder_start_hour',
    'water_reminder_end_hour'
  ])

  ipcMain.handle('achievements:list', (): AchievementState[] => {
    return getAllAchievementStates(db)
  })

  ipcMain.handle('achievements:streaks', (): Streaks => {
    return getStreaks(db)
  })

  ipcMain.handle('backup:export', async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    return exportBackup(win)
  })

  ipcMain.handle('backup:import', async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    const result = await importBackup(win)
    if (result.imported) triggerAchievements()
    return result
  })

  ipcMain.handle('backup:reset', () => {
    resetAllData()
  })

  // ── AI Assistant ───────────────────────────────────────────────────
  const inFlight = new Map<string, AbortController>()

  ipcMain.handle(
    'assistant:chat',
    async (e, payload: { sessionId: string; history: GroqChatMessage[] }) => {
      const row = db
        .prepare(`SELECT groq_api_key, ai_model FROM users WHERE id = ?`)
        .get(USER_ID) as { groq_api_key: string | null; ai_model: string }
      const key = row.groq_api_key ?? ''
      const model = row.ai_model || 'openai/gpt-oss-120b'

      const ctx = buildWellnessContext()
      const messages: GroqChatMessage[] = [
        { role: 'system', content: buildSystemPrompt(ctx) },
        ...payload.history
      ]

      const sender = e.sender
      const send = (channel: string, data: unknown): void => {
        if (!sender.isDestroyed()) sender.send(channel, data)
      }

      const controller = new AbortController()
      inFlight.set(payload.sessionId, controller)
      const id = payload.sessionId

      await streamChat(key, model, messages, {
        signal: controller.signal,
        onChunk: (text) => send(`assistant:chunk:${id}`, text),
        onDone: () => {
          inFlight.delete(id)
          send(`assistant:done:${id}`, null)
        },
        onError: (msg) => {
          inFlight.delete(id)
          send(`assistant:error:${id}`, msg)
        }
      })
    }
  )

  ipcMain.handle('assistant:cancel', (_e, sessionId: string) => {
    const c = inFlight.get(sessionId)
    if (c) {
      c.abort()
      inFlight.delete(sessionId)
    }
  })

  ipcMain.handle('assistant:testKey', async () => {
    const row = db
      .prepare(`SELECT groq_api_key, ai_model FROM users WHERE id = ?`)
      .get(USER_ID) as { groq_api_key: string | null; ai_model: string }
    return testKey(row.groq_api_key ?? '', row.ai_model || 'openai/gpt-oss-120b')
  })

  ipcMain.handle('assistant:context', () => buildWellnessContext())

  // ── Start on boot ─────────────────────────────────────────────────
  ipcMain.handle('startup:get', () => {
    return app.getLoginItemSettings().openAtLogin
  })

  ipcMain.handle('startup:set', (_e, enable: boolean) => {
    app.setLoginItemSettings({ openAtLogin: enable })
  })

  // ── Daily quote ───────────────────────────────────────────────────
  ipcMain.handle('quote:today', (): { q: string; a: string } => {
    return getQuoteOfTheDay()
  })

  // ── Chat archive ───────────────────────────────────────────────────
  ipcMain.handle('chat:listSessions', (): ChatSession[] => {
    return db
      .prepare(
        `SELECT id, title, datetime(created_at, 'localtime') AS created_at
         FROM chat_sessions WHERE user_id = ? ORDER BY created_at DESC`
      )
      .all(USER_ID) as ChatSession[]
  })

  ipcMain.handle('chat:getMessages', (_e, sessionId: string): ChatMessage[] => {
    return db
      .prepare(
        `SELECT id, session_id, role, content, datetime(created_at, 'localtime') AS created_at
         FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC`
      )
      .all(sessionId) as ChatMessage[]
  })

  ipcMain.handle(
    'chat:saveSession',
    (_e, session: ChatSession, messages: ChatMessage[]): void => {
      db.prepare(
        `INSERT OR REPLACE INTO chat_sessions (id, user_id, title, created_at)
         VALUES (?, ?, ?, datetime('now'))`
      ).run(session.id, USER_ID, session.title)
      const insertMsg = db.prepare(
        `INSERT OR IGNORE INTO chat_messages (id, session_id, role, content) VALUES (?, ?, ?, ?)`
      )
      const insertMany = db.transaction((msgs: ChatMessage[]) => {
        for (const m of msgs) insertMsg.run(m.id, session.id, m.role, m.content)
      })
      insertMany(messages)
    }
  )

  ipcMain.handle('chat:deleteSession', (_e, sessionId: string): void => {
    db.prepare('DELETE FROM chat_sessions WHERE id = ? AND user_id = ?').run(sessionId, USER_ID)
  })

  // ── WGER exercise library ──────────────────────────────────────────
  ipcMain.handle(
    'wger:search',
    async (_e, query: string, categoryId?: number): Promise<WgerExercise[]> => {
      return searchExercises(query, categoryId)
    }
  )

  ipcMain.handle('wger:categories', async (): Promise<WgerCategory[]> => {
    return getCategories()
  })

  // Start prefetching in background so first search is fast
  prefetchExercises()

  ipcMain.handle(
    'settings:update',
    (_e, input: Partial<Omit<UserSettings, 'id'>>) => {
      const fields: string[] = []
      const values: unknown[] = []
      for (const [k, v] of Object.entries(input)) {
        if (!ALLOWED_SETTINGS_COLUMNS.has(k)) continue
        fields.push(`${k} = ?`)
        values.push(v)
      }
      if (fields.length === 0) return
      values.push(USER_ID)
      db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    }
  )
}

type DB = ReturnType<typeof getDb>

function buildDateSeries(days: number): string[] {
  const out: string[] = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

function exerciseDailyStats(db: DB, days: number): DailyExerciseStat[] {
  const rows = db
    .prepare(
      `SELECT date(logged_at, 'localtime') AS date,
              SUM(duration_min) AS total_min,
              COALESCE(SUM(calories), 0) AS total_calories,
              COUNT(*) AS sessions
       FROM exercise_logs
       WHERE user_id = ?
         AND date(logged_at, 'localtime') >= date('now','localtime', ?)
       GROUP BY date(logged_at, 'localtime')`
    )
    .all(USER_ID, `-${days - 1} days`) as {
    date: string
    total_min: number
    total_calories: number
    sessions: number
  }[]
  const map = new Map(rows.map((r) => [r.date, r]))
  return buildDateSeries(days).map((date) => {
    const r = map.get(date)
    return {
      date,
      total_min: r?.total_min ?? 0,
      total_calories: r?.total_calories ?? 0,
      sessions: r?.sessions ?? 0
    }
  })
}

function sleepDailyStats(db: DB, days: number): DailySleepStat[] {
  const rows = db
    .prepare(
      `SELECT date(wake_time, 'localtime') AS date,
              SUM((julianday(wake_time) - julianday(bedtime)) * 24.0) AS hours,
              AVG(quality) AS quality
       FROM sleep_logs
       WHERE user_id = ?
         AND date(wake_time, 'localtime') >= date('now','localtime', ?)
       GROUP BY date(wake_time, 'localtime')`
    )
    .all(USER_ID, `-${days - 1} days`) as {
    date: string
    hours: number | null
    quality: number | null
  }[]
  const map = new Map(rows.map((r) => [r.date, r]))
  return buildDateSeries(days).map((date) => {
    const r = map.get(date)
    return {
      date,
      hours: r?.hours ? Number(r.hours.toFixed(2)) : 0,
      quality: r?.quality ?? null
    }
  })
}

function waterDailyStats(db: DB, days: number): DailyWaterStat[] {
  const rows = db
    .prepare(
      `SELECT date(logged_at, 'localtime') AS date,
              SUM(amount_ml) AS total_ml
       FROM water_logs
       WHERE user_id = ?
         AND date(logged_at, 'localtime') >= date('now','localtime', ?)
       GROUP BY date(logged_at, 'localtime')`
    )
    .all(USER_ID, `-${days - 1} days`) as { date: string; total_ml: number }[]
  const map = new Map(rows.map((r) => [r.date, r]))
  return buildDateSeries(days).map((date) => ({
    date,
    total_ml: map.get(date)?.total_ml ?? 0
  }))
}

function mealDailyStats(db: DB, days: number): DailyMealStat[] {
  const rows = db
    .prepare(
      `SELECT date(scheduled_at) AS date,
              SUM(eaten) AS eaten,
              COUNT(*) AS scheduled,
              COALESCE(SUM(CASE WHEN eaten = 1 THEN calories ELSE 0 END), 0) AS calories
       FROM meals
       WHERE user_id = ?
         AND date(scheduled_at) >= date('now','localtime', ?)
       GROUP BY date(scheduled_at)`
    )
    .all(USER_ID, `-${days - 1} days`) as {
    date: string
    eaten: number
    scheduled: number
    calories: number
  }[]
  const map = new Map(rows.map((r) => [r.date, r]))
  return buildDateSeries(days).map((date) => {
    const r = map.get(date)
    return {
      date,
      eaten: r?.eaten ?? 0,
      scheduled: r?.scheduled ?? 0,
      calories: r?.calories ?? 0
    }
  })
}

import { getDb } from '../db'
import { getStreaks } from '../achievements'

const USER_ID = 1

export interface WellnessContext {
  date: string
  goals: {
    water_ml: number
    sleep_hours: number
    exercise_min: number
  }
  today: {
    water_ml: number
    exercise_min: number
    meals_eaten: number
    meals_scheduled: number
    medications_due_unmet: { name: string; time: string }[]
  }
  streaks: { water: number; exercise: number; sleep: number }
  last_7_days: {
    water_ml_per_day: { date: string; ml: number }[]
    exercise_min_per_day: { date: string; min: number }[]
    sleep_hours_per_night: { date: string; hours: number }[]
  }
  last_sleep: { date: string; hours: number; quality: number | null } | null
  active_medications: { name: string; dose: string | null; time_of_day: string | null }[]
}

export function buildWellnessContext(): WellnessContext {
  const db = getDb()
  const today = new Date().toISOString().slice(0, 10)

  const goalsRow = db
    .prepare(
      `SELECT daily_water_goal_ml, sleep_goal_hours, exercise_goal_min FROM users WHERE id = ?`
    )
    .get(USER_ID) as {
    daily_water_goal_ml: number
    sleep_goal_hours: number
    exercise_goal_min: number
  }

  const waterToday =
    (db
      .prepare(
        `SELECT COALESCE(SUM(amount_ml), 0) s FROM water_logs
         WHERE user_id = ? AND date(logged_at, 'localtime') = date('now','localtime')`
      )
      .get(USER_ID) as { s: number }).s

  const exerciseToday =
    (db
      .prepare(
        `SELECT COALESCE(SUM(duration_min), 0) s FROM exercise_logs
         WHERE user_id = ? AND date(logged_at, 'localtime') = date('now','localtime')`
      )
      .get(USER_ID) as { s: number }).s

  const mealsToday = db
    .prepare(
      `SELECT COUNT(*) total, SUM(eaten) eaten FROM meals
       WHERE user_id = ? AND date(scheduled_at) = date('now','localtime')`
    )
    .get(USER_ID) as { total: number; eaten: number | null }

  const medsDue = db
    .prepare(
      `SELECT name, time_of_day FROM medications m
       WHERE user_id = ? AND active = 1 AND time_of_day IS NOT NULL
         AND time_of_day <= strftime('%H:%M', 'now', 'localtime')
         AND NOT EXISTS (
           SELECT 1 FROM medication_logs ml
           WHERE ml.medication_id = m.id
             AND date(ml.taken_at, 'localtime') = date('now','localtime')
         )`
    )
    .all(USER_ID) as { name: string; time_of_day: string }[]

  const water7 = db
    .prepare(
      `SELECT date(logged_at, 'localtime') d, COALESCE(SUM(amount_ml), 0) v
       FROM water_logs WHERE user_id = ?
         AND date(logged_at, 'localtime') >= date('now','localtime','-6 days')
       GROUP BY d ORDER BY d`
    )
    .all(USER_ID) as { d: string; v: number }[]

  const exercise7 = db
    .prepare(
      `SELECT date(logged_at, 'localtime') d, COALESCE(SUM(duration_min), 0) v
       FROM exercise_logs WHERE user_id = ?
         AND date(logged_at, 'localtime') >= date('now','localtime','-6 days')
       GROUP BY d ORDER BY d`
    )
    .all(USER_ID) as { d: string; v: number }[]

  const sleep7 = db
    .prepare(
      `SELECT date(wake_time, 'localtime') d,
              ROUND(SUM((julianday(wake_time) - julianday(bedtime)) * 24.0), 2) v
       FROM sleep_logs WHERE user_id = ?
         AND date(wake_time, 'localtime') >= date('now','localtime','-6 days')
       GROUP BY d ORDER BY d`
    )
    .all(USER_ID) as { d: string; v: number }[]

  const lastSleep = db
    .prepare(
      `SELECT date(wake_time, 'localtime') d,
              ROUND((julianday(wake_time) - julianday(bedtime)) * 24.0, 2) hours,
              quality
       FROM sleep_logs WHERE user_id = ?
       ORDER BY wake_time DESC LIMIT 1`
    )
    .get(USER_ID) as { d: string; hours: number; quality: number | null } | undefined

  const meds = db
    .prepare(
      `SELECT name, dose, time_of_day FROM medications
       WHERE user_id = ? AND active = 1
       ORDER BY name`
    )
    .all(USER_ID) as { name: string; dose: string | null; time_of_day: string | null }[]

  return {
    date: today,
    goals: {
      water_ml: goalsRow.daily_water_goal_ml,
      sleep_hours: goalsRow.sleep_goal_hours,
      exercise_min: goalsRow.exercise_goal_min
    },
    today: {
      water_ml: waterToday,
      exercise_min: exerciseToday,
      meals_eaten: mealsToday.eaten ?? 0,
      meals_scheduled: mealsToday.total,
      medications_due_unmet: medsDue.map((m) => ({ name: m.name, time: m.time_of_day }))
    },
    streaks: getStreaks(db),
    last_7_days: {
      water_ml_per_day: water7.map((r) => ({ date: r.d, ml: r.v })),
      exercise_min_per_day: exercise7.map((r) => ({ date: r.d, min: r.v })),
      sleep_hours_per_night: sleep7.map((r) => ({ date: r.d, hours: r.v }))
    },
    last_sleep: lastSleep
      ? { date: lastSleep.d, hours: lastSleep.hours, quality: lastSleep.quality }
      : null,
    active_medications: meds
  }
}

export function buildSystemPrompt(ctx: WellnessContext): string {
  return `You are VitaCloud, a dedicated Health & Wellness Expert Companion built into Wellness Proton. You combine the knowledge of a certified health coach, nutritionist, exercise physiologist, and sleep specialist to help the user build sustainable, evidence-based habits across hydration, nutrition, exercise, sleep, and medication adherence.

Your personality: warm, encouraging, and direct. You celebrate progress, normalise setbacks, and always move the conversation toward the next concrete action. You speak like a trusted expert friend — knowledgeable but never condescending.

Core rules:
- You are NOT a licensed physician. Never diagnose conditions or recommend changing/stopping medications. When a question crosses into clinical territory, acknowledge it genuinely and advise the user to consult a qualified healthcare professional.
- Ground every response in the user's actual data below. Do not invent or assume numbers.
- Keep answers concise (under 150 words) unless the user explicitly asks for more depth.
- When suggesting a workout, meal plan, or daily routine, make it specific, realistic, and tied to the user's current goals and progress.
- Use markdown sparingly: short bullet lists are fine, avoid heavy headings. Emojis are welcome but not overdone.
- If the user seems stressed, burnt out, or discouraged, acknowledge the feeling before offering advice.

Today is ${ctx.date}. Here is the user's live wellness snapshot (JSON):
\`\`\`json
${JSON.stringify(ctx, null, 2)}
\`\`\``
}

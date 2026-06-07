import type Database from 'better-sqlite3'

export type AchievementCategory = 'water' | 'exercise' | 'sleep' | 'meals' | 'medication' | 'meta'

export interface AchievementDef {
  id: string
  title: string
  description: string
  category: AchievementCategory
  /**
   * Returns current progress towards `target`. Unlock fires when progress >= target.
   * Implementation must be cheap — it runs after every relevant log mutation.
   */
  evaluate: (db: Database.Database, userId: number) => { progress: number; target: number }
}

const USER_ID = 1

export const ACHIEVEMENTS: AchievementDef[] = [
  // ── Water ──────────────────────────────────────────────────────────
  {
    id: 'water_first_sip',
    title: 'First Sip',
    description: 'Log your first glass of water',
    category: 'water',
    evaluate: (db) => ({
      progress: count(db, `SELECT COUNT(*) c FROM water_logs WHERE user_id = ?`),
      target: 1
    })
  },
  {
    id: 'water_goal_day',
    title: 'Hydration Hero',
    description: 'Hit your daily water goal',
    category: 'water',
    evaluate: (db) => {
      const today = count(
        db,
        `SELECT COALESCE(SUM(amount_ml), 0) c FROM water_logs
         WHERE user_id = ? AND date(logged_at, 'localtime') = date('now','localtime')`
      )
      const goal = count(db, `SELECT daily_water_goal_ml c FROM users WHERE id = ?`)
      return { progress: today, target: goal || 2000 }
    }
  },
  {
    id: 'water_streak_7',
    title: '7-Day Hydration Streak',
    description: 'Hit your water goal 7 days in a row',
    category: 'water',
    evaluate: (db) => ({
      progress: waterStreak(db),
      target: 7
    })
  },
  {
    id: 'water_streak_30',
    title: 'Hydration Master',
    description: 'Hit your water goal 30 days in a row',
    category: 'water',
    evaluate: (db) => ({
      progress: waterStreak(db),
      target: 30
    })
  },

  // ── Water (extra) ─────────────────────────────────────────────────
  {
    id: 'water_logs_50',
    title: 'Steady Sipper',
    description: 'Log water 50 times',
    category: 'water',
    evaluate: (db) => ({
      progress: count(db, `SELECT COUNT(*) c FROM water_logs WHERE user_id = ?`),
      target: 50
    })
  },
  {
    id: 'water_logs_200',
    title: 'Fountain of Youth',
    description: 'Log water 200 times',
    category: 'water',
    evaluate: (db) => ({
      progress: count(db, `SELECT COUNT(*) c FROM water_logs WHERE user_id = ?`),
      target: 200
    })
  },
  {
    id: 'water_streak_14',
    title: 'Hydration Habit',
    description: 'Hit your water goal 14 days in a row',
    category: 'water',
    evaluate: (db) => ({
      progress: waterStreak(db),
      target: 14
    })
  },

  // ── Exercise ───────────────────────────────────────────────────────
  {
    id: 'exercise_first',
    title: 'Getting Started',
    description: 'Log your first workout',
    category: 'exercise',
    evaluate: (db) => ({
      progress: count(db, `SELECT COUNT(*) c FROM exercise_logs WHERE user_id = ?`),
      target: 1
    })
  },
  {
    id: 'exercise_sessions_10',
    title: 'Ten Down',
    description: 'Complete 10 workouts',
    category: 'exercise',
    evaluate: (db) => ({
      progress: count(db, `SELECT COUNT(*) c FROM exercise_logs WHERE user_id = ?`),
      target: 10
    })
  },
  {
    id: 'exercise_sessions_50',
    title: 'Gym Rat',
    description: 'Complete 50 workouts',
    category: 'exercise',
    evaluate: (db) => ({
      progress: count(db, `SELECT COUNT(*) c FROM exercise_logs WHERE user_id = ?`),
      target: 50
    })
  },
  {
    id: 'exercise_100_min',
    title: 'Century',
    description: 'Accumulate 100 minutes of exercise',
    category: 'exercise',
    evaluate: (db) => ({
      progress: count(
        db,
        `SELECT COALESCE(SUM(duration_min), 0) c FROM exercise_logs WHERE user_id = ?`
      ),
      target: 100
    })
  },
  {
    id: 'exercise_500_min',
    title: 'Iron Lungs',
    description: 'Accumulate 500 minutes of exercise',
    category: 'exercise',
    evaluate: (db) => ({
      progress: count(
        db,
        `SELECT COALESCE(SUM(duration_min), 0) c FROM exercise_logs WHERE user_id = ?`
      ),
      target: 500
    })
  },
  {
    id: 'exercise_1000_min',
    title: 'Unstoppable',
    description: 'Accumulate 1000 minutes of exercise',
    category: 'exercise',
    evaluate: (db) => ({
      progress: count(
        db,
        `SELECT COALESCE(SUM(duration_min), 0) c FROM exercise_logs WHERE user_id = ?`
      ),
      target: 1000
    })
  },
  {
    id: 'exercise_vigorous_10',
    title: 'Beast Mode',
    description: 'Log 10 vigorous intensity workouts',
    category: 'exercise',
    evaluate: (db) => ({
      progress: count(
        db,
        `SELECT COUNT(*) c FROM exercise_logs WHERE user_id = ? AND intensity = 'vigorous'`
      ),
      target: 10
    })
  },
  {
    id: 'exercise_streak_7',
    title: 'Active Week',
    description: 'Hit your exercise goal 7 days in a row',
    category: 'exercise',
    evaluate: (db) => ({
      progress: exerciseStreak(db),
      target: 7
    })
  },
  {
    id: 'exercise_streak_14',
    title: 'Two-Week Warrior',
    description: 'Hit your exercise goal 14 days in a row',
    category: 'exercise',
    evaluate: (db) => ({
      progress: exerciseStreak(db),
      target: 14
    })
  },

  // ── Sleep ──────────────────────────────────────────────────────────
  {
    id: 'sleep_first',
    title: 'Sweet Dreams',
    description: 'Log your first night of sleep',
    category: 'sleep',
    evaluate: (db) => ({
      progress: count(db, `SELECT COUNT(*) c FROM sleep_logs WHERE user_id = ?`),
      target: 1
    })
  },
  {
    id: 'sleep_logs_7',
    title: 'Sleep Tracker',
    description: 'Log 7 nights of sleep',
    category: 'sleep',
    evaluate: (db) => ({
      progress: count(db, `SELECT COUNT(*) c FROM sleep_logs WHERE user_id = ?`),
      target: 7
    })
  },
  {
    id: 'sleep_logs_30',
    title: 'Sleep Scholar',
    description: 'Log 30 nights of sleep',
    category: 'sleep',
    evaluate: (db) => ({
      progress: count(db, `SELECT COUNT(*) c FROM sleep_logs WHERE user_id = ?`),
      target: 30
    })
  },
  {
    id: 'sleep_streak_7',
    title: 'Well Rested',
    description: 'Hit your sleep goal 7 nights in a row',
    category: 'sleep',
    evaluate: (db) => ({
      progress: sleepStreak(db),
      target: 7
    })
  },
  {
    id: 'sleep_streak_14',
    title: 'Sleep Champion',
    description: 'Hit your sleep goal 14 nights in a row',
    category: 'sleep',
    evaluate: (db) => ({
      progress: sleepStreak(db),
      target: 14
    })
  },
  {
    id: 'sleep_quality_5',
    title: 'Five-Star Slumber',
    description: 'Log a night of perfect (5★) sleep quality',
    category: 'sleep',
    evaluate: (db) => ({
      progress: count(
        db,
        `SELECT COUNT(*) c FROM sleep_logs WHERE user_id = ? AND quality = 5`
      ),
      target: 1
    })
  },
  {
    id: 'sleep_quality_5_five_times',
    title: 'Dream Weaver',
    description: 'Log 5 nights of perfect (5★) sleep quality',
    category: 'sleep',
    evaluate: (db) => ({
      progress: count(
        db,
        `SELECT COUNT(*) c FROM sleep_logs WHERE user_id = ? AND quality = 5`
      ),
      target: 5
    })
  },

  // ── Meals ──────────────────────────────────────────────────────────
  {
    id: 'meals_planned_10',
    title: 'Meal Prep',
    description: 'Plan 10 meals',
    category: 'meals',
    evaluate: (db) => ({
      progress: count(db, `SELECT COUNT(*) c FROM meals WHERE user_id = ?`),
      target: 10
    })
  },
  {
    id: 'meals_planned_50',
    title: 'Sous Chef',
    description: 'Plan 50 meals',
    category: 'meals',
    evaluate: (db) => ({
      progress: count(db, `SELECT COUNT(*) c FROM meals WHERE user_id = ?`),
      target: 50
    })
  },
  {
    id: 'meals_planned_100',
    title: 'Head Chef',
    description: 'Plan 100 meals',
    category: 'meals',
    evaluate: (db) => ({
      progress: count(db, `SELECT COUNT(*) c FROM meals WHERE user_id = ?`),
      target: 100
    })
  },
  {
    id: 'meals_full_day',
    title: 'Clean Plate Club',
    description: 'Eat every meal you planned for a day',
    category: 'meals',
    evaluate: (db) => ({
      progress: mealsFullDays(db),
      target: 1
    })
  },
  {
    id: 'meals_full_week',
    title: 'Consistent Eater',
    description: 'Eat every planned meal for 7 days',
    category: 'meals',
    evaluate: (db) => ({
      progress: mealsFullDays(db),
      target: 7
    })
  },
  {
    id: 'meals_breakfast_streak_7',
    title: 'Early Bird',
    description: 'Eat breakfast 7 days in a row',
    category: 'meals',
    evaluate: (db) => ({
      progress: breakfastStreak(db),
      target: 7
    })
  },

  // ── Medication ─────────────────────────────────────────────────────
  {
    id: 'meds_first',
    title: 'On Track',
    description: 'Log a medication taken',
    category: 'medication',
    evaluate: (db) => ({
      progress: count(
        db,
        `SELECT COUNT(*) c FROM medication_logs ml
         JOIN medications m ON m.id = ml.medication_id WHERE m.user_id = ?`
      ),
      target: 1
    })
  },
  {
    id: 'meds_taken_30',
    title: 'Dose Discipline',
    description: 'Log a medication taken 30 times',
    category: 'medication',
    evaluate: (db) => ({
      progress: count(
        db,
        `SELECT COUNT(*) c FROM medication_logs ml
         JOIN medications m ON m.id = ml.medication_id WHERE m.user_id = ?`
      ),
      target: 30
    })
  },
  {
    id: 'meds_taken_100',
    title: 'Never Miss a Dose',
    description: 'Log a medication taken 100 times',
    category: 'medication',
    evaluate: (db) => ({
      progress: count(
        db,
        `SELECT COUNT(*) c FROM medication_logs ml
         JOIN medications m ON m.id = ml.medication_id WHERE m.user_id = ?`
      ),
      target: 100
    })
  },

  // ── Meta ───────────────────────────────────────────────────────────
  {
    id: 'all_four_day',
    title: 'Perfect Balance',
    description: 'Log water, meal, exercise, and sleep all in the same day',
    category: 'meta',
    evaluate: (db) => ({
      progress: allFourDays(db),
      target: 1
    })
  },
  {
    id: 'all_four_week',
    title: 'Wellness Week',
    description: 'Achieve perfect balance for 7 days',
    category: 'meta',
    evaluate: (db) => ({
      progress: allFourDays(db),
      target: 7
    })
  },
  {
    id: 'early_adopter',
    title: 'Early Adopter',
    description: 'Use the app for the first time',
    category: 'meta',
    evaluate: (db) => ({
      progress: count(db, `SELECT COUNT(*) c FROM users WHERE id = ?`),
      target: 1
    })
  },
  {
    id: 'all_categories_tried',
    title: 'Well Rounded',
    description: 'Log at least one entry in every category (water, exercise, sleep, meal, medication)',
    category: 'meta',
    evaluate: (db) => {
      const hasWater = count(db, `SELECT COUNT(*) c FROM water_logs WHERE user_id = ?`) > 0 ? 1 : 0
      const hasExercise = count(db, `SELECT COUNT(*) c FROM exercise_logs WHERE user_id = ?`) > 0 ? 1 : 0
      const hasSleep = count(db, `SELECT COUNT(*) c FROM sleep_logs WHERE user_id = ?`) > 0 ? 1 : 0
      const hasMeals = count(db, `SELECT COUNT(*) c FROM meals WHERE user_id = ?`) > 0 ? 1 : 0
      const hasMeds = count(
        db,
        `SELECT COUNT(*) c FROM medication_logs ml
         JOIN medications m ON m.id = ml.medication_id WHERE m.user_id = ?`
      ) > 0 ? 1 : 0
      return { progress: hasWater + hasExercise + hasSleep + hasMeals + hasMeds, target: 5 }
    }
  },
  {
    id: 'app_veteran',
    title: 'App Veteran',
    description: 'Have data logged across 30 different days',
    category: 'meta',
    evaluate: (db) => ({
      progress: activeDays(db),
      target: 30
    })
  },
  {
    id: 'app_legend',
    title: 'Wellness Legend',
    description: 'Have data logged across 100 different days',
    category: 'meta',
    evaluate: (db) => ({
      progress: activeDays(db),
      target: 100
    })
  }
]

function count(db: Database.Database, sql: string): number {
  const row = db.prepare(sql).get(USER_ID) as { c: number } | undefined
  return row?.c ?? 0
}

// ── Streak helpers ───────────────────────────────────────────────────

const STREAK_THRESHOLD = 0.9

function waterStreak(db: Database.Database): number {
  const goal =
    (db.prepare(`SELECT daily_water_goal_ml g FROM users WHERE id = ?`).get(USER_ID) as
      | { g: number }
      | undefined)?.g ?? 2000
  const threshold = goal * STREAK_THRESHOLD
  return computeStreak(db, (date) => {
    const r = db
      .prepare(
        `SELECT COALESCE(SUM(amount_ml), 0) s FROM water_logs
         WHERE user_id = ? AND date(logged_at, 'localtime') = ?`
      )
      .get(USER_ID, date) as { s: number }
    return r.s >= threshold
  })
}

function exerciseStreak(db: Database.Database): number {
  const goal =
    (db.prepare(`SELECT exercise_goal_min g FROM users WHERE id = ?`).get(USER_ID) as
      | { g: number }
      | undefined)?.g ?? 30
  const threshold = goal * STREAK_THRESHOLD
  return computeStreak(db, (date) => {
    const r = db
      .prepare(
        `SELECT COALESCE(SUM(duration_min), 0) s FROM exercise_logs
         WHERE user_id = ? AND date(logged_at, 'localtime') = ?`
      )
      .get(USER_ID, date) as { s: number }
    return r.s >= threshold
  })
}

function sleepStreak(db: Database.Database): number {
  const goal =
    (db.prepare(`SELECT sleep_goal_hours g FROM users WHERE id = ?`).get(USER_ID) as
      | { g: number }
      | undefined)?.g ?? 8
  const threshold = goal * STREAK_THRESHOLD
  return computeStreak(db, (date) => {
    const r = db
      .prepare(
        `SELECT COALESCE(SUM((julianday(wake_time) - julianday(bedtime)) * 24.0), 0) s
         FROM sleep_logs
         WHERE user_id = ? AND date(wake_time, 'localtime') = ?`
      )
      .get(USER_ID, date) as { s: number }
    return r.s >= threshold
  })
}

/**
 * Counts consecutive days ending today (or yesterday if today not yet met) where `predicate(date)` is true.
 * Looks back at most 365 days.
 */
export function computeStreak(
  _db: Database.Database,
  predicate: (date: string) => boolean
): number {
  const today = new Date()
  let count = 0

  const todayStr = isoDate(today)
  const todayMet = predicate(todayStr)

  // If today isn't met yet, start from yesterday so an in-progress day doesn't break a real streak.
  const start = new Date(today)
  if (!todayMet) {
    start.setDate(start.getDate() - 1)
  }

  for (let i = 0; i < 365; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() - i)
    if (predicate(isoDate(d))) {
      count++
    } else {
      break
    }
  }
  return count
}

function mealsFullDays(db: Database.Database): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) c FROM (
         SELECT date(scheduled_at) d FROM meals
         WHERE user_id = ?
         GROUP BY date(scheduled_at)
         HAVING COUNT(*) > 0 AND SUM(eaten) = COUNT(*)
       )`
    )
    .get(USER_ID) as { c: number }
  return row.c
}

function allFourDays(db: Database.Database): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) c FROM (
         SELECT d FROM (
           SELECT date(logged_at, 'localtime') d FROM water_logs WHERE user_id = ?
           UNION
           SELECT date(logged_at, 'localtime') d FROM exercise_logs WHERE user_id = ?
           UNION
           SELECT date(wake_time, 'localtime') d FROM sleep_logs WHERE user_id = ?
           UNION
           SELECT date(scheduled_at) d FROM meals WHERE user_id = ? AND eaten = 1
         )
         GROUP BY d
         HAVING COUNT(DISTINCT d) >= 1
            AND EXISTS (SELECT 1 FROM water_logs WHERE user_id = ? AND date(logged_at,'localtime') = d)
            AND EXISTS (SELECT 1 FROM exercise_logs WHERE user_id = ? AND date(logged_at,'localtime') = d)
            AND EXISTS (SELECT 1 FROM sleep_logs WHERE user_id = ? AND date(wake_time,'localtime') = d)
            AND EXISTS (SELECT 1 FROM meals WHERE user_id = ? AND date(scheduled_at) = d AND eaten = 1)
       )`
    )
    .get(USER_ID, USER_ID, USER_ID, USER_ID, USER_ID, USER_ID, USER_ID, USER_ID) as { c: number }
  return row.c
}

function breakfastStreak(db: Database.Database): number {
  return computeStreak(db, (date) => {
    const r = db
      .prepare(
        `SELECT COUNT(*) c FROM meals
         WHERE user_id = ? AND slot = 'breakfast' AND eaten = 1
           AND date(scheduled_at) = ?`
      )
      .get(USER_ID, date) as { c: number }
    return r.c > 0
  })
}

function activeDays(db: Database.Database): number {
  const row = db
    .prepare(
      `SELECT COUNT(DISTINCT d) c FROM (
         SELECT date(logged_at, 'localtime') d FROM water_logs WHERE user_id = ?
         UNION
         SELECT date(logged_at, 'localtime') d FROM exercise_logs WHERE user_id = ?
         UNION
         SELECT date(wake_time, 'localtime') d FROM sleep_logs WHERE user_id = ?
         UNION
         SELECT date(scheduled_at) d FROM meals WHERE user_id = ?
       )`
    )
    .get(USER_ID, USER_ID, USER_ID, USER_ID) as { c: number }
  return row.c
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

export interface AchievementState {
  id: string
  title: string
  description: string
  category: AchievementCategory
  progress: number
  target: number
  unlocked: boolean
  unlocked_at: string | null
}

export function getAllAchievementStates(db: Database.Database): AchievementState[] {
  const unlocked = new Map(
    (
      db.prepare(`SELECT id, datetime(unlocked_at, 'localtime') AS unlocked_at FROM achievements`).all() as {
        id: string
        unlocked_at: string
      }[]
    ).map((r) => [r.id, r.unlocked_at])
  )

  return ACHIEVEMENTS.map((def) => {
    const { progress, target } = def.evaluate(db, USER_ID)
    const unlockedAt = unlocked.get(def.id) ?? null
    return {
      id: def.id,
      title: def.title,
      description: def.description,
      category: def.category,
      progress: Math.min(progress, target),
      target,
      unlocked: unlockedAt !== null,
      unlocked_at: unlockedAt
    }
  })
}

/**
 * Evaluates all achievements and inserts newly-unlocked ones. Returns the IDs newly unlocked.
 */
export function evaluateAndUnlock(db: Database.Database): string[] {
  const alreadyUnlocked = new Set(
    (db.prepare(`SELECT id FROM achievements`).all() as { id: string }[]).map((r) => r.id)
  )
  const newlyUnlocked: string[] = []
  const insert = db.prepare(`INSERT INTO achievements (id, progress) VALUES (?, ?)`)
  for (const def of ACHIEVEMENTS) {
    if (alreadyUnlocked.has(def.id)) continue
    const { progress, target } = def.evaluate(db, USER_ID)
    if (progress >= target) {
      insert.run(def.id, progress)
      newlyUnlocked.push(def.id)
    }
  }
  return newlyUnlocked
}

export function getStreaks(db: Database.Database): {
  water: number
  exercise: number
  sleep: number
} {
  return {
    water: waterStreak(db),
    exercise: exerciseStreak(db),
    sleep: sleepStreak(db)
  }
}

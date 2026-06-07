export interface WaterLog {
  id: number
  amount_ml: number
  logged_at: string
}

export interface WaterSummary {
  total_ml: number
  goal_ml: number
  logs: WaterLog[]
}

export interface Meal {
  id: number
  name: string
  slot: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  calories: number | null
  scheduled_at: string
  eaten: 0 | 1
}

export interface Medication {
  id: number
  name: string
  dose: string | null
  frequency: string
  time_of_day: string | null
  active: 0 | 1
  taken_today: 0 | 1
}

export interface ExerciseLog {
  id: number
  activity: string
  duration_min: number
  intensity: 'light' | 'moderate' | 'vigorous'
  calories: number | null
  logged_at: string
}

export interface SleepLog {
  id: number
  bedtime: string
  wake_time: string
  quality: number | null
}

export interface UserSettings {
  id: number
  name: string
  daily_water_goal_ml: number
  sleep_goal_hours: number
  exercise_goal_min: number
  weight_kg: number
  theme: 'light' | 'dark'
  groq_api_key: string | null
  ai_model: string
  reminders_enabled: 0 | 1
  water_reminder_enabled: 0 | 1
  water_reminder_interval_min: number
  water_reminder_start_hour: number
  water_reminder_end_hour: number
}

export interface AssistantChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatSession {
  id: string
  title: string
  created_at: string
}

export interface ChatMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface WgerExercise {
  id: number
  name: string
  description: string
  category: string
  categoryId: number
  muscles: string[]
  equipment: string[]
}

export interface WgerCategory {
  id: number
  name: string
}

export interface Streaks {
  water: number
  exercise: number
  sleep: number
}

export type AchievementCategory =
  | 'water'
  | 'exercise'
  | 'sleep'
  | 'meals'
  | 'medication'
  | 'meta'

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

export interface DailyExerciseStat {
  date: string
  total_min: number
  total_calories: number
  sessions: number
}

export interface DailySleepStat {
  date: string
  hours: number
  quality: number | null
}

export interface DailyWaterStat {
  date: string
  total_ml: number
}

export interface DailyMealStat {
  date: string
  eaten: number
  scheduled: number
  calories: number
}

export interface AnalyticsSummary {
  exercise: DailyExerciseStat[]
  sleep: DailySleepStat[]
  water: DailyWaterStat[]
  meals: DailyMealStat[]
  goals: { water_ml: number; sleep_hours: number; exercise_min: number }
}

export interface WellnessApi {
  water: {
    todaySummary: () => Promise<WaterSummary>
    add: (amountMl: number) => Promise<void>
    delete: (id: number) => Promise<void>
  }
  meals: {
    forDate: (date: string) => Promise<Meal[]>
    recent: (days: number) => Promise<Meal[]>
    create: (input: Omit<Meal, 'id' | 'eaten'>) => Promise<number>
    update: (id: number, input: { name: string; slot: Meal['slot']; calories: number | null; time: string }) => Promise<void>
    delete: (id: number) => Promise<void>
    toggleEaten: (id: number) => Promise<void>
  }
  medications: {
    list: () => Promise<Medication[]>
    create: (input: Omit<Medication, 'id' | 'active' | 'taken_today'>) => Promise<number>
    update: (id: number, input: Omit<Medication, 'id' | 'active' | 'taken_today'>) => Promise<void>
    delete: (id: number) => Promise<{ ok: boolean; reason?: string }>
    toggleActive: (id: number) => Promise<void>
    logTaken: (id: number) => Promise<void>
    unlogTaken: (id: number) => Promise<void>
  }
  exercise: {
    forDate: (date: string) => Promise<ExerciseLog[]>
    create: (input: Omit<ExerciseLog, 'id' | 'logged_at'>) => Promise<number>
    delete: (id: number) => Promise<void>
    dailyStats: (days: number) => Promise<DailyExerciseStat[]>
  }
  sleep: {
    recent: (limit: number) => Promise<SleepLog[]>
    create: (input: Omit<SleepLog, 'id'>) => Promise<number>
    delete: (id: number) => Promise<void>
    dailyStats: (days: number) => Promise<DailySleepStat[]>
  }
  analytics: {
    summary: (days: number) => Promise<AnalyticsSummary>
  }
  achievements: {
    list: () => Promise<AchievementState[]>
    streaks: () => Promise<Streaks>
  }
  backup: {
    export: () => Promise<{ saved: boolean; path?: string }>
    import: () => Promise<{ imported: boolean; path?: string; error?: string }>
    reset: () => Promise<void>
  }
  assistant: {
    chat: (payload: { sessionId: string; history: AssistantChatMessage[] }) => Promise<void>
    cancel: (sessionId: string) => Promise<void>
    testKey: () => Promise<{ ok: boolean; error?: string }>
  }
  chat: {
    listSessions: () => Promise<ChatSession[]>
    getMessages: (sessionId: string) => Promise<ChatMessage[]>
    saveSession: (session: ChatSession, messages: ChatMessage[]) => Promise<void>
    deleteSession: (sessionId: string) => Promise<void>
  }
  wger: {
    search: (query: string, categoryId?: number) => Promise<WgerExercise[]>
    categories: () => Promise<WgerCategory[]>
  }
  quote: {
    today: () => Promise<{ q: string; a: string }>
  }
  startup: {
    get: () => Promise<boolean>
    set: (enable: boolean) => Promise<void>
  }
  settings: {
    get: () => Promise<UserSettings>
    update: (input: Partial<Omit<UserSettings, 'id'>>) => Promise<void>
  }
  updater: {
    checkForUpdates: () => Promise<{ updateAvailable: boolean; version?: string }>
    downloadUpdate: () => Promise<void>
    installUpdate: () => Promise<void>
    getStatus: () => Promise<UpdaterStatus>
    onStatus: (cb: (status: UpdaterStatus) => void) => () => void
  }
}

export type UpdaterStatus =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'available'; version: string }
  | { phase: 'not-available' }
  | { phase: 'downloading'; percent: number }
  | { phase: 'ready' }
  | { phase: 'error'; message: string }

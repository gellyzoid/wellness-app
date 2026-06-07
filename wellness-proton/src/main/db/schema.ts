export const MIGRATIONS: { id: number; sql: string }[] = [
  {
    id: 1,
    sql: `
      CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        daily_water_goal_ml INTEGER NOT NULL DEFAULT 2000,
        sleep_goal_hours REAL NOT NULL DEFAULT 8,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      INSERT INTO users (id, name) VALUES (1, 'Me');

      CREATE TABLE water_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        amount_ml INTEGER NOT NULL,
        logged_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX idx_water_logs_user_date ON water_logs(user_id, logged_at);

      CREATE TABLE meals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        name TEXT NOT NULL,
        slot TEXT NOT NULL CHECK (slot IN ('breakfast','lunch','dinner','snack')),
        calories INTEGER,
        scheduled_at TEXT NOT NULL,
        eaten INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX idx_meals_user_date ON meals(user_id, scheduled_at);

      CREATE TABLE medications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        name TEXT NOT NULL,
        dose TEXT,
        frequency TEXT NOT NULL DEFAULT 'daily',
        time_of_day TEXT,
        active INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE medication_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        medication_id INTEGER NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
        taken_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE exercise_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        activity TEXT NOT NULL,
        duration_min INTEGER NOT NULL,
        intensity TEXT NOT NULL DEFAULT 'moderate' CHECK (intensity IN ('light','moderate','vigorous')),
        calories INTEGER,
        logged_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX idx_exercise_logs_user_date ON exercise_logs(user_id, logged_at);

      CREATE TABLE sleep_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        bedtime TEXT NOT NULL,
        wake_time TEXT NOT NULL,
        quality INTEGER CHECK (quality BETWEEN 1 AND 5)
      );
      CREATE INDEX idx_sleep_logs_user ON sleep_logs(user_id, bedtime);
    `
  },
  {
    id: 2,
    sql: `
      ALTER TABLE users ADD COLUMN water_reminder_enabled INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE users ADD COLUMN water_reminder_interval_min INTEGER NOT NULL DEFAULT 60;
      ALTER TABLE users ADD COLUMN water_reminder_start_hour INTEGER NOT NULL DEFAULT 9;
      ALTER TABLE users ADD COLUMN water_reminder_end_hour INTEGER NOT NULL DEFAULT 21;
      ALTER TABLE users ADD COLUMN reminders_enabled INTEGER NOT NULL DEFAULT 1;

      CREATE TABLE reminder_dispatches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kind TEXT NOT NULL,
        target_id INTEGER,
        dispatch_key TEXT NOT NULL UNIQUE,
        fired_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX idx_reminder_dispatches_kind ON reminder_dispatches(kind, fired_at);
    `
  },
  {
    id: 3,
    sql: `
      ALTER TABLE users ADD COLUMN exercise_goal_min INTEGER NOT NULL DEFAULT 30;
    `
  },
  {
    id: 4,
    sql: `
      CREATE TABLE achievements (
        id TEXT PRIMARY KEY,
        unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
        progress INTEGER NOT NULL DEFAULT 0
      );

      ALTER TABLE users ADD COLUMN theme TEXT NOT NULL DEFAULT 'light';
    `
  },
  {
    id: 5,
    sql: `
      ALTER TABLE users ADD COLUMN groq_api_key TEXT;
      ALTER TABLE users ADD COLUMN ai_model TEXT NOT NULL DEFAULT 'openai/gpt-oss-120b';
    `
  },
  {
    id: 6,
    sql: `
      ALTER TABLE users ADD COLUMN weight_kg REAL NOT NULL DEFAULT 70;
    `
  },
  {
    id: 7,
    sql: `
      CREATE TABLE chat_sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE chat_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('user','assistant')),
        content TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, created_at);
    `
  }
]

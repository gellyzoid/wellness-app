import { app } from 'electron'
import { join } from 'path'
import Database from 'better-sqlite3'
import { MIGRATIONS } from './schema'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db
  const dbPath = join(app.getPath('userData'), 'wellness-proton.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  runMigrations(db)
  return db
}

function runMigrations(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)
  const applied = new Set(
    database
      .prepare('SELECT id FROM _migrations')
      .all()
      .map((r) => (r as { id: number }).id)
  )
  const insertMigration = database.prepare('INSERT INTO _migrations (id) VALUES (?)')
  for (const m of MIGRATIONS) {
    if (applied.has(m.id)) continue
    database.transaction(() => {
      database.exec(m.sql)
      insertMigration.run(m.id)
    })()
  }
}

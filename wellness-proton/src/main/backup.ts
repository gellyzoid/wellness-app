import { app, dialog, BrowserWindow } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import { getDb } from './db'

const USER_ID = 1
const BACKUP_VERSION = 1

const EXPORT_TABLES = [
  'users',
  'water_logs',
  'meals',
  'medications',
  'medication_logs',
  'exercise_logs',
  'sleep_logs',
  'achievements'
] as const

interface BackupPayload {
  version: number
  exported_at: string
  app_version: string
  tables: Record<string, unknown[]>
}

export async function exportBackup(window: BrowserWindow | null): Promise<{
  saved: boolean
  path?: string
}> {
  const db = getDb()
  const payload: BackupPayload = {
    version: BACKUP_VERSION,
    exported_at: new Date().toISOString(),
    app_version: app.getVersion(),
    tables: {}
  }
  for (const t of EXPORT_TABLES) {
    payload.tables[t] = db.prepare(`SELECT * FROM ${t}`).all()
  }

  const defaultName = `wellness-proton-backup-${new Date()
    .toISOString()
    .slice(0, 10)}.json`

  const opts = {
    title: 'Export Wellness backup',
    defaultPath: defaultName,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  }
  const result = window
    ? await dialog.showSaveDialog(window, opts)
    : await dialog.showSaveDialog(opts)
  if (result.canceled || !result.filePath) return { saved: false }
  writeFileSync(result.filePath, JSON.stringify(payload, null, 2), 'utf-8')
  return { saved: true, path: result.filePath }
}

export async function importBackup(window: BrowserWindow | null): Promise<{
  imported: boolean
  path?: string
  error?: string
}> {
  const opts = {
    title: 'Import Wellness backup',
    properties: ['openFile' as const],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  }
  const result = window
    ? await dialog.showOpenDialog(window, opts)
    : await dialog.showOpenDialog(opts)
  if (result.canceled || result.filePaths.length === 0) return { imported: false }
  const path = result.filePaths[0]

  let payload: BackupPayload
  try {
    payload = JSON.parse(readFileSync(path, 'utf-8'))
  } catch (e) {
    return { imported: false, error: 'Invalid JSON file' }
  }
  if (!payload || payload.version !== BACKUP_VERSION || !payload.tables) {
    return { imported: false, error: 'Unsupported backup format' }
  }

  const db = getDb()
  db.transaction(() => {
    // Wipe in reverse FK order
    for (const t of [...EXPORT_TABLES].reverse()) {
      if (t === 'users') {
        db.prepare(`DELETE FROM users WHERE id != ?`).run(USER_ID)
      } else {
        db.exec(`DELETE FROM ${t}`)
      }
    }
    for (const t of EXPORT_TABLES) {
      const rows = payload.tables[t]
      if (!Array.isArray(rows) || rows.length === 0) continue
      for (const row of rows) {
        if (typeof row !== 'object' || row === null) continue
        const obj = row as Record<string, unknown>
        if (t === 'users') {
          // Update existing user row instead of insert to preserve PK = 1
          const cols = Object.keys(obj).filter((k) => k !== 'id')
          if (cols.length === 0) continue
          const setClause = cols.map((c) => `${c} = ?`).join(', ')
          db.prepare(`UPDATE users SET ${setClause} WHERE id = ?`).run(
            ...cols.map((c) => obj[c] as never),
            USER_ID
          )
        } else {
          const cols = Object.keys(obj)
          const placeholders = cols.map(() => '?').join(', ')
          db.prepare(
            `INSERT INTO ${t} (${cols.join(', ')}) VALUES (${placeholders})`
          ).run(...cols.map((c) => obj[c] as never))
        }
      }
    }
  })()

  return { imported: true, path }
}

export function resetAllData(): void {
  const db = getDb()
  db.transaction(() => {
    db.exec(`
      DELETE FROM achievements;
      DELETE FROM sleep_logs;
      DELETE FROM exercise_logs;
      DELETE FROM medication_logs;
      DELETE FROM medications;
      DELETE FROM meals;
      DELETE FROM water_logs;
      DELETE FROM reminder_dispatches;
    `)
  })()
}

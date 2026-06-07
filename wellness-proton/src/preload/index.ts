import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { WellnessApi } from '../shared/types'

const api: WellnessApi = {
  water: {
    todaySummary: () => ipcRenderer.invoke('water:todaySummary'),
    add: (amountMl) => ipcRenderer.invoke('water:add', amountMl),
    delete: (id) => ipcRenderer.invoke('water:delete', id)
  },
  meals: {
    forDate: (date) => ipcRenderer.invoke('meals:forDate', date),
    recent: (days) => ipcRenderer.invoke('meals:recent', days),
    create: (input) => ipcRenderer.invoke('meals:create', input),
    update: (id, input) => ipcRenderer.invoke('meals:update', id, input),
    delete: (id) => ipcRenderer.invoke('meals:delete', id),
    toggleEaten: (id) => ipcRenderer.invoke('meals:toggleEaten', id)
  },
  medications: {
    list: () => ipcRenderer.invoke('medications:list'),
    create: (input) => ipcRenderer.invoke('medications:create', input),
    update: (id, input) => ipcRenderer.invoke('medications:update', id, input),
    delete: (id) => ipcRenderer.invoke('medications:delete', id),
    toggleActive: (id) => ipcRenderer.invoke('medications:toggleActive', id),
    logTaken: (id) => ipcRenderer.invoke('medications:logTaken', id),
    unlogTaken: (id) => ipcRenderer.invoke('medications:unlogTaken', id)
  },
  exercise: {
    forDate: (date) => ipcRenderer.invoke('exercise:forDate', date),
    create: (input) => ipcRenderer.invoke('exercise:create', input),
    delete: (id) => ipcRenderer.invoke('exercise:delete', id),
    dailyStats: (days) => ipcRenderer.invoke('exercise:dailyStats', days)
  },
  sleep: {
    recent: (limit) => ipcRenderer.invoke('sleep:recent', limit),
    create: (input) => ipcRenderer.invoke('sleep:create', input),
    delete: (id) => ipcRenderer.invoke('sleep:delete', id),
    dailyStats: (days) => ipcRenderer.invoke('sleep:dailyStats', days)
  },
  analytics: {
    summary: (days) => ipcRenderer.invoke('analytics:summary', days)
  },
  achievements: {
    list: () => ipcRenderer.invoke('achievements:list'),
    streaks: () => ipcRenderer.invoke('achievements:streaks')
  },
  backup: {
    export: () => ipcRenderer.invoke('backup:export'),
    import: () => ipcRenderer.invoke('backup:import'),
    reset: () => ipcRenderer.invoke('backup:reset')
  },
  assistant: {
    chat: (payload) => ipcRenderer.invoke('assistant:chat', payload),
    cancel: (sessionId) => ipcRenderer.invoke('assistant:cancel', sessionId),
    testKey: () => ipcRenderer.invoke('assistant:testKey')
  },
  wger: {
    search: (query, categoryId) => ipcRenderer.invoke('wger:search', query, categoryId),
    categories: () => ipcRenderer.invoke('wger:categories')
  },
  quote: {
    today: () => ipcRenderer.invoke('quote:today')
  },
  startup: {
    get: () => ipcRenderer.invoke('startup:get'),
    set: (enable) => ipcRenderer.invoke('startup:set', enable)
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (input) => ipcRenderer.invoke('settings:update', input)
  },
  chat: {
    listSessions: () => ipcRenderer.invoke('chat:listSessions'),
    getMessages: (sessionId) => ipcRenderer.invoke('chat:getMessages', sessionId),
    saveSession: (session, messages) => ipcRenderer.invoke('chat:saveSession', session, messages),
    deleteSession: (sessionId) => ipcRenderer.invoke('chat:deleteSession', sessionId)
  },
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('updater:checkForUpdates'),
    downloadUpdate: () => ipcRenderer.invoke('updater:downloadUpdate'),
    installUpdate: () => ipcRenderer.invoke('updater:installUpdate'),
    getStatus: () => ipcRenderer.invoke('updater:getStatus'),
    onStatus: (cb) => {
      const handler = (_e: Electron.IpcRendererEvent, status: unknown) => cb(status as import('../shared/types').UpdaterStatus)
      ipcRenderer.on('updater:status', handler)
      return () => ipcRenderer.off('updater:status', handler)
    }
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}

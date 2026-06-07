import { app, shell, BrowserWindow, Tray, Menu, nativeImage, dialog, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import icon from '../../resources/icon.png?asset'
import { registerIpcHandlers } from './ipc'
import { startScheduler, stopScheduler, checkPastDueOnStartup } from './scheduler'
import { evaluateAndUnlock } from './achievements'
import { getDb } from './db'
import type { UpdaterStatus } from '../shared/types'

// Auto-updater state
let updaterStatus: UpdaterStatus = { phase: 'idle' }

function getMainWindow(): BrowserWindow | undefined {
  return BrowserWindow.getAllWindows()[0]
}

function setupAutoUpdater(): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.on('checking-for-update', () => {
    updaterStatus = { phase: 'checking' }
    getMainWindow()?.webContents.send('updater:status', updaterStatus)
  })

  autoUpdater.on('update-available', (info) => {
    updaterStatus = { phase: 'available', version: info.version }
    getMainWindow()?.webContents.send('updater:status', updaterStatus)
  })

  autoUpdater.on('update-not-available', () => {
    updaterStatus = { phase: 'not-available' }
    getMainWindow()?.webContents.send('updater:status', updaterStatus)
  })

  autoUpdater.on('download-progress', (progress) => {
    updaterStatus = { phase: 'downloading', percent: Math.round(progress.percent) }
    getMainWindow()?.webContents.send('updater:status', updaterStatus)
  })

  autoUpdater.on('update-downloaded', () => {
    updaterStatus = { phase: 'ready' }
    getMainWindow()?.webContents.send('updater:status', updaterStatus)
  })

  autoUpdater.on('error', (err) => {
    updaterStatus = { phase: 'error', message: err.message }
    getMainWindow()?.webContents.send('updater:status', updaterStatus)
  })

  ipcMain.handle('updater:getStatus', () => updaterStatus)

  ipcMain.handle('updater:checkForUpdates', async () => {
    try {
      const result = await autoUpdater.checkForUpdates()
      if (result?.updateInfo && result.updateInfo.version !== app.getVersion()) {
        return { updateAvailable: true, version: result.updateInfo.version }
      }
      return { updateAvailable: false }
    } catch (err) {
      updaterStatus = { phase: 'error', message: (err as Error).message }
      return { updateAvailable: false }
    }
  })

  ipcMain.handle('updater:downloadUpdate', () => autoUpdater.downloadUpdate())

  ipcMain.handle('updater:installUpdate', () => {
    autoUpdater.quitAndInstall(false, true)
  })
}

// Single instance lock
if (!app.requestSingleInstanceLock()) {
  dialog.showErrorBox(
    'Wellness Proton is already running',
    'Another instance of Wellness Proton is already open. Check the system tray.'
  )
  app.exit(0)
}

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform !== 'darwin' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

app.on('second-instance', () => {
  const win = BrowserWindow.getAllWindows()[0]
  if (win) {
    win.show()
    win.focus()
  }
})

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.wellnessproton')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  setupAutoUpdater()
  registerIpcHandlers()
  evaluateAndUnlock(getDb())
  const mainWindow = createWindow()
  startScheduler(mainWindow)
  mainWindow.once('ready-to-show', () => {
    checkPastDueOnStartup(mainWindow)
  })

  // Tray
  const trayIcon = nativeImage.createFromPath(icon).resize({ width: 16, height: 16 })
  const tray = new Tray(trayIcon)
  tray.setToolTip('Wellness Proton')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: 'Show',
        click: () => {
          mainWindow.show()
          mainWindow.focus()
        }
      },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ])
  )
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  // Hide to tray instead of minimizing
  mainWindow.on('minimize', () => {
    mainWindow.hide()
  })

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      const w = createWindow()
      startScheduler(w)
    }
  })
})

app.on('window-all-closed', () => {
  stopScheduler()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

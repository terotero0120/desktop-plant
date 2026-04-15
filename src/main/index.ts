import { app, shell, BrowserWindow, Tray, Menu, nativeImage, screen, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initStore, getState, resetPlant, flushState, IPC_CHANNELS } from './store'
import { initInputEngine, stopInputEngine } from './inputEngine'

const WINDOW_WIDTH = 200
const WINDOW_HEIGHT = 300
const WINDOW_MARGIN = 16

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

function createTray(): void {
  const iconImage = nativeImage.createFromPath(join(__dirname, '../../resources/icon.png'))

  tray = new Tray(iconImage)
  tray.setToolTip('Desktop Plant')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Quit',
      click: (): void => {
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
    }
  })
}

function createWindow(): void {
  const { x: workX, y: workY, width: workWidth, height: workHeight } =
    screen.getPrimaryDisplay().workArea

  mainWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    x: workX + workWidth - WINDOW_WIDTH - WINDOW_MARGIN,
    y: workY + workHeight - WINDOW_HEIGHT - WINDOW_MARGIN,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      // sandbox: false は uiohook-napi など native モジュールを main から
      // IPC 経由で呼び出す際に必要になる可能性があるため残す
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
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
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.desktopplant')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  try {
    await initStore()
  } catch (err) {
    console.error('[desktop-plant] store initialization failed:', err)
    app.quit()
    return
  }

  ipcMain.handle(IPC_CHANNELS.GET_STATE, () => getState())

  ipcMain.handle(IPC_CHANNELS.PLANT_NEXT_SEED, () => {
    resetPlant()
    flushState()
    const state = getState()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.STATE_UPDATE, state)
    }
    return state
  })

  createWindow()
  createTray()
  initInputEngine(() => mainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// トレイ常駐アプリのためウィンドウを閉じてもプロセスは維持する
app.on('window-all-closed', () => {
  // intentionally empty: tray keeps the app alive
})

// 終了前にフックを停止・ポイントをフラッシュ
app.on('before-quit', () => {
  stopInputEngine()
})

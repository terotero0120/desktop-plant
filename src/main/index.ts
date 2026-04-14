import { app, shell, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

const WINDOW_WIDTH = 200
const WINDOW_HEIGHT = 300
const WINDOW_MARGIN = 16

// Keep a global reference to prevent garbage collection
let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

function createTray(): void {
  // Create a minimal 16x16 transparent PNG image for the tray icon
  // Using a simple colored square as placeholder
  const iconImage = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEwAACxMBAJqcGAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABUSURBVDiNY2AYBQMBgP///w8YGBh8YCQZGP7/Z2BgYGB4TwZDDgwwMMDAQAYDBgwYMGDAgAEDBgwYMGDAgAEDBgwYMGDAgAEDBgwYMGDAgAEA5AQKAP4AAAAASUVORK5CYII='
  )

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

  // setContextMenu ensures menu works on all platforms (especially macOS)
  tray.setContextMenu(contextMenu)

  // Also handle right-click explicitly for Windows
  tray.on('right-click', () => {
    tray?.popUpContextMenu(contextMenu)
  })

  // Left-click toggles window visibility
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
      }
    }
  })
}

function createWindow(): void {
  // Get primary display work area to position window in bottom-right corner
  const primaryDisplay = screen.getPrimaryDisplay()
  const { x: workX, y: workY, width: workWidth, height: workHeight } = primaryDisplay.workArea

  const windowX = workX + workWidth - WINDOW_WIDTH - WINDOW_MARGIN
  const windowY = workY + workHeight - WINDOW_HEIGHT - WINDOW_MARGIN

  mainWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    x: windowX,
    y: windowY,
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
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()
  createTray()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

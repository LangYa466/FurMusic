import { app, shell, BrowserWindow, ipcMain, net, Tray, Menu } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import icon from '../../resources/icon.png?asset'

const LOCAL_VERSION = '1.0.0'
const VERSION_URL =
  'https://raw.githubusercontent.com/LangYa466/FurMusic/refs/heads/master/version.txt'
const RELEASES_URL = 'https://github.com/LangYa466/FurMusic/releases'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false
let apiServer: { close: () => void } | null = null

// 持久化数据存储路径
const getStorePath = (name: string): string => {
  return join(app.getPath('userData'), `${name}.json`)
}

const loadStore = (name: string): unknown => {
  const path = getStorePath(name)
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, 'utf-8'))
    } catch {
      return null
    }
  }
  return null
}

const saveStore = (name: string, data: unknown): void => {
  const path = getStorePath(name)
  writeFileSync(path, JSON.stringify(data), 'utf-8')
}

// 开机自启动相关
function getAutoLaunchEnabled(): boolean {
  return app.getLoginItemSettings().openAtLogin
}

function setAutoLaunch(enable: boolean): void {
  if (process.platform === 'linux') {
    // Linux 使用 path 参数
    app.setLoginItemSettings({
      openAtLogin: enable,
      path: process.execPath
    })
  } else {
    // Windows 和 macOS
    app.setLoginItemSettings({
      openAtLogin: enable,
      openAsHidden: true // macOS: 启动时隐藏窗口
    })
  }
}

function compareVersion(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number)
  const parts2 = v2.split('.').map(Number)
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0
    const p2 = parts2[i] || 0
    if (p1 > p2) return 1
    if (p1 < p2) return -1
  }
  return 0
}

function checkForUpdates(): void {
  const request = net.request(VERSION_URL)
  request.on('response', (response) => {
    let data = ''
    response.on('data', (chunk) => {
      data += chunk.toString()
    })
    response.on('end', () => {
      const remoteVersion = data.trim()
      if (compareVersion(remoteVersion, LOCAL_VERSION) > 0) {
        mainWindow?.webContents.send('update-available', remoteVersion)
      }
    })
  })
  request.on('error', (err) => {
    console.error('Update check failed:', err)
  })
  request.end()
}

function startApiServer(): void {
  try {
    // 直接在主进程中启动 API 服务器
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { serveNcmApi } = require('NeteaseCloudMusicApi')
    serveNcmApi({
      port: 3000,
      host: '127.0.0.1'
    })
      .then((server: { close: () => void }) => {
        apiServer = server
        console.log('NeteaseCloudMusicApi server started on http://127.0.0.1:3000')
      })
      .catch((err: Error) => {
        console.error('Failed to start API server:', err)
      })
  } catch (error) {
    console.error('Failed to start API server:', error)
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 400,
    minHeight: 700,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // F12 打开开发者工具
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
      mainWindow?.webContents.toggleDevTools()
      event.preventDefault()
    }
  })

  // 点击关闭按钮时最小化到托盘
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
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

function createTray(): void {
  tray = new Tray(icon)
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        mainWindow?.show()
      }
    },
    {
      label: '退出',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])
  tray.setToolTip('FurMusic')
  tray.setContextMenu(contextMenu)
  tray.on('click', () => {
    mainWindow?.show()
  })
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 窗口控制 IPC
  ipcMain.on('window-minimize', () => mainWindow?.minimize())
  ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })
  ipcMain.on('window-close', () => mainWindow?.close())
  ipcMain.on('open-releases', () => shell.openExternal(RELEASES_URL))

  // 开机自启动 IPC
  ipcMain.handle('get-auto-launch', () => getAutoLaunchEnabled())
  ipcMain.handle('set-auto-launch', (_, enable: boolean) => {
    setAutoLaunch(enable)
    return getAutoLaunchEnabled()
  })

  // 持久化存储 IPC
  ipcMain.handle('store-get', (_, name: string) => loadStore(name))
  ipcMain.handle('store-set', (_, name: string, data: unknown) => {
    saveStore(name, data)
    return true
  })

  startApiServer()
  createWindow()
  createTray()
  checkForUpdates()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (apiServer) {
    apiServer.close()
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

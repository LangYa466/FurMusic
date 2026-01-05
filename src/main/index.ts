import { app, shell, BrowserWindow, ipcMain, net, Tray, Menu } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync } from 'fs'
import icon from '../../resources/icon.png?asset'

const LOCAL_VERSION = '1.0.5'
const VERSION_URL =
  'https://raw.githubusercontent.com/LangYa466/FurMusic/refs/heads/master/version.txt'
const RELEASES_URL = 'https://github.com/LangYa466/FurMusic/releases/latest'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false
let apiServer: { server?: { close: (callback?: () => void) => void } } | null = null
let currentProxy: string | null = null

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

// 日志系统
const getLogPath = (): string => {
  const logDir = join(app.getPath('userData'), 'logs')
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true })
  }
  const today = new Date().toISOString().split('T')[0]
  return join(logDir, `${today}.log`)
}

const writeLog = (level: string, message: string, data?: unknown): void => {
  const timestamp = new Date().toISOString()
  const logEntry = data
    ? `[${timestamp}] [${level}] ${message} ${JSON.stringify(data)}\n`
    : `[${timestamp}] [${level}] ${message}\n`

  try {
    appendFileSync(getLogPath(), logEntry, 'utf-8')
  } catch (error) {
    console.error('Failed to write log:', error)
  }
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
  // 确保窗口已加载完成
  if (!mainWindow || mainWindow.isDestroyed()) {
    return
  }

  const request = net.request(VERSION_URL)
  request.on('response', (response) => {
    let data = ''
    response.on('data', (chunk) => {
      data += chunk.toString()
    })
    response.on('end', () => {
      const remoteVersion = data.trim()
      console.log('Remote version:', remoteVersion, 'Local version:', LOCAL_VERSION)
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
    // 设置代理环境变量（NeteaseCloudMusicApi 通过环境变量读取代理）
    if (currentProxy) {
      process.env.HTTP_PROXY = currentProxy
      process.env.HTTPS_PROXY = currentProxy
      console.log('Using proxy:', currentProxy)
    } else {
      delete process.env.HTTP_PROXY
      delete process.env.HTTPS_PROXY
    }

    // 直接在主进程中启动 API 服务器
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { serveNcmApi } = require('NeteaseCloudMusicApi')
    serveNcmApi({
      port: 3000,
      host: '127.0.0.1'
    })
      .then((server: { server?: { close: (callback?: () => void) => void } }) => {
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

function restartApiServer(): void {
  if (apiServer?.server) {
    apiServer.server.close()
    apiServer = null
  }
  startApiServer()
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

  // 页面加载完成后检查更新
  mainWindow.webContents.on('did-finish-load', () => {
    checkForUpdates()
  })

  // F12 打开开发者工具
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
      mainWindow?.webContents.toggleDevTools()
      event.preventDefault()
    }
  })

  // 点击关闭按钮时最小化到托盘（仅当托盘创建成功时）
  mainWindow.on('close', (event) => {
    if (!isQuitting && tray) {
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
  // Windows 需要使用 ico 格式，开发模式和打包后路径不同
  let trayIconPath: string
  if (process.platform === 'win32') {
    trayIconPath = is.dev
      ? join(__dirname, '../../build/icon.ico')
      : join(process.resourcesPath, 'app.asar.unpacked/build/icon.ico')
  } else {
    trayIconPath = icon
  }

  try {
    tray = new Tray(trayIconPath)
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
  } catch (error) {
    console.error('Failed to create tray:', error)
    tray = null
  }
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

  // 代理设置 IPC
  ipcMain.handle('set-proxy', (_, proxyUrl: string | null) => {
    currentProxy = proxyUrl
    restartApiServer()
    return true
  })

  // 日志 IPC
  ipcMain.handle('write-log', (_, level: string, message: string, data?: unknown) => {
    writeLog(level, message, data)
    return true
  })

  // 加载保存的代理设置
  const savedSettings = loadStore('settings') as {
    proxyEnabled?: boolean
    proxyHost?: string
    proxyPort?: string
  } | null
  if (savedSettings?.proxyEnabled && savedSettings.proxyHost && savedSettings.proxyPort) {
    currentProxy = `http://${savedSettings.proxyHost}:${savedSettings.proxyPort}`
  }

  startApiServer()
  createWindow()
  createTray()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (apiServer?.server) {
    apiServer.server.close()
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

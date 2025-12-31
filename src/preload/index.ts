import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  openReleases: () => ipcRenderer.send('open-releases'),
  onUpdateAvailable: (callback: (version: string) => void) => {
    ipcRenderer.on('update-available', (_, version) => callback(version))
  },
  // 开机自启动
  getAutoLaunch: () => ipcRenderer.invoke('get-auto-launch') as Promise<boolean>,
  setAutoLaunch: (enable: boolean) =>
    ipcRenderer.invoke('set-auto-launch', enable) as Promise<boolean>,
  // 持久化存储
  storeGet: (name: string) => ipcRenderer.invoke('store-get', name),
  storeSet: (name: string, data: unknown) => ipcRenderer.invoke('store-set', name, data),
  // 代理设置
  setProxy: (proxyUrl: string | null) => ipcRenderer.invoke('set-proxy', proxyUrl)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
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

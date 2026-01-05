import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      minimize: () => void
      maximize: () => void
      close: () => void
      openReleases: () => void
      onUpdateAvailable: (callback: (version: string) => void) => void
      getAutoLaunch: () => Promise<boolean>
      setAutoLaunch: (enable: boolean) => Promise<boolean>
      storeGet: (name: string) => Promise<unknown>
      storeSet: (name: string, data: unknown) => Promise<boolean>
      setProxy: (proxyUrl: string | null) => Promise<boolean>
      writeLog: (level: string, message: string, data?: unknown) => Promise<boolean>
    }
  }
}

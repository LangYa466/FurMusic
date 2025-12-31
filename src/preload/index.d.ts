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
    }
  }
}

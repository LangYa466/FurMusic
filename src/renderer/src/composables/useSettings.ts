import { ref } from 'vue'
import type { Settings, LastPlaying } from '../types'
import { defaultSettings } from '../constants'

const bgMode = ref<'album' | 'custom'>(defaultSettings.bgMode)
const customBgUrl = ref(defaultSettings.customBgUrl)
const quality = ref(defaultSettings.quality)
const mainFont = ref(defaultSettings.mainFont)
const lyricsFont = ref(defaultSettings.lyricsFont)
const themeColor = ref(defaultSettings.themeColor)
const lyricsCoverSize = ref(defaultSettings.lyricsCoverSize)
const lyricsInfoSize = ref(defaultSettings.lyricsInfoSize)
const lyricsTextSize = ref(defaultSettings.lyricsTextSize)
const lyricsCoverRound = ref(defaultSettings.lyricsCoverRound)
const lyricsCoverRotate = ref(defaultSettings.lyricsCoverRotate)
const volume = ref(defaultSettings.volume)
const proxyEnabled = ref(defaultSettings.proxyEnabled)
const proxyHost = ref(defaultSettings.proxyHost)
const proxyPort = ref(defaultSettings.proxyPort)

export function useSettings() {
  const saveSettings = async () => {
    const settings: Settings = {
      bgMode: bgMode.value,
      customBgUrl: customBgUrl.value,
      quality: quality.value,
      mainFont: mainFont.value,
      lyricsFont: lyricsFont.value,
      themeColor: themeColor.value,
      lyricsCoverSize: lyricsCoverSize.value,
      lyricsInfoSize: lyricsInfoSize.value,
      lyricsTextSize: lyricsTextSize.value,
      lyricsCoverRound: lyricsCoverRound.value,
      lyricsCoverRotate: lyricsCoverRotate.value,
      volume: volume.value,
      proxyEnabled: proxyEnabled.value,
      proxyHost: proxyHost.value,
      proxyPort: proxyPort.value
    }
    await window.api.storeSet('settings', settings)
  }

  const loadSettings = async () => {
    const saved = (await window.api.storeGet('settings')) as Partial<Settings> | null
    if (saved) {
      bgMode.value = saved.bgMode || defaultSettings.bgMode
      customBgUrl.value = saved.customBgUrl || defaultSettings.customBgUrl
      quality.value = saved.quality || defaultSettings.quality
      mainFont.value = saved.mainFont || defaultSettings.mainFont
      lyricsFont.value = saved.lyricsFont || defaultSettings.lyricsFont
      themeColor.value = saved.themeColor || defaultSettings.themeColor
      lyricsCoverSize.value = saved.lyricsCoverSize || defaultSettings.lyricsCoverSize
      lyricsInfoSize.value = saved.lyricsInfoSize || defaultSettings.lyricsInfoSize
      lyricsTextSize.value = saved.lyricsTextSize || defaultSettings.lyricsTextSize
      lyricsCoverRound.value = saved.lyricsCoverRound ?? defaultSettings.lyricsCoverRound
      lyricsCoverRotate.value = saved.lyricsCoverRotate ?? defaultSettings.lyricsCoverRotate
      volume.value = saved.volume ?? defaultSettings.volume
      proxyEnabled.value = saved.proxyEnabled ?? defaultSettings.proxyEnabled
      proxyHost.value = saved.proxyHost || defaultSettings.proxyHost
      proxyPort.value = saved.proxyPort || defaultSettings.proxyPort
    }
  }

  const saveLastPlaying = async (songId: number, playlistId: number, currentTime: number) => {
    const data: LastPlaying = { songId, playlistId, currentTime }
    await window.api.storeSet('last_playing', data)
  }

  const loadLastPlaying = async (): Promise<LastPlaying | null> => {
    return (await window.api.storeGet('last_playing')) as LastPlaying | null
  }

  return {
    bgMode,
    customBgUrl,
    quality,
    mainFont,
    lyricsFont,
    themeColor,
    lyricsCoverSize,
    lyricsInfoSize,
    lyricsTextSize,
    lyricsCoverRound,
    lyricsCoverRotate,
    volume,
    proxyEnabled,
    proxyHost,
    proxyPort,
    saveSettings,
    loadSettings,
    saveLastPlaying,
    loadLastPlaying
  }
}

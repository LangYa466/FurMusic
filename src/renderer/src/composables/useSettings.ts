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

export function useSettings() {
  const saveSettings = () => {
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
      volume: volume.value
    }
    localStorage.setItem('netease_settings', JSON.stringify(settings))
  }

  const loadSettings = () => {
    const saved = localStorage.getItem('netease_settings')
    if (saved) {
      const s = JSON.parse(saved) as Partial<Settings>
      bgMode.value = s.bgMode || defaultSettings.bgMode
      customBgUrl.value = s.customBgUrl || defaultSettings.customBgUrl
      quality.value = s.quality || defaultSettings.quality
      mainFont.value = s.mainFont || defaultSettings.mainFont
      lyricsFont.value = s.lyricsFont || defaultSettings.lyricsFont
      themeColor.value = s.themeColor || defaultSettings.themeColor
      lyricsCoverSize.value = s.lyricsCoverSize || defaultSettings.lyricsCoverSize
      lyricsInfoSize.value = s.lyricsInfoSize || defaultSettings.lyricsInfoSize
      lyricsTextSize.value = s.lyricsTextSize || defaultSettings.lyricsTextSize
      lyricsCoverRound.value = s.lyricsCoverRound ?? defaultSettings.lyricsCoverRound
      lyricsCoverRotate.value = s.lyricsCoverRotate ?? defaultSettings.lyricsCoverRotate
      volume.value = s.volume ?? defaultSettings.volume
    }
  }

  const saveLastPlaying = (songId: number, playlistId: number, currentTime: number) => {
    const data: LastPlaying = { songId, playlistId, currentTime }
    localStorage.setItem('netease_last_playing', JSON.stringify(data))
  }

  const loadLastPlaying = (): LastPlaying | null => {
    const saved = localStorage.getItem('netease_last_playing')
    return saved ? JSON.parse(saved) : null
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
    saveSettings,
    loadSettings,
    saveLastPlaying,
    loadLastPlaying
  }
}

export interface Artist {
  id?: number
  name: string
  picUrl?: string
  img1v1Url?: string
}

export interface Album {
  picUrl: string
}

export interface Song {
  id: number
  name: string
  dt: number
  al?: Album
  ar?: Artist[]
}

export interface Playlist {
  id: number
  name: string
  coverImgUrl: string
}

export interface LyricWord {
  time: number // 逐字显示开始时间戳（毫秒）
  duration: number // 逐字显示时长（厘秒/0.01s）
  text: string // 文字内容
}

export interface LyricLine {
  time: number // 歌词行显示开始时间戳（秒）
  duration?: number // 歌词行显示总时长（毫秒）
  text: string // 歌词文本
  words?: LyricWord[] // 逐字歌词数据
}

export interface ArtistInfo {
  id: number
  name: string
  picUrl?: string
  img1v1Url?: string
  cover?: string
}

export interface Settings {
  bgMode: 'album' | 'custom'
  customBgUrl: string
  quality: string
  mainFont: string
  lyricsFont: string
  themeColor: string
  lyricsCoverSize: number
  lyricsInfoSize: number
  lyricsTextSize: number
  lyricsCoverRound: boolean
  lyricsCoverRotate: boolean
  volume: number
  proxyEnabled: boolean
  proxyHost: string
  proxyPort: string
}

export interface LastPlaying {
  songId: number
  playlistId: number
  currentTime: number
}

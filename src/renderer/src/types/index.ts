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

export interface LyricLine {
  time: number
  text: string
}

export interface ArtistInfo {
  id: number
  name: string
  picUrl?: string
  img1v1Url?: string
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
}

export interface LastPlaying {
  songId: number
  playlistId: number
  currentTime: number
}

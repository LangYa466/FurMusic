export const qualityLabels: Record<string, string> = {
  standard: '标准',
  higher: '较高',
  exhigh: '极高',
  lossless: '无损',
  hires: 'Hi-Res'
}

export const fontLabels: Record<string, string> = {
  system: '系统默认',
  'Microsoft YaHei': '微软雅黑',
  SimHei: '黑体',
  KaiTi: '楷体'
}

export const themeColors = [
  '#e91e63',
  '#9c27b0',
  '#673ab7',
  '#3f51b5',
  '#2196f3',
  '#00bcd4',
  '#009688',
  '#4caf50',
  '#ff9800',
  '#ff5722'
]

export const defaultSettings = {
  bgMode: 'album' as const,
  customBgUrl: '',
  quality: 'exhigh',
  mainFont: 'system',
  lyricsFont: 'system',
  themeColor: '#e91e63',
  lyricsCoverSize: 200,
  lyricsInfoSize: 20,
  lyricsTextSize: 24,
  lyricsCoverRound: false,
  lyricsCoverRotate: false,
  volume: 0.8
}

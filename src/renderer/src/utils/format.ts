import type { Song } from '../types'

export function getArtists(song: Song | null): string {
  return song?.ar?.map((a) => a.name).join(' / ') || ''
}

export function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

export function formatTime(s: number): string {
  return `${Math.floor(s / 60)}:${Math.floor(s % 60)
    .toString()
    .padStart(2, '0')}`
}

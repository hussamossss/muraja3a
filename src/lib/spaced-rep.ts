import { Strength } from './types'

export function calcNewInterval(current: number, strength: Strength): number {
  switch (strength) {
    case 'strong': return Math.max(1, Math.round(current * 2))
    case 'medium': return Math.max(1, Math.round(current * 1.5))
    case 'weak':   return Math.max(1, Math.round(current * 0.5))
  }
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d + days)
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export function todayStr(): string {
  const d = new Date()
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function daysDiff(dateStr: string): number {
  return Math.round(
    (new Date(dateStr + 'T00:00:00').getTime() - new Date(todayStr() + 'T00:00:00').getTime()) / 86400000
  )
}

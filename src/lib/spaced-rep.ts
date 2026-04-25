import { Strength } from './types'

export function calcNewInterval(current: number, strength: Strength): number {
  switch (strength) {
    case 'strong': return Math.max(1, Math.round(current * 2))
    case 'medium': return Math.max(1, Math.round(current * 1.5))
    case 'weak':   return Math.max(1, Math.round(current * 0.5))
  }
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function daysDiff(dateStr: string): number {
  return Math.round(
    (new Date(dateStr).getTime() - new Date(todayStr()).getTime()) / 86400000
  )
}

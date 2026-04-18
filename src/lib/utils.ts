import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatDateShort(date: Date | string): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(new Date(date))
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export function getCurrentWeek(): number {
  const d = new Date()
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

export function getCurrentQuarter(): number {
  return Math.ceil((new Date().getMonth() + 1) / 3)
}

function getMondayOfCurrentWeek(): Date {
  const now = new Date()
  const day = now.getDay() // 0=So, 1=Mo, ...6=Sa
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

export function getCurrentWeekLabel(): string {
  const week = getCurrentWeek()
  const monday = getMondayOfCurrentWeek()
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const year = sunday.getFullYear()

  if (monday.getMonth() === sunday.getMonth()) {
    const month = new Intl.DateTimeFormat('de-DE', { month: 'long' }).format(monday)
    return `KW ${week} · ${monday.getDate()}.–${sunday.getDate()}. ${month} ${year}`
  } else {
    const monStr = `${monday.getDate()}. ${new Intl.DateTimeFormat('de-DE', { month: 'short' }).format(monday)}`
    const sunStr = `${sunday.getDate()}. ${new Intl.DateTimeFormat('de-DE', { month: 'short' }).format(sunday)} ${year}`
    return `KW ${week} · ${monStr}–${sunStr}`
  }
}

export function getCurrentMonthLabel(): string {
  return new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(new Date())
}

export function getCurrentQuarterLabel(): string {
  const quarter = getCurrentQuarter()
  const year = new Date().getFullYear()
  const labels: Record<number, string> = { 1: 'Jan–Mär', 2: 'Apr–Jun', 3: 'Jul–Sep', 4: 'Okt–Dez' }
  return `Q${quarter} ${year} · ${labels[quarter]}`
}

export function getCurrentYearLabel(): string {
  return String(new Date().getFullYear())
}

export function daysSince(dateStr: string): number {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + '...'
}

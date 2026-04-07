import { useState, useEffect, useCallback } from 'react'
import { useStore } from '../../store/useStore'
import { getHabitsForMonth, getHabitLogs } from '../../lib/db'
import type { HabitRow, HabitLogRow } from '../../types/database'

interface Props {
  month: number
  year: number
  onRateComputed?: (rate: number | null) => void
}

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate()
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

function isoDate(day: number, month: number, year: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getMondayOfWeek(d: Date): string {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  return monday.toISOString().split('T')[0]
}

function getSundayOfWeek(mondayStr: string): string {
  const d = new Date(mondayStr + 'T12:00:00')
  d.setDate(d.getDate() + 6)
  return d.toISOString().split('T')[0]
}

// ─── Raten-Berechnungen ───────────────────────────────────────────────────────

function calcHabitRate(
  habitId: string,
  logMap: Map<string, boolean>,
  month: number,
  year: number,
  today: string
): number {
  const daysInMonth = getDaysInMonth(month, year)
  let done = 0
  let elapsed = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = isoDate(d, month, year)
    if (iso > today) break
    elapsed++
    if (logMap.get(`${habitId}:${iso}`) === true) done++
  }
  return elapsed === 0 ? 0 : Math.round((done / elapsed) * 100)
}

function calcMonthRate(
  habits: HabitRow[],
  logMap: Map<string, boolean>,
  month: number,
  year: number,
  today: string
): number {
  if (habits.length === 0) return 0
  const rates = habits.map((h) => calcHabitRate(h.id, logMap, month, year, today))
  return Math.round(rates.reduce((a, b) => a + b, 0) / rates.length)
}

function calcWeekRate(
  habits: HabitRow[],
  logMap: Map<string, boolean>,
  today: string
): number {
  if (habits.length === 0) return 0
  const mondayStr = getMondayOfWeek(new Date(today + 'T12:00:00'))
  const sundayStr = getSundayOfWeek(mondayStr)
  let done = 0
  let total = 0
  for (const h of habits) {
    // Wochentage bis heute (innerhalb dieser Woche)
    let d = new Date(mondayStr + 'T12:00:00')
    while (true) {
      const iso = d.toISOString().split('T')[0]
      if (iso > sundayStr || iso > today) break
      total++
      if (logMap.get(`${h.id}:${iso}`) === true) done++
      d.setDate(d.getDate() + 1)
    }
  }
  return total === 0 ? 0 : Math.round((done / total) * 100)
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────

export default function HabitGrid({ month, year, onRateComputed }: Props) {
  const { user } = useStore()
  const [habits, setHabits] = useState<HabitRow[]>([])
  const [logs, setLogs] = useState<HabitLogRow[]>([])
  const [loading, setLoading] = useState(false)

  const today = todayISO()
  const daysInMonth = getDaysInMonth(month, year)

  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [h, l] = await Promise.all([
        getHabitsForMonth(user.id, month, year),
        getHabitLogs(user.id, month, year),
      ])
      const activeHabits = h.filter((h) => h.is_active)
      setHabits(activeHabits)
      setLogs(l)
    } catch (err) {
      console.error('HabitGrid laden:', err)
    } finally {
      setLoading(false)
    }
  }, [user, month, year]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadData() }, [loadData])

  // Log-Lookup: "habitId:YYYY-MM-DD" → boolean
  const logMap = new Map<string, boolean>()
  logs.forEach((l) => {
    logMap.set(`${l.habit_id}:${l.log_date}`, l.completed)
  })

  const monthRate = calcMonthRate(habits, logMap, month, year, today)
  const weekRate = calcWeekRate(habits, logMap, today)

  // Habit-Rate an Eltern-Komponente melden
  useEffect(() => {
    if (!loading) {
      onRateComputed?.(habits.length > 0 ? monthRate : null)
    }
  }, [loading, monthRate, habits.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Tage-Array für Header
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  if (loading) {
    return <div style={{ padding: '1.5rem 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Lade Habits…</div>
  }

  if (habits.length === 0) {
    return (
      <div style={{ padding: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        Keine aktiven Habits für diesen Monat. Habits im Journal → Monat → Planung definieren.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Header: Titel + Raten */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Habit-Grid
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.75rem' }}>
          <span>KW: <strong style={{ color: weekRate >= 70 ? '#22c55e' : weekRate >= 40 ? '#f59e0b' : '#ef4444' }}>{weekRate}%</strong></span>
          <span>Monat: <strong style={{ color: monthRate >= 70 ? '#22c55e' : monthRate >= 40 ? '#f59e0b' : '#ef4444' }}>{monthRate}%</strong></span>
        </div>
      </div>

      {/* Scrollbarer Grid */}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: 'max-content', width: '100%' }}>
          <thead>
            <tr>
              {/* Habit-Name-Spalte */}
              <th style={{
                textAlign: 'left', padding: '0.3rem 0.75rem 0.3rem 0',
                fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.04em',
                position: 'sticky', left: 0, background: 'var(--bg-primary)', zIndex: 1,
                borderRight: '1px solid var(--border)', whiteSpace: 'nowrap',
                minWidth: '130px',
              }}>
                Habit
              </th>
              {days.map((d) => {
                const iso = isoDate(d, month, year)
                const isToday = iso === today
                return (
                  <th key={d} style={{
                    padding: '0.3rem 0.15rem',
                    fontSize: '0.65rem', color: isToday ? 'var(--accent)' : 'var(--text-muted)',
                    fontWeight: isToday ? 700 : 400,
                    textAlign: 'center', minWidth: '22px',
                  }}>
                    {d}
                  </th>
                )
              })}
              {/* Rate-Spalte */}
              <th style={{
                padding: '0.3rem 0 0.3rem 0.5rem',
                fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.04em',
                textAlign: 'right', whiteSpace: 'nowrap',
              }}>
                Rate
              </th>
            </tr>
          </thead>
          <tbody>
            {habits.map((habit) => {
              const rate = calcHabitRate(habit.id, logMap, month, year, today)
              const rateColor = rate >= 70 ? '#22c55e' : rate >= 40 ? '#f59e0b' : '#ef4444'

              return (
                <tr key={habit.id}>
                  {/* Habit-Name */}
                  <td style={{
                    padding: '0.3rem 0.75rem 0.3rem 0',
                    fontSize: '0.8rem', color: 'var(--text-primary)',
                    whiteSpace: 'nowrap', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis',
                    position: 'sticky', left: 0, background: 'var(--bg-primary)', zIndex: 1,
                    borderRight: '1px solid var(--border)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: habit.color || 'var(--accent)', flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {habit.title}
                        {habit.frequency_type === 'weekly' && (
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: '0.3rem' }}>
                            ({habit.frequency_value}×/W)
                          </span>
                        )}
                      </span>
                    </div>
                  </td>

                  {/* Tages-Zellen */}
                  {days.map((d) => {
                    const iso = isoDate(d, month, year)
                    const isFuture = iso > today
                    const isToday = iso === today
                    const done = logMap.get(`${habit.id}:${iso}`)
                    const isPast = !isFuture && !isToday

                    let symbol: string
                    let color: string
                    let bg: string

                    if (isFuture) {
                      symbol = '·'
                      color = 'var(--border)'
                      bg = 'transparent'
                    } else if (done === true) {
                      symbol = '✓'
                      color = '#22c55e'
                      bg = '#22c55e12'
                    } else if (isPast || isToday) {
                      symbol = '×'
                      color = '#e5e7eb'
                      bg = 'transparent'
                    } else {
                      symbol = '·'
                      color = 'var(--border)'
                      bg = 'transparent'
                    }

                    return (
                      <td key={d} style={{
                        padding: '0.25rem 0.1rem',
                        textAlign: 'center',
                        fontSize: done === true ? '0.75rem' : '0.8rem',
                        fontWeight: done === true ? 700 : 400,
                        color,
                        background: bg,
                        borderRadius: '3px',
                        outline: isToday ? '1px solid var(--accent)' : 'none',
                        outlineOffset: '-1px',
                      }}>
                        {symbol}
                      </td>
                    )
                  })}

                  {/* Rate */}
                  <td style={{
                    padding: '0.3rem 0 0.3rem 0.5rem',
                    textAlign: 'right',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: rateColor,
                    whiteSpace: 'nowrap',
                  }}>
                    {rate}%
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Legende */}
      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
        <span><span style={{ color: '#22c55e', fontWeight: 700 }}>✓</span> erledigt</span>
        <span><span style={{ color: '#e5e7eb' }}>×</span> nicht erledigt</span>
        <span><span style={{ color: 'var(--border)' }}>·</span> Zukunft</span>
      </div>
    </div>
  )
}

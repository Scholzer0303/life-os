import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { getHabitsForMonth, getHabitLogs, logHabit } from '../../lib/db'
import type { HabitRow, HabitLogRow } from '../../types/database'

interface Props {
  date: string       // YYYY-MM-DD
  readonly?: boolean
}

function getMondayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

function getSundayOfWeek(mondayStr: string): string {
  const d = new Date(mondayStr + 'T12:00:00')
  d.setDate(d.getDate() + 6)
  return d.toISOString().split('T')[0]
}

export default function HabitChecklist({ date, readonly = false }: Props) {
  const { user } = useStore()
  const [habits, setHabits] = useState<HabitRow[]>([])
  const [logs, setLogs] = useState<HabitLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

  const dateObj = new Date(date + 'T12:00:00')
  const month = dateObj.getMonth() + 1
  const year = dateObj.getFullYear()
  const mondayStr = getMondayOfWeek(date)
  const sundayStr = getSundayOfWeek(mondayStr)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    Promise.all([
      getHabitsForMonth(user.id, month, year),
      getHabitLogs(user.id, month, year),
    ])
      .then(([h, l]) => { setHabits(h); setLogs(l) })
      .catch((err) => console.error('HabitChecklist laden:', err))
      .finally(() => setLoading(false))
  }, [date]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleToggle(habit: HabitRow, doneToday: boolean) {
    if (readonly || !user || toggling) return
    setToggling(habit.id)
    const next = !doneToday
    try {
      await logHabit(habit.id, user.id, date, next)
      setLogs((prev) => {
        const without = prev.filter((l) => !(l.habit_id === habit.id && l.log_date === date))
        return [...without, { id: Date.now().toString(), habit_id: habit.id, user_id: user.id, log_date: date, completed: next }]
      })
    } catch (err) {
      console.error('Habit toggle:', err)
    } finally {
      setToggling(null)
    }
  }

  if (loading) {
    return <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '0.5rem 0' }}>Habits laden…</div>
  }

  if (habits.length === 0) {
    return (
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '1rem 1.1rem',
        marginBottom: '1.25rem',
        color: 'var(--text-muted)',
        fontSize: '0.85rem',
      }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Habits</div>
        Keine Habits für diesen Monat. Habits werden in Journal → Monat → Planung definiert.
      </div>
    )
  }

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '1rem 1.1rem',
      marginBottom: '1.25rem',
    }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
        Habits
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {habits.map((habit) => {
          const doneToday = logs.some((l) => l.habit_id === habit.id && l.log_date === date && l.completed)
          const isToggling = toggling === habit.id

          // Wochenfortschritt für weekly habits
          const weekCount = habit.frequency_type === 'weekly'
            ? logs.filter((l) => l.habit_id === habit.id && l.log_date >= mondayStr && l.log_date <= sundayStr && l.completed).length
            : null
          const weekTarget = habit.frequency_type === 'weekly' ? habit.frequency_value : null
          const weekDone = weekCount !== null && weekTarget !== null && weekCount >= weekTarget

          return (
            <button
              key={habit.id}
              onClick={() => handleToggle(habit, doneToday)}
              disabled={readonly || isToggling}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                background: doneToday ? `${habit.color}18` : 'transparent',
                border: `1px solid ${doneToday ? habit.color + '40' : 'transparent'}`,
                borderRadius: '8px',
                padding: '0.5rem 0.65rem',
                cursor: readonly ? 'default' : 'pointer',
                textAlign: 'left',
                transition: 'background 0.12s, border-color 0.12s',
                opacity: isToggling ? 0.6 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: 0 }}>
                {/* Farbpunkt */}
                <div style={{
                  width: '9px', height: '9px', borderRadius: '50%',
                  background: habit.color, flexShrink: 0,
                  opacity: doneToday ? 1 : 0.4,
                }} />
                {/* Check-Icon */}
                <span style={{
                  fontSize: '1rem',
                  color: doneToday ? habit.color : 'var(--border)',
                  flexShrink: 0,
                  lineHeight: 1,
                }}>
                  {doneToday ? '✓' : '○'}
                </span>
                {/* Titel */}
                <span style={{
                  fontSize: '0.9rem',
                  color: doneToday ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: doneToday ? 500 : 400,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {habit.title}
                </span>
              </div>

              {/* Wochenfortschritt-Badge für weekly habits */}
              {weekCount !== null && weekTarget !== null && (
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 500,
                  color: weekDone ? '#22c55e' : 'var(--text-muted)',
                  background: weekDone ? '#22c55e18' : 'var(--bg-primary)',
                  border: `1px solid ${weekDone ? '#22c55e40' : 'var(--border)'}`,
                  borderRadius: '6px',
                  padding: '0.15rem 0.45rem',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}>
                  {weekCount}/{weekTarget}× Wo.
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

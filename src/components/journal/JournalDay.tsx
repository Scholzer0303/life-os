import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { getEntriesForDate } from '../../lib/db'
import { todayISO } from '../../lib/utils'
import MorningJournal from './MorningJournal'
import EveningJournal from './EveningJournal'
import HabitChecklist from '../habits/HabitChecklist'
import type { JournalEntryRow } from '../../types/database'
import type { DailyTask } from '../../types'

interface Props {
  initialDate?: string
}

// ISO-Kalenderwoche berechnen (ISO 8601)
function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function formatDayHeader(isoDate: string): string {
  const d = new Date(isoDate + 'T12:00:00')
  const weekday = new Intl.DateTimeFormat('de-DE', { weekday: 'long' }).format(d)
  const dayMonth = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long' }).format(d)
  const year = d.getFullYear()
  const kw = getISOWeek(d)
  return `${weekday}, ${dayMonth} · ${year} · KW ${kw}`
}

function addDays(isoDate: string, delta: number): string {
  const d = new Date(isoDate + 'T12:00:00')
  d.setDate(d.getDate() + delta)
  return d.toISOString().split('T')[0]
}

// Lese-Ansicht für vergangene Morgen-Einträge
function MorningReadOnly({ entry }: { entry: JournalEntryRow }) {
  const metricsEnabled = localStorage.getItem('metrics_enabled') !== 'false'
  const tasks: DailyTask[] = Array.isArray(entry.daily_tasks)
    ? (entry.daily_tasks as unknown as DailyTask[])
    : []

  const energyColor =
    (entry.feeling_score ?? 0) >= 7
      ? 'var(--accent-green, #22c55e)'
      : (entry.feeling_score ?? 0) >= 4
      ? '#f59e0b'
      : '#ef4444'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '0.5rem' }}>
      {/* Energie */}
      {entry.feeling_score && (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '1rem 1.1rem',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Energie
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: energyColor }}>
            {entry.feeling_score}/10
          </div>
          {entry.free_text && (
            <div style={{ marginTop: '0.4rem', fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              „{entry.free_text}"
            </div>
          )}
        </div>
      )}

      {/* Metriken */}
      {metricsEnabled && (entry.weight || entry.sleep_score) && (
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {entry.weight && (
            <div style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.85rem 1rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Gewicht</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{entry.weight} kg</div>
            </div>
          )}
          {entry.sleep_score && (
            <div style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.85rem 1rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Schlaf</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{entry.sleep_score}/100</div>
            </div>
          )}
        </div>
      )}

      {/* Tagesaufgaben */}
      {tasks.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem 1.1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Tagesaufgaben
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {tasks.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', color: t.completed ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                <span style={{ fontSize: '1rem' }}>{t.completed ? '✅' : '○'}</span>
                <span style={{ textDecoration: t.completed ? 'line-through' : 'none' }}>{t.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hauptziel */}
      {entry.main_goal_today && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem 1.1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fokus</div>
          <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{entry.main_goal_today}</div>
        </div>
      )}

      {/* Kalender */}
      {entry.calendar_planned !== null && (
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Kalender geplant: {entry.calendar_planned ? '✓ Ja' : '✗ Nein'}
        </div>
      )}
    </div>
  )
}

// Lese-Ansicht für vergangene Abend-Einträge
function EveningReadOnly({ entry }: { entry: JournalEntryRow }) {
  const energyColor =
    (entry.energy_level ?? 0) >= 7
      ? '#22c55e'
      : (entry.energy_level ?? 0) >= 4
      ? '#f59e0b'
      : '#ef4444'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '0.5rem' }}>
      {entry.energy_level && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem 1.1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Energie Abend</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: energyColor }}>{entry.energy_level}/10</div>
        </div>
      )}
      {entry.accomplished && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem 1.1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Geschafft</div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{entry.accomplished}</div>
        </div>
      )}
      {entry.what_blocked && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem 1.1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Was hat gebremst</div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{entry.what_blocked}</div>
        </div>
      )}
      {entry.free_text && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem 1.1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gedanken</div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{entry.free_text}</div>
        </div>
      )}
      {entry.gratitude && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem 1.1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dankbarkeit</div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{entry.gratitude}</div>
        </div>
      )}
    </div>
  )
}

export default function JournalDay({ initialDate }: Props) {
  const today = todayISO()
  const [selectedDate, setSelectedDate] = useState(initialDate ?? today)
  const [activeSubTab, setActiveSubTab] = useState<'morgen' | 'abend'>('morgen')
  const { user } = useStore()

  // Einträge für vergangene Tage laden
  const [pastEntries, setPastEntries] = useState<JournalEntryRow[]>([])
  const [loading, setLoading] = useState(false)

  const isToday = selectedDate === today

  useEffect(() => {
    if (isToday || !user) { setPastEntries([]); return }
    setLoading(true)
    getEntriesForDate(user.id, selectedDate)
      .then(setPastEntries)
      .catch((err) => console.error('JournalDay Einträge laden:', err))
      .finally(() => setLoading(false))
  }, [selectedDate, user]) // eslint-disable-line react-hooks/exhaustive-deps

  const pastMorning = pastEntries.find((e) => e.type === 'morning') ?? null
  const pastEvening = pastEntries.find((e) => e.type === 'evening') ?? null

  return (
    <div>
      {/* Datum-Navigation */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.25rem',
          gap: '0.5rem',
        }}
      >
        <button
          onClick={() => setSelectedDate(addDays(selectedDate, -1))}
          style={{
            background: 'none',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '0.4rem 0.6rem',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
          }}
          aria-label="Vorheriger Tag"
        >
          <ChevronLeft size={16} />
        </button>

        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            {formatDayHeader(selectedDate)}
          </div>
          {isToday && (
            <div style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 600, marginTop: '0.1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Heute
            </div>
          )}
        </div>

        <button
          onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          disabled={isToday}
          style={{
            background: 'none',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '0.4rem 0.6rem',
            cursor: isToday ? 'default' : 'pointer',
            color: isToday ? 'var(--border)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
          }}
          aria-label="Nächster Tag"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Sub-Tabs: Morgen | Abend */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
          marginBottom: '1.25rem',
        }}
      >
        {(['morgen', 'abend'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.55rem 1.1rem',
              fontSize: '0.875rem',
              fontWeight: activeSubTab === tab ? 600 : 400,
              color: activeSubTab === tab ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: activeSubTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: '-1px',
              fontFamily: 'DM Sans, sans-serif',
              textTransform: 'capitalize',
              transition: 'color 0.15s',
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Inhalt */}
      {loading && (
        <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Lade…
        </div>
      )}

      {!loading && activeSubTab === 'morgen' && (
        <>
          {isToday ? (
            <MorningJournal />
          ) : pastMorning ? (
            <MorningReadOnly entry={pastMorning} />
          ) : (
            <div style={{ padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
              Kein Morgen-Eintrag für diesen Tag.
            </div>
          )}
        </>
      )}

      {!loading && activeSubTab === 'abend' && (
        <>
          {/* Habits für vergangene Tage als Lese-Ansicht — heute ist in EveningJournal integriert */}
          {!isToday && <HabitChecklist date={selectedDate} readonly />}

          {isToday ? (
            <EveningJournal />
          ) : pastEvening ? (
            <EveningReadOnly entry={pastEvening} />
          ) : (
            <div style={{ padding: '1rem 0', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
              Kein Abend-Eintrag für diesen Tag.
            </div>
          )}
        </>
      )}
    </div>
  )
}

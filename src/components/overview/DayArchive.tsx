import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { X } from 'lucide-react'
import { useStore } from '../../store/useStore'
import {
  getEntriesForDate,
  getHabitsForMonth,
  getHabitLogsForDate,
  getCoachSessionsForDate,
  parseMessages,
} from '../../lib/db'
import type { JournalEntryRow, CoachSessionRow, HabitLogRow, HabitRow } from '../../types/database'
import type { DailyTask } from '../../types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  return new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d)
}

function energyColor(v: number): string {
  if (v >= 8) return '#22c55e'
  if (v >= 5) return 'var(--accent)'
  return 'var(--accent-warm, #f59e0b)'
}

const LABEL: React.CSSProperties = {
  fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem',
}

const SECTION: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  padding: '1rem',
  display: 'flex', flexDirection: 'column', gap: '0.65rem',
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────

interface Props {
  date: string
  onClose: () => void
}

export default function DayArchive({ date, onClose }: Props) {
  const { user } = useStore()
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<JournalEntryRow[]>([])
  const [habits, setHabits] = useState<HabitRow[]>([])
  const [habitLogs, setHabitLogs] = useState<HabitLogRow[]>([])
  const [sessions, setSessions] = useState<CoachSessionRow[]>([])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    const d = new Date(date + 'T12:00:00')
    const month = d.getMonth() + 1
    const year = d.getFullYear()

    Promise.all([
      getEntriesForDate(user.id, date),
      getHabitsForMonth(user.id, month, year),
      getHabitLogsForDate(user.id, date),
      getCoachSessionsForDate(user.id, date),
    ])
      .then(([e, h, hl, cs]) => {
        setEntries(e)
        setHabits(h)
        setHabitLogs(hl)
        setSessions(cs)
      })
      .catch((err) => console.error('DayArchive laden:', err))
      .finally(() => setLoading(false))
  }, [user, date])

  const morning = entries.find((e) => e.type === 'morning') ?? null
  const evening = entries.find((e) => e.type === 'evening') ?? null
  const hasAnyData = morning || evening || habits.length > 0 || sessions.length > 0

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Lora, serif' }}>
          {formatDate(date)}
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: '0.2rem' }}
          aria-label="Schließen"
        >
          <X size={18} />
        </button>
      </div>

      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loading && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', padding: '1.5rem 0' }}>Lade…</div>
        )}

        {!loading && !hasAnyData && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', padding: '1.5rem 0', fontStyle: 'italic' }}>
            Kein Eintrag für diesen Tag.
          </div>
        )}

        {!loading && morning && <MorningSection entry={morning} />}
        {!loading && evening && <EveningSection entry={evening} />}
        {!loading && habits.length > 0 && <HabitsSection habits={habits} logs={habitLogs} />}
        {!loading && sessions.length > 0 && <CoachSection sessions={sessions} />}
      </div>
    </div>
  )
}

// ─── Morgenjournal ────────────────────────────────────────────────────────────

function MorningSection({ entry }: { entry: JournalEntryRow }) {
  const tasks = parseTasks(entry.daily_tasks)

  return (
    <div style={SECTION}>
      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Morgen
      </div>

      {/* Metriken */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {entry.feeling_score != null && (
          <MetricBadge label="Energie" value={`${entry.feeling_score}/10`} color={energyColor(entry.feeling_score)} />
        )}
        {entry.sleep_score != null && (
          <MetricBadge label="Schlaf" value={`${entry.sleep_score}/100`} />
        )}
        {entry.weight != null && (
          <MetricBadge label="Gewicht" value={`${entry.weight} kg`} />
        )}
        {entry.calendar_planned != null && (
          <MetricBadge label="Kalender" value={entry.calendar_planned ? 'Ja' : 'Nein'} color={entry.calendar_planned ? '#22c55e' : undefined} />
        )}
      </div>

      {/* Tagesaufgaben */}
      {tasks.length > 0 && (
        <div>
          <div style={LABEL}>Tagesaufgaben</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {tasks.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <span style={{ color: t.completed ? '#22c55e' : 'var(--text-muted)', flexShrink: 0 }}>{t.completed ? '✓' : '○'}</span>
                <span style={{ color: t.completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: t.completed ? 'line-through' : 'none' }}>
                  {t.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KI-Impuls */}
      {entry.ai_feedback && (
        <div>
          <div style={LABEL}>KI-Impuls</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            <ReactMarkdown>{entry.ai_feedback}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Abendjournal ─────────────────────────────────────────────────────────────

function EveningSection({ entry }: { entry: JournalEntryRow }) {
  const nextTasks = parseNextTasks(entry.next_day_tasks)

  return (
    <div style={SECTION}>
      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Abend
      </div>

      {/* Energie */}
      {entry.energy_level != null && (
        <MetricBadge label="Energie-Abend" value={`${entry.energy_level}/10`} color={energyColor(entry.energy_level)} />
      )}

      {entry.accomplished && (
        <TextBlock label="Was lief gut" text={entry.accomplished} />
      )}
      {entry.what_blocked && (
        <TextBlock label="Was hat geblockt" text={entry.what_blocked} />
      )}
      {entry.free_text && (
        <TextBlock label="Freie Gedanken" text={entry.free_text} />
      )}
      {entry.gratitude && (
        <TextBlock label="Dankbarkeit" text={entry.gratitude} />
      )}

      {/* Morgen-Aufgaben vorausgeplant */}
      {nextTasks.length > 0 && (
        <div>
          <div style={LABEL}>Aufgaben für morgen geplant</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {nextTasks.map((t, i) => (
              <div key={i} style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>→</span> {t}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Habits ───────────────────────────────────────────────────────────────────

function HabitsSection({ habits, logs }: { habits: HabitRow[]; logs: HabitLogRow[] }) {
  const logMap = new Map(logs.map((l) => [l.habit_id, l.completed]))

  return (
    <div style={SECTION}>
      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Habits
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        {habits.map((h) => {
          const done = logMap.get(h.id) === true
          return (
            <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
              <span style={{ color: done ? '#22c55e' : 'var(--border)', flexShrink: 0 }}>{done ? '✓' : '○'}</span>
              <span style={{ color: done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: done ? 'line-through' : 'none' }}>
                {h.title}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Coach-Gespräche ──────────────────────────────────────────────────────────

function CoachSection({ sessions }: { sessions: CoachSessionRow[] }) {
  return (
    <div style={SECTION}>
      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Coach-Gespräche
      </div>
      {sessions.map((s) => {
        const msgs = parseMessages(s)
        const userMsg = msgs.find((m) => m.role === 'user')
        const assistantMsg = msgs.filter((m) => m.role === 'assistant').at(-1)
        return (
          <div key={s.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {new Date(s.created_at ?? '').toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {msgs.length} Nachrichten
              </span>
            </div>
            {s.summary && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{s.summary}</div>
            )}
            {!s.summary && userMsg && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, fontStyle: 'italic' }}>
                "{userMsg.content.slice(0, 120)}{userMsg.content.length > 120 ? '…' : ''}"
              </div>
            )}
            {assistantMsg && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                KI: {assistantMsg.content.slice(0, 100)}{assistantMsg.content.length > 100 ? '…' : ''}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Kleine Hilfskomponenten ──────────────────────────────────────────────────

function MetricBadge({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.4rem 0.65rem', display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: color ?? 'var(--text-primary)' }}>{value}</div>
    </div>
  )
}

function TextBlock({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div style={LABEL}>{label}</div>
      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{text}</div>
    </div>
  )
}

// ─── Parser ───────────────────────────────────────────────────────────────────

function parseTasks(raw: unknown): DailyTask[] {
  if (!raw || !Array.isArray(raw)) return []
  return (raw as unknown[]).filter((t): t is DailyTask =>
    typeof t === 'object' && t !== null && 'title' in t
  )
}

function parseNextTasks(raw: unknown): string[] {
  if (!raw || !Array.isArray(raw)) return []
  return (raw as unknown[]).map((t) => {
    if (typeof t === 'string') return t
    if (typeof t === 'object' && t !== null && 'title' in t) return (t as { title: string }).title
    return ''
  }).filter(Boolean)
}

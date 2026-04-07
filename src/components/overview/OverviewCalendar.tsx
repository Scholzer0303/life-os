import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import { getEntriesForMonth } from '../../lib/db'
import type { JournalEntryRow } from '../../types/database'

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

function getMonthLabel(month: number, year: number): string {
  return new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1))
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

function isoFromDayMonthYear(day: number, month: number, year: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getFirstWeekdayOfMonth(month: number, year: number): number {
  const jsDay = new Date(year, month - 1, 1).getDay()
  return jsDay === 0 ? 6 : jsDay - 1
}

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate()
}

// ─── Statistiken ─────────────────────────────────────────────────────────────

function calcStats(entries: JournalEntryRow[], daysInMonth: number, month: number, year: number) {
  const morningEntries = entries.filter((e) => e.type === 'morning')
  const eveningEntries = entries.filter((e) => e.type === 'evening')
  const morningDays = new Set(morningEntries.map((e) => e.entry_date)).size

  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()
  const elapsedDays = (year === currentYear && month === currentMonth)
    ? new Date().getDate()
    : daysInMonth

  const journalQuote = elapsedDays > 0 ? Math.round((morningDays / elapsedDays) * 100) : 0

  const energyVals = eveningEntries.map((e) => e.energy_level).filter((v): v is number => v !== null)
  const avgEnergy = energyVals.length > 0 ? (energyVals.reduce((a, b) => a + b, 0) / energyVals.length).toFixed(1) : null

  const sleepVals = morningEntries.map((e) => e.sleep_score).filter((v): v is number => v !== null)
  const avgSleep = sleepVals.length > 0 ? Math.round(sleepVals.reduce((a, b) => a + b, 0) / sleepVals.length) : null

  const weightVals = morningEntries.map((e) => e.weight).filter((v): v is number => v !== null)
  const avgWeight = weightVals.length > 0 ? (weightVals.reduce((a, b) => a + b, 0) / weightVals.length).toFixed(1) : null

  return { morningDays, elapsedDays, journalQuote, avgEnergy, avgSleep, avgWeight }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  month: number
  year: number
  isCurrentMonth: boolean
  onPrev: () => void
  onNext: () => void
  onGoToToday: () => void
  habitMonthRate?: number | null
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────

export default function OverviewCalendar({ month, year, isCurrentMonth, onPrev, onNext, onGoToToday, habitMonthRate }: Props) {
  const { user } = useStore()
  const navigate = useNavigate()
  const [entries, setEntries] = useState<JournalEntryRow[]>([])
  const [loading, setLoading] = useState(false)

  const monthLabel = getMonthLabel(month, year)
  const daysInMonth = getDaysInMonth(month, year)
  const firstWeekday = getFirstWeekdayOfMonth(month, year)
  const today = todayISO()

  const loadEntries = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await getEntriesForMonth(user.id, month, year)
      setEntries(data)
    } catch (err) {
      console.error('OverviewCalendar laden:', err)
    } finally {
      setLoading(false)
    }
  }, [user, month, year]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadEntries() }, [loadEntries])

  const entryMap = new Map<string, Set<string>>()
  entries.forEach((e) => {
    if (!entryMap.has(e.entry_date)) entryMap.set(e.entry_date, new Set())
    entryMap.get(e.entry_date)!.add(e.type)
  })

  const stats = calcStats(entries, daysInMonth, month, year)

  const cells: (number | null)[] = Array(firstWeekday).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <button
          onClick={onPrev}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.4rem 0.6rem', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
          aria-label="Vorheriger Monat"
        >
          <ChevronLeft size={16} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, justifyContent: 'center' }}>
          <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{monthLabel}</span>
          {!isCurrentMonth && (
            <button
              onClick={onGoToToday}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.2rem 0.6rem', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}
            >
              Heute
            </button>
          )}
        </div>

        <button
          onClick={onNext}
          disabled={isCurrentMonth}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.4rem 0.6rem', cursor: isCurrentMonth ? 'default' : 'pointer', color: isCurrentMonth ? 'var(--border)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
          aria-label="Nächster Monat"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Wochentag-Header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center' }}>
        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => (
          <div key={d} style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', padding: '0.3rem 0', letterSpacing: '0.03em' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Kalender-Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', padding: '2rem 0' }}>Lade…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
          {cells.map((day, idx) => {
            if (day === null) return <div key={`empty-${idx}`} style={{ aspectRatio: '1' }} />
            const iso = isoFromDayMonthYear(day, month, year)
            const types = entryMap.get(iso) ?? new Set()
            const hasMorning = types.has('morning')
            const hasEvening = types.has('evening')
            const isToday = iso === today
            const isFuture = iso > today
            return (
              <button
                key={day}
                onClick={() => !isFuture && navigate(`/journal?tab=tag&date=${iso}`)}
                disabled={isFuture}
                style={{
                  aspectRatio: '1',
                  border: isToday ? '2px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius: '8px',
                  background: isToday ? 'color-mix(in srgb, var(--accent) 10%, var(--bg-card))' : 'var(--bg-card)',
                  cursor: isFuture ? 'default' : 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: '3px', padding: '2px', opacity: isFuture ? 0.35 : 1, transition: 'background 0.1s',
                }}
              >
                <span style={{ fontSize: '0.8rem', fontWeight: isToday ? 700 : 400, color: isToday ? 'var(--accent)' : 'var(--text-primary)', lineHeight: 1 }}>
                  {day}
                </span>
                <div style={{ display: 'flex', gap: '2px', height: '5px', alignItems: 'center' }}>
                  {hasMorning && <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent)' }} />}
                  {hasEvening && <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent-warm, #f59e0b)' }} />}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Legende */}
      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }} /> Morgen
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-warm, #f59e0b)' }} /> Abend
        </div>
      </div>

      {/* Monatsstatistiken */}
      {!loading && (
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
            {monthLabel} — Statistiken
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem' }}>
            <StatTile label="Journal-Quote" value={`${stats.journalQuote}%`} sub={`${stats.morningDays} / ${stats.elapsedDays} Tage`} />
            <StatTile
              label="Habit-Rate"
              value={habitMonthRate !== null && habitMonthRate !== undefined ? `${habitMonthRate}%` : '–'}
              sub={habitMonthRate !== null && habitMonthRate !== undefined ? 'Ø aller Habits' : 'keine Habits'}
              valueColor={habitMonthRate !== null && habitMonthRate !== undefined
                ? (habitMonthRate >= 70 ? '#22c55e' : habitMonthRate >= 40 ? '#f59e0b' : '#ef4444')
                : undefined}
            />
            <StatTile label="Ø Energie" value={stats.avgEnergy ?? '–'} sub={stats.avgEnergy ? 'von 10' : 'kein Wert'} />
            <StatTile label="Ø Schlaf-Score" value={stats.avgSleep !== null ? String(stats.avgSleep) : '–'} sub={stats.avgSleep !== null ? 'von 100' : 'kein Wert'} />
            <div style={{ gridColumn: 'span 2' }}>
              <StatTile label="Ø Gewicht" value={stats.avgWeight ? `${stats.avgWeight} kg` : '–'} sub={stats.avgWeight ? '' : 'kein Wert'} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Hilfkomponente: Statistik-Kachel ────────────────────────────────────────

function StatTile({ label, value, sub, valueColor }: { label: string; value: string; sub?: string; valueColor?: string }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.85rem 1rem' }}>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.3rem' }}>{label}</div>
      <div style={{ fontSize: '1.3rem', fontWeight: 700, color: valueColor ?? (value === '–' ? 'var(--text-muted)' : 'var(--text-primary)') }}>{value}</div>
      {sub && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{sub}</div>}
    </div>
  )
}

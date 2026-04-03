import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Search, X, Sun, Moon, PenLine, MessageCircle, ChevronRight as ChevronRightSm } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { getJournalEntries, searchJournalEntries } from '../../lib/db'
import { formatDateShort } from '../../lib/utils'
import AIFeedbackCard from './AIFeedbackCard'
import type { JournalEntryRow, GoalRow } from '../../types/database'

// ── Day dot colors ────────────────────────────────────────────────────────────
function getDayDots(entries: JournalEntryRow[]): { color: string; label: string }[] {
  const hasMorning = entries.some((e) => e.type === 'morning')
  const hasEvening = entries.some((e) => e.type === 'evening')
  const hasFreeform = entries.some((e) => e.type === 'freeform')
  const dots: { color: string; label: string }[] = []
  if (hasMorning && hasEvening) dots.push({ color: '#6B4FBB', label: 'Morgen + Abend' })
  else if (hasMorning) dots.push({ color: 'var(--accent)', label: 'Morgen' })
  else if (hasEvening) dots.push({ color: 'var(--accent-green)', label: 'Abend' })
  if (hasFreeform) dots.push({ color: 'var(--streak)', label: 'Freeform' })
  return dots
}

// ── Goal Breadcrumb ───────────────────────────────────────────────────────────
function GoalBreadcrumb({ goalId, allGoals }: { goalId: string; allGoals: GoalRow[] }) {
  const goal = allGoals.find((g) => g.id === goalId)
  if (!goal) return null

  const chain: GoalRow[] = [goal]
  let current = goal
  while (current.parent_id) {
    const parent = allGoals.find((g) => g.id === current.parent_id)
    if (!parent) break
    chain.unshift(parent)
    current = parent
  }

  if (chain.length === 0) return null

  return (
    <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.75rem', background: 'rgba(134,59,255,0.07)', borderRadius: '8px' }}>
      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.35rem' }}>
        Ziel-Kontext
      </span>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.2rem' }}>
        {chain.map((g, i) => (
          <span key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            <span style={{ fontSize: '0.8rem', color: i === chain.length - 1 ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: i === chain.length - 1 ? 600 : 400 }}>
              {g.title}
            </span>
            {i < chain.length - 1 && <ChevronRightSm size={11} color="var(--text-muted)" />}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Entry Detail Modal ────────────────────────────────────────────────────────
function EntryDetail({ entries, onClose }: { entries: JournalEntryRow[]; onClose: () => void }) {
  const [localEntries, setLocalEntries] = useState(entries)
  const { goals: storeGoals } = useStore()

  function handleFeedbackSaved(entryId: string, feedback: string) {
    setLocalEntries((prev) => prev.map((e) => e.id === entryId ? { ...e, ai_feedback: feedback } : e))
  }

  const FEELING_EMOJI = ['', '😞', '😕', '😐', '🙂', '😄']
  const TYPE_LABEL: Record<string, string> = { morning: 'Morgen', evening: 'Abend', freeform: 'Freeform' }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 0' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--bg-primary)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '640px', maxHeight: '88svh', overflow: 'auto', padding: '1.5rem 1.25rem 2rem' }}
      >
        {/* Handle bar */}
        <div style={{ width: '36px', height: '4px', background: 'var(--border)', borderRadius: '2px', margin: '0 auto 1.25rem' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <span style={{ fontFamily: 'Lora, serif', fontSize: '1.1rem', fontWeight: 600 }}>
            {entries[0] ? formatDateShort(entries[0].entry_date) : ''}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem' }}>
            <X size={20} />
          </button>
        </div>

        {localEntries.map((entry) => (
          <div key={entry.id} style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
              {entry.type === 'morning' && <Sun size={14} color="var(--accent)" />}
              {entry.type === 'evening' && <Moon size={14} color="var(--accent-green)" />}
              {entry.type === 'freeform' && <PenLine size={14} color="var(--streak)" />}
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: entry.type === 'morning' ? 'var(--accent)' : entry.type === 'evening' ? 'var(--accent-green)' : 'var(--streak)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {TYPE_LABEL[entry.type]}
              </span>
            </div>

            {/* Morning fields */}
            {entry.feeling_score && (
              <Field label="Gefühl">{FEELING_EMOJI[entry.feeling_score]} {['', 'Sehr schlecht', 'Nicht so gut', 'Okay', 'Gut', 'Sehr gut'][entry.feeling_score]}</Field>
            )}
            {entry.main_goal_today && <Field label="Ziel">{entry.main_goal_today}</Field>}
            {entry.potential_blockers && <Field label="Blocker">{entry.potential_blockers}</Field>}

            {/* Evening fields */}
            {entry.accomplished && <Field label="Geschafft">{entry.accomplished}</Field>}
            {entry.what_blocked && <Field label="Aufgehalten">{entry.what_blocked}</Field>}
            {entry.energy_level && (
              <Field label="Energie">
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{entry.energy_level}/10</span>
              </Field>
            )}

            {/* Freetext */}
            {entry.free_text && <Field label="Freitext">{entry.free_text}</Field>}

            {/* Timeblocks */}
            {Array.isArray(entry.timeblocks) && (entry.timeblocks as unknown[]).length > 0 && (
              <Field label="Tagesplan">
                {(entry.timeblocks as Array<{ title: string; duration_min: number }>).map((b, i) => (
                  <span key={i} style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {b.title} — {b.duration_min < 60 ? `${b.duration_min} Min` : `${b.duration_min / 60} Std`}
                  </span>
                ))}
              </Field>
            )}

            {/* AI Feedback */}
            <div style={{ marginTop: '0.75rem' }}>
              {(entry.type === 'evening' || entry.type === 'freeform') && (
                <AIFeedbackCard entry={entry} onFeedbackSaved={(f) => handleFeedbackSaved(entry.id, f)} />
              )}
              {entry.type === 'morning' && entry.ai_feedback && (
                <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '8px', borderLeft: '3px solid var(--accent)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                    <MessageCircle size={12} color="var(--accent)" />
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Coach</span>
                  </div>
                  {entry.ai_feedback}
                </div>
              )}
            </div>

            {/* Ziel-Breadcrumb */}
            {entry.linked_goal_ids && entry.linked_goal_ids.length > 0 && (
              <GoalBreadcrumb goalId={entry.linked_goal_ids[0]} allGoals={storeGoals} />
            )}
          </div>
        ))}
      </motion.div>
    </motion.div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '0.65rem' }}>
      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.2rem' }}>{label}</span>
      <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>{children}</div>
    </div>
  )
}

// ── Calendar ──────────────────────────────────────────────────────────────────
const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

// ── Main Overview ─────────────────────────────────────────────────────────────
export default function JournalOverview() {
  const { user } = useStore()
  const navigate = useNavigate()

  const [allEntries, setAllEntries] = useState<JournalEntryRow[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<JournalEntryRow[] | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [viewYear, setViewYear] = useState(new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(new Date().getMonth())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    getJournalEntries(user.id, 90)
      .then((data) => { setAllEntries(data); setIsLoading(false) })
      .catch(console.error)
  }, [user])

  const runSearch = useCallback(async (q: string) => {
    if (!user || !q.trim()) { setSearchResults(null); return }
    setIsSearching(true)
    try {
      const results = await searchJournalEntries(user.id, q.trim())
      setSearchResults(results)
    } catch { setSearchResults([]) }
    finally { setIsSearching(false) }
  }, [user])

  useEffect(() => {
    const timer = setTimeout(() => runSearch(searchQuery), 350)
    return () => clearTimeout(timer)
  }, [searchQuery, runSearch])

  // Build entry lookup by date
  const byDate = allEntries.reduce<Record<string, JournalEntryRow[]>>((acc, e) => {
    if (!acc[e.entry_date]) acc[e.entry_date] = []
    acc[e.entry_date].push(e)
    return acc
  }, {})

  // Calendar days for current month
  const firstDay = new Date(viewYear, viewMonth, 1)
  const lastDay = new Date(viewYear, viewMonth + 1, 0)
  const startPad = (firstDay.getDay() + 6) % 7 // Mon=0
  const daysInMonth = lastDay.getDate()

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11) }
    else setViewMonth((m) => m - 1)
  }
  function nextMonth() {
    const now = new Date()
    if (viewYear === now.getFullYear() && viewMonth === now.getMonth()) return
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0) }
    else setViewMonth((m) => m + 1)
  }

  const today = new Date()
  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth()

  const selectedEntries = selectedDate ? (byDate[selectedDate] ?? []) : []

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>Journal</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => navigate('/journal?type=morning')} title="Morgen-Journal" style={quickIconBtn}>
            <Sun size={16} />
          </button>
          <button onClick={() => navigate('/journal?type=evening')} title="Abend-Journal" style={quickIconBtn}>
            <Moon size={16} />
          </button>
          <button onClick={() => navigate('/journal?type=freeform')} title="Freeform" style={quickIconBtn}>
            <PenLine size={16} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
        <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input
          type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Journal durchsuchen…"
          style={{ width: '100%', padding: '0.7rem 0.85rem 0.7rem 2.5rem', border: '1.5px solid var(--border)', borderRadius: '10px', fontSize: '0.9rem', fontFamily: 'DM Sans, sans-serif', background: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.1rem' }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Search results */}
      {searchQuery ? (
        <div>
          {isSearching ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Suche…</p>
          ) : searchResults && searchResults.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Keine Ergebnisse für „{searchQuery}".</p>
          ) : searchResults ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {searchResults.map((entry) => (
                <button key={entry.id} onClick={() => { setSelectedDate(entry.entry_date); setSearchQuery('') }}
                  style={{ padding: '0.85rem 1rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', cursor: 'pointer', textAlign: 'left', fontFamily: 'DM Sans, sans-serif' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDateShort(entry.entry_date)}</span>
                    <span style={{ fontSize: '0.7rem', color: entry.type === 'morning' ? 'var(--accent)' : entry.type === 'evening' ? 'var(--accent-green)' : 'var(--streak)', fontWeight: 600, textTransform: 'uppercase' }}>
                      {entry.type === 'morning' ? 'Morgen' : entry.type === 'evening' ? 'Abend' : 'Freeform'}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                    {entry.main_goal_today ?? entry.accomplished ?? entry.free_text ?? ''}
                  </p>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <>
          {/* Calendar */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1rem', marginBottom: '1.5rem' }}>
            {/* Month nav */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.25rem' }}>
                <ChevronLeft size={18} />
              </button>
              <span style={{ fontFamily: 'Lora, serif', fontWeight: 600, fontSize: '0.95rem' }}>
                {MONTHS[viewMonth]} {viewYear}
              </span>
              <button onClick={nextMonth} disabled={isCurrentMonth} style={{ background: 'none', border: 'none', cursor: isCurrentMonth ? 'default' : 'pointer', color: isCurrentMonth ? 'var(--border)' : 'var(--text-secondary)', padding: '0.25rem' }}>
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Weekday headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '0.4rem' }}>
              {WEEKDAYS.map((d) => (
                <div key={d} style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, padding: '0.1rem' }}>{d}</div>
              ))}
            </div>

            {/* Days grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
              {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1
                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const dayEntries = byDate[dateStr] ?? []
                const dots = getDayDots(dayEntries)
                const isToday = dateStr === today.toISOString().split('T')[0]
                const isSelected = selectedDate === dateStr
                const isFuture = new Date(dateStr) > today
                return (
                  <button
                    key={day}
                    onClick={() => !isFuture && dayEntries.length > 0 && setSelectedDate(isSelected ? null : dateStr)}
                    disabled={isFuture || dayEntries.length === 0}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.35rem 0.1rem', borderRadius: '8px', background: isSelected ? 'var(--bg-secondary)' : isToday ? 'rgba(45,91,227,0.06)' : 'transparent', border: isToday ? '1.5px solid var(--accent)' : isSelected ? '1.5px solid var(--border)' : '1.5px solid transparent', cursor: dayEntries.length > 0 && !isFuture ? 'pointer' : 'default', transition: 'background 0.1s' }}
                  >
                    <span style={{ fontSize: '0.75rem', fontWeight: isToday ? 700 : 400, color: isFuture ? 'var(--border)' : isToday ? 'var(--accent)' : 'var(--text-primary)' }}>
                      {day}
                    </span>
                    <div style={{ display: 'flex', gap: '2px', marginTop: '2px', minHeight: '6px' }}>
                      {dots.map((dot, di) => (
                        <div key={di} style={{ width: '5px', height: '5px', borderRadius: '50%', background: dot.color }} title={dot.label} />
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Recent entries */}
          <h3 style={{ fontFamily: 'Lora, serif', fontSize: '1rem', fontWeight: 600, margin: '0 0 0.75rem' }}>Letzte Einträge</h3>
          {isLoading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Wird geladen…</p>
          ) : allEntries.length === 0 ? (
            <div style={{ padding: '1.5rem', background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: '12px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', margin: '0 0 0.75rem', fontSize: '0.9rem' }}>Noch keine Einträge.</p>
              <button onClick={() => navigate('/journal?type=morning')} style={{ padding: '0.5rem 1rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem', fontWeight: 500 }}>
                Ersten Eintrag schreiben →
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {allEntries.slice(0, 10).map((entry) => {
                const preview = entry.main_goal_today ?? entry.accomplished ?? entry.free_text ?? ''
                return (
                  <button key={entry.id} onClick={() => setSelectedDate(entry.entry_date)}
                    style={{ padding: '0.85rem 1rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', cursor: 'pointer', textAlign: 'left', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.type === 'morning' ? 'var(--accent)' : entry.type === 'evening' ? 'var(--accent-green)' : 'var(--streak)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {entry.type === 'morning' ? 'Morgen' : entry.type === 'evening' ? 'Abend' : 'Freeform'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDateShort(entry.entry_date)}</span>
                      </div>
                      {preview && (
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                          {preview}
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Entry Detail Modal */}
      <AnimatePresence>
        {selectedDate && selectedEntries.length > 0 && (
          <EntryDetail entries={selectedEntries} onClose={() => setSelectedDate(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

const quickIconBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '2rem', height: '2rem', background: 'var(--bg-card)',
  border: '1px solid var(--border)', borderRadius: '8px',
  cursor: 'pointer', color: 'var(--text-secondary)',
}

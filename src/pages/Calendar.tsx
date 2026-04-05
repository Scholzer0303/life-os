import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Loader2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import {
  getRecurringBlocks,
  getExceptionsForBlocks,
  createRecurringBlock,
  updateRecurringBlock,
  deleteRecurringBlock,
  upsertBlockException,
  deleteExceptionsFrom,
} from '../lib/db'
import type { RecurringBlock, BlockException, DayBlock, BlockFormData, SeriesEditScope } from '../types'
import BlockSheet from '../components/calendar/BlockSheet'
import SeriesScopeDialog from '../components/calendar/SeriesScopeDialog'

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return toDateString(d)
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const today = toDateString(new Date())
  const yesterday = addDays(today, -1)
  const tomorrow = addDays(today, 1)
  if (dateStr === today) return 'Heute'
  if (dateStr === yesterday) return 'Gestern'
  if (dateStr === tomorrow) return 'Morgen'
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
}

// Zeit 'HH:MM' → Minuten seit Mitternacht
function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

// Prüft ob ein Block an einem bestimmten Datum vorkommt
function blockOccursOnDate(block: RecurringBlock, dateStr: string): boolean {
  if (dateStr < block.start_date) return false
  if (block.end_date && dateStr > block.end_date) return false

  const d = new Date(dateStr + 'T12:00:00')
  const dow = d.getDay() // 0=So, 1=Mo … 6=Sa

  switch (block.recurrence_type) {
    case 'none':
      return dateStr === block.start_date
    case 'daily':
      return true
    case 'weekdays':
      return dow >= 1 && dow <= 5
    case 'weekly':
      return block.recurrence_day === dow
    default:
      return false
  }
}

// Löst alle Blöcke für ein Datum auf (Wiederholungslogik + Ausnahmen anwenden)
function resolveBlocksForDate(
  blocks: RecurringBlock[],
  exceptions: BlockException[],
  dateStr: string
): DayBlock[] {
  const exceptionMap = new Map<string, BlockException>()
  for (const ex of exceptions) {
    if (ex.exception_date === dateStr) {
      exceptionMap.set(ex.block_id, ex)
    }
  }

  const result: DayBlock[] = []

  for (const block of blocks) {
    if (!blockOccursOnDate(block, dateStr)) continue

    const ex = exceptionMap.get(block.id)

    // Gelöschte Ausnahme → Block überspringen
    if (ex?.is_deleted) continue

    result.push({
      id: block.id,
      exception_id: ex?.id,
      date: dateStr,
      title: ex?.modified_title ?? block.title,
      start_time: ex?.modified_start_time ?? block.start_time,
      end_time: ex?.modified_end_time ?? block.end_time,
      color: ex?.modified_color ?? block.color,
      recurrence_type: block.recurrence_type,
      is_modified: !!ex,
    })
  }

  // Nach Startzeit sortieren
  return result.sort((a, b) => timeToMin(a.start_time) - timeToMin(b.start_time))
}

// ─── Zeitachsen-Konstanten ────────────────────────────────────────────────────

const HOUR_START = 6
const HOUR_END = 22
const SLOT_MIN = 30
const SLOTS_PER_HOUR = 60 / SLOT_MIN
const TOTAL_SLOTS = (HOUR_END - HOUR_START) * SLOTS_PER_HOUR
const SLOT_HEIGHT = 48  // px pro 30-Minuten-Slot
const TIME_COL_WIDTH = '3.5rem'

function slotLabel(slotIndex: number): string {
  const totalMin = HOUR_START * 60 + slotIndex * SLOT_MIN
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function isFullHour(slotIndex: number): boolean {
  return slotIndex % SLOTS_PER_HOUR === 0
}

// Berechnet Position und Höhe eines Blocks in px
function blockGeometry(startTime: string, endTime: string) {
  const startMin = timeToMin(startTime)
  const endMin = timeToMin(endTime)
  const axisStartMin = HOUR_START * 60
  const pxPerMin = SLOT_HEIGHT / SLOT_MIN

  const top = (startMin - axisStartMin) * pxPerMin
  const height = Math.max((endMin - startMin) * pxPerMin, SLOT_HEIGHT / 2)
  return { top, height }
}

// ─── Komponenten ──────────────────────────────────────────────────────────────

interface DayBlockBarProps {
  block: DayBlock
  onClick: (block: DayBlock) => void
}

function DayBlockBar({ block, onClick }: DayBlockBarProps) {
  const { top, height } = blockGeometry(block.start_time, block.end_time)
  const durationMin = timeToMin(block.end_time) - timeToMin(block.start_time)
  const isShort = height < 40

  return (
    <button
      onClick={() => onClick(block)}
      style={{
        position: 'absolute',
        left: '0.25rem',
        right: '0.25rem',
        top: `${top}px`,
        height: `${height}px`,
        background: block.color,
        borderRadius: '0.4rem',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        padding: isShort ? '0 0.4rem' : '0.3rem 0.4rem',
        overflow: 'hidden',
        zIndex: 5,
        opacity: 0.92,
        display: 'flex',
        flexDirection: isShort ? 'row' : 'column',
        alignItems: isShort ? 'center' : 'flex-start',
        gap: isShort ? '0.35rem' : '0.1rem',
      }}
      aria-label={`${block.title} ${block.start_time}–${block.end_time}`}
    >
      <span style={{
        fontSize: '0.72rem',
        fontWeight: 600,
        color: '#fff',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        lineHeight: 1.2,
      }}>
        {block.title}
      </span>
      {!isShort && (
        <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1 }}>
          {block.start_time}–{block.end_time}
          {durationMin >= 60 && ` · ${Math.round(durationMin / 60 * 10) / 10}h`}
        </span>
      )}
      {isShort && (
        <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' }}>
          {block.start_time}
        </span>
      )}
    </button>
  )
}

function CurrentTimeLine() {
  const now = new Date()
  const currentMin = now.getHours() * 60 + now.getMinutes()
  const startMin = HOUR_START * 60
  const endMin = HOUR_END * 60
  if (currentMin < startMin || currentMin > endMin) return null

  const totalPx = TOTAL_SLOTS * SLOT_HEIGHT
  const offsetPx = ((currentMin - startMin) / (endMin - startMin)) * totalPx

  return (
    <div style={{
      position: 'absolute',
      left: TIME_COL_WIDTH,
      right: 0,
      top: `${offsetPx}px`,
      height: '2px',
      background: 'var(--accent)',
      zIndex: 10,
      pointerEvents: 'none',
    }}>
      <div style={{
        position: 'absolute',
        left: '-5px',
        top: '-4px',
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        background: 'var(--accent)',
      }} />
    </div>
  )
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────

export default function Calendar() {
  const { user } = useStore()
  const today = toDateString(new Date())

  const [selectedDate, setSelectedDate] = useState(today)
  const [allBlocks, setAllBlocks] = useState<RecurringBlock[]>([])
  const [allExceptions, setAllExceptions] = useState<BlockException[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Sheet-State
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingBlock, setEditingBlock] = useState<RecurringBlock | null>(null)

  // Serien-Scope-Dialog
  const [scopeOpen, setScopeOpen] = useState(false)
  const [scopeMode, setScopeMode] = useState<'edit' | 'delete'>('edit')
  const [pendingSaveData, setPendingSaveData] = useState<BlockFormData | null>(null)

  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const blocks = await getRecurringBlocks(user.id)
      const blockIds = blocks.map(b => b.id)
      const exceptions = await getExceptionsForBlocks(blockIds)
      setAllBlocks(blocks as RecurringBlock[])
      setAllExceptions(exceptions as BlockException[])
    } catch (err) {
      console.error('Kalender laden fehlgeschlagen:', err)
      setError('Zeitblöcke konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { loadData() }, [loadData])

  const dayBlocks = resolveBlocksForDate(allBlocks, allExceptions, selectedDate)
  const isToday = selectedDate === today

  function goBack() { setSelectedDate(prev => addDays(prev, -1)) }
  function goForward() { setSelectedDate(prev => addDays(prev, 1)) }
  function goToday() { setSelectedDate(today) }

  function handleBlockClick(block: DayBlock) {
    const source = allBlocks.find(b => b.id === block.id)
    if (source) {
      setEditingBlock(source)
      setSheetOpen(true)
    }
  }

  function handleAddClick() {
    setEditingBlock(null)
    setSheetOpen(true)
  }

  // Gibt das Datum des Vortags zurück ('YYYY-MM-DD')
  function dayBefore(dateStr: string): string {
    return addDays(dateStr, -1)
  }

  // Wird vom BlockSheet aufgerufen — bei Serien zuerst Scope fragen
  async function handleSave(data: BlockFormData) {
    if (!user) return
    // Neuer Block — kein Scope nötig
    if (!editingBlock) {
      await applySave(data, null)
      return
    }
    // Einmaliger Block — kein Scope nötig
    if (editingBlock.recurrence_type === 'none') {
      await applySave(data, 'all')
      return
    }
    // Serie → Scope-Dialog zeigen
    setPendingSaveData(data)
    setScopeMode('edit')
    setScopeOpen(true)
  }

  // Wird vom BlockSheet aufgerufen — bei Serien zuerst Scope fragen
  function handleDeleteRequest() {
    if (!editingBlock) return
    if (editingBlock.recurrence_type === 'none') {
      applyDelete('all')
      return
    }
    setScopeMode('delete')
    setScopeOpen(true)
  }

  // Scope wurde gewählt — Speichern anwenden
  async function handleScopeSelect(scope: SeriesEditScope) {
    setScopeOpen(false)
    if (scopeMode === 'edit' && pendingSaveData) {
      await applySave(pendingSaveData, scope)
      setPendingSaveData(null)
    } else if (scopeMode === 'delete') {
      await applyDelete(scope)
    }
  }

  function handleScopeCancel() {
    setScopeOpen(false)
    setPendingSaveData(null)
  }

  async function applySave(data: BlockFormData, scope: SeriesEditScope | null) {
    if (!user) return

    if (!editingBlock) {
      // Neuer Block anlegen
      const created = await createRecurringBlock({
        user_id: user.id,
        title: data.title,
        start_time: data.start_time,
        end_time: data.end_time,
        color: data.color,
        recurrence_type: data.recurrence_type,
        recurrence_day: data.recurrence_day,
        start_date: data.start_date,
        end_date: data.end_date || null,
      })
      setAllBlocks(prev => [...prev, created as RecurringBlock])
      setSheetOpen(false)
      return
    }

    if (scope === 'all') {
      // Gesamte Serie updaten
      const updated = await updateRecurringBlock(editingBlock.id, {
        title: data.title,
        start_time: data.start_time,
        end_time: data.end_time,
        color: data.color,
        recurrence_type: data.recurrence_type,
        recurrence_day: data.recurrence_day,
        start_date: data.start_date,
        end_date: data.end_date || null,
      })
      setAllBlocks(prev => prev.map(b => b.id === updated.id ? updated as RecurringBlock : b))

    } else if (scope === 'only_this') {
      // Ausnahme für genau dieses Datum anlegen
      const ex = await upsertBlockException({
        block_id: editingBlock.id,
        exception_date: selectedDate,
        modified_title: data.title !== editingBlock.title ? data.title : null,
        modified_start_time: data.start_time !== editingBlock.start_time ? data.start_time : null,
        modified_end_time: data.end_time !== editingBlock.end_time ? data.end_time : null,
        modified_color: data.color !== editingBlock.color ? data.color : null,
        is_deleted: false,
      })
      setAllExceptions(prev => {
        const filtered = prev.filter(e => !(e.block_id === editingBlock.id && e.exception_date === selectedDate))
        return [...filtered, ex as BlockException]
      })

    } else if (scope === 'this_and_following') {
      // Original-Serie bis gestern kürzen
      const updated = await updateRecurringBlock(editingBlock.id, {
        end_date: dayBefore(selectedDate),
      })
      setAllBlocks(prev => prev.map(b => b.id === updated.id ? updated as RecurringBlock : b))
      // Neue Serie ab heute mit den neuen Werten anlegen
      const created = await createRecurringBlock({
        user_id: user.id,
        title: data.title,
        start_time: data.start_time,
        end_time: data.end_time,
        color: data.color,
        recurrence_type: data.recurrence_type,
        recurrence_day: data.recurrence_day,
        start_date: selectedDate,
        end_date: data.end_date || null,
      })
      setAllBlocks(prev => [...prev, created as RecurringBlock])
      // Ausnahmen ab heute für den alten Block löschen (nicht mehr nötig)
      await deleteExceptionsFrom(editingBlock.id, selectedDate)
      setAllExceptions(prev => prev.filter(
        e => !(e.block_id === editingBlock.id && e.exception_date >= selectedDate)
      ))
    }

    setSheetOpen(false)
  }

  async function applyDelete(scope: SeriesEditScope) {
    if (!editingBlock) return

    if (scope === 'all') {
      await deleteRecurringBlock(editingBlock.id)
      setAllBlocks(prev => prev.filter(b => b.id !== editingBlock.id))
      setAllExceptions(prev => prev.filter(e => e.block_id !== editingBlock.id))

    } else if (scope === 'only_this') {
      const ex = await upsertBlockException({
        block_id: editingBlock.id,
        exception_date: selectedDate,
        modified_title: null,
        modified_start_time: null,
        modified_end_time: null,
        modified_color: null,
        is_deleted: true,
      })
      setAllExceptions(prev => {
        const filtered = prev.filter(e => !(e.block_id === editingBlock.id && e.exception_date === selectedDate))
        return [...filtered, ex as BlockException]
      })

    } else if (scope === 'this_and_following') {
      // Original-Serie bis gestern kürzen
      const updated = await updateRecurringBlock(editingBlock.id, {
        end_date: dayBefore(selectedDate),
      })
      setAllBlocks(prev => prev.map(b => b.id === updated.id ? updated as RecurringBlock : b))
      // Ausnahmen ab heute löschen
      await deleteExceptionsFrom(editingBlock.id, selectedDate)
      setAllExceptions(prev => prev.filter(
        e => !(e.block_id === editingBlock.id && e.exception_date >= selectedDate)
      ))
    }

    setSheetOpen(false)
  }

  return (
    <div style={{ paddingBottom: '5rem' }}>
      {/* Header */}
      <div style={{
        padding: '1rem 1rem 0.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}>
        <CalendarIcon size={20} style={{ color: 'var(--accent)' }} />
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Kalender</h1>
        {loading && <Loader2 size={16} style={{ color: 'var(--text-muted)', marginLeft: 'auto' }} className="animate-spin" />}
      </div>

      {/* Datum-Navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0.5rem 1rem',
        gap: '0.5rem',
      }}>
        <button
          onClick={goBack}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '0.5rem',
            padding: '0.4rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            color: 'var(--text)',
          }}
          aria-label="Vorheriger Tag"
        >
          <ChevronLeft size={18} />
        </button>

        <button
          onClick={goToday}
          style={{
            flex: 1,
            background: 'var(--bg-card)',
            border: `1px solid ${isToday ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: '0.75rem',
            padding: '0.6rem 1rem',
            cursor: 'pointer',
            textAlign: 'center',
            color: isToday ? 'var(--accent)' : 'var(--text)',
            fontWeight: isToday ? 600 : 400,
            fontSize: '0.95rem',
          }}
        >
          {formatDayLabel(selectedDate)}
          <span style={{
            display: 'block',
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            marginTop: '0.1rem',
          }}>
            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('de-DE', {
              day: '2-digit', month: '2-digit', year: 'numeric'
            })}
          </span>
        </button>

        <button
          onClick={goForward}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '0.5rem',
            padding: '0.4rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            color: 'var(--text)',
          }}
          aria-label="Nächster Tag"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Fehler */}
      {error && (
        <div style={{
          margin: '0 1rem',
          padding: '0.75rem',
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '0.5rem',
          color: '#ef4444',
          fontSize: '0.85rem',
        }}>
          {error}
        </div>
      )}

      {/* Leerer Zustand */}
      {!loading && !error && dayBlocks.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '1rem',
          color: 'var(--text-muted)',
          fontSize: '0.85rem',
        }}>
          Keine Zeitblöcke für diesen Tag. Tippe auf + um einen zu erstellen.
        </div>
      )}

      {/* Zeitachse */}
      <div style={{
        margin: '0.5rem 1rem',
        background: 'var(--bg-card)',
        borderRadius: '1rem',
        border: '1px solid var(--border)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Block-Overlay-Bereich (absolute Positionierung relativ zur Zeitachse) */}
        <div style={{ position: 'relative' }}>
          {/* Zeitslots */}
          {Array.from({ length: TOTAL_SLOTS }, (_, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                height: `${SLOT_HEIGHT}px`,
                borderBottom: `1px solid ${isFullHour(i) ? 'var(--border)' : 'rgba(var(--border-rgb, 128,128,128),0.2)'}`,
              }}
            >
              <div style={{
                width: TIME_COL_WIDTH,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'flex-start',
                paddingTop: '0.2rem',
                paddingLeft: '0.5rem',
                color: isFullHour(i) ? 'var(--text-muted)' : 'transparent',
                fontSize: '0.7rem',
                fontVariantNumeric: 'tabular-nums',
                userSelect: 'none',
              }}>
                {slotLabel(i)}
              </div>
              <div style={{ flex: 1, borderLeft: '1px solid var(--border)' }} />
            </div>
          ))}

          {/* Zeitblöcke als absolute Balken */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: TIME_COL_WIDTH,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
          }}>
            <div style={{ position: 'relative', height: `${TOTAL_SLOTS * SLOT_HEIGHT}px`, pointerEvents: 'auto' }}>
              {dayBlocks.map(block => (
                <DayBlockBar key={`${block.id}-${block.date}`} block={block} onClick={handleBlockClick} />
              ))}
            </div>
          </div>

          {/* Aktuelle-Zeit-Linie */}
          {isToday && <CurrentTimeLine />}
        </div>
      </div>

      {/* Floating Add-Button */}
      <button
        onClick={handleAddClick}
        style={{
          position: 'fixed',
          bottom: '5.5rem',
          right: '1.25rem',
          width: '3.25rem',
          height: '3.25rem',
          borderRadius: '50%',
          background: 'var(--accent)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          zIndex: 50,
          color: '#fff',
        }}
        aria-label="Neuen Zeitblock erstellen"
      >
        <Plus size={22} />
      </button>

      {/* Block erstellen / bearbeiten */}
      <BlockSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSave={handleSave}
        onDelete={editingBlock ? handleDeleteRequest : undefined}
        editing={editingBlock}
        defaultDate={selectedDate}
      />

      {/* Serien-Scope-Dialog */}
      <SeriesScopeDialog
        open={scopeOpen}
        mode={scopeMode}
        onSelect={handleScopeSelect}
        onCancel={handleScopeCancel}
      />
    </div>
  )
}

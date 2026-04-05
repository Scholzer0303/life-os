// Alle DB-Typen aus database.ts re-exportiert
export type {
  ProfileRow as Profile,
  ProfileUpdate,
  GoalRow as Goal,
  GoalInsert,
  GoalUpdate,
  JournalEntryRow as JournalEntry,
  JournalEntryInsert,
  JournalEntryUpdate,
  CoachSessionRow as CoachSession,
  CoachSessionInsert,
  PatternEventInsert,
  Json,
} from './database'

// UI-only Types
export type GoalType = 'three_year' | 'year' | 'quarterly' | 'monthly' | 'weekly'
export type GoalStatus = 'active' | 'completed' | 'paused'
export type JournalEntryType = 'morning' | 'evening' | 'freeform'
export type CoachMode = 'stuck' | 'on_track' | 'clarity' | 'chat'

export interface DailyTask {
  id: string
  title: string
  completed: boolean
  goal_id?: string | null
}

export interface TimeBlock {
  title: string
  duration_min: number
  buffer_min: number
  completed: boolean
}

export interface CoachMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface PatternAnalysis {
  energyPatterns: string       // "Montags energielos (Ø 3.1/10), mittwochs am stärksten (Ø 7.8/10)"
  focusPatterns: string        // "Produktivste Zeit: morgens 9–11 Uhr"
  sabotagePatterns: string     // "Häufige Blocker: Trading-Themen (4x), Energiemangel (3x)"
  progressObservation: string  // Fortschritt in Richtung Nordstern
  coachQuestion: string        // Eine offene Frage basierend auf den Mustern
  generatedAt: string          // ISO timestamp
}

// ─── Kalender / Wiederkehrende Zeitblöcke ────────────────────────────────────

export type RecurrenceType = 'none' | 'daily' | 'weekdays' | 'weekly' | 'custom'

// Rohdaten aus der DB (Serienvorlage)
export interface RecurringBlock {
  id: string
  user_id: string
  title: string
  start_time: string        // 'HH:MM'
  end_time: string          // 'HH:MM'
  recurrence_type: RecurrenceType
  recurrence_day: number | null  // 0=So … 6=Sa, nur bei 'weekly'
  recurrence_days: number[] | null  // z.B. [1,3,5] = Mo,Mi,Fr, nur bei 'custom'
  start_date: string        // 'YYYY-MM-DD'
  end_date: string | null
  color: string
  created_at: string
}

// Eine Ausnahme für einen einzelnen Termin
export interface BlockException {
  id: string
  block_id: string
  exception_date: string    // 'YYYY-MM-DD'
  modified_title: string | null
  modified_start_time: string | null
  modified_end_time: string | null
  modified_color: string | null
  is_deleted: boolean
  created_at: string
}

// Aufgelöster Block für einen konkreten Tag (nach Anwendung von Ausnahmen)
export interface DayBlock {
  id: string              // block_id
  exception_id?: string  // gesetzt wenn eine Ausnahme vorliegt
  date: string           // 'YYYY-MM-DD'
  title: string
  start_time: string     // 'HH:MM'
  end_time: string       // 'HH:MM'
  color: string
  recurrence_type: RecurrenceType
  is_modified: boolean   // true wenn eine Ausnahme die Werte verändert hat
}

// Formular-Daten beim Erstellen/Bearbeiten eines Blocks
export interface BlockFormData {
  title: string
  start_time: string
  end_time: string
  color: string
  recurrence_type: RecurrenceType
  recurrence_day: number | null
  recurrence_days: number[] | null  // nur bei 'custom'
  start_date: string
  end_date: string
}

// Auswahl beim Bearbeiten einer Serie
export type SeriesEditScope = 'only_this' | 'this_and_following' | 'all'

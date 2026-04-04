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

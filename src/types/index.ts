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
export type GoalType = 'quarterly' | 'monthly' | 'weekly'
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

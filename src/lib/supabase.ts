import { createClient } from '@supabase/supabase-js'
import type { Profile, Goal, JournalEntry, CoachSession, PatternEvent } from '../types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> }
      goals: { Row: Goal; Insert: Omit<Goal, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Goal> }
      journal_entries: { Row: JournalEntry; Insert: Omit<JournalEntry, 'id' | 'created_at' | 'updated_at'>; Update: Partial<JournalEntry> }
      coach_sessions: { Row: CoachSession; Insert: Omit<CoachSession, 'id' | 'created_at'>; Update: Partial<CoachSession> }
      pattern_events: { Row: PatternEvent; Insert: Omit<PatternEvent, 'id' | 'created_at'>; Update: Partial<PatternEvent> }
    }
  }
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

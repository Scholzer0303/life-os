import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile, Goal, JournalEntry } from '../types'

interface AppState {
  // Auth
  user: User | null
  session: Session | null
  // Data
  profile: Profile | null
  goals: Goal[]
  recentEntries: JournalEntry[]
  // UI
  isLoading: boolean
  error: string | null
  // Setters
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setProfile: (profile: Profile | null) => void
  setGoals: (goals: Goal[]) => void
  setRecentEntries: (entries: JournalEntry[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

const initialState = {
  user: null,
  session: null,
  profile: null,
  goals: [],
  recentEntries: [],
  isLoading: false,
  error: null,
}

export const useStore = create<AppState>((set) => ({
  ...initialState,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setGoals: (goals) => set({ goals }),
  setRecentEntries: (entries) => set({ recentEntries: entries }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}))

import { supabase } from './supabase'
import { todayISO, getCurrentWeek, getCurrentQuarter } from './utils'
import type {
  ProfileRow,
  ProfileUpdate,
  GoalRow,
  GoalInsert,
  GoalUpdate,
  JournalEntryRow,
  JournalEntryInsert,
  JournalEntryUpdate,
  CoachSessionRow,
  CoachSessionInsert,
  PatternEventInsert,
} from '../types/database'
import type { TimeBlock, CoachMessage } from '../types'

// ─── Profiles ────────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function upsertProfile(userId: string, updates: ProfileUpdate): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...updates })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateProfile(userId: string, updates: ProfileUpdate): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Goals ───────────────────────────────────────────────────────────────────

export async function getGoals(userId: string): Promise<GoalRow[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getActiveGoals(userId: string): Promise<GoalRow[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('type', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getWeeklyGoals(userId: string): Promise<GoalRow[]> {
  const week = getCurrentWeek()
  const year = new Date().getFullYear()
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'weekly')
    .eq('week', week)
    .eq('year', year)
  if (error) throw error
  return data ?? []
}

export async function getQuarterlyGoals(userId: string): Promise<GoalRow[]> {
  const quarter = getCurrentQuarter()
  const year = new Date().getFullYear()
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'quarterly')
    .eq('quarter', quarter)
    .eq('year', year)
  if (error) throw error
  return data ?? []
}

export async function createGoal(goal: GoalInsert): Promise<GoalRow> {
  const { data, error } = await supabase.from('goals').insert(goal).select().single()
  if (error) throw error
  return data
}

export async function updateGoal(id: string, updates: GoalUpdate): Promise<GoalRow> {
  const { data, error } = await supabase
    .from('goals')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await supabase.from('goals').delete().eq('id', id)
  if (error) throw error
}

// ─── Journal Entries ──────────────────────────────────────────────────────────

export async function getJournalEntries(userId: string, limit = 30): Promise<JournalEntryRow[]> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .order('entry_date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function getRecentEntries(userId: string, days = 7): Promise<JournalEntryRow[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .gte('entry_date', since.toISOString().split('T')[0])
    .order('entry_date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getTodayEntries(userId: string): Promise<JournalEntryRow[]> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('entry_date', todayISO())
  if (error) throw error
  return data ?? []
}

export async function getEntryById(id: string): Promise<JournalEntryRow | null> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createJournalEntry(entry: JournalEntryInsert): Promise<JournalEntryRow> {
  const { data, error } = await supabase.from('journal_entries').insert(entry).select().single()
  if (error) throw error
  return data
}

export async function updateJournalEntry(
  id: string,
  updates: JournalEntryUpdate
): Promise<JournalEntryRow> {
  const { data, error } = await supabase
    .from('journal_entries')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function searchJournalEntries(
  userId: string,
  query: string
): Promise<JournalEntryRow[]> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .or(
      `main_goal_today.ilike.%${query}%,accomplished.ilike.%${query}%,free_text.ilike.%${query}%`
    )
    .order('entry_date', { ascending: false })
    .limit(20)
  if (error) throw error
  return data ?? []
}

// Streak: aufeinanderfolgende Tage mit Einträgen
export async function getStreak(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('entry_date')
    .eq('user_id', userId)
    .order('entry_date', { ascending: false })
    .limit(100)
  if (error) throw error
  if (!data || data.length === 0) return 0

  const uniqueDays = [...new Set(data.map((e) => e.entry_date))].sort().reverse()
  let streak = 0
  let current = todayISO()

  for (const day of uniqueDays) {
    if (day === current) {
      streak++
      const d = new Date(current)
      d.setDate(d.getDate() - 1)
      current = d.toISOString().split('T')[0]
    } else {
      break
    }
  }
  return streak
}

// Best streak ever
export async function getBestStreak(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('entry_date')
    .eq('user_id', userId)
    .order('entry_date', { ascending: true })
  if (error) throw error
  if (!data || data.length === 0) return 0

  const uniqueDays = [...new Set(data.map((e) => e.entry_date))].sort()
  let best = 1
  let current = 1
  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = new Date(uniqueDays[i - 1])
    const curr = new Date(uniqueDays[i])
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
    if (diff === 1) {
      current++
      if (current > best) best = current
    } else {
      current = 1
    }
  }
  return best
}

// Heatmap-Daten der letzten N Tage
export async function getHeatmapData(
  userId: string,
  days = 60
): Promise<{ entry_date: string; type: string }[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)
  const { data, error } = await supabase
    .from('journal_entries')
    .select('entry_date, type')
    .eq('user_id', userId)
    .gte('entry_date', since.toISOString().split('T')[0])
  if (error) throw error
  return (data ?? []) as { entry_date: string; type: string }[]
}

// ─── Typed accessors for JSONB fields ─────────────────────────────────────────

export function parseTimeblocks(entry: JournalEntryRow): TimeBlock[] {
  if (!Array.isArray(entry.timeblocks)) return []
  return entry.timeblocks as unknown as TimeBlock[]
}

export function parseMessages(session: CoachSessionRow): CoachMessage[] {
  if (!Array.isArray(session.messages)) return []
  return session.messages as unknown as CoachMessage[]
}

// ─── Coach Sessions ───────────────────────────────────────────────────────────

export async function createCoachSession(session: CoachSessionInsert): Promise<CoachSessionRow> {
  const { data, error } = await supabase
    .from('coach_sessions')
    .insert(session)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCoachSession(
  id: string,
  messages: CoachMessage[],
  summary?: string
): Promise<CoachSessionRow> {
  // Cast to Json since JSONB columns are typed as Json in the Database type
  const payload = summary !== undefined
    ? { messages: messages as unknown as import('../types/database').Json, summary }
    : { messages: messages as unknown as import('../types/database').Json }
  const { data, error } = await supabase
    .from('coach_sessions')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Pattern Events ───────────────────────────────────────────────────────────

export async function logPatternEvent(event: PatternEventInsert): Promise<void> {
  const { error } = await supabase.from('pattern_events').insert(event)
  if (error) throw error
}

export async function getLastJournalDate(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('entry_date')
    .eq('user_id', userId)
    .order('entry_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data?.entry_date ?? null
}

// ─── Goal Hierarchy ───────────────────────────────────────────────────────────

export interface ActiveGoalHierarchy {
  week: GoalRow | null
  month: GoalRow | null
  quarter: GoalRow | null
  year: GoalRow | null
  three_year: GoalRow | null
}

export async function getActiveGoalHierarchy(userId: string): Promise<ActiveGoalHierarchy> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  if (error) throw error

  const goals = (data ?? []) as GoalRow[]

  function pick(type: string): GoalRow | null {
    return goals.find((g) => g.type === type) ?? null
  }

  return {
    week: pick('weekly'),
    month: pick('monthly'),
    quarter: pick('quarterly'),
    year: pick('year'),
    three_year: pick('three_year'),
  }
}

// ─── Data Management ──────────────────────────────────────────────────────────

export async function countJournalEntries(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('journal_entries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (error) throw error
  return count ?? 0
}

export async function countGoals(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('goals')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (error) throw error
  return count ?? 0
}

export async function deleteAllJournalEntries(userId: string): Promise<void> {
  const { error } = await supabase
    .from('journal_entries')
    .delete()
    .eq('user_id', userId)
  if (error) throw error
}

export async function deleteAllGoals(userId: string): Promise<void> {
  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('user_id', userId)
  if (error) throw error
}

export async function deleteAllUserData(userId: string): Promise<void> {
  const deleteEntries = supabase.from('journal_entries').delete().eq('user_id', userId)
  const deleteGoals = supabase.from('goals').delete().eq('user_id', userId)
  const deleteSessions = supabase.from('coach_sessions').delete().eq('user_id', userId)
  const deleteEvents = supabase.from('pattern_events').delete().eq('user_id', userId)

  const results = await Promise.all([deleteEntries, deleteGoals, deleteSessions, deleteEvents])
  for (const { error } of results) {
    if (error) throw error
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      onboarding_completed: false,
      north_star: null,
      values: [],
      stop_list: [],
      ai_profile: {},
      ikigai: {},
      identity_statement: '',
    })
    .eq('id', userId)
  if (profileError) throw profileError
}

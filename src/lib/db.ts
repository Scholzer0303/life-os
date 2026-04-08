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
  GoalTaskRow,
  GoalTaskInsert,
  GoalTaskUpdate,
  HabitRow,
  HabitInsert,
  HabitUpdate,
  HabitLogRow,
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

export async function getMonthlyGoals(userId: string, month: number, year: number): Promise<GoalRow[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'monthly')
    .eq('month', month)
    .eq('year', year)
    .order('created_at', { ascending: true })
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

export async function getYearlyGoals(userId: string, year: number): Promise<GoalRow[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'year')
    .eq('year', year)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getQuarterlyGoalsByQuarterYear(userId: string, quarter: number, year: number): Promise<GoalRow[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'quarterly')
    .eq('quarter', quarter)
    .eq('year', year)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getWeeklyGoalsByWeekYear(userId: string, week: number, year: number): Promise<GoalRow[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'weekly')
    .eq('week', week)
    .eq('year', year)
    .order('created_at', { ascending: true })
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

export async function getGoalsByParent(userId: string, parentId: string): Promise<GoalRow[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .eq('parent_id', parentId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
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

export async function getEntriesForMonth(userId: string, month: number, year: number): Promise<JournalEntryRow[]> {
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .gte('entry_date', from)
    .lte('entry_date', to)
    .order('entry_date', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getEntriesForDate(userId: string, date: string): Promise<JournalEntryRow[]> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('entry_date', date)
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
  const { data, error } = await supabase
    .from('journal_entries')
    .upsert(entry, { onConflict: 'user_id,entry_date,type' })
    .select()
    .single()
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

export async function getCoachSessions(userId: string): Promise<CoachSessionRow[]> {
  const { data, error } = await supabase
    .from('coach_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function deleteCoachSession(id: string): Promise<void> {
  const { error } = await supabase.from('coach_sessions').delete().eq('id', id)
  if (error) throw error
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

export async function getReviewSessions(
  userId: string,
  trigger: string,
  seit: Date
): Promise<CoachSessionRow[]> {
  const { data, error } = await supabase
    .from('coach_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('trigger', trigger as CoachSessionRow['trigger'])
    .gte('created_at', seit.toISOString())
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as CoachSessionRow[]
}

export async function getReviewArchive(userId: string): Promise<CoachSessionRow[]> {
  const { data, error } = await supabase
    .from('coach_sessions')
    .select('*')
    .eq('user_id', userId)
    .in('trigger', ['weekly_review', 'monthly_review', 'quarterly_review', 'yearly_review'])
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as CoachSessionRow[]
}

// ─── Goal Tasks ──────────────────────────────────────────────────────────────

export async function getGoalTasks(goalId: string): Promise<GoalTaskRow[]> {
  const { data, error } = await supabase
    .from('goal_tasks')
    .select('*')
    .eq('goal_id', goalId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getTasksForGoals(userId: string, goalIds: string[]): Promise<GoalTaskRow[]> {
  if (goalIds.length === 0) return []
  const { data, error } = await supabase
    .from('goal_tasks')
    .select('*')
    .eq('user_id', userId)
    .in('goal_id', goalIds)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createGoalTask(task: GoalTaskInsert): Promise<GoalTaskRow> {
  const { data, error } = await supabase.from('goal_tasks').insert(task).select().single()
  if (error) throw error
  return data
}

export async function updateGoalTask(id: string, updates: GoalTaskUpdate): Promise<GoalTaskRow> {
  const { data, error } = await supabase
    .from('goal_tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteGoalTask(id: string): Promise<void> {
  const { error } = await supabase.from('goal_tasks').delete().eq('id', id)
  if (error) throw error
}

export async function getTodayGoalTasks(userId: string, date: string): Promise<GoalTaskRow[]> {
  const { data, error } = await supabase
    .from('goal_tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('planned_date', date)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getYesterdayOpenGoalTasks(userId: string): Promise<GoalTaskRow[]> {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('goal_tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('planned_date', yesterdayStr)
    .eq('completed', false)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data ?? []
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

// ─── Recurring Blocks ─────────────────────────────────────────────────────────

export interface RecurringBlockRow {
  id: string
  user_id: string
  title: string
  start_time: string  // 'HH:MM'
  end_time: string    // 'HH:MM'
  recurrence_type: 'none' | 'daily' | 'weekdays' | 'weekly' | 'custom'
  recurrence_day: number | null  // 0=So … 6=Sa
  recurrence_days: number[] | null  // z.B. [1,3,5] = Mo,Mi,Fr, nur bei 'custom'
  start_date: string  // 'YYYY-MM-DD'
  end_date: string | null
  color: string
  created_at: string
}

export interface RecurringBlockExceptionRow {
  id: string
  block_id: string
  exception_date: string  // 'YYYY-MM-DD'
  modified_title: string | null
  modified_start_time: string | null
  modified_end_time: string | null
  modified_color: string | null
  is_deleted: boolean
  created_at: string
}

export type RecurringBlockInsert = Omit<RecurringBlockRow, 'id' | 'created_at'>
export type RecurringBlockUpdate = Partial<Omit<RecurringBlockRow, 'id' | 'user_id' | 'created_at'>>
export type ExceptionInsert = Omit<RecurringBlockExceptionRow, 'id' | 'created_at'>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export async function getRecurringBlocks(userId: string): Promise<RecurringBlockRow[]> {
  const { data, error } = await db
    .from('recurring_blocks')
    .select('*')
    .eq('user_id', userId)
    .order('start_time', { ascending: true })
  if (error) throw error
  return (data ?? []) as RecurringBlockRow[]
}

export async function createRecurringBlock(block: RecurringBlockInsert): Promise<RecurringBlockRow> {
  const { data, error } = await db
    .from('recurring_blocks')
    .insert(block)
    .select()
    .single()
  if (error) throw error
  return data as RecurringBlockRow
}

export async function updateRecurringBlock(
  id: string,
  updates: RecurringBlockUpdate
): Promise<RecurringBlockRow> {
  const { data, error } = await db
    .from('recurring_blocks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as RecurringBlockRow
}

export async function deleteRecurringBlock(id: string): Promise<void> {
  const { error } = await db.from('recurring_blocks').delete().eq('id', id)
  if (error) throw error
}

export async function getExceptionsForBlocks(
  blockIds: string[]
): Promise<RecurringBlockExceptionRow[]> {
  if (blockIds.length === 0) return []
  const { data, error } = await db
    .from('recurring_block_exceptions')
    .select('*')
    .in('block_id', blockIds)
  if (error) throw error
  return (data ?? []) as RecurringBlockExceptionRow[]
}

export async function upsertBlockException(
  exception: ExceptionInsert
): Promise<RecurringBlockExceptionRow> {
  const { data, error } = await db
    .from('recurring_block_exceptions')
    .upsert(exception, { onConflict: 'block_id,exception_date' })
    .select()
    .single()
  if (error) throw error
  return data as RecurringBlockExceptionRow
}

export async function deleteBlockException(id: string): Promise<void> {
  const { error } = await db.from('recurring_block_exceptions').delete().eq('id', id)
  if (error) throw error
}

// Löscht alle Ausnahmen ab einem bestimmten Datum für einen Block (für "Dieser und alle folgenden")
export async function deleteExceptionsFrom(blockId: string, fromDate: string): Promise<void> {
  const { error } = await db
    .from('recurring_block_exceptions')
    .delete()
    .eq('block_id', blockId)
    .gte('exception_date', fromDate)
  if (error) throw error
}

// ─── Habits ───────────────────────────────────────────────────────────────────

export async function getHabitsForMonth(
  userId: string,
  month: number,
  year: number
): Promise<HabitRow[]> {
  const { data, error } = await db
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .eq('month', month)
    .eq('year', year)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as HabitRow[]
}

export async function createHabit(
  userId: string,
  habitData: Omit<HabitInsert, 'user_id'>
): Promise<HabitRow> {
  const { data, error } = await db
    .from('habits')
    .insert({ ...habitData, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data as HabitRow
}

export async function updateHabit(habitId: string, updates: HabitUpdate): Promise<HabitRow> {
  const { data, error } = await db
    .from('habits')
    .update(updates)
    .eq('id', habitId)
    .select()
    .single()
  if (error) throw error
  return data as HabitRow
}

export async function deleteHabit(habitId: string): Promise<void> {
  const { error } = await db.from('habits').delete().eq('id', habitId)
  if (error) throw error
}

export async function logHabit(
  habitId: string,
  userId: string,
  date: string,
  completed: boolean
): Promise<void> {
  const { error } = await db
    .from('habit_logs')
    .upsert({ habit_id: habitId, user_id: userId, log_date: date, completed }, { onConflict: 'habit_id,log_date' })
  if (error) throw error
}

export async function getHabitWeekProgress(
  userId: string,
  habitId: string,
  weekStart: string,
  weekEnd: string
): Promise<number> {
  const { data, error } = await db
    .from('habit_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('habit_id', habitId)
    .eq('completed', true)
    .gte('log_date', weekStart)
    .lte('log_date', weekEnd)
  if (error) throw error
  return (data ?? []).length
}

export async function getHabitLogs(
  userId: string,
  month: number,
  year: number
): Promise<HabitLogRow[]> {
  // Datumsbereich für den Monat berechnen
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { data, error } = await db
    .from('habit_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('log_date', startDate)
    .lte('log_date', endDate)
  if (error) throw error
  return (data ?? []) as HabitLogRow[]
}

// ─── Journal Periods (Paket 4) ────────────────────────────────────────────────

import type { JournalPeriod } from '../types'

export async function getJournalPeriod(
  userId: string,
  periodType: JournalPeriod['period_type'],
  periodKey: string
): Promise<JournalPeriod | null> {
  const { data, error } = await db
    .from('journal_periods')
    .select('*')
    .eq('user_id', userId)
    .eq('period_type', periodType)
    .eq('period_key', periodKey)
    .maybeSingle()
  if (error) throw error
  return data as JournalPeriod | null
}

export async function upsertJournalPeriod(
  userId: string,
  periodType: JournalPeriod['period_type'],
  periodKey: string,
  updates: { planning_data?: Record<string, unknown>; reflection_data?: Record<string, unknown>; ai_summary?: string }
): Promise<JournalPeriod> {
  const { data, error } = await db
    .from('journal_periods')
    .upsert(
      { user_id: userId, period_type: periodType, period_key: periodKey, ...updates, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,period_type,period_key' }
    )
    .select()
    .single()
  if (error) throw error
  return data as JournalPeriod
}

export async function deleteJournalPeriod(id: string): Promise<void> {
  const { error } = await db.from('journal_periods').delete().eq('id', id)
  if (error) throw error
}

export async function listJournalPeriods(
  userId: string,
  periodType: JournalPeriod['period_type']
): Promise<JournalPeriod[]> {
  const { data, error } = await db
    .from('journal_periods')
    .select('*')
    .eq('user_id', userId)
    .eq('period_type', periodType)
    .order('period_key', { ascending: false })
  if (error) throw error
  return (data ?? []) as JournalPeriod[]
}

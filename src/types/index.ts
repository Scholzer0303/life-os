export interface Profile {
  id: string
  created_at: string
  updated_at: string
  name: string | null
  north_star: string | null
  values: string[]
  ikigai: Record<string, string>
  stop_list: string[]
  energy_pattern: Record<string, unknown>
  onboarding_completed: boolean
}

export type GoalType = 'quarterly' | 'monthly' | 'weekly'
export type GoalStatus = 'active' | 'completed' | 'paused'

export interface Goal {
  id: string
  user_id: string
  created_at: string
  updated_at: string
  title: string
  description: string | null
  type: GoalType
  status: GoalStatus
  parent_id: string | null
  quarter: number | null
  month: number | null
  year: number
  week: number | null
  progress: number
}

export type JournalEntryType = 'morning' | 'evening' | 'freeform'

export interface TimeBlock {
  title: string
  duration_min: number
  buffer_min: number
  completed: boolean
}

export interface JournalEntry {
  id: string
  user_id: string
  created_at: string
  updated_at: string
  entry_date: string
  type: JournalEntryType
  // Morning fields
  feeling_score: number | null
  main_goal_today: string | null
  potential_blockers: string | null
  // Evening fields
  accomplished: string | null
  what_blocked: string | null
  energy_level: number | null
  // Freeform
  free_text: string | null
  // Timeboxing
  timeblocks: TimeBlock[]
  // AI
  ai_feedback: string | null
  ai_feedback_requested_at: string | null
  // Linked goals
  linked_goal_ids: string[]
}

export interface CoachMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface CoachSession {
  id: string
  user_id: string
  created_at: string
  trigger: 'on_demand' | 'pattern_interrupt' | 'weekly_review' | 'entry_feedback'
  messages: CoachMessage[]
  summary: string | null
}

export type PatternEventType =
  | 'missed_journal_3days'
  | 'goal_abandoned'
  | 'reset_ritual'

export interface PatternEvent {
  id: string
  user_id: string
  created_at: string
  event_type: PatternEventType
  context: Record<string, unknown>
}

export type CoachMode = 'stuck' | 'on_track' | 'clarity' | 'chat'

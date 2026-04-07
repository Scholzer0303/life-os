// Typen aus schema.sql — bei Schema-Änderungen hier aktualisieren

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string | null
          north_star: string | null
          values: string[]
          ikigai: Json
          stop_list: string[]
          energy_pattern: Json
          onboarding_completed: boolean
          ai_profile: Json
          identity_statement: string | null
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          name?: string | null
          north_star?: string | null
          values?: string[]
          ikigai?: Json
          stop_list?: string[]
          energy_pattern?: Json
          onboarding_completed?: boolean
          ai_profile?: Json
          identity_statement?: string | null
        }
        Update: {
          name?: string | null
          north_star?: string | null
          values?: string[]
          ikigai?: Json
          stop_list?: string[]
          energy_pattern?: Json
          onboarding_completed?: boolean
          updated_at?: string
          ai_profile?: Json
          identity_statement?: string | null
        }
        Relationships: []
      }
      goals: {
        Row: {
          id: string
          user_id: string
          created_at: string
          updated_at: string
          title: string
          description: string | null
          type: 'three_year' | 'year' | 'quarterly' | 'monthly' | 'weekly'
          status: 'active' | 'completed' | 'paused'
          parent_id: string | null
          quarter: number | null
          month: number | null
          year: number
          week: number | null
          progress: number
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          updated_at?: string
          title: string
          description?: string | null
          type: 'three_year' | 'year' | 'quarterly' | 'monthly' | 'weekly'
          status?: 'active' | 'completed' | 'paused'
          parent_id?: string | null
          quarter?: number | null
          month?: number | null
          year?: number
          week?: number | null
          progress?: number
        }
        Update: {
          title?: string
          description?: string | null
          type?: 'three_year' | 'year' | 'quarterly' | 'monthly' | 'weekly'
          status?: 'active' | 'completed' | 'paused'
          parent_id?: string | null
          quarter?: number | null
          month?: number | null
          year?: number
          week?: number | null
          progress?: number
          updated_at?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          id: string
          user_id: string
          created_at: string
          updated_at: string
          entry_date: string
          type: 'morning' | 'evening' | 'freeform'
          feeling_score: number | null
          main_goal_today: string | null
          potential_blockers: string | null
          accomplished: string | null
          what_blocked: string | null
          energy_level: number | null
          free_text: string | null
          timeblocks: Json
          daily_tasks: Json
          ai_feedback: string | null
          ai_feedback_requested_at: string | null
          linked_goal_ids: string[]
          identity_action: string | null
          calendar_planned: boolean | null
          gratitude: string | null
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          updated_at?: string
          entry_date?: string
          type: 'morning' | 'evening' | 'freeform'
          feeling_score?: number | null
          main_goal_today?: string | null
          potential_blockers?: string | null
          accomplished?: string | null
          what_blocked?: string | null
          energy_level?: number | null
          free_text?: string | null
          timeblocks?: Json
          daily_tasks?: Json
          ai_feedback?: string | null
          ai_feedback_requested_at?: string | null
          linked_goal_ids?: string[]
          identity_action?: string | null
          calendar_planned?: boolean | null
          gratitude?: string | null
        }
        Update: {
          entry_date?: string
          type?: 'morning' | 'evening' | 'freeform'
          feeling_score?: number | null
          main_goal_today?: string | null
          potential_blockers?: string | null
          accomplished?: string | null
          what_blocked?: string | null
          energy_level?: number | null
          free_text?: string | null
          timeblocks?: Json
          daily_tasks?: Json
          ai_feedback?: string | null
          ai_feedback_requested_at?: string | null
          linked_goal_ids?: string[]
          updated_at?: string
          identity_action?: string | null
          calendar_planned?: boolean | null
          gratitude?: string | null
        }
        Relationships: []
      }
      coach_sessions: {
        Row: {
          id: string
          user_id: string
          created_at: string
          trigger: 'on_demand' | 'pattern_interrupt' | 'weekly_review' | 'entry_feedback' | 'monthly_review' | 'quarterly_review' | 'yearly_review'
          messages: Json
          summary: string | null
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          trigger: 'on_demand' | 'pattern_interrupt' | 'weekly_review' | 'entry_feedback' | 'monthly_review' | 'quarterly_review' | 'yearly_review'
          messages?: Json
          summary?: string | null
        }
        Update: {
          messages?: Json
          summary?: string | null
        }
        Relationships: []
      }
      goal_tasks: {
        Row: {
          id: string
          goal_id: string
          user_id: string
          title: string
          completed: boolean
          sort_order: number
          created_at: string
          planned_date: string | null
        }
        Insert: {
          id?: string
          goal_id: string
          user_id: string
          title: string
          completed?: boolean
          sort_order?: number
          created_at?: string
          planned_date?: string | null
        }
        Update: {
          title?: string
          completed?: boolean
          sort_order?: number
          planned_date?: string | null
        }
        Relationships: []
      }
      pattern_events: {
        Row: {
          id: string
          user_id: string
          created_at: string
          event_type: string | null
          context: Json
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          event_type?: string | null
          context?: Json
        }
        Update: {
          event_type?: string | null
          context?: Json
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Convenience-Aliases für App-Code
export type ProfileRow = Database['public']['Tables']['profiles']['Row']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type GoalRow = Database['public']['Tables']['goals']['Row']
export type GoalInsert = Database['public']['Tables']['goals']['Insert']
export type GoalUpdate = Database['public']['Tables']['goals']['Update']

export type JournalEntryRow = Database['public']['Tables']['journal_entries']['Row']
export type JournalEntryInsert = Database['public']['Tables']['journal_entries']['Insert']
export type JournalEntryUpdate = Database['public']['Tables']['journal_entries']['Update']

export type CoachSessionRow = Database['public']['Tables']['coach_sessions']['Row']
export type CoachSessionInsert = Database['public']['Tables']['coach_sessions']['Insert']

export type GoalTaskRow = Database['public']['Tables']['goal_tasks']['Row']
export type GoalTaskInsert = Database['public']['Tables']['goal_tasks']['Insert']
export type GoalTaskUpdate = Database['public']['Tables']['goal_tasks']['Update']

export type PatternEventInsert = Database['public']['Tables']['pattern_events']['Insert']

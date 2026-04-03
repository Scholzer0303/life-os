-- Life OS — Supabase Datenbankschema
-- Führe dieses SQL im Supabase SQL-Editor aus: https://app.supabase.com → SQL Editor

-- Profil (wird beim Onboarding befüllt)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT,
  north_star TEXT,
  values JSONB DEFAULT '[]',
  ikigai JSONB DEFAULT '{}',
  stop_list TEXT[] DEFAULT '{}',
  energy_pattern JSONB DEFAULT '{}',
  onboarding_completed BOOLEAN DEFAULT FALSE
);

-- Ziel-Hierarchie
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK (type IN ('quarterly', 'monthly', 'weekly')) NOT NULL,
  status TEXT CHECK (status IN ('active', 'completed', 'paused')) DEFAULT 'active',
  parent_id UUID REFERENCES goals(id) ON DELETE SET NULL,
  quarter INT CHECK (quarter BETWEEN 1 AND 4),
  month INT CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  week INT CHECK (week BETWEEN 1 AND 53),
  progress INT DEFAULT 0 CHECK (progress BETWEEN 0 AND 100)
);

-- Journal-Einträge
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT CHECK (type IN ('morning', 'evening', 'freeform')) NOT NULL,
  feeling_score INT CHECK (feeling_score BETWEEN 1 AND 10),
  main_goal_today TEXT,
  potential_blockers TEXT,
  accomplished TEXT,
  what_blocked TEXT,
  energy_level INT CHECK (energy_level BETWEEN 1 AND 10),
  free_text TEXT,
  timeblocks JSONB DEFAULT '[]',
  ai_feedback TEXT,
  ai_feedback_requested_at TIMESTAMPTZ,
  linked_goal_ids UUID[] DEFAULT '{}'
);

-- Coach-Gespräche
CREATE TABLE coach_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  trigger TEXT CHECK (trigger IN ('on_demand', 'pattern_interrupt', 'weekly_review', 'entry_feedback')),
  messages JSONB NOT NULL DEFAULT '[]',
  summary TEXT
);

-- Pattern Interrupt Log
CREATE TABLE pattern_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  event_type TEXT,
  context JSONB DEFAULT '{}'
);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own profile" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users see own goals" ON goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own journal" ON journal_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own sessions" ON coach_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own patterns" ON pattern_events FOR ALL USING (auth.uid() = user_id);

-- Auto-Update für updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER goals_updated_at BEFORE UPDATE ON goals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER journal_updated_at BEFORE UPDATE ON journal_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at();

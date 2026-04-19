import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon, MessageCircle, X, Info, Sparkles, BookOpen, Flame } from 'lucide-react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts'
import { useStore } from '../store/useStore'
import {
  getTodayEntries,
  getWeeklyGoals,
  getMonthlyGoals,
  getStreak,
  getBestStreak,
  getHeatmapData,
  getLastJournalDate,
  getRecentEntries,
  updateGoal,
  updateProfile,
  getTasksForGoals,
  updateGoalTask,
  updateJournalEntry,
  getTodayGoalTasks,
} from '../lib/db'
import { generatePatternAnalysis } from '../lib/claude'
import { formatDate, daysSince, getCurrentWeek } from '../lib/utils'
import StreakBadge from '../components/dashboard/StreakBadge'
import GoalCard from '../components/dashboard/GoalCard'
import { LIFE_AREAS, LIFE_AREA_ORDER } from '../lib/lifeAreas'
import type { GoalRow, GoalTaskRow } from '../types/database'
import type { DailyTask } from '../types'

const MOTIVATION_QUOTES = [
  'Erfolgreiche Menschen sind nicht immer motiviert, sie sind diszipliniert. Motivation ist ein flüchtiges Gefühl — wer darauf wartet, fängt nie an.',
  'Alles was gut für dich ist, fühlt sich kurzfristig unangenehm an. Alles Schädliche fühlt sich kurzfristig gut an. Das ist kein Zufall — es ist ein Muster.',
  'Nach 4–6 Wochen wird eine neue Gewohnheit automatisch. Vorher ist es harte Arbeit. Das ist normal — kein Zeichen von Schwäche.',
  'Du wählst sowieso zwischen zwei Schmerzen: dem Schmerz der Disziplin oder dem Schmerz des Bedauerns. Der erste wiegt weniger.',
  'Der Weg ist das Ziel. Wer aufhört, verliert alles was er aufgebaut hat — fang klein an, aber fang an.',
  'Du kannst nicht noch 50 Silvester feiern und gleichzeitig so leben als hättest du unendlich Zeit.',
  'Klein anfangen. Einen Bereich wählen. Vier Wochen durchhalten. Der Hunger kommt von selbst.',
  'Nicht überladen. Nicht tausend Bälle jonglieren. Was sind deine wichtigsten Bälle — und hältst du sie wirklich?',
]

function InfoTooltip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false)
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
      <button
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onTouchStart={() => setVisible((v) => !v)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.15rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
        aria-label="Info"
      >
        <Info size={14} />
      </button>
      {visible && (
        <div
          style={{
            position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
            marginBottom: '6px', background: 'var(--bg-primary)', color: 'var(--text-primary)',
            fontSize: '0.72rem', lineHeight: 1.45, padding: '0.5rem 0.7rem',
            borderRadius: '8px', width: '220px', boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
            zIndex: 50, pointerEvents: 'none', whiteSpace: 'normal', border: '1px solid var(--border)',
          }}
        >
          {text}
        </div>
      )}
    </div>
  )
}

function getGreeting(name: string | null): string {
  const h = new Date().getHours()
  const n = name ?? 'da'
  if (h < 12) return `Guten Morgen, ${n}`
  if (h < 17) return `Guten Tag, ${n}`
  return `Guten Abend, ${n}`
}

// Lebensrad-Miniatur: Placeholder-Daten (Paket 11 liefert echte Werte)
const radarPlaceholder = LIFE_AREA_ORDER.map((key) => ({
  area: LIFE_AREAS[key].label,
  value: 5,
  color: LIFE_AREAS[key].color,
}))

export default function Dashboard() {
  const { profile, user } = useStore()
  const navigate = useNavigate()

  const [hasMorningEntry, setHasMorningEntry] = useState(false)
  const [hasEveningEntry, setHasEveningEntry] = useState(false)
  const [weeklyGoals, setWeeklyGoals] = useState<GoalRow[]>([])
  const [weeklyGoalTasks, setWeeklyGoalTasks] = useState<GoalTaskRow[]>([])
  const [monthlyGoals, setMonthlyGoals] = useState<GoalRow[]>([])
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([])
  const [morningEntryId, setMorningEntryId] = useState<string | null>(null)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [weekActiveDays, setWeekActiveDays] = useState(0)
  const [showPatternInterrupt, setShowPatternInterrupt] = useState(false)
  const [showPatternTooltip, setShowPatternTooltip] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [morningGoalToday, setMorningGoalToday] = useState<string | null>(null)
  const [showIdentityReminder, setShowIdentityReminder] = useState(false)
  const [identityModalOpen, setIdentityModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [recentEntries, setRecentEntries] = useState<import('../types/database').JournalEntryRow[]>([])
  const [motivationQuote, setMotivationQuote] = useState<string | null>(null)
  const [showOnboardingBanner, setShowOnboardingBanner] = useState(() => {
    if (localStorage.getItem('ob_banner_dismissed')) return false
    const la = (profile as Record<string, unknown> | null)?.life_areas as Record<string, string> | null
    const visionMissing = !la || Object.values(la).every((v) => !v?.trim())
    const identityMissing = !profile?.identity_statement?.trim()
    return visionMissing || identityMissing
  })

  useEffect(() => {
    if (!user) return
    loadDashboardData(user.id)
  }, [user])

  useEffect(() => {
    if (!profile || !recentEntries || recentEntries.length < 14) return
    const aiProfile = profile.ai_profile as Record<string, string> | null
    const lastAnalysis = aiProfile?.generatedAt
    const days = lastAnalysis
      ? Math.floor((Date.now() - new Date(lastAnalysis).getTime()) / 86400000)
      : 999
    if (days >= 14) {
      generatePatternAnalysis(profile, recentEntries, weeklyGoals)
        .then((analysis) => updateProfile(profile.id, { ai_profile: analysis as unknown as import('../types/database').Json }))
        .catch((err) => console.error('Pattern analysis (silent):', err))
    }
  }, [recentEntries.length]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!profile?.identity_statement) return
    const dismissed = localStorage.getItem('identity_reminder_dismissed')
    if (!dismissed) { setShowIdentityReminder(true); return }
    const daysSinceDismiss = Math.floor((Date.now() - Number(dismissed)) / 86400000)
    if (daysSinceDismiss >= 3) setShowIdentityReminder(true)
  }, [profile?.identity_statement])

  async function loadDashboardData(userId: string) {
    setIsLoading(true)
    const today = new Date().toISOString().split('T')[0]
    try {
      const now = new Date()
      const curMonth = now.getMonth() + 1
      const curYear = now.getFullYear()
      const [todayEntries, goals, streakCount, best, heatmap, lastDate, recent, todayGoalTasks, mGoals] = await Promise.all([
        getTodayEntries(userId),
        getWeeklyGoals(userId),
        getStreak(userId),
        getBestStreak(userId),
        getHeatmapData(userId, 60),
        getLastJournalDate(userId),
        getRecentEntries(userId, 30),
        getTodayGoalTasks(userId, today),
        getMonthlyGoals(userId, curMonth, curYear),
      ])
      setMonthlyGoals(mGoals)

      const morningEntry = todayEntries.find((e) => e.type === 'morning')
      setHasMorningEntry(!!morningEntry)
      setHasEveningEntry(todayEntries.some((e) => e.type === 'evening'))
      setMorningGoalToday(morningEntry?.main_goal_today ?? null)
      if (morningEntry) {
        setMorningEntryId(morningEntry.id)
        const unlinkedTasks: DailyTask[] = Array.isArray(morningEntry.daily_tasks)
          ? morningEntry.daily_tasks as unknown as DailyTask[]
          : []
        const linkedTasks: DailyTask[] = todayGoalTasks.map((gt) => ({
          id: gt.id, title: gt.title, completed: gt.completed,
          goal_id: gt.goal_id, goal_task_id: gt.id,
        }))
        setDailyTasks([...unlinkedTasks, ...linkedTasks])
      }
      const topGoals = goals.slice(0, 3)
      setWeeklyGoals(topGoals)
      if (topGoals.length > 0) {
        getTasksForGoals(userId, topGoals.map((g) => g.id))
          .then(setWeeklyGoalTasks)
          .catch((err) => console.error('Tasks laden fehlgeschlagen:', err))
      }
      setRecentEntries(recent)
      setStreak(streakCount)
      setBestStreak(best)

      const monday = new Date()
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
      monday.setHours(0, 0, 0, 0)
      const uniqueThisWeek = new Set(
        heatmap.filter((e) => new Date(e.entry_date) >= monday).map((e) => e.entry_date)
      )
      setWeekActiveDays(uniqueThisWeek.size)

      const accountCreatedAt = profile?.created_at
      const accountAgeInDays = accountCreatedAt
        ? Math.floor((Date.now() - new Date(accountCreatedAt).getTime()) / 86400000) : 0
      if (accountAgeInDays >= 3 && (!lastDate || daysSince(lastDate) >= 3)) {
        setShowPatternInterrupt(true)
      }
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleProgressUpdate(goalId: string, progress: number) {
    try {
      const updated = await updateGoal(goalId, { progress })
      setWeeklyGoals((prev) => prev.map((g) => (g.id === goalId ? updated : g)))
    } catch (err) {
      console.error('Progress update error:', err)
    }
  }

  async function handleToggleDailyTask(task: DailyTask) {
    const updatedList = dailyTasks.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t))
    setDailyTasks(updatedList)
    if (task.goal_task_id) {
      setWeeklyGoalTasks((prev) => prev.map((t) => t.id === task.goal_task_id ? { ...t, completed: !task.completed } : t))
      try {
        await updateGoalTask(task.goal_task_id, { completed: !task.completed })
        if (task.goal_id) {
          const allGoalTasks = weeklyGoalTasks.map((t) => t.id === task.goal_task_id ? { ...t, completed: !task.completed } : t)
          const goalTasks = allGoalTasks.filter((t) => t.goal_id === task.goal_id)
          if (goalTasks.length > 0) {
            const progress = Math.round((goalTasks.filter((t) => t.completed).length / goalTasks.length) * 100)
            handleProgressUpdate(task.goal_id, progress)
          }
        }
      } catch (err) {
        console.error('Task toggle error:', err)
        setDailyTasks(dailyTasks)
        setWeeklyGoalTasks((prev) => prev.map((t) => t.id === task.goal_task_id ? { ...t, completed: task.completed } : t))
      }
    } else {
      if (!morningEntryId) return
      const unlinkedOnly = updatedList.filter((t) => !t.goal_task_id)
      updateJournalEntry(morningEntryId, { daily_tasks: unlinkedOnly as unknown as import('../types/database').Json })
        .catch((err) => console.error('daily_tasks update:', err))
    }
  }

  async function handleToggleTask(task: GoalTaskRow) {
    const updated = { ...task, completed: !task.completed }
    setWeeklyGoalTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)))
    setDailyTasks((prev) => prev.map((t) => t.goal_task_id === task.id ? { ...t, completed: !task.completed } : t))
    try {
      await updateGoalTask(task.id, { completed: updated.completed })
      const allTasks = weeklyGoalTasks.map((t) => (t.id === task.id ? updated : t))
      const goalTasks = allTasks.filter((t) => t.goal_id === task.goal_id)
      if (goalTasks.length > 0) {
        const progress = Math.round((goalTasks.filter((t) => t.completed).length / goalTasks.length) * 100)
        handleProgressUpdate(task.goal_id, progress)
      }
    } catch (err) {
      console.error('Task toggle error:', err)
      setWeeklyGoalTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)))
    }
  }

  function handleShowQuote() {
    const idx = Math.floor(Math.random() * MOTIVATION_QUOTES.length)
    setMotivationQuote(MOTIVATION_QUOTES[idx])
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <div style={{ width: '28px', height: '28px', border: '3px solid var(--border)', borderTop: '3px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div>
      {/* ── Onboarding-Schritte offen Banner ─────────────────── */}
      <AnimatePresence>
        {showOnboardingBanner && (
          <motion.div
            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            style={{
              background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
              border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
              borderRadius: '12px',
              padding: '0.875rem 1rem 0.875rem 1.25rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>✦</span>
            <span style={{ flex: 1, fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
              Noch offene Einrichtungsschritte —{' '}
              <button
                onClick={() => navigate('/me')}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: 'inherit' }}
              >
                im „Ich"-Tab nachholen →
              </button>
            </span>
            <button
              onClick={() => {
                localStorage.setItem('ob_banner_dismissed', '1')
                setShowOnboardingBanner(false)
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.1rem', flexShrink: 0, lineHeight: 1 }}
              aria-label="Schließen"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Pattern Interrupt Banner ──────────────────────────── */}
      <AnimatePresence>
        {showPatternInterrupt && (
          <motion.div
            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            style={{
              background: '#FFF5F0', border: '1px solid var(--accent-warm)',
              borderRadius: '12px', padding: '1rem 1rem 1rem 1.25rem',
              marginBottom: '1.5rem', position: 'relative',
            }}
          >
            <button
              onClick={() => setShowPatternInterrupt(false)}
              style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.1rem', lineHeight: 1 }}
              aria-label="Schließen"
            >
              <X size={16} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--accent-warm)' }}>Hey — Leben passiert.</p>
              <div ref={tooltipRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                <button
                  onMouseEnter={() => setShowPatternTooltip(true)} onMouseLeave={() => setShowPatternTooltip(false)}
                  onTouchStart={() => setShowPatternTooltip((v) => !v)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem', color: 'var(--accent-warm)', opacity: 0.7, display: 'flex', alignItems: 'center' }}
                  aria-label="Info"
                >
                  <Info size={14} />
                </button>
                {showPatternTooltip && (
                  <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '6px', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.75rem', lineHeight: 1.4, padding: '0.5rem 0.75rem', borderRadius: '8px', whiteSpace: 'nowrap', boxShadow: 'var(--shadow-modal)', zIndex: 10, pointerEvents: 'none', border: '1px solid var(--border)' }}>
                    Dieser Hinweis erscheint wenn du 3 oder mehr<br />Tage keinen Eintrag gemacht hast.
                  </div>
                )}
              </div>
            </div>
            <p style={{ margin: '0 0 0.85rem', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Du warst eine Weile weg. Kein Vorwurf — aber was ist gerade los?
            </p>
            <button
              onClick={() => navigate('/pattern-interrupt')}
              style={{ padding: '0.5rem 1rem', background: 'var(--accent-warm)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer' }}
            >
              Reset starten →
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ────────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
          <h1 style={{ fontFamily: 'Lora, serif', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 600, margin: 0, lineHeight: 1.2 }}>
            {getGreeting(profile?.name ?? null)}
          </h1>
          <StreakBadge streak={streak} />
        </div>
        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.875rem' }}>
          {formatDate(new Date())}
        </p>
      </div>

      {/* ── 2-Spalten-Grid ───────────────────────────────────── */}
      <div className="dashboard-grid">

        {/* ══ LINKE SPALTE ══════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Lebensrad-Miniatur */}
          <div
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-card)', padding: '1.25rem',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                Lebensrad
              </h2>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Detailansicht im Ich-Tab</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarPlaceholder} margin={{ top: 8, right: 20, bottom: 8, left: 20 }}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis
                  dataKey="area"
                  tick={{ fontSize: 11, fill: 'var(--text-secondary)', fontFamily: 'DM Sans, sans-serif' }}
                />
                <Radar
                  name="Lebensrad"
                  dataKey="value"
                  stroke="var(--accent)"
                  fill="var(--accent)"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
            {/* Legende */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem 0.75rem', marginTop: '0.5rem' }}>
              {LIFE_AREA_ORDER.map((key) => (
                <span key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: LIFE_AREAS[key].color, flexShrink: 0 }} />
                  {LIFE_AREAS[key].label}
                </span>
              ))}
            </div>
          </div>

          {/* Identitäts-Affirmation */}
          <AnimatePresence>
            {showIdentityReminder && profile?.identity_statement && (
              <motion.div
                key="identity-reminder"
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderLeft: '3px solid #a855f7', borderRadius: 'var(--radius-card)',
                  padding: '1rem 1rem 1rem 1.25rem', boxShadow: 'var(--shadow-card)',
                  display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>
                    Dein zukünftiges Ich
                  </span>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5, fontStyle: 'italic' }}>
                    {profile.identity_statement.length > 120
                      ? profile.identity_statement.slice(0, 120) + '…'
                      : profile.identity_statement}
                  </p>
                  {profile.identity_statement.length > 120 && (
                    <button
                      onClick={() => setIdentityModalOpen(true)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a855f7', fontSize: '0.8rem', padding: '0.3rem 0 0', fontFamily: 'DM Sans, sans-serif' }}
                    >
                      Vollständig lesen
                    </button>
                  )}
                </div>
                <button
                  onClick={() => { localStorage.setItem('identity_reminder_dismissed', String(Date.now())); setShowIdentityReminder(false) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.1rem', flexShrink: 0 }}
                  aria-label="Schließen"
                >
                  <X size={15} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tages-Tasks */}
          {hasMorningEntry && dailyTasks.length > 0 && (
            <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: '1.25rem', boxShadow: 'var(--shadow-card)' }}>
              <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1rem', fontWeight: 600, margin: '0 0 0.85rem', color: 'var(--text-primary)' }}>
                Heute zu erledigen
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {dailyTasks.map((task) => {
                  const linkedGoal = task.goal_id ? weeklyGoals.find((g) => g.id === task.goal_id) : null
                  return (
                    <button
                      key={task.id}
                      onClick={() => handleToggleDailyTask(task)}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem 0', textAlign: 'left' }}
                    >
                      <span style={{ flexShrink: 0, width: 18, height: 18, borderRadius: '4px', border: `2px solid ${task.completed ? 'var(--accent-green)' : 'var(--border-strong)'}`, background: task.completed ? 'var(--accent-green)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '0.15rem' }}>
                        {task.completed && <span style={{ color: '#fff', fontSize: '0.65rem', fontWeight: 700 }}>✓</span>}
                      </span>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', flex: 1 }}>
                        <span style={{ fontSize: '0.9rem', color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: task.completed ? 'line-through' : 'none', lineHeight: 1.4 }}>
                          {task.title}
                        </span>
                        {linkedGoal && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)', borderRadius: '4px', padding: '0.05rem 0.4rem', display: 'inline-block', width: 'fit-content', lineHeight: 1.5 }}>
                            KW {getCurrentWeek()}: {linkedGoal.title}
                          </span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.65rem 0 0' }}>
                {dailyTasks.filter((t) => t.completed).length} / {dailyTasks.length} erledigt
              </p>
            </section>
          )}

          {/* Wochenziele */}
          <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: '1.25rem', boxShadow: 'var(--shadow-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                Wochenziele
              </h2>
              <button
                onClick={() => navigate('/goals')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--accent)', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, padding: 0 }}
              >
                Alle →
              </button>
            </div>
            {weeklyGoals.length === 0 ? (
              <div style={{ padding: '1.25rem', background: 'var(--bg-secondary)', border: '1px dashed var(--border)', borderRadius: '10px', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', margin: '0 0 0.75rem', fontSize: '0.9rem' }}>Noch keine Wochenziele gesetzt.</p>
                <button
                  onClick={() => navigate('/goals')}
                  style={{ padding: '0.5rem 1rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-btn)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem', fontWeight: 500 }}
                >
                  Ziel erstellen →
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {weeklyGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    tasks={weeklyGoalTasks.filter((t) => t.goal_id === goal.id)}
                    onToggleTask={handleToggleTask}
                    parentName={goal.parent_id ? monthlyGoals.find((m) => m.id === goal.parent_id)?.title : undefined}
                  />
                ))}
              </div>
            )}
          </section>

        </div>{/* Ende linke Spalte */}

        {/* ══ RECHTE SPALTE ═════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Streak-Karte */}
          <div
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-card)', padding: '1.25rem',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1rem', fontWeight: 600, margin: '0 0 1rem', color: 'var(--text-primary)' }}>
              Dein Fortschritt
            </h2>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1, background: 'var(--bg-secondary)', borderRadius: '10px', padding: '0.85rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--streak)', lineHeight: 1, marginBottom: '0.25rem' }}>
                  {streak}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tage Streak</div>
              </div>
              <div style={{ flex: 1, background: 'var(--bg-secondary)', borderRadius: '10px', padding: '0.85rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent)', lineHeight: 1, marginBottom: '0.25rem' }}>
                  {weekActiveDays}<span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--text-muted)' }}>/7</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Diese Woche</div>
              </div>
              <div style={{ flex: 1, background: 'var(--bg-secondary)', borderRadius: '10px', padding: '0.85rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-secondary)', lineHeight: 1, marginBottom: '0.25rem' }}>
                  {bestStreak}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rekord</div>
              </div>
            </div>
          </div>

          {/* Fokus-Banner + Heute-Buttons */}
          <div
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-card)', padding: '1.25rem',
              boxShadow: 'var(--shadow-card)', display: 'flex', flexDirection: 'column', gap: '1rem',
            }}
          >
            <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
              Heute
            </h2>

            {/* Fokus */}
            {morningGoalToday ? (
              <div style={{ padding: '0.75rem 1rem', background: 'color-mix(in srgb, var(--accent) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>
                  Dein Fokus
                </span>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  {morningGoalToday}
                </p>
              </div>
            ) : !hasMorningEntry && (
              <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-secondary)', border: '1px dashed var(--border)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Starte deinen Tag — Ziel setzen</span>
                <button
                  onClick={() => navigate('/journal?type=morning')}
                  style={{ padding: '0.4rem 0.75rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' }}
                >
                  Starten →
                </button>
              </div>
            )}

            {/* Journal-Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => navigate('/journal?type=morning')}
                style={{
                  flex: 1, padding: '0.85rem 0.5rem',
                  background: hasMorningEntry ? 'var(--bg-secondary)' : 'var(--accent)',
                  color: hasMorningEntry ? 'var(--text-secondary)' : '#fff',
                  border: hasMorningEntry ? '1px solid var(--border)' : 'none',
                  borderRadius: '12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 500, fontSize: '0.875rem', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: '0.35rem', transition: 'all 0.15s',
                }}
              >
                <Sun size={20} strokeWidth={hasMorningEntry ? 1.5 : 2} />
                <span>{hasMorningEntry ? 'Morgen ✓' : 'Morgen-Journal'}</span>
              </button>
              <button
                onClick={() => navigate('/journal?type=evening')}
                style={{
                  flex: 1, padding: '0.85rem 0.5rem',
                  background: hasEveningEntry ? 'var(--bg-secondary)' : 'var(--bg-card)',
                  color: hasEveningEntry ? 'var(--text-muted)' : 'var(--text-primary)',
                  border: '1px solid var(--border)', borderRadius: '12px', cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '0.875rem',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', transition: 'all 0.15s',
                }}
              >
                <Moon size={20} strokeWidth={hasEveningEntry ? 1.5 : 2} />
                <span>{hasEveningEntry ? 'Abend ✓' : 'Abend-Journal'}</span>
              </button>
            </div>

            {/* Quick-Links */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => navigate('/coach')} style={quickBtnStyle}>
                <MessageCircle size={14} />
                Coach
              </button>
              <button onClick={() => navigate('/journal?type=freeform')} style={quickBtnStyle}>
                <BookOpen size={14} />
                Freeform
              </button>
              <button onClick={() => navigate('/review')} style={quickBtnStyle}>
                <Flame size={14} />
                Review
              </button>
            </div>
          </div>

          {/* Motivationssprüche */}
          <div
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-card)', padding: '1.25rem',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1rem', fontWeight: 600, margin: '0 0 0.85rem', color: 'var(--text-primary)' }}>
              Brauch ich heute
            </h2>
            {motivationQuote ? (
              <div>
                <p style={{ margin: '0 0 0.85rem', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic' }}>
                  „{motivationQuote}"
                </p>
                <button
                  onClick={handleShowQuote}
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.4rem 0.85rem', fontSize: '0.8rem', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                >
                  Anderen Spruch
                </button>
              </div>
            ) : (
              <button
                onClick={handleShowQuote}
                style={{
                  width: '100%', padding: '0.85rem 1rem',
                  background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                  borderRadius: '10px', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  fontFamily: 'DM Sans, sans-serif', fontSize: '0.875rem',
                  color: 'var(--text-secondary)', fontWeight: 500, transition: 'all 0.15s',
                }}
              >
                <Sparkles size={16} color="var(--accent)" />
                Zeig mir etwas
              </button>
            )}
          </div>

          {/* Pattern interrupt link */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.25rem' }}>
            <button
              onClick={() => navigate('/pattern-interrupt')}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', textDecoration: 'underline', padding: '0.25rem' }}
            >
              Ich bin gerade raus aus dem Rhythmus
            </button>
            <InfoTooltip text="Wenn du hier tippst, öffnet sich ein kurzer geführter Flow der dir hilft wieder in deinen Rhythmus zu finden." />
          </div>

        </div>{/* Ende rechte Spalte */}
      </div>{/* Ende dashboard-grid */}

      {/* Identitäts-Modal */}
      <AnimatePresence>
        {identityModalOpen && profile?.identity_statement && (
          <motion.div
            key="identity-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
            onClick={() => setIdentityModalOpen(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              style={{ background: 'var(--bg-card)', borderRadius: '16px 16px 0 0', padding: '1.5rem 1.25rem 2rem', width: '100%', maxWidth: '520px' }}
            >
              <div style={{ width: '36px', height: '4px', background: 'var(--border)', borderRadius: '2px', margin: '0 auto 1.25rem' }} />
              <h3 style={{ fontFamily: 'Lora, serif', fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Dein zukünftiges Ich</h3>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {profile.identity_statement}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const quickBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '0.5rem 0.4rem',
  background: 'var(--bg-secondary)',
  color: 'var(--text-secondary)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  cursor: 'pointer',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '0.78rem',
  fontWeight: 500,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.3rem',
  whiteSpace: 'nowrap' as const,
}

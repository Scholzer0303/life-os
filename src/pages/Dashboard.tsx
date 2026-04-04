import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon, Compass, Flame, BookOpen, MessageCircle, X } from 'lucide-react'
import { useStore } from '../store/useStore'
import {
  getTodayEntries,
  getWeeklyGoals,
  getStreak,
  getBestStreak,
  getHeatmapData,
  getLastJournalDate,
  updateGoal,
  updateProfile,
} from '../lib/db'
import { generatePatternAnalysis } from '../lib/claude'
import { formatDate, daysSince } from '../lib/utils'
import HeatmapGrid from '../components/dashboard/HeatmapGrid'
import StreakBadge from '../components/dashboard/StreakBadge'
import GoalCard from '../components/dashboard/GoalCard'
import type { GoalRow } from '../types/database'

function getGreeting(name: string | null): string {
  const h = new Date().getHours()
  const n = name ?? 'da'
  if (h < 12) return `Guten Morgen, ${n}`
  if (h < 17) return `Guten Tag, ${n}`
  return `Guten Abend, ${n}`
}

export default function Dashboard() {
  const { profile, user } = useStore()
  const navigate = useNavigate()

  const [hasMorningEntry, setHasMorningEntry] = useState(false)
  const [hasEveningEntry, setHasEveningEntry] = useState(false)
  const [weeklyGoals, setWeeklyGoals] = useState<GoalRow[]>([])
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [weekActiveDays, setWeekActiveDays] = useState(0)
  const [heatmapData, setHeatmapData] = useState<{ entry_date: string; type: string }[]>([])
  const [showPatternInterrupt, setShowPatternInterrupt] = useState(false)
  const [morningGoalToday, setMorningGoalToday] = useState<string | null>(null)
  const [showIdentityReminder, setShowIdentityReminder] = useState(false)
  const [identityModalOpen, setIdentityModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadDashboardData(user.id)
  }, [user])

  // Auto pattern analysis: ab 14 Einträgen, alle 14 Tage
  useEffect(() => {
    if (!profile || !recentEntries || recentEntries.length < 14) return
    const aiProfile = profile.ai_profile as Record<string, string> | null
    const lastAnalysis = aiProfile?.generatedAt
    const daysSince = lastAnalysis
      ? Math.floor((Date.now() - new Date(lastAnalysis).getTime()) / 86400000)
      : 999
    if (daysSince >= 14) {
      generatePatternAnalysis(profile, recentEntries, goals)
        .then((analysis) => updateProfile(profile.id, { ai_profile: analysis as unknown as import('../types/database').Json }))
        .catch((err) => console.error('Pattern analysis (silent):', err))
    }
  }, [recentEntries.length]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!profile?.identity_statement) return
    const dismissed = localStorage.getItem('identity_reminder_dismissed')
    if (!dismissed) {
      setShowIdentityReminder(true)
      return
    }
    const daysSinceDismiss = Math.floor((Date.now() - Number(dismissed)) / 86400000)
    if (daysSinceDismiss >= 3) setShowIdentityReminder(true)
  }, [profile?.identity_statement])

  async function loadDashboardData(userId: string) {
    setIsLoading(true)
    try {
      const [todayEntries, goals, streakCount, best, heatmap, lastDate] = await Promise.all([
        getTodayEntries(userId),
        getWeeklyGoals(userId),
        getStreak(userId),
        getBestStreak(userId),
        getHeatmapData(userId, 60),
        getLastJournalDate(userId),
      ])

      const morningEntry = todayEntries.find((e) => e.type === 'morning')
      setHasMorningEntry(!!morningEntry)
      setHasEveningEntry(todayEntries.some((e) => e.type === 'evening'))
      setMorningGoalToday(morningEntry?.main_goal_today ?? null)
      setWeeklyGoals(goals.slice(0, 3))
      setStreak(streakCount)
      setBestStreak(best)
      setHeatmapData(heatmap)

      // Unique active days this week (Mon–today)
      const monday = new Date()
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
      monday.setHours(0, 0, 0, 0)
      const uniqueThisWeek = new Set(
        heatmap
          .filter((e) => new Date(e.entry_date) >= monday)
          .map((e) => e.entry_date)
      )
      setWeekActiveDays(uniqueThisWeek.size)

      // Pattern interrupt: 3+ days without entry
      if (lastDate && daysSince(lastDate) >= 3) {
        setShowPatternInterrupt(true)
      } else if (!lastDate && profile?.onboarding_completed) {
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

  function handlePatternReset() {
    navigate('/pattern-interrupt')
  }

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
        }}
      >
        <div
          style={{
            width: '28px',
            height: '28px',
            border: '3px solid var(--border)',
            borderTop: '3px solid var(--accent)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div>
      {/* ── Pattern Interrupt Banner ──────────────────────────────── */}
      <AnimatePresence>
        {showPatternInterrupt && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            style={{
              background: '#FFF5F0',
              border: '1px solid var(--accent-warm)',
              borderRadius: '12px',
              padding: '1rem 1rem 1rem 1.25rem',
              marginBottom: '1.5rem',
              position: 'relative',
            }}
          >
            <button
              onClick={() => setShowPatternInterrupt(false)}
              style={{
                position: 'absolute',
                top: '0.75rem',
                right: '0.75rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '0.1rem',
                lineHeight: 1,
              }}
              aria-label="Schließen"
            >
              <X size={16} />
            </button>
            <p style={{ margin: '0 0 0.35rem', fontWeight: 600, color: 'var(--accent-warm)' }}>
              Hey — Leben passiert.
            </p>
            <p
              style={{
                margin: '0 0 0.85rem',
                fontSize: '0.9rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
              }}
            >
              Du warst eine Weile weg. Kein Vorwurf — aber was ist gerade los?
            </p>
            <button
              onClick={handlePatternReset}
              style={{
                padding: '0.5rem 1rem',
                background: 'var(--accent-warm)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Reset starten →
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ───────────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '0.25rem',
          }}
        >
          <h1
            style={{
              fontFamily: 'Lora, serif',
              fontSize: 'clamp(1.5rem, 4vw, 2rem)',
              fontWeight: 600,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {getGreeting(profile?.name ?? null)}
          </h1>
          <StreakBadge streak={streak} />
        </div>
        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.875rem' }}>
          {formatDate(new Date())}
        </p>
      </div>

      {/* ── Fokus-Banner ─────────────────────────────────────────── */}
      {morningGoalToday ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            padding: '0.75rem 1rem',
            background: 'rgba(134,59,255,0.1)',
            border: '1px solid rgba(134,59,255,0.25)',
            borderRadius: '10px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
          }}
        >
          <span style={{ fontSize: '1rem', lineHeight: 1 }}>🎯</span>
          <div>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Dein Fokus heute
            </span>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
              {morningGoalToday}
            </p>
          </div>
        </motion.div>
      ) : !hasMorningEntry && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            padding: '0.75rem 1rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Starte deinen Tag — Ziel setzen
          </span>
          <button
            onClick={() => navigate('/journal?type=morning')}
            style={{
              padding: '0.4rem 0.75rem',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Starten →
          </button>
        </motion.div>
      )}

      {/* ── Nordstern ────────────────────────────────────────────── */}
      {profile?.north_star && (
        <div
          style={{
            padding: '0.85rem 1rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            borderLeft: '3px solid var(--accent)',
            marginBottom: '1.75rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              marginBottom: '0.3rem',
            }}
          >
            <Compass size={13} color="var(--accent)" />
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                color: 'var(--accent)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Nordstern
            </span>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
            }}
          >
            {profile.north_star}
          </p>
        </div>
      )}

      {/* ── Identitäts-Reminder ──────────────────────────────────── */}
      <AnimatePresence>
        {showIdentityReminder && profile?.identity_statement && (
          <motion.div
            key="identity-reminder"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            style={{
              padding: '0.75rem 1rem',
              background: 'rgba(134,59,255,0.08)',
              border: '1px solid rgba(134,59,255,0.2)',
              borderRadius: '10px',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
            }}
          >
            <span style={{ fontSize: '1rem', lineHeight: 1.4, flexShrink: 0 }}>💫</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {profile.identity_statement.length > 60
                  ? profile.identity_statement.slice(0, 60) + '…'
                  : profile.identity_statement}
              </p>
              <button
                onClick={() => setIdentityModalOpen(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: '0.8rem', padding: '0.25rem 0 0', fontFamily: 'DM Sans, sans-serif' }}
              >
                Vollständig lesen
              </button>
            </div>
            <button
              onClick={() => {
                localStorage.setItem('identity_reminder_dismissed', String(Date.now()))
                setShowIdentityReminder(false)
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.1rem', flexShrink: 0, display: 'flex' }}
              aria-label="Schließen"
            >
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Identitäts-Modal */}
      <AnimatePresence>
        {identityModalOpen && profile?.identity_statement && (
          <motion.div
            key="identity-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
            onClick={() => setIdentityModalOpen(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              style={{ background: 'var(--bg-card)', borderRadius: '16px 16px 0 0', padding: '1.5rem 1.25rem 2rem', width: '100%', maxWidth: '520px' }}
            >
              <div style={{ width: '36px', height: '4px', background: 'var(--border)', borderRadius: '2px', margin: '0 auto 1.25rem' }} />
              <h3 style={{ fontFamily: 'Lora, serif', fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>💫 Dein zukünftiges Ich</h3>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {profile.identity_statement}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Heutiger Status ──────────────────────────────────────── */}
      <section style={{ marginBottom: '1.75rem' }}>
        <h2
          style={{
            fontFamily: 'Lora, serif',
            fontSize: '1.1rem',
            fontWeight: 600,
            margin: '0 0 0.85rem',
            color: 'var(--text-primary)',
          }}
        >
          Heute
        </h2>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {/* Morning */}
          <button
            onClick={() => navigate('/journal?type=morning')}
            style={{
              flex: 1,
              padding: '0.85rem',
              background: hasMorningEntry ? 'var(--bg-secondary)' : 'var(--accent)',
              color: hasMorningEntry ? 'var(--text-secondary)' : '#fff',
              border: hasMorningEntry ? '1px solid var(--border)' : 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 500,
              fontSize: '0.9rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.15s',
            }}
          >
            <Sun size={20} strokeWidth={hasMorningEntry ? 1.5 : 2} />
            <span>{hasMorningEntry ? 'Morgen ✓' : 'Morgen-Journal'}</span>
          </button>

          {/* Evening */}
          <button
            onClick={() => navigate('/journal?type=evening')}
            style={{
              flex: 1,
              padding: '0.85rem',
              background: hasEveningEntry ? 'var(--bg-secondary)' : 'var(--bg-card)',
              color: hasEveningEntry ? 'var(--text-muted)' : 'var(--text-primary)',
              border: `1px solid ${hasEveningEntry ? 'var(--border)' : 'var(--border)'}`,
              borderRadius: '12px',
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 500,
              fontSize: '0.9rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.15s',
            }}
          >
            <Moon size={20} strokeWidth={hasEveningEntry ? 1.5 : 2} />
            <span>{hasEveningEntry ? 'Abend ✓' : 'Abend-Journal'}</span>
          </button>
        </div>
      </section>

      {/* ── Quick Access ─────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: '0.6rem',
          marginBottom: '1.75rem',
        }}
      >
        <button
          onClick={() => navigate('/journal?type=freeform')}
          style={quickBtnStyle}
        >
          <BookOpen size={15} />
          Freeform
        </button>
        <button
          onClick={() => navigate('/coach')}
          style={quickBtnStyle}
        >
          <MessageCircle size={15} />
          Coach fragen
        </button>
        <button
          onClick={() => navigate('/review')}
          style={quickBtnStyle}
        >
          <Flame size={15} />
          Review
        </button>
      </div>

      {/* ── Wochenziele ──────────────────────────────────────────── */}
      <section style={{ marginBottom: '1.75rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.85rem',
          }}
        >
          <h2
            style={{
              fontFamily: 'Lora, serif',
              fontSize: '1.1rem',
              fontWeight: 600,
              margin: 0,
            }}
          >
            Wochenziele
          </h2>
          <button
            onClick={() => navigate('/goals')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.8rem',
              color: 'var(--accent)',
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 500,
              padding: 0,
            }}
          >
            Alle →
          </button>
        </div>

        {weeklyGoals.length === 0 ? (
          <div
            style={{
              padding: '1.5rem',
              background: 'var(--bg-card)',
              border: '1px dashed var(--border)',
              borderRadius: '12px',
              textAlign: 'center',
            }}
          >
            <p style={{ color: 'var(--text-muted)', margin: '0 0 0.75rem', fontSize: '0.9rem' }}>
              Noch keine Wochenziele gesetzt.
            </p>
            <button
              onClick={() => navigate('/goals')}
              style={{
                padding: '0.5rem 1rem',
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '0.85rem',
                fontWeight: 500,
              }}
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
                onUpdateProgress={handleProgressUpdate}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Heatmap ──────────────────────────────────────────────── */}
      <section style={{ marginBottom: '1rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.85rem',
          }}
        >
          <h2
            style={{
              fontFamily: 'Lora, serif',
              fontSize: '1.1rem',
              fontWeight: 600,
              margin: 0,
            }}
          >
            Letzte 60 Tage
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Diese Woche: {weekActiveDays}/7
            </span>
            <StreakBadge streak={streak} bestStreak={bestStreak} />
          </div>
        </div>
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '1rem',
            overflowX: 'auto',
          }}
        >
          <HeatmapGrid data={heatmapData} days={60} />
        </div>
      </section>

      {/* ── Manual Pattern Interrupt ──────────────────────────────── */}
      <div style={{ textAlign: 'center', paddingBottom: '1rem' }}>
        <button
          onClick={() => navigate('/pattern-interrupt')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '0.8rem',
            cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif',
            textDecoration: 'underline',
            padding: '0.25rem',
          }}
        >
          Ich bin gerade raus aus dem Rhythmus
        </button>
      </div>
    </div>
  )
}

const quickBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '0.6rem 0.5rem',
  background: 'var(--bg-card)',
  color: 'var(--text-secondary)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
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

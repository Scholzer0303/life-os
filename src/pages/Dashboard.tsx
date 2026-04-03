import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon, Compass, Flame, BookOpen, MessageCircle, X } from 'lucide-react'
import { useStore } from '../store/useStore'
import {
  getTodayEntries,
  getWeeklyGoals,
  getStreak,
  getHeatmapData,
  getLastJournalDate,
  updateGoal,
  logPatternEvent,
} from '../lib/db'
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
  const [heatmapData, setHeatmapData] = useState<{ entry_date: string; type: string }[]>([])
  const [showPatternInterrupt, setShowPatternInterrupt] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadDashboardData(user.id)
  }, [user])

  async function loadDashboardData(userId: string) {
    setIsLoading(true)
    try {
      const [todayEntries, goals, streakCount, heatmap, lastDate] = await Promise.all([
        getTodayEntries(userId),
        getWeeklyGoals(userId),
        getStreak(userId),
        getHeatmapData(userId, 60),
        getLastJournalDate(userId),
      ])

      setHasMorningEntry(todayEntries.some((e) => e.type === 'morning'))
      setHasEveningEntry(todayEntries.some((e) => e.type === 'evening'))
      setWeeklyGoals(goals.slice(0, 3))
      setStreak(streakCount)
      setHeatmapData(heatmap)

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

  async function handlePatternReset() {
    if (!user) return
    await logPatternEvent({
      user_id: user.id,
      event_type: 'reset_ritual',
      context: { triggered_from: 'dashboard_banner' },
    })
    setShowPatternInterrupt(false)
    navigate('/journal?type=freeform')
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
          {streak > 0 && <StreakBadge streak={streak} />}
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

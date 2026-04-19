import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, RotateCcw, Zap, Target, HelpCircle, MessageCircle, Clock, Trash2, ChevronLeft } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store/useStore'
import { sendCoachMessage } from '../lib/claude'
import type { CoachTone, CoachHabit } from '../lib/claude'
import { createCoachSession, updateCoachSession, getCoachSessions, deleteCoachSession, getHabitsForMonth, getHabitLogs } from '../lib/db'
import type { CoachMessage, CoachMode } from '../types'
import type { CoachSessionRow } from '../types/database'

const TRIGGER_LABEL: Record<string, string> = {
  on_demand: 'Coach',
  pattern_interrupt: 'Muster-Interrupt',
  weekly_review: 'Wochenreview',
  monthly_review: 'Monatsreview',
  quarterly_review: 'Quartalsreview',
  yearly_review: 'Jahresreview',
  entry_feedback: 'Journal-Feedback',
}

const MODES: { value: CoachMode; label: string; icon: React.ReactNode; starter: string; desc: string }[] = [
  {
    value: 'stuck',
    label: 'Festgesteckt',
    icon: <Zap size={20} />,
    starter: 'Ich stecke gerade fest und weiß nicht weiter.',
    desc: 'Du kommst nicht voran und brauchst einen neuen Blickwinkel.',
  },
  {
    value: 'on_track',
    label: 'Auf Kurs?',
    icon: <Target size={20} />,
    starter: 'Ich möchte prüfen, ob ich auf dem richtigen Weg bin.',
    desc: 'Kurz-Check: Läuft es in die richtige Richtung?',
  },
  {
    value: 'clarity',
    label: 'Klarheit',
    icon: <HelpCircle size={20} />,
    starter: 'Ich brauche Klarheit über eine Entscheidung oder Situation.',
    desc: 'Du stehst vor einer Entscheidung oder brauchst Klarheit.',
  },
  {
    value: 'chat',
    label: 'Einfach reden',
    icon: <MessageCircle size={20} />,
    starter: 'Ich möchte einfach reden — kein spezifisches Thema.',
    desc: 'Kein Thema, kein Ziel — einfach das Gespräch suchen.',
  },
]

const SESSION_MODE_KEY = 'coach_session_mode'
const SESSION_MESSAGES_KEY = 'coach_session_messages'
const SESSION_ID_KEY = 'coach_session_id'
const TONE_KEY = 'coach_tone'

const TONE_OPTIONS: { value: CoachTone; label: string; emoji: string; hint: string }[] = [
  { value: 'sachlich',    label: 'Sachlich',    emoji: '💡', hint: 'Klar, direkt, faktenbasiert' },
  { value: 'arschtritt',  label: 'Arschtritt',  emoji: '🔥', hint: 'Unbequeme Wahrheiten, kein Schonen' },
  { value: 'anerkennend', label: 'Anerkennend', emoji: '🙌', hint: 'Empathisch, wertschätzend' },
]

export default function Coach() {
  const { user, profile, goals, recentEntries } = useStore()

  const [mode, setMode] = useState<CoachMode | null>(() => {
    const savedMode = localStorage.getItem(SESSION_MODE_KEY)
    const savedId = localStorage.getItem(SESSION_ID_KEY)
    return savedMode && savedId ? (savedMode as CoachMode) : null
  })

  const [messages, setMessages] = useState<CoachMessage[]>(() => {
    const saved = localStorage.getItem(SESSION_MESSAGES_KEY)
    if (saved) {
      try { return JSON.parse(saved) as CoachMessage[] } catch { return [] }
    }
    return []
  })

  const [session, setSession] = useState<CoachSessionRow | null>(() => {
    const savedId = localStorage.getItem(SESSION_ID_KEY)
    return savedId ? { id: savedId } as CoachSessionRow : null
  })

  const [tone, setTone] = useState<CoachTone>(
    () => (localStorage.getItem(TONE_KEY) as CoachTone) ?? 'sachlich'
  )

  const [coachHabits, setCoachHabits] = useState<CoachHabit[]>([])

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const [showArchive, setShowArchive] = useState(false)
  const [archiveSessions, setArchiveSessions] = useState<CoachSessionRow[]>([])
  const [archiveLoading, setArchiveLoading] = useState(false)
  const [selectedSession, setSelectedSession] = useState<CoachSessionRow | null>(null)

  async function openArchive() {
    if (!user) return
    setShowArchive(true)
    setSelectedSession(null)
    setArchiveLoading(true)
    try {
      const sessions = await getCoachSessions(user.id)
      setArchiveSessions(sessions)
    } catch (err) {
      console.error('Archiv laden fehlgeschlagen:', err)
    } finally {
      setArchiveLoading(false)
    }
  }

  async function handleDeleteSession(id: string) {
    try {
      await deleteCoachSession(id)
      setArchiveSessions((prev) => prev.filter((s) => s.id !== id))
      if (selectedSession?.id === id) setSelectedSession(null)
    } catch (err) {
      console.error('Session löschen fehlgeschlagen:', err)
    }
  }

  useEffect(() => {
    if (mode) localStorage.setItem(SESSION_MODE_KEY, mode)
    else localStorage.removeItem(SESSION_MODE_KEY)
  }, [mode])

  useEffect(() => {
    localStorage.setItem(SESSION_MESSAGES_KEY, JSON.stringify(messages))
  }, [messages])

  useEffect(() => {
    if (session?.id) localStorage.setItem(SESSION_ID_KEY, session.id)
  }, [session])

  useEffect(() => { localStorage.setItem(TONE_KEY, tone) }, [tone])

  useEffect(() => {
    if (!user) {
      localStorage.removeItem(SESSION_MODE_KEY)
      localStorage.removeItem(SESSION_MESSAGES_KEY)
      localStorage.removeItem(SESSION_ID_KEY)
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()
    const daysElapsed = now.getDate()
    Promise.all([
      getHabitsForMonth(user.id, month, year),
      getHabitLogs(user.id, month, year),
    ]).then(([habits, logs]) => {
      const result: CoachHabit[] = habits.map((h) => {
        const completed = logs.filter((l) => l.habit_id === h.id && l.completed).length
        const target = h.frequency_type === 'daily'
          ? daysElapsed
          : Math.ceil(daysElapsed / 7) * h.frequency_value
        const rate = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0
        return { title: h.title, frequency_type: h.frequency_type, frequency_value: h.frequency_value, completionRate: rate }
      })
      setCoachHabits(result)
    }).catch((err) => console.error('Coach Habits laden:', err))
  }, [user])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startSession = useCallback(async (selectedMode: CoachMode, starterOverride?: string) => {
    if (!user || !profile) return
    setMode(selectedMode)
    setError(null)

    const modeConfig = MODES.find((m) => m.value === selectedMode)!
    const starterMessage: CoachMessage = {
      role: 'user',
      content: starterOverride ?? modeConfig.starter,
      timestamp: new Date().toISOString(),
    }

    try {
      const newSession = await createCoachSession({
        user_id: user.id,
        trigger: 'on_demand',
        messages: [] as unknown as import('../types/database').Json,
      })
      setSession(newSession)

      setIsLoading(true)
      const reply = await sendCoachMessage([starterMessage], profile, recentEntries, goals, tone, coachHabits)
      const assistantMsg: CoachMessage = {
        role: 'assistant',
        content: reply,
        timestamp: new Date().toISOString(),
      }
      const updatedMessages = [starterMessage, assistantMsg]
      setMessages(updatedMessages)
      await updateCoachSession(newSession.id, updatedMessages)
    } catch (err) {
      console.error('Coach Session Fehler:', err)
      setError('KI momentan nicht verfügbar — bitte erneut versuchen.')
    } finally {
      setIsLoading(false)
    }
  }, [user, profile, recentEntries, goals, tone, coachHabits]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSend() {
    if (!input.trim() || isLoading || !profile || !session) return

    const userMsg: CoachMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setError(null)
    setIsLoading(true)

    try {
      const reply = await sendCoachMessage(updatedMessages, profile, recentEntries, goals, tone, coachHabits)
      const assistantMsg: CoachMessage = {
        role: 'assistant',
        content: reply,
        timestamp: new Date().toISOString(),
      }
      const finalMessages = [...updatedMessages, assistantMsg]
      setMessages(finalMessages)
      await updateCoachSession(session.id, finalMessages)
    } catch (err) {
      console.error('Coach sendMessage Fehler:', err)
      setError('KI momentan nicht verfügbar — bitte erneut versuchen.')
    } finally {
      setIsLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  function handleReset() {
    localStorage.removeItem(SESSION_MODE_KEY)
    localStorage.removeItem(SESSION_MESSAGES_KEY)
    localStorage.removeItem(SESSION_ID_KEY)
    setMode(null)
    setMessages([])
    setInput('')
    setError(null)
    setSession(null)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const aiProfile = profile?.ai_profile as Record<string, string> | null
  const hasPatterns = aiProfile &&
    aiProfile.energyPatterns &&
    aiProfile.generatedAt &&
    Math.floor((Date.now() - new Date(aiProfile.generatedAt).getTime()) / 86400000) < 30

  // ── Archiv-Ansicht ──────────────────────────────────────────────────────────
  if (showArchive) {
    const sessionMessages = selectedSession
      ? (Array.isArray(selectedSession.messages) ? selectedSession.messages as unknown as CoachMessage[] : [])
      : []

    return (
      <div style={{ maxWidth: '720px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <button
            onClick={() => { if (selectedSession) { setSelectedSession(null) } else { setShowArchive(false) } }}
            style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.4rem', display: 'flex' }}
          >
            <ChevronLeft size={20} />
          </button>
          <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1.3rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
            {selectedSession ? (TRIGGER_LABEL[selectedSession.trigger] ?? selectedSession.trigger) : 'Vergangene Sessions'}
          </h2>
        </div>

        {selectedSession && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              {new Date(selectedSession.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
            {sessionMessages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={msg.role === 'user' ? userBubbleStyle : aiBubbleStyle}>
                  {msg.role === 'assistant' ? <ReactMarkdown>{msg.content}</ReactMarkdown> : msg.content}
                </div>
              </div>
            ))}
            {sessionMessages.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Keine Nachrichten gespeichert.</p>
            )}
          </div>
        )}

        {!selectedSession && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {archiveLoading && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Lade Sessions…</p>}
            {!archiveLoading && archiveSessions.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Noch keine Sessions gespeichert.</p>
            )}
            {archiveSessions.map((s) => {
              const msgs = Array.isArray(s.messages) ? s.messages as unknown as CoachMessage[] : []
              const preview = msgs[0]?.content?.slice(0, 90) ?? s.summary?.slice(0, 90) ?? '—'
              return (
                <div
                  key={s.id}
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.85rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start', boxShadow: 'var(--shadow-card)' }}
                >
                  <button onClick={() => setSelectedSession(s)} style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 10%, transparent)', padding: '0.15rem 0.45rem', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {TRIGGER_LABEL[s.trigger] ?? s.trigger}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {new Date(s.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                      {preview}{preview.length >= 90 ? '…' : ''}
                    </p>
                  </button>
                  <button onClick={() => handleDeleteSession(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.2rem', flexShrink: 0, display: 'flex' }} title="Session löschen">
                    <Trash2 size={15} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── Modus-Auswahl ─────────────────────────────────────────────────────────
  if (!mode) {
    return (
      <div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
          <h1 style={{ fontFamily: 'Lora, serif', fontSize: 'clamp(1.4rem, 3vw, 1.8rem)', fontWeight: 600, margin: 0 }}>Coach</h1>
          <button
            onClick={openArchive}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.4rem 0.8rem', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: '0.35rem', boxShadow: 'var(--shadow-card)' }}
          >
            <Clock size={13} /> Vergangene Sessions
          </button>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
          Was brauchst du gerade?
        </p>

        {/* Desktop: 2-Spalten — links Modi, rechts Ton + Kontext */}
        <div className="coach-layout">

          {/* Linke Spalte: Modus-Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {MODES.map((m) => (
              <motion.button
                key={m.value}
                whileTap={{ scale: 0.98 }}
                onClick={() => startSession(m.value)}
                style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: '14px', padding: '1.1rem 1.25rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  gap: '1rem', textAlign: 'left', width: '100%',
                  boxShadow: 'var(--shadow-card)', transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(79,138,139,0.15)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)' }}
              >
                <span style={{ color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 10%, transparent)', borderRadius: '10px', padding: '0.6rem', display: 'flex', flexShrink: 0 }}>
                  {m.icon}
                </span>
                <div>
                  <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '1rem', margin: 0, fontFamily: 'DM Sans, sans-serif' }}>
                    {m.label}
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '0.2rem 0 0', lineHeight: 1.4 }}>
                    {m.desc}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Rechte Spalte: Ton-Auswahl + Kontext-Panels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Ton-Auswahl */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.25rem', boxShadow: 'var(--shadow-card)' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.85rem' }}>
                Wie soll ich heute mit dir reden?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {TONE_OPTIONS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTone(t.value)}
                    style={{
                      padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
                      background: tone === t.value ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'var(--bg-secondary)',
                      color: tone === t.value ? 'var(--text-primary)' : 'var(--text-secondary)',
                      border: `2px solid ${tone === t.value ? 'var(--accent)' : 'transparent'}`,
                      borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                      textAlign: 'left', transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{t.emoji}</span>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: tone === t.value ? 600 : 500 }}>{t.label}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{t.hint}</div>
                    </div>
                    {tone === t.value && (
                      <span style={{ marginLeft: 'auto', color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 700 }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Muster-Panel */}
            {hasPatterns && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.25rem', boxShadow: 'var(--shadow-card)' }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', margin: '0 0 0.85rem' }}>
                  Deine Muster
                </p>
                {aiProfile!.energyPatterns && (
                  <div style={{ marginBottom: '0.6rem' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Energie</span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>{aiProfile!.energyPatterns}</span>
                  </div>
                )}
                {aiProfile!.focusPatterns && (
                  <div style={{ marginBottom: '0.6rem' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Fokus</span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>{aiProfile!.focusPatterns}</span>
                  </div>
                )}
                {aiProfile!.sabotagePatterns && (
                  <div style={{ marginBottom: '0.85rem' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Achtung</span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>{aiProfile!.sabotagePatterns}</span>
                  </div>
                )}
                {aiProfile!.coachQuestion && (
                  <button
                    onClick={() => startSession('clarity', aiProfile!.coachQuestion)}
                    style={{ width: '100%', padding: '0.65rem 0.9rem', background: 'color-mix(in srgb, var(--accent) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)', borderRadius: '8px', color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', textAlign: 'left', fontFamily: 'DM Sans, sans-serif' }}
                  >
                    Muster mit Coach besprechen →
                  </button>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    )
  }

  // ── Chat-Ansicht ───────────────────────────────────────────────────────────
  const currentMode = MODES.find((m) => m.value === mode)!

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100svh - 4.5rem)',
        maxWidth: '800px',
      }}
    >
      {/* Chat Header */}
      <div
        style={{
          padding: '0.85rem 1.25rem',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-card)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          borderRadius: '14px 14px 0 0',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span style={{ color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 10%, transparent)', borderRadius: '8px', padding: '0.35rem', display: 'flex' }}>
            {currentMode.icon}
          </span>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: 1.2 }}>
              {currentMode.label}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
              {TONE_OPTIONS.find((t) => t.value === tone)?.emoji} {TONE_OPTIONS.find((t) => t.value === tone)?.label}
            </div>
          </div>
        </div>
        <button
          onClick={handleReset}
          title="Neue Session"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.45rem 0.75rem', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontFamily: 'DM Sans, sans-serif' }}
        >
          <RotateCcw size={14} />
          Neu
        </button>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          background: 'var(--bg-secondary)',
        }}
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '0.5rem', alignItems: 'flex-end' }}
            >
              {msg.role === 'assistant' && (
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.75rem', color: '#fff', fontWeight: 700 }}>
                  C
                </div>
              )}
              <div style={msg.role === 'user' ? userBubbleStyle : aiBubbleStyle}>
                {msg.role === 'assistant'
                  ? <ReactMarkdown>{msg.content}</ReactMarkdown>
                  : msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading */}
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', justifyContent: 'flex-start', gap: '0.5rem', alignItems: 'flex-end' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.75rem', color: '#fff', fontWeight: 700 }}>
              C
            </div>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '18px 18px 18px 4px', padding: '0.75rem 1rem', display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
              {[0, 1, 2].map((dot) => (
                <motion.span
                  key={dot}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: dot * 0.2 }}
                  style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)', display: 'block' }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.65rem 0.9rem', color: '#dc2626', fontSize: '0.85rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: '0.85rem 1rem',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          gap: '0.6rem',
          alignItems: 'flex-end',
          flexShrink: 0,
          background: 'var(--bg-card)',
          borderRadius: '0 0 14px 14px',
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Schreib etwas… (Enter zum Senden)"
          rows={1}
          style={{
            flex: 1,
            background: 'var(--bg-secondary)',
            border: '1.5px solid var(--border)',
            borderRadius: '12px',
            padding: '0.7rem 1rem',
            color: 'var(--text-primary)',
            fontSize: '0.95rem',
            resize: 'none',
            outline: 'none',
            fontFamily: 'DM Sans, sans-serif',
            lineHeight: 1.5,
            maxHeight: 120,
            overflowY: 'auto',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          style={{
            background: isLoading || !input.trim() ? 'var(--bg-secondary)' : 'var(--accent)',
            border: 'none',
            borderRadius: '12px',
            padding: '0.7rem 1rem',
            cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
            color: isLoading || !input.trim() ? 'var(--text-muted)' : '#fff',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            transition: 'all 0.15s',
          }}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  )
}

const userBubbleStyle: React.CSSProperties = {
  maxWidth: '72%',
  padding: '0.75rem 1rem',
  borderRadius: '18px 18px 4px 18px',
  background: 'var(--accent)',
  color: '#fff',
  fontSize: '0.92rem',
  lineHeight: 1.55,
  whiteSpace: 'pre-wrap',
}

const aiBubbleStyle: React.CSSProperties = {
  maxWidth: '80%',
  padding: '0.75rem 1rem',
  borderRadius: '18px 18px 18px 4px',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
  fontSize: '0.92rem',
  lineHeight: 1.55,
}

import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, RotateCcw, Zap, Target, HelpCircle, MessageCircle, Clock, Trash2, ChevronLeft } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store/useStore'
import { sendCoachMessage } from '../lib/claude'
import type { CoachTone } from '../lib/claude'
import { createCoachSession, updateCoachSession, getCoachSessions, deleteCoachSession } from '../lib/db'
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

const MODES: { value: CoachMode; label: string; icon: React.ReactNode; starter: string }[] = [
  {
    value: 'stuck',
    label: 'Festgesteckt',
    icon: <Zap size={18} />,
    starter: 'Ich stecke gerade fest und weiß nicht weiter.',
  },
  {
    value: 'on_track',
    label: 'Auf Kurs?',
    icon: <Target size={18} />,
    starter: 'Ich möchte prüfen, ob ich auf dem richtigen Weg bin.',
  },
  {
    value: 'clarity',
    label: 'Klarheit',
    icon: <HelpCircle size={18} />,
    starter: 'Ich brauche Klarheit über eine Entscheidung oder Situation.',
  },
  {
    value: 'chat',
    label: 'Einfach reden',
    icon: <MessageCircle size={18} />,
    starter: 'Ich möchte einfach reden — kein spezifisches Thema.',
  },
]

const SESSION_MODE_KEY = 'coach_session_mode'
const SESSION_MESSAGES_KEY = 'coach_session_messages'
const SESSION_ID_KEY = 'coach_session_id'
const TONE_KEY = 'coach_tone'

const TONE_OPTIONS: { value: CoachTone; label: string }[] = [
  { value: 'sachlich',    label: '💡 Sachlich' },
  { value: 'arschtritt',  label: '🔥 Arschtritt' },
  { value: 'anerkennend', label: '🙌 Anerkennend' },
]

export default function Coach() {
  const { user, profile, goals, recentEntries } = useStore()

  const [mode, setMode] = useState<CoachMode | null>(() => {
    const savedMode = localStorage.getItem(SESSION_MODE_KEY)
    const savedId = localStorage.getItem(SESSION_ID_KEY)
    // Nur wiederherstellen wenn auch Session-ID vorhanden (sonst stuck state)
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

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Archiv
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

  // Persistenz: bei Änderungen speichern
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

  // Ton persistieren
  useEffect(() => { localStorage.setItem(TONE_KEY, tone) }, [tone])

  // Bei Abmelden: Session-Daten aus localStorage löschen
  useEffect(() => {
    if (!user) {
      localStorage.removeItem(SESSION_MODE_KEY)
      localStorage.removeItem(SESSION_MESSAGES_KEY)
      localStorage.removeItem(SESSION_ID_KEY)
    }
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
      // Create session in DB
      const newSession = await createCoachSession({
        user_id: user.id,
        trigger: 'on_demand',
        messages: [] as unknown as import('../types/database').Json,
      })
      setSession(newSession)

      // Get first AI response
      setIsLoading(true)
      const reply = await sendCoachMessage([starterMessage], profile, recentEntries, goals, tone)
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
  }, [user, profile, recentEntries, goals])

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
      const reply = await sendCoachMessage(updatedMessages, profile, recentEntries, goals, tone)
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

  // Muster-Daten aus ai_profile
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
      <div style={{ padding: '1.5rem', maxWidth: 480, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <button
            onClick={() => { if (selectedSession) { setSelectedSession(null) } else { setShowArchive(false) } }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}
          >
            <ChevronLeft size={22} />
          </button>
          <h2 style={{ fontFamily: 'Lora, serif', fontSize: '1.3rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
            {selectedSession ? (TRIGGER_LABEL[selectedSession.trigger] ?? selectedSession.trigger) : 'Vergangene Sessions'}
          </h2>
        </div>

        {/* Session-Detail */}
        {selectedSession && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              {new Date(selectedSession.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
            {sessionMessages.map((msg, i) => (
              <div
                key={i}
                style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}
              >
                <div style={{
                  maxWidth: '82%',
                  padding: '0.65rem 0.9rem',
                  borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  background: msg.role === 'user' ? 'var(--accent)' : 'var(--surface)',
                  border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                  color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                  fontSize: '0.88rem',
                  lineHeight: 1.5,
                  whiteSpace: msg.role === 'user' ? 'pre-wrap' : undefined,
                }}>
                  {msg.role === 'assistant' ? <ReactMarkdown>{msg.content}</ReactMarkdown> : msg.content}
                </div>
              </div>
            ))}
            {sessionMessages.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Keine Nachrichten gespeichert.</p>
            )}
          </div>
        )}

        {/* Session-Liste */}
        {!selectedSession && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {archiveLoading && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Lade Sessions…</p>}
            {!archiveLoading && archiveSessions.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Noch keine Sessions gespeichert.</p>
            )}
            {archiveSessions.map((s) => {
              const msgs = Array.isArray(s.messages) ? s.messages as unknown as CoachMessage[] : []
              const preview = msgs[0]?.content?.slice(0, 80) ?? s.summary?.slice(0, 80) ?? '—'
              return (
                <div
                  key={s.id}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '0.85rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}
                >
                  <button
                    onClick={() => setSelectedSession(s)}
                    style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent)', background: 'rgba(134,59,255,0.1)', padding: '0.15rem 0.45rem', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {TRIGGER_LABEL[s.trigger] ?? s.trigger}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {new Date(s.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                      {preview}{preview.length >= 80 ? '…' : ''}
                    </p>
                  </button>
                  <button
                    onClick={() => handleDeleteSession(s.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.2rem', flexShrink: 0, display: 'flex' }}
                    title="Session löschen"
                  >
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

  // Mode selection screen
  if (!mode) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: 480, margin: '0 auto' }}>
        {/* Nordstern Banner */}
        {profile?.north_star && (
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '0.75rem 1rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>⭐</span>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
              {profile.north_star}
            </p>
          </div>
        )}

        {/* Muster-Panel */}
        {hasPatterns && (
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
            }}
          >
            <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', margin: '0 0 0.75rem' }}>
              🔍 Deine Muster
            </p>
            {aiProfile!.energyPatterns && (
              <div style={{ marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Energie: </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{aiProfile!.energyPatterns}</span>
              </div>
            )}
            {aiProfile!.focusPatterns && (
              <div style={{ marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fokus: </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{aiProfile!.focusPatterns}</span>
              </div>
            )}
            {aiProfile!.sabotagePatterns && (
              <div style={{ marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Achtung: </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{aiProfile!.sabotagePatterns}</span>
              </div>
            )}
            {aiProfile!.coachQuestion && (
              <button
                onClick={() => startSession('clarity', aiProfile!.coachQuestion)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.9rem',
                  background: 'rgba(134,59,255,0.1)',
                  border: '1px solid rgba(134,59,255,0.25)',
                  borderRadius: 8,
                  color: 'var(--accent)',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                }}
              >
                Muster mit Coach besprechen →
              </button>
            )}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
          <h2 style={{ fontFamily: 'Lora, serif', color: 'var(--text-primary)', fontSize: '1.4rem', margin: 0 }}>
            Coach
          </h2>
          <button
            onClick={openArchive}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '0.35rem 0.75rem', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.78rem', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <Clock size={13} /> Vergangene Sessions
          </button>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
          Was brauchst du gerade?
        </p>

        {/* Ton-Auswahl */}
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.5rem' }}>
            Wie soll ich heute mit dir reden?
          </p>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {TONE_OPTIONS.map((t) => (
              <button key={t.value} onClick={() => setTone(t.value)}
                style={{ flex: 1, padding: '0.5rem 0.25rem', background: tone === t.value ? 'var(--accent)' : 'var(--bg-card)', color: tone === t.value ? '#fff' : 'var(--text-secondary)', border: `1.5px solid ${tone === t.value ? 'var(--accent)' : 'var(--border)'}`, borderRadius: '8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '0.78rem', fontWeight: tone === t.value ? 600 : 400, transition: 'all 0.12s' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {MODES.map((m) => (
            <motion.button
              key={m.value}
              whileTap={{ scale: 0.98 }}
              onClick={() => startSession(m.value)}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '1rem 1.25rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <span style={{ color: 'var(--accent)', flexShrink: 0 }}>{m.icon}</span>
              <div>
                <p
                  style={{
                    color: 'var(--text-primary)',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    margin: 0,
                  }}
                >
                  {m.label}
                </p>
                <p
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                    margin: '0.2rem 0 0',
                  }}
                >
                  {m.starter}
                </p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    )
  }

  // Chat screen
  const currentMode = MODES.find((m) => m.value === mode)!

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 4rem)',
        maxWidth: 480,
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '0.75rem 1rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: 'var(--accent)' }}>{currentMode.icon}</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
            {currentMode.label}
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '0.15rem 0.5rem', borderRadius: '999px', marginLeft: '0.15rem' }}>
            {TONE_OPTIONS.find((t) => t.value === tone)?.label}
          </span>
        </div>
        <button
          onClick={handleReset}
          title="Neue Session"
          style={{
            background: 'none',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '0.4rem',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '80%',
                  padding: '0.65rem 0.9rem',
                  borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  background:
                    msg.role === 'user'
                      ? 'var(--accent)'
                      : 'var(--surface)',
                  border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                  color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                  fontSize: '0.9rem',
                  lineHeight: 1.5,
                  whiteSpace: msg.role === 'user' ? 'pre-wrap' : undefined,
                }}
              >
                {msg.role === 'assistant'
                  ? <ReactMarkdown>{msg.content}</ReactMarkdown>
                  : msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ display: 'flex', justifyContent: 'flex-start' }}
          >
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '12px 12px 12px 2px',
                padding: '0.65rem 0.9rem',
                display: 'flex',
                gap: '0.3rem',
                alignItems: 'center',
              }}
            >
              {[0, 1, 2].map((dot) => (
                <motion.span
                  key={dot}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: dot * 0.2 }}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--text-muted)',
                    display: 'block',
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 8,
              padding: '0.65rem 0.9rem',
              color: '#dc2626',
              fontSize: '0.85rem',
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: '0.75rem 1rem',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'flex-end',
          flexShrink: 0,
          background: 'var(--bg)',
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Schreib etwas…"
          rows={1}
          style={{
            flex: 1,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '0.6rem 0.85rem',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            lineHeight: 1.5,
            maxHeight: 120,
            overflowY: 'auto',
          }}
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          style={{
            background: 'var(--accent)',
            border: 'none',
            borderRadius: 10,
            padding: '0.6rem 0.75rem',
            cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
            opacity: isLoading || !input.trim() ? 0.5 : 1,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  )
}

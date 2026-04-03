import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, RotateCcw, Zap, Target, HelpCircle, MessageCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store/useStore'
import { sendCoachMessage } from '../lib/claude'
import { createCoachSession, updateCoachSession } from '../lib/db'
import type { CoachMessage, CoachMode } from '../types'
import type { CoachSessionRow } from '../types/database'

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

export default function Coach() {
  const { user, profile, goals, recentEntries } = useStore()
  const [mode, setMode] = useState<CoachMode | null>(null)
  const [messages, setMessages] = useState<CoachMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<CoachSessionRow | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startSession = useCallback(async (selectedMode: CoachMode) => {
    if (!user || !profile) return
    setMode(selectedMode)
    setError(null)

    const modeConfig = MODES.find((m) => m.value === selectedMode)!
    const starterMessage: CoachMessage = {
      role: 'user',
      content: modeConfig.starter,
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
      const reply = await sendCoachMessage([starterMessage], profile, recentEntries, goals)
      const assistantMsg: CoachMessage = {
        role: 'assistant',
        content: reply,
        timestamp: new Date().toISOString(),
      }
      const updatedMessages = [starterMessage, assistantMsg]
      setMessages(updatedMessages)
      await updateCoachSession(newSession.id, updatedMessages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Starten der Session')
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
      const reply = await sendCoachMessage(updatedMessages, profile, recentEntries, goals)
      const assistantMsg: CoachMessage = {
        role: 'assistant',
        content: reply,
        timestamp: new Date().toISOString(),
      }
      const finalMessages = [...updatedMessages, assistantMsg]
      setMessages(finalMessages)
      await updateCoachSession(session.id, finalMessages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Senden')
    } finally {
      setIsLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  function handleReset() {
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

        <h2
          style={{
            fontFamily: 'Lora, serif',
            color: 'var(--text-primary)',
            fontSize: '1.4rem',
            marginBottom: '0.4rem',
          }}
        >
          Coach
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Was brauchst du gerade?
        </p>

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
          <span
            style={{
              fontWeight: 600,
              color: 'var(--text-primary)',
              fontSize: '0.95rem',
            }}
          >
            {currentMode.label}
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
                  whiteSpace: 'pre-wrap',
                }}
              >
                {msg.content}
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

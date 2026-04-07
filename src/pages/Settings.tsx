import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, LogOut, RefreshCw, AlertTriangle, Info } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { updateProfile, countJournalEntries, countGoals, deleteAllJournalEntries, deleteAllGoals, deleteAllUserData } from '../lib/db'
import { generatePatternAnalysis } from '../lib/claude'
import { useStore } from '../store/useStore'

// ─── Kleine Hilfs-Komponenten ─────────────────────────────────────────────────

function InfoTooltip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
      <button
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onTouchStart={() => setVisible((v) => !v)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '0.15rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
        }}
        aria-label="Info"
      >
        <Info size={14} />
      </button>
      {visible && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '6px',
            background: 'var(--bg-primary, #1a1a2e)',
            color: 'var(--text-primary)',
            fontSize: '0.72rem',
            lineHeight: 1.45,
            padding: '0.5rem 0.7rem',
            borderRadius: '8px',
            width: '220px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
            zIndex: 50,
            pointerEvents: 'none',
            whiteSpace: 'normal',
          }}
        >
          {text}
        </div>
      )}
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '1.25rem',
        marginBottom: '1rem',
      }}
    >
      <h2
        style={{
          fontSize: '0.8rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--text-muted)',
          marginBottom: '1rem',
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  )
}

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  body: React.ReactNode
  confirmLabel: string
  confirmColor?: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

function ConfirmModal({
  isOpen,
  title,
  body,
  confirmLabel,
  confirmColor = '#ef4444',
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 200,
        padding: '0 0 env(safe-area-inset-bottom)',
      }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)',
          borderRadius: '16px 16px 0 0',
          padding: '1.5rem',
          width: '100%',
          maxWidth: '520px',
        }}
      >
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
          {title}
        </h3>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
          {body}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '0.75rem',
              borderRadius: '8px',
              border: 'none',
              background: confirmColor,
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? '...' : confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Haupt-Seite ──────────────────────────────────────────────────────────────

export default function Settings() {
  const { profile, user, setProfile, recentEntries, goals } = useStore()
  const navigate = useNavigate()

  // Profil-Edit-State
  const [name, setName] = useState(profile?.name ?? '')
  const [email, setEmail] = useState('')
  const [northStar, setNorthStar] = useState(profile?.north_star ?? '')
  const [values, setValues] = useState<string[]>(profile?.values ?? [])
  const [stopList, setStopList] = useState<string[]>(profile?.stop_list ?? [])
  const [newValue, setNewValue] = useState('')
  const [newStopItem, setNewStopItem] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Counts für Lösch-Modals
  const [journalCount, setJournalCount] = useState<number | null>(null)
  const [goalCount, setGoalCount] = useState<number | null>(null)

  // Journal-Einstellungen
  const [metricsEnabled, setMetricsEnabled] = useState(
    () => localStorage.getItem('metrics_enabled') !== 'false'
  )

  function toggleMetrics() {
    const next = !metricsEnabled
    setMetricsEnabled(next)
    localStorage.setItem('metrics_enabled', String(next))
  }

  // Modals
  const [showOnboardingModal, setShowOnboardingModal] = useState(false)
  const [showDeleteJournalModal, setShowDeleteJournalModal] = useState(false)
  const [showDeleteGoalsModal, setShowDeleteGoalsModal] = useState(false)
  const [showDeleteAllStep, setShowDeleteAllStep] = useState<0 | 1 | 2>(0)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? '')
    })
    if (user) {
      countJournalEntries(user.id).then(setJournalCount).catch(() => {})
      countGoals(user.id).then(setGoalCount).catch(() => {})
    }
  }, [user])

  // Profil-State mit Store synchron halten
  useEffect(() => {
    setName(profile?.name ?? '')
    setNorthStar(profile?.north_star ?? '')
    setValues(profile?.values ?? [])
    setStopList(profile?.stop_list ?? [])
  }, [profile])

  async function handleSave() {
    if (!user) return
    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    try {
      const updated = await updateProfile(user.id, {
        name: name.trim() || null,
        north_star: northStar.trim() || null,
        values,
        stop_list: stopList,
      })
      setProfile(updated)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2500)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Fehler beim Speichern.')
    } finally {
      setIsSaving(false)
    }
  }

  function addValue() {
    const v = newValue.trim()
    if (v && !values.includes(v)) {
      setValues([...values, v])
      setNewValue('')
    }
  }

  function addStopItem() {
    const v = newStopItem.trim()
    if (v) {
      setStopList([...stopList, v])
      setNewStopItem('')
    }
  }

  async function handleOnboardingRestart() {
    if (!user) return
    setIsDeleting(true)
    try {
      const updated = await updateProfile(user.id, { onboarding_completed: false })
      setProfile(updated)
      navigate('/onboarding')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Fehler.')
    } finally {
      setIsDeleting(false)
      setShowOnboardingModal(false)
    }
  }

  async function handleDeleteJournal() {
    if (!user) return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await deleteAllJournalEntries(user.id)
      setJournalCount(0)
      setShowDeleteJournalModal(false)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Fehler.')
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleDeleteGoals() {
    if (!user) return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await deleteAllGoals(user.id)
      setGoalCount(0)
      setShowDeleteGoalsModal(false)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Fehler.')
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleDeleteAll() {
    if (!user || deleteConfirmText !== 'LÖSCHEN') return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await deleteAllUserData(user.id)
      // Profil neu laden
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      setProfile(data)
      navigate('/onboarding')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Fehler beim Löschen.')
      setIsDeleting(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const ikigaiRaw = profile?.ikigai as Record<string, string> | null
  const aiProfile = profile?.ai_profile as Record<string, string> | null
  const hasAiProfile = aiProfile && aiProfile.energyPatterns

  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)

  async function handleReanalyze() {
    if (!profile || !user || recentEntries.length < 14) return
    setIsAnalyzing(true)
    setAnalyzeError(null)
    try {
      const analysis = await generatePatternAnalysis(profile, recentEntries, goals)
      const updated = await updateProfile(user.id, { ai_profile: analysis as unknown as import('../types/database').Json })
      setProfile(updated)
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Fehler bei der Analyse.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Ikigai edit state
  const [ikigaiLoves, setIkigaiLoves] = useState(ikigaiRaw?.loves ?? '')
  const [ikigaiGoodAt, setIkigaiGoodAt] = useState(ikigaiRaw?.good_at ?? '')
  const [ikigaiPaidFor, setIkigaiPaidFor] = useState(ikigaiRaw?.paid_for ?? '')
  const [ikigaiWorldNeeds, setIkigaiWorldNeeds] = useState(ikigaiRaw?.world_needs ?? '')
  const [ikigaiSynthesis, setIkigaiSynthesis] = useState(ikigaiRaw?.synthesis ?? '')
  const [isSavingIkigai, setIsSavingIkigai] = useState(false)
  const [ikigaiSaveSuccess, setIkigaiSaveSuccess] = useState(false)
  const [ikigaiError, setIkigaiError] = useState<string | null>(null)

  async function handleSaveIkigai() {
    if (!user) return
    setIsSavingIkigai(true)
    setIkigaiError(null)
    setIkigaiSaveSuccess(false)
    try {
      const updated = await updateProfile(user.id, {
        ikigai: {
          loves: ikigaiLoves.trim(),
          good_at: ikigaiGoodAt.trim(),
          paid_for: ikigaiPaidFor.trim(),
          world_needs: ikigaiWorldNeeds.trim(),
          synthesis: ikigaiSynthesis.trim(),
        } as unknown as import('../types/database').Json,
      })
      setProfile(updated)
      setIkigaiSaveSuccess(true)
      setTimeout(() => setIkigaiSaveSuccess(false), 2500)
    } catch (err) {
      setIkigaiError(err instanceof Error ? err.message : 'Fehler beim Speichern.')
    } finally {
      setIsSavingIkigai(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100svh',
        background: 'var(--bg-primary)',
        paddingBottom: 'calc(72px + env(safe-area-inset-bottom))',
      }}
    >
      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '1.5rem 1rem 0' }}>
        <h1
          style={{
            fontFamily: 'Lora, serif',
            fontSize: '1.4rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '1.25rem',
          }}
        >
          Einstellungen
        </h1>

        {/* ── Sektion 1: Mein Profil ── */}
        <SectionCard title="Mein Profil">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Name */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.875rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* E-Mail (read-only) */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                E-Mail
              </label>
              <div
                style={{
                  padding: '0.65rem 0.875rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-muted)',
                  fontSize: '0.9rem',
                }}
              >
                {email || '—'}
              </div>
            </div>

            {/* Nordstern */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                Nordstern
              </label>
              <textarea
                value={northStar}
                onChange={(e) => setNorthStar(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.875rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  lineHeight: 1.5,
                }}
              />
            </div>

            {/* Werte */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
                Werte
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
                {values.map((v) => (
                  <span
                    key={v}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '999px',
                      background: 'rgba(134,59,255,0.15)',
                      color: 'var(--accent)',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                    }}
                  >
                    {v}
                    <button
                      onClick={() => setValues(values.filter((x) => x !== v))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--accent)', display: 'flex' }}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Wert hinzufügen..."
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addValue()}
                  style={{
                    flex: 1,
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                  }}
                />
                <button
                  onClick={addValue}
                  style={{
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'var(--accent)',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Stopp-Liste */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
                Stopp-Liste
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.5rem' }}>
                {stopList.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-primary)',
                    }}
                  >
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{item}</span>
                    <button
                      onClick={() => setStopList(stopList.filter((_, j) => j !== i))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Eintrag hinzufügen..."
                  value={newStopItem}
                  onChange={(e) => setNewStopItem(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addStopItem()}
                  style={{
                    flex: 1,
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                  }}
                />
                <button
                  onClick={addStopItem}
                  style={{
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'var(--accent)',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Speichern-Button */}
            {saveError && (
              <div style={{ padding: '0.6rem 0.875rem', borderRadius: '8px', background: '#FFF0EE', color: '#ef4444', fontSize: '0.85rem' }}>
                {saveError}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={handleSave}
                disabled={isSaving}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  opacity: isSaving ? 0.7 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {saveSuccess ? 'Gespeichert ✓' : isSaving ? 'Speichert...' : 'Speichern'}
              </button>
              <InfoTooltip text="Speichert deinen Namen, Nordstern, Werte und Stopp-Liste. Keine Daten werden gelöscht." />
            </div>
          </div>
        </SectionCard>

        {/* ── Sektion 2: Ikigai ── */}
        <SectionCard title="Ikigai">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {[
              { label: 'Was liebst du zu tun?', value: ikigaiLoves, setter: setIkigaiLoves, placeholder: 'Ich liebe es zu…' },
              { label: 'Worin bist du gut?', value: ikigaiGoodAt, setter: setIkigaiGoodAt, placeholder: 'Ich bin besonders gut in…' },
              { label: 'Wofür würden Menschen dir zahlen?', value: ikigaiPaidFor, setter: setIkigaiPaidFor, placeholder: 'Menschen zahlen mir für…' },
              { label: 'Was braucht die Welt?', value: ikigaiWorldNeeds, setter: setIkigaiWorldNeeds, placeholder: 'Die Welt braucht…' },
            ].map(({ label, value, setter, placeholder }) => (
              <div key={label}>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                  {label}
                </label>
                <textarea
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  placeholder={placeholder}
                  rows={2}
                  style={{
                    width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px',
                    border: '1px solid var(--border)', background: 'var(--bg-primary)',
                    color: 'var(--text-primary)', fontSize: '0.875rem', resize: 'none',
                    boxSizing: 'border-box', lineHeight: 1.5, outline: 'none',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
            ))}

            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                Ikigai-Kern (Synthese)
              </label>
              <textarea
                value={ikigaiSynthesis}
                onChange={(e) => setIkigaiSynthesis(e.target.value)}
                placeholder="Mein Ikigai ist…"
                rows={3}
                style={{
                  width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px',
                  border: '1px solid rgba(134,59,255,0.3)', background: 'rgba(134,59,255,0.05)',
                  color: 'var(--text-primary)', fontSize: '0.875rem', resize: 'none',
                  boxSizing: 'border-box', lineHeight: 1.5, outline: 'none',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(134,59,255,0.3)')}
              />
            </div>

            {ikigaiError && (
              <div style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', background: '#FFF0EE', color: '#ef4444', fontSize: '0.85rem' }}>
                {ikigaiError}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={handleSaveIkigai}
                disabled={isSavingIkigai}
                style={{
                  flex: 1, padding: '0.7rem', borderRadius: '10px', border: 'none',
                  background: 'var(--accent)', color: '#fff', fontSize: '0.875rem',
                  fontWeight: 600, cursor: isSavingIkigai ? 'not-allowed' : 'pointer',
                  opacity: isSavingIkigai ? 0.7 : 1,
                }}
              >
                {ikigaiSaveSuccess ? 'Gespeichert ✓' : isSavingIkigai ? 'Speichert...' : 'Ikigai speichern'}
              </button>
              <InfoTooltip text="Speichert deine Ikigai-Antworten. Keine Daten werden gelöscht." />
            </div>
          </div>
        </SectionCard>

        {/* ── Sektion 3: KI-Profil ── */}
        <SectionCard title="🧠 Dein KI-Profil">
          {hasAiProfile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {aiProfile!.energyPatterns && (
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Energie-Muster</span>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginTop: '0.2rem', lineHeight: 1.5 }}>{aiProfile!.energyPatterns}</p>
                </div>
              )}
              {aiProfile!.focusPatterns && (
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fokus-Muster</span>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginTop: '0.2rem', lineHeight: 1.5 }}>{aiProfile!.focusPatterns}</p>
                </div>
              )}
              {aiProfile!.sabotagePatterns && (
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sabotage-Trigger</span>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginTop: '0.2rem', lineHeight: 1.5 }}>{aiProfile!.sabotagePatterns}</p>
                </div>
              )}
              {aiProfile!.generatedAt && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                  Zuletzt analysiert: {new Date(aiProfile!.generatedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </p>
              )}
              {analyzeError && (
                <p style={{ fontSize: '0.825rem', color: '#dc2626', margin: 0 }}>{analyzeError}</p>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <button
                  onClick={handleReanalyze}
                  disabled={isAnalyzing || recentEntries.length < 14}
                  style={{
                    padding: '0.6rem 1rem',
                    background: isAnalyzing || recentEntries.length < 14 ? 'var(--bg-secondary)' : 'var(--accent)',
                    color: isAnalyzing || recentEntries.length < 14 ? 'var(--text-muted)' : '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    cursor: isAnalyzing || recentEntries.length < 14 ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {isAnalyzing ? 'Analysiere…' : 'Jetzt neu analysieren'}
                </button>
                <InfoTooltip text="Lässt die KI deine letzten Journal-Einträge neu analysieren und dein Profil aktualisieren. Benötigt mindestens 14 Einträge." />
              </div>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 0.75rem' }}>
                {journalCount !== null && journalCount < 14
                  ? `Schreibe noch ${14 - journalCount} Journal-${14 - journalCount === 1 ? 'Eintrag' : 'Einträge'} — dann erkenne ich deine Muster.`
                  : 'Schreibe 14 Journal-Einträge — dann erkenne ich deine Muster.'}
              </p>
              {journalCount !== null && journalCount >= 14 && (
                <>
                  {analyzeError && (
                    <p style={{ fontSize: '0.825rem', color: '#dc2626', marginBottom: '0.5rem' }}>{analyzeError}</p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={handleReanalyze}
                      disabled={isAnalyzing}
                      style={{
                        padding: '0.6rem 1rem',
                        background: isAnalyzing ? 'var(--bg-secondary)' : 'var(--accent)',
                        color: isAnalyzing ? 'var(--text-muted)' : '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {isAnalyzing ? 'Analysiere…' : 'Muster jetzt analysieren'}
                    </button>
                    <InfoTooltip text="Lässt die KI deine Journal-Einträge analysieren und ein persönliches Muster-Profil erstellen." />
                  </div>
                </>
              )}
            </div>
          )}
        </SectionCard>

        {/* ── Sektion 4: Journal-Einstellungen ── */}
        <SectionCard title="Journal">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)', margin: '0 0 0.2rem' }}>
                Morgenmetriken
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Gewicht und Schlafscore im Morgenjournal erfassen
              </p>
            </div>
            <button
              onClick={toggleMetrics}
              style={{
                width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer', flexShrink: 0,
                background: metricsEnabled ? 'var(--accent)' : 'var(--border)',
                position: 'relative', transition: 'background 0.2s',
              }}
              aria-label="Morgenmetriken umschalten"
            >
              <span style={{
                position: 'absolute', top: '3px',
                left: metricsEnabled ? '23px' : '3px',
                width: '18px', height: '18px', borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s',
              }} />
            </button>
          </div>
        </SectionCard>

        {/* ── Sektion 5: Onboarding ── */}
        <SectionCard title="Onboarding">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.875rem', lineHeight: 1.5 }}>
            Starte das Onboarding erneut, um deine Werte und deinen Nordstern zu überarbeiten. Dein Name und deine E-Mail bleiben erhalten.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => setShowOnboardingModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={15} />
              Onboarding neu starten
            </button>
            <InfoTooltip text="Setzt deinen Onboarding-Status zurück. Dein Name und alle Journal-Einträge bleiben erhalten." />
          </div>
        </SectionCard>

        {/* ── Sektion 5: Gefahrenzone ── */}
        <div
          style={{
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '12px',
            padding: '1.25rem',
            marginBottom: '1rem',
          }}
        >
          <h2
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#ef4444',
              marginBottom: '0.5rem',
            }}
          >
            Gefahrenzone
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.4 }}>
            Diese Aktionen sind dauerhaft und können nicht rückgängig gemacht werden.
          </p>

          {deleteError && (
            <div style={{ padding: '0.6rem 0.875rem', borderRadius: '8px', background: '#FFF0EE', color: '#ef4444', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              {deleteError}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {/* Journal löschen */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => setShowDeleteJournalModal(true)}
                style={{
                  flex: 1,
                  padding: '0.7rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#f97316',
                  color: '#fff',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                Journal-Einträge löschen
                {journalCount !== null && (
                  <span style={{ fontWeight: 400, opacity: 0.85 }}> ({journalCount} Einträge)</span>
                )}
              </button>
              <InfoTooltip text="Löscht alle deine Morgen-, Abend- und Freeform-Einträge unwiderruflich. Ziele und Profil bleiben erhalten." />
            </div>

            {/* Ziele löschen */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => setShowDeleteGoalsModal(true)}
                style={{
                  flex: 1,
                  padding: '0.7rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#f97316',
                  color: '#fff',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                Ziele löschen
                {goalCount !== null && (
                  <span style={{ fontWeight: 400, opacity: 0.85 }}> ({goalCount} Ziele)</span>
                )}
              </button>
              <InfoTooltip text="Löscht alle deine Ziele unwiderruflich. Journal-Einträge und Profil bleiben erhalten." />
            </div>

            {/* Alle Daten löschen */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => setShowDeleteAllStep(1)}
                style={{
                  flex: 1,
                  padding: '0.85rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  textAlign: 'left',
                }}
              >
                <AlertTriangle size={16} />
                Alle Daten löschen &amp; neu starten
              </button>
              <InfoTooltip text="Löscht alle Einträge, Ziele, Coach-Sessions und setzt dein Profil zurück. Nur dein Name bleibt. Nicht rückgängig zu machen." />
            </div>
          </div>
        </div>

        {/* ── Sektion 6: Account ── */}
        <SectionCard title="Datenspeicher">
          <p style={{ margin: '0 0 0.6rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Deine Daten werden in Supabase gespeichert. Der kostenlose Plan bietet 500 MB Datenbank-Speicher. Mit normaler Nutzung reicht das für mehrere Jahre.
          </p>
          <a
            href="https://supabase.com/dashboard/project/oqmowbctjzoiwtgpoqmo/settings/billing"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '0.85rem', color: 'var(--accent)', textDecoration: 'none' }}
          >
            Speichernutzung im Supabase Dashboard prüfen →
          </a>
        </SectionCard>

        <SectionCard title="Account">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={handleSignOut}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              <LogOut size={15} />
              Abmelden
            </button>
            <InfoTooltip text="Meldet dich aus der App ab. Deine Daten bleiben gespeichert." />
          </div>
        </SectionCard>
      </div>

      {/* ─── Modals ─── */}
      <AnimatePresence>
        {/* Onboarding-Bestätigung */}
        {showOnboardingModal && (
          <ConfirmModal
            isOpen={true}
            title="Onboarding neu starten?"
            body="Dein Name und deine E-Mail bleiben erhalten. Alle anderen Daten (Nordstern, Werte, Stopp-Liste) können neu gesetzt werden."
            confirmLabel="Neu starten"
            confirmColor="var(--accent)"
            onConfirm={handleOnboardingRestart}
            onCancel={() => setShowOnboardingModal(false)}
            isLoading={isDeleting}
          />
        )}

        {/* Journal-Einträge löschen */}
        {showDeleteJournalModal && (
          <ConfirmModal
            isOpen={true}
            title="Journal-Einträge löschen?"
            body={
              <>
                Du hast <strong>{journalCount ?? '?'} Einträge</strong>. Alle werden dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
              </>
            }
            confirmLabel="Ja, endgültig löschen"
            onConfirm={handleDeleteJournal}
            onCancel={() => setShowDeleteJournalModal(false)}
            isLoading={isDeleting}
          />
        )}

        {/* Ziele löschen */}
        {showDeleteGoalsModal && (
          <ConfirmModal
            isOpen={true}
            title="Alle Ziele löschen?"
            body={
              <>
                Du hast <strong>{goalCount ?? '?'} Ziele</strong>. Alle werden dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
              </>
            }
            confirmLabel="Ja, endgültig löschen"
            onConfirm={handleDeleteGoals}
            onCancel={() => setShowDeleteGoalsModal(false)}
            isLoading={isDeleting}
          />
        )}

        {/* Alle Daten löschen — Stufe 1 */}
        {showDeleteAllStep === 1 && (
          <ConfirmModal
            isOpen={true}
            title="Alle Daten löschen?"
            body={
              <ul style={{ paddingLeft: '1.2rem', margin: 0, lineHeight: 1.8 }}>
                <li>Alle Journal-Einträge</li>
                <li>Alle Ziele</li>
                <li>Alle Coach-Sessions</li>
                <li>Alle Pattern-Events</li>
                <li>Nordstern, Werte, Stopp-Liste, KI-Profil</li>
              </ul>
            }
            confirmLabel="Weiter →"
            onConfirm={() => { setShowDeleteAllStep(2); setDeleteConfirmText('') }}
            onCancel={() => setShowDeleteAllStep(0)}
          />
        )}
      </AnimatePresence>

      {/* Alle Daten löschen — Stufe 2 (Texteingabe) */}
      {showDeleteAllStep === 2 && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 200,
            padding: '0 0 env(safe-area-inset-bottom)',
          }}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              background: 'var(--bg-card)',
              borderRadius: '16px 16px 0 0',
              padding: '1.5rem',
              width: '100%',
              maxWidth: '520px',
            }}
          >
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ef4444', marginBottom: '0.75rem' }}>
              Letzte Bestätigung
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
              Tippe <strong style={{ color: 'var(--text-primary)' }}>LÖSCHEN</strong> zur Bestätigung:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="LÖSCHEN"
              autoFocus
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '2px solid var(--border)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '1rem',
                marginBottom: '1rem',
                boxSizing: 'border-box',
                letterSpacing: '0.05em',
              }}
            />
            {deleteError && (
              <div style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', background: '#FFF0EE', color: '#ef4444', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                {deleteError}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => { setShowDeleteAllStep(0); setDeleteConfirmText('') }}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Abbrechen
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={deleteConfirmText !== 'LÖSCHEN' || isDeleting}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: deleteConfirmText === 'LÖSCHEN' ? '#ef4444' : 'var(--bg-secondary)',
                  color: deleteConfirmText === 'LÖSCHEN' ? '#fff' : 'var(--text-muted)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: deleteConfirmText === 'LÖSCHEN' && !isDeleting ? 'pointer' : 'not-allowed',
                  transition: 'background 0.2s',
                }}
              >
                {isDeleting ? 'Löscht...' : 'Endgültig löschen'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

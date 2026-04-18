import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, LogOut, RefreshCw, AlertTriangle, Info, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { updateProfile, countJournalEntries, countGoals, deleteAllJournalEntries, deleteAllGoals, deleteAllUserData } from '../lib/db'
import { generatePatternAnalysis } from '../lib/claude'
import { useStore } from '../store/useStore'

// ─── Hilfs-Komponenten ────────────────────────────────────────────────────────

function InfoTooltip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
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
        <div style={{
          position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
          marginBottom: '6px', background: 'var(--bg-primary, #1a1a2e)', color: 'var(--text-primary)',
          fontSize: '0.72rem', lineHeight: 1.45, padding: '0.5rem 0.7rem', borderRadius: '8px',
          width: '220px', boxShadow: '0 2px 10px rgba(0,0,0,0.3)', zIndex: 50, pointerEvents: 'none', whiteSpace: 'normal',
        }}>
          {text}
        </div>
      )}
    </div>
  )
}

function CollapsibleSection({
  title,
  isOpen,
  onToggle,
  dangerStyle,
  children,
}: {
  title: string
  isOpen: boolean
  onToggle: () => void
  dangerStyle?: boolean
  children: React.ReactNode
}) {
  return (
    <div style={{
      background: dangerStyle ? 'rgba(239,68,68,0.04)' : 'var(--bg-card)',
      border: `1px solid ${dangerStyle ? 'rgba(239,68,68,0.35)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-card)',
      marginBottom: '0.65rem',
      overflow: 'hidden',
      boxShadow: dangerStyle ? 'none' : 'var(--shadow-card)',
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.9rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer',
          gap: '0.75rem',
        }}
      >
        <span style={{
          fontSize: '0.92rem', fontWeight: 600,
          color: dangerStyle ? '#ef4444' : 'var(--text-primary)',
          textAlign: 'left',
        }}>
          {title}
        </span>
        <div style={{
          width: '24px', height: '24px', borderRadius: '6px',
          background: dangerStyle ? 'rgba(239,68,68,0.1)' : 'var(--bg-secondary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <ChevronDown
            size={14}
            color={dangerStyle ? '#ef4444' : 'var(--text-muted)'}
            style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          />
        </div>
      </button>
      {isOpen && (
        <div style={{ padding: '0 1.25rem 1.25rem', borderTop: `1px solid ${dangerStyle ? 'rgba(239,68,68,0.15)' : 'var(--border)'}` }}>
          <div style={{ paddingTop: '1rem' }}>
            {children}
          </div>
        </div>
      )}
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
  isOpen, title, body, confirmLabel, confirmColor = '#ef4444',
  onConfirm, onCancel, isLoading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200, padding: '0 0 env(safe-area-inset-bottom)' }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--bg-card)', borderRadius: '16px 16px 0 0', padding: '1.5rem', width: '100%', maxWidth: '520px' }}
      >
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>{title}</h3>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>{body}</div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', fontSize: '0.875rem', cursor: 'pointer' }}>
            Abbrechen
          </button>
          <button onClick={onConfirm} disabled={isLoading} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: 'none', background: confirmColor, color: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1 }}>
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

  // Profil-Felder
  const [name, setName] = useState(profile?.name ?? '')
  const [email, setEmail] = useState('')
  const [identityStatement, setIdentityStatement] = useState(profile?.identity_statement ?? '')
  const [values, setValues] = useState<string[]>(profile?.values ?? [])
  const [stopList, setStopList] = useState<string[]>(profile?.stop_list ?? [])
  const [newValue, setNewValue] = useState('')
  const [newStopItem, setNewStopItem] = useState('')

  // Speicher-State (sektionsbasiert)
  const [savingSection, setSavingSection] = useState<string | null>(null)
  const [savedSection, setSavedSection] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Counts für Lösch-Modals
  const [journalCount, setJournalCount] = useState<number | null>(null)
  const [goalCount, setGoalCount] = useState<number | null>(null)

  // Journal-Einstellungen
  const [metricsEnabled, setMetricsEnabled] = useState(
    () => localStorage.getItem('metrics_enabled') !== 'false'
  )

  // Vision inline edit
  const [editingVision, setEditingVision] = useState(false)
  const [visionDraft, setVisionDraft] = useState('')
  const [visionSaving, setVisionSaving] = useState(false)

  async function saveVision() {
    if (!user) return
    setVisionSaving(true)
    try {
      const updated = await updateProfile(user.id, { north_star: visionDraft.trim() || null })
      setProfile({ ...profile!, north_star: updated.north_star })
      setEditingVision(false)
    } catch (err) {
      console.error('Vision speichern:', err)
    } finally {
      setVisionSaving(false)
    }
  }

  // Modals
  const [showOnboardingModal, setShowOnboardingModal] = useState(false)
  const [showDeleteJournalModal, setShowDeleteJournalModal] = useState(false)
  const [showDeleteGoalsModal, setShowDeleteGoalsModal] = useState(false)
  const [showDeleteAllStep, setShowDeleteAllStep] = useState<0 | 1 | 2>(0)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Eingeklappte Sektionen — nur "profil" ist standardmäßig offen
  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set(['profil']))

  function toggleSection(key: string) {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Ikigai-State
  const ikigaiRaw = profile?.ikigai as Record<string, string> | null
  const [ikigaiLoves, setIkigaiLoves] = useState(ikigaiRaw?.loves ?? '')
  const [ikigaiGoodAt, setIkigaiGoodAt] = useState(ikigaiRaw?.good_at ?? '')
  const [ikigaiPaidFor, setIkigaiPaidFor] = useState(ikigaiRaw?.paid_for ?? '')
  const [ikigaiWorldNeeds, setIkigaiWorldNeeds] = useState(ikigaiRaw?.world_needs ?? '')
  const [ikigaiSynthesis, setIkigaiSynthesis] = useState(ikigaiRaw?.synthesis ?? '')
  const [isSavingIkigai, setIsSavingIkigai] = useState(false)
  const [ikigaiSaveSuccess, setIkigaiSaveSuccess] = useState(false)
  const [ikigaiError, setIkigaiError] = useState<string | null>(null)

  // KI-Profil
  const aiProfile = profile?.ai_profile as Record<string, string> | null
  const hasAiProfile = aiProfile && aiProfile.energyPatterns
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? '')
    })
    if (user) {
      countJournalEntries(user.id).then(setJournalCount).catch(() => {})
      countGoals(user.id).then(setGoalCount).catch(() => {})
    }
  }, [user])

  useEffect(() => {
    setName(profile?.name ?? '')
    setIdentityStatement(profile?.identity_statement ?? '')
    setValues(profile?.values ?? [])
    setStopList(profile?.stop_list ?? [])
  }, [profile])

  // ─── Allgemeine Speicherfunktion ───────────────────────────────────────────

  async function saveSection(section: string, data: Parameters<typeof updateProfile>[1]) {
    if (!user) return
    setSavingSection(section)
    setSavedSection(null)
    setSaveError(null)
    try {
      const updated = await updateProfile(user.id, data)
      setProfile(updated)
      setSavedSection(section)
      setTimeout(() => setSavedSection(null), 2500)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Fehler beim Speichern.')
    } finally {
      setSavingSection(null)
    }
  }

  function saveBtnLabel(section: string, idle: string) {
    if (savingSection === section) return 'Speichert...'
    if (savedSection === section) return 'Gespeichert ✓'
    return idle
  }

  // ─── Ikigai speichern ──────────────────────────────────────────────────────

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

  // ─── Onboarding-Neustart ───────────────────────────────────────────────────

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

  // ─── Lösch-Handler ────────────────────────────────────────────────────────

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
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      setProfile(data)
      navigate('/onboarding')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Fehler beim Löschen.')
      setIsDeleting(false)
    }
  }

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

  function toggleMetrics() {
    const next = !metricsEnabled
    setMetricsEnabled(next)
    localStorage.setItem('metrics_enabled', String(next))
  }

  function addValue() {
    const v = newValue.trim()
    if (v && !values.includes(v)) { setValues([...values, v]); setNewValue('') }
  }

  function addStopItem() {
    const v = newStopItem.trim()
    if (v) { setStopList([...stopList, v]); setNewStopItem('') }
  }

  // ─── Styles ───────────────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.65rem 0.875rem', borderRadius: '8px',
    border: '1px solid var(--border)', background: 'var(--bg-primary)',
    color: 'var(--text-primary)', fontSize: '0.9rem', boxSizing: 'border-box',
  }

  const textareaStyle: React.CSSProperties = {
    ...inputStyle, resize: 'vertical', lineHeight: 1.5, outline: 'none',
  }

  const saveBtn = (section: string, _onClick: () => void, disabled?: boolean): React.CSSProperties => ({
    flex: 1, padding: '0.7rem', borderRadius: '10px', border: 'none',
    background: savedSection === section ? '#16a34a' : 'var(--accent)',
    color: '#fff', fontSize: '0.875rem', fontWeight: 600,
    cursor: (disabled || savingSection === section) ? 'not-allowed' : 'pointer',
    opacity: (disabled || savingSection === section) ? 0.7 : 1,
    transition: 'background 0.2s',
  })

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: '640px', paddingBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'Lora, serif', fontSize: 'clamp(1.4rem, 3vw, 1.75rem)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
          Einstellungen
        </h1>

        {saveError && (
          <div style={{ padding: '0.6rem 0.875rem', borderRadius: '8px', background: '#FFF0EE', color: '#ef4444', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
            {saveError}
          </div>
        )}

        {/* ── 1. Mein Profil ── */}
        <CollapsibleSection title="Mein Profil" isOpen={openSections.has('profil')} onToggle={() => toggleSection('profil')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>E-Mail</label>
              <div style={{ padding: '0.65rem 0.875rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                {email || '—'}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button onClick={() => saveSection('profil', { name: name.trim() || null })} disabled={savingSection === 'profil'} style={saveBtn('profil', () => {})}>
                {saveBtnLabel('profil', 'Speichern')}
              </button>
            </div>
          </div>
        </CollapsibleSection>

        {/* ── 2. Vision & Identität ── */}
        <CollapsibleSection title="Vision & Identität" isOpen={openSections.has('vision')} onToggle={() => toggleSection('vision')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Vision */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Meine Vision
                </span>
                {!editingVision && (
                  <button
                    onClick={() => { setVisionDraft(profile?.north_star ?? ''); setEditingVision(true) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--accent)', fontFamily: 'DM Sans, sans-serif', padding: 0 }}
                  >
                    Bearbeiten →
                  </button>
                )}
              </div>
              {editingVision ? (
                <div>
                  <textarea
                    value={visionDraft}
                    onChange={(e) => setVisionDraft(e.target.value)}
                    rows={4}
                    autoFocus
                    placeholder="Meine Vision ist…"
                    style={{ width: '100%', padding: '0.85rem 1rem', border: '1.5px solid var(--accent)', borderRadius: '10px', fontSize: '0.95rem', fontFamily: 'DM Sans, sans-serif', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.5, marginBottom: '0.75rem' }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => setEditingVision(false)}
                      style={{ padding: '0.6rem 1rem', background: 'none', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', color: 'var(--text-secondary)' }}
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={saveVision}
                      disabled={visionSaving}
                      style={{ flex: 1, padding: '0.6rem 1rem', background: visionSaving ? 'var(--text-muted)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', cursor: visionSaving ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}
                    >
                      {visionSaving ? 'Wird gespeichert…' : 'Speichern'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: '0.85rem 1rem',
                  background: profile?.north_star
                    ? 'color-mix(in srgb, var(--accent) 6%, var(--bg-card))'
                    : 'var(--bg-secondary)',
                  border: `1px solid ${profile?.north_star ? 'color-mix(in srgb, var(--accent) 20%, var(--border))' : 'var(--border)'}`,
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  color: profile?.north_star ? 'var(--text-primary)' : 'var(--text-muted)',
                  lineHeight: 1.6,
                  fontStyle: profile?.north_star ? 'normal' : 'italic',
                }}>
                  {profile?.north_star ?? 'Noch keine Vision definiert.'}
                </div>
              )}
            </div>

            {/* Identitätssatz (editierbar) */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                Identitätssatz
              </label>
              <textarea
                value={identityStatement}
                onChange={(e) => setIdentityStatement(e.target.value)}
                rows={3}
                placeholder="Ich bin jemand der…"
                style={textareaStyle}
                onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button
                  onClick={() => saveSection('identity', { identity_statement: identityStatement.trim() || null })}
                  disabled={savingSection === 'identity'}
                  style={saveBtn('identity', () => {})}
                >
                  {saveBtnLabel('identity', 'Speichern')}
                </button>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* ── 3. Werte ── */}
        <CollapsibleSection title="Werte" isOpen={openSections.has('werte')} onToggle={() => toggleSection('werte')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {values.map((v) => (
                <span key={v} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.65rem', borderRadius: '999px', background: 'rgba(134,59,255,0.15)', color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 500 }}>
                  {v}
                  <button onClick={() => setValues(values.filter((x) => x !== v))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--accent)', display: 'flex' }}>
                    <X size={12} />
                  </button>
                </span>
              ))}
              {values.length === 0 && (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Noch keine Werte eingetragen.</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Wert hinzufügen..."
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addValue()}
                style={{ flex: 1, padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              />
              <button onClick={addValue} style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <Plus size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button onClick={() => saveSection('werte', { values })} disabled={savingSection === 'werte'} style={saveBtn('werte', () => {})}>
                {saveBtnLabel('werte', 'Speichern')}
              </button>
              <InfoTooltip text="Speichert deine Werte-Liste." />
            </div>
          </div>
        </CollapsibleSection>

        {/* ── 4. Stopp-Liste ── */}
        <CollapsibleSection title="Stopp-Liste" isOpen={openSections.has('stopp')} onToggle={() => toggleSection('stopp')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {stopList.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-primary)' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{item}</span>
                  <button onClick={() => setStopList(stopList.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                    <X size={14} />
                  </button>
                </div>
              ))}
              {stopList.length === 0 && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Noch keine Einträge.</p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Eintrag hinzufügen..."
                value={newStopItem}
                onChange={(e) => setNewStopItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addStopItem()}
                style={{ flex: 1, padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              />
              <button onClick={addStopItem} style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <Plus size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button onClick={() => saveSection('stopp', { stop_list: stopList })} disabled={savingSection === 'stopp'} style={saveBtn('stopp', () => {})}>
                {saveBtnLabel('stopp', 'Speichern')}
              </button>
              <InfoTooltip text="Speichert deine Stopp-Liste." />
            </div>
          </div>
        </CollapsibleSection>

        {/* ── 5. Ikigai ── */}
        <CollapsibleSection title="Ikigai" isOpen={openSections.has('ikigai')} onToggle={() => toggleSection('ikigai')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {[
              { label: 'Was liebst du zu tun?', value: ikigaiLoves, setter: setIkigaiLoves, placeholder: 'Ich liebe es zu…' },
              { label: 'Worin bist du gut?', value: ikigaiGoodAt, setter: setIkigaiGoodAt, placeholder: 'Ich bin besonders gut in…' },
              { label: 'Wofür würden Menschen dir zahlen?', value: ikigaiPaidFor, setter: setIkigaiPaidFor, placeholder: 'Menschen zahlen mir für…' },
              { label: 'Was braucht die Welt?', value: ikigaiWorldNeeds, setter: setIkigaiWorldNeeds, placeholder: 'Die Welt braucht…' },
            ].map(({ label, value, setter, placeholder }) => (
              <div key={label}>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>{label}</label>
                <textarea
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  placeholder={placeholder}
                  rows={2}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.875rem', resize: 'none', boxSizing: 'border-box', lineHeight: 1.5, outline: 'none' }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
            ))}
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Ikigai-Kern (Synthese)</label>
              <textarea
                value={ikigaiSynthesis}
                onChange={(e) => setIkigaiSynthesis(e.target.value)}
                placeholder="Mein Ikigai ist…"
                rows={3}
                style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(134,59,255,0.3)', background: 'rgba(134,59,255,0.05)', color: 'var(--text-primary)', fontSize: '0.875rem', resize: 'none', boxSizing: 'border-box', lineHeight: 1.5, outline: 'none' }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(134,59,255,0.3)')}
              />
            </div>
            {ikigaiError && (
              <div style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', background: '#FFF0EE', color: '#ef4444', fontSize: '0.85rem' }}>{ikigaiError}</div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button onClick={handleSaveIkigai} disabled={isSavingIkigai} style={{ flex: 1, padding: '0.7rem', borderRadius: '10px', border: 'none', background: ikigaiSaveSuccess ? '#16a34a' : 'var(--accent)', color: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: isSavingIkigai ? 'not-allowed' : 'pointer', opacity: isSavingIkigai ? 0.7 : 1 }}>
                {ikigaiSaveSuccess ? 'Gespeichert ✓' : isSavingIkigai ? 'Speichert...' : 'Ikigai speichern'}
              </button>
              <InfoTooltip text="Speichert deine Ikigai-Antworten. Keine Daten werden gelöscht." />
            </div>
          </div>
        </CollapsibleSection>

        {/* ── 6. KI-Profil ── */}
        <CollapsibleSection title="🧠 Dein KI-Profil" isOpen={openSections.has('kiprofil')} onToggle={() => toggleSection('kiprofil')}>
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
              {analyzeError && <p style={{ fontSize: '0.825rem', color: '#dc2626', margin: 0 }}>{analyzeError}</p>}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <button
                  onClick={handleReanalyze}
                  disabled={isAnalyzing || recentEntries.length < 14}
                  style={{ padding: '0.6rem 1rem', background: isAnalyzing || recentEntries.length < 14 ? 'var(--bg-secondary)' : 'var(--accent)', color: isAnalyzing || recentEntries.length < 14 ? 'var(--text-muted)' : '#fff', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 500, cursor: isAnalyzing || recentEntries.length < 14 ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                >
                  {isAnalyzing ? 'Analysiere…' : 'Jetzt neu analysieren'}
                </button>
                <InfoTooltip text="Lässt die KI deine letzten Journal-Einträge neu analysieren. Benötigt mindestens 14 Einträge." />
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
                  {analyzeError && <p style={{ fontSize: '0.825rem', color: '#dc2626', marginBottom: '0.5rem' }}>{analyzeError}</p>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button onClick={handleReanalyze} disabled={isAnalyzing} style={{ padding: '0.6rem 1rem', background: isAnalyzing ? 'var(--bg-secondary)' : 'var(--accent)', color: isAnalyzing ? 'var(--text-muted)' : '#fff', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 500, cursor: isAnalyzing ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                      {isAnalyzing ? 'Analysiere…' : 'Muster jetzt analysieren'}
                    </button>
                    <InfoTooltip text="Lässt die KI deine Journal-Einträge analysieren und ein persönliches Muster-Profil erstellen." />
                  </div>
                </>
              )}
            </div>
          )}
        </CollapsibleSection>

        {/* ── 7. Habits & Journal ── */}
        <CollapsibleSection title="Habits & Journal" isOpen={openSections.has('journal')} onToggle={() => toggleSection('journal')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)', margin: '0 0 0.2rem' }}>Morgenmetriken</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Gewicht und Schlafscore im Morgenjournal erfassen</p>
            </div>
            <button
              onClick={toggleMetrics}
              style={{ width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer', flexShrink: 0, background: metricsEnabled ? 'var(--accent)' : 'var(--border)', position: 'relative', transition: 'background 0.2s' }}
              aria-label="Morgenmetriken umschalten"
            >
              <span style={{ position: 'absolute', top: '3px', left: metricsEnabled ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
            </button>
          </div>
        </CollapsibleSection>

        {/* ── 8. Profil einrichten ── */}
        <CollapsibleSection title="Profil einrichten" isOpen={openSections.has('setup')} onToggle={() => toggleSection('setup')}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.875rem', lineHeight: 1.5 }}>
            Starte den Einrichtungs-Assistenten erneut, um Vision, Werte und Identität geführt neu zu setzen. Journal-Einträge und Ziele bleiben erhalten.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => setShowOnboardingModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', fontSize: '0.875rem', cursor: 'pointer' }}
            >
              <RefreshCw size={15} />
              Profil-Einrichtung neu starten
            </button>
            <InfoTooltip text="Startet den Einrichtungs-Assistenten neu. Alle Journal-Einträge und Ziele bleiben unberührt." />
          </div>
        </CollapsibleSection>

        {/* ── 9. Gefahrenzone — visuell abgesetzt ── */}
        <div style={{ margin: '1.25rem 0 0.65rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(239,68,68,0.2)' }} />
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(239,68,68,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Gefahrenzone</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(239,68,68,0.2)' }} />
        </div>
        <CollapsibleSection title="Gefahrenzone" isOpen={openSections.has('danger')} onToggle={() => toggleSection('danger')} dangerStyle>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.4 }}>
            Diese Aktionen sind dauerhaft und können nicht rückgängig gemacht werden.
          </p>
          {deleteError && (
            <div style={{ padding: '0.6rem 0.875rem', borderRadius: '8px', background: '#FFF0EE', color: '#ef4444', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              {deleteError}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button onClick={() => setShowDeleteJournalModal(true)} style={{ flex: 1, padding: '0.7rem 1rem', borderRadius: '8px', border: 'none', background: '#f97316', color: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
                Journal-Einträge löschen
                {journalCount !== null && <span style={{ fontWeight: 400, opacity: 0.85 }}> ({journalCount} Einträge)</span>}
              </button>
              <InfoTooltip text="Löscht alle deine Morgen-, Abend- und Freeform-Einträge unwiderruflich. Ziele und Profil bleiben erhalten." />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button onClick={() => setShowDeleteGoalsModal(true)} style={{ flex: 1, padding: '0.7rem 1rem', borderRadius: '8px', border: 'none', background: '#f97316', color: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
                Ziele löschen
                {goalCount !== null && <span style={{ fontWeight: 400, opacity: 0.85 }}> ({goalCount} Ziele)</span>}
              </button>
              <InfoTooltip text="Löscht alle deine Ziele unwiderruflich. Journal-Einträge und Profil bleiben erhalten." />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button onClick={() => setShowDeleteAllStep(1)} style={{ flex: 1, padding: '0.85rem 1rem', borderRadius: '8px', border: 'none', background: '#ef4444', color: '#fff', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', textAlign: 'left' }}>
                <AlertTriangle size={16} />
                Alle Daten löschen &amp; neu starten
              </button>
              <InfoTooltip text="Löscht alle Einträge, Ziele, Coach-Sessions und setzt dein Profil zurück. Nicht rückgängig zu machen." />
            </div>
          </div>
        </CollapsibleSection>

        {/* ── 10. Datenspeicher ── */}
        <CollapsibleSection title="Datenspeicher" isOpen={openSections.has('data')} onToggle={() => toggleSection('data')}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Deine Daten werden in Supabase gespeichert. Der kostenlose Plan bietet 500 MB Datenbank-Speicher. Mit normaler Nutzung reicht das für mehrere Jahre.
          </p>
        </CollapsibleSection>

        {/* ── 11. Account ── */}
        <CollapsibleSection title="Account" isOpen={openSections.has('account')} onToggle={() => toggleSection('account')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={async () => { await supabase.auth.signOut(); navigate('/login') }}
              style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', fontSize: '0.875rem', cursor: 'pointer' }}
            >
              <LogOut size={15} />
              Abmelden
            </button>
            <InfoTooltip text="Meldet dich aus der App ab. Deine Daten bleiben gespeichert." />
          </div>
        </CollapsibleSection>

      {/* ─── Modals ─── */}
      <AnimatePresence>
        {showOnboardingModal && (
          <ConfirmModal
            isOpen={true}
            title="Profil-Einrichtung neu starten?"
            body="Der Einrichtungs-Assistent wird neu gestartet. Alle Journal-Einträge, Ziele und Habits bleiben vollständig erhalten."
            confirmLabel="Neu starten"
            confirmColor="var(--accent)"
            onConfirm={handleOnboardingRestart}
            onCancel={() => setShowOnboardingModal(false)}
            isLoading={isDeleting}
          />
        )}
        {showDeleteJournalModal && (
          <ConfirmModal
            isOpen={true}
            title="Journal-Einträge löschen?"
            body={<>Du hast <strong>{journalCount ?? '?'} Einträge</strong>. Alle werden dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.</>}
            confirmLabel="Ja, endgültig löschen"
            onConfirm={handleDeleteJournal}
            onCancel={() => setShowDeleteJournalModal(false)}
            isLoading={isDeleting}
          />
        )}
        {showDeleteGoalsModal && (
          <ConfirmModal
            isOpen={true}
            title="Alle Ziele löschen?"
            body={<>Du hast <strong>{goalCount ?? '?'} Ziele</strong>. Alle werden dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.</>}
            confirmLabel="Ja, endgültig löschen"
            onConfirm={handleDeleteGoals}
            onCancel={() => setShowDeleteGoalsModal(false)}
            isLoading={isDeleting}
          />
        )}
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
                <li>Vision, Werte, Stopp-Liste, KI-Profil</li>
              </ul>
            }
            confirmLabel="Weiter →"
            onConfirm={() => { setShowDeleteAllStep(2); setDeleteConfirmText('') }}
            onCancel={() => setShowDeleteAllStep(0)}
          />
        )}
      </AnimatePresence>

      {/* Alle Daten löschen — Stufe 2 */}
      {showDeleteAllStep === 2 && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200, padding: '0 0 env(safe-area-inset-bottom)' }}>
          <motion.div
            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{ background: 'var(--bg-card)', borderRadius: '16px 16px 0 0', padding: '1.5rem', width: '100%', maxWidth: '520px' }}
          >
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ef4444', marginBottom: '0.75rem' }}>Letzte Bestätigung</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
              Tippe <strong style={{ color: 'var(--text-primary)' }}>LÖSCHEN</strong> zur Bestätigung:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="LÖSCHEN"
              autoFocus
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '2px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '1rem', marginBottom: '1rem', boxSizing: 'border-box', letterSpacing: '0.05em' }}
            />
            {deleteError && (
              <div style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', background: '#FFF0EE', color: '#ef4444', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{deleteError}</div>
            )}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => { setShowDeleteAllStep(0); setDeleteConfirmText('') }} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', fontSize: '0.875rem', cursor: 'pointer' }}>
                Abbrechen
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={deleteConfirmText !== 'LÖSCHEN' || isDeleting}
                style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: 'none', background: '#ef4444', color: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: deleteConfirmText !== 'LÖSCHEN' || isDeleting ? 'not-allowed' : 'pointer', opacity: deleteConfirmText !== 'LÖSCHEN' || isDeleting ? 0.5 : 1 }}
              >
                {isDeleting ? 'Löscht...' : 'Jetzt alles löschen'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import MorningJournal from '../components/journal/MorningJournal'
import EveningJournal from '../components/journal/EveningJournal'
import FreeformJournal from '../components/journal/FreeformJournal'
import JournalDay from '../components/journal/JournalDay'
import JournalWeek from '../components/journal/JournalWeek'
import JournalMonth from '../components/journal/JournalMonth'
import JournalQuarter from '../components/journal/JournalQuarter'
import JournalYear from '../components/journal/JournalYear'

type JournalTab = 'tag' | 'woche' | 'monat' | 'quartal' | 'jahr'

const TABS: { id: JournalTab; label: string }[] = [
  { id: 'tag', label: 'Tag' },
  { id: 'woche', label: 'Woche' },
  { id: 'monat', label: 'Monat' },
  { id: 'quartal', label: 'Quartal' },
  { id: 'jahr', label: 'Jahr' },
]


export default function Journal() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  // Legacy-Unterstützung: ?type=morning / evening / freeform
  const legacyType = searchParams.get('type')

  const tabParam = searchParams.get('tab') as JournalTab | null
  const dateParam = searchParams.get('date') ?? undefined
  const [activeTab, setActiveTab] = useState<JournalTab>(() => {
    if (tabParam) return tabParam
    const saved = localStorage.getItem('life_os_journal_tab') as JournalTab | null
    return saved ?? 'tag'
  })

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam)
    }
  }, [tabParam]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleTabChange(tab: JournalTab) {
    setActiveTab(tab)
    setSearchParams({ tab })
    localStorage.setItem('life_os_journal_tab', tab)
  }

  // Legacy-Flow für bestehende Links von Dashboard
  if (legacyType) {
    return (
      <div>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '0.875rem',
            padding: '0 0 1.25rem',
          }}
        >
          <ArrowLeft size={16} />
          Zurück
        </button>
        {legacyType === 'morning' && <MorningJournal />}
        {legacyType === 'evening' && <EveningJournal />}
        {legacyType === 'freeform' && <FreeformJournal />}
      </div>
    )
  }

  return (
    <div style={{ paddingTop: '0.25rem' }}>
      {/* Tab-Leiste — Pill Style */}
      <div
        style={{
          display: 'flex',
          gap: '0.25rem',
          background: 'var(--bg-secondary)',
          borderRadius: '12px',
          padding: '0.3rem',
          marginBottom: '1.5rem',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            style={{
              flex: 1,
              background: activeTab === tab.id ? 'var(--bg-card)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem 0.75rem',
              fontSize: '0.875rem',
              fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
              borderRadius: '9px',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
              fontFamily: 'DM Sans, sans-serif',
              boxShadow: activeTab === tab.id ? 'var(--shadow-card)' : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab-Inhalte */}
      {activeTab === 'tag' && <JournalDay initialDate={dateParam} />}
      {activeTab === 'woche' && <JournalWeek />}
      {activeTab === 'monat' && <JournalMonth />}
      {activeTab === 'quartal' && <JournalQuarter />}
      {activeTab === 'jahr' && <JournalYear />}
    </div>
  )
}

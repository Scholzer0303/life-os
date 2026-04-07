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
  const [activeTab, setActiveTab] = useState<JournalTab>(tabParam ?? 'tag')

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam)
    }
  }, [tabParam]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleTabChange(tab: JournalTab) {
    setActiveTab(tab)
    setSearchParams({ tab })
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
      {/* Tab-Leiste */}
      <div
        style={{
          display: 'flex',
          gap: '0.25rem',
          borderBottom: '1px solid var(--border)',
          marginBottom: '1.25rem',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.6rem 1rem',
              fontSize: '0.875rem',
              fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: '-1px',
              whiteSpace: 'nowrap',
              transition: 'color 0.15s',
              fontFamily: 'DM Sans, sans-serif',
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

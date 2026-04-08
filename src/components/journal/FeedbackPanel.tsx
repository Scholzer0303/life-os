import ReactMarkdown from 'react-markdown'
import { Loader } from 'lucide-react'

const mdComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p style={{ margin: '0 0 0.3rem', fontSize: '0.875rem', lineHeight: 1.55, color: 'var(--text-primary)' }}>{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul style={{ margin: '0.2rem 0 0.3rem', paddingLeft: '1.1rem' }}>{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol style={{ margin: '0.2rem 0 0.3rem', paddingLeft: '1.1rem' }}>{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li style={{ fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '0.1rem', color: 'var(--text-primary)' }}>{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong style={{ fontWeight: 600 }}>{children}</strong>
  ),
}

export interface FollowupEntry {
  question: string
  answer: string
}

interface FeedbackPanelProps {
  loading: boolean
  error: string | null
  text: string | null
  showFollowup: boolean
  followupInput: string
  followupHistory: FollowupEntry[]
  followupLoading: boolean
  onNewFeedback: () => void
  onToggleFollowup: () => void
  onFollowupChange: (val: string) => void
  onFollowupSubmit: () => void
}

export default function FeedbackPanel({
  loading, error, text,
  showFollowup, followupInput, followupHistory, followupLoading,
  onNewFeedback, onToggleFollowup, onFollowupChange, onFollowupSubmit,
}: FeedbackPanelProps) {
  return (
    <div style={{
      marginTop: '0.5rem',
      padding: '0.6rem 0.7rem',
      background: 'color-mix(in srgb, var(--accent) 8%, var(--bg-primary))',
      borderRadius: '6px',
      border: '1px solid color-mix(in srgb, var(--accent) 20%, var(--border))',
    }}>
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          <Loader size={13} style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
          KI analysiert…
        </div>
      )}
      {error && <p style={{ fontSize: '0.85rem', color: '#ef4444', margin: 0 }}>{error}</p>}
      {text && !loading && (
        <div>
          {/* Markdown-gerenderte Hauptantwort */}
          <ReactMarkdown components={mdComponents}>{text}</ReactMarkdown>

          {/* Bisheriger Rückfrage-Verlauf */}
          {followupHistory.length > 0 && (
            <div style={{ marginTop: '0.5rem', borderTop: '1px solid color-mix(in srgb, var(--accent) 20%, var(--border))', paddingTop: '0.5rem' }}>
              {followupHistory.map((entry, i) => (
                <div key={i} style={{ marginBottom: '0.5rem' }}>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 0.2rem', fontStyle: 'italic' }}>
                    Du: {entry.question}
                  </p>
                  <ReactMarkdown components={mdComponents}>{entry.answer}</ReactMarkdown>
                </div>
              ))}
            </div>
          )}

          {/* Rückfrage-Eingabe */}
          {showFollowup && (
            <div style={{ marginTop: '0.6rem', borderTop: followupHistory.length === 0 ? '1px solid color-mix(in srgb, var(--accent) 20%, var(--border))' : 'none', paddingTop: followupHistory.length === 0 ? '0.6rem' : '0' }}>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <input
                  value={followupInput}
                  onChange={(e) => onFollowupChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onFollowupSubmit()}
                  placeholder="Rückfrage stellen…"
                  disabled={followupLoading}
                  style={{
                    flex: 1, padding: '0.4rem 0.6rem', borderRadius: '6px',
                    border: '1px solid var(--border)', background: 'var(--bg-primary)',
                    color: 'var(--text-primary)', fontSize: '0.82rem', outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
                <button
                  onClick={onFollowupSubmit}
                  disabled={followupLoading || !followupInput.trim()}
                  style={{
                    padding: '0.4rem 0.7rem', background: 'var(--accent)', color: '#fff',
                    border: 'none', borderRadius: '6px', fontSize: '0.85rem',
                    cursor: followupLoading || !followupInput.trim() ? 'not-allowed' : 'pointer',
                    opacity: followupLoading || !followupInput.trim() ? 0.6 : 1,
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  {followupLoading
                    ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />
                    : '→'}
                </button>
              </div>
            </div>
          )}

          {/* Aktions-Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              onClick={onNewFeedback}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-muted)', padding: 0, fontFamily: 'inherit' }}
            >
              Neues Feedback
            </button>
            <button
              onClick={onToggleFollowup}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: showFollowup ? 'var(--accent)' : 'var(--text-muted)', padding: 0, fontFamily: 'inherit' }}
            >
              Rückfrage
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

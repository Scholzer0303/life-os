import type { ReactNode } from 'react'
import Navigation from './Navigation'

interface AppLayoutProps {
  children: ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div
      style={{
        height: '100dvh',
        overflow: 'hidden',
        background: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          maxWidth: '640px',
          width: '100%',
          margin: '0 auto',
          padding: '1.5rem 1.25rem 0',
          paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))',
          boxSizing: 'border-box',
        }}
      >
        {children}
      </main>
      <Navigation />
    </div>
  )
}

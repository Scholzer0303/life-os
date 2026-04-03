import type { ReactNode } from 'react'
import Navigation from './Navigation'

interface AppLayoutProps {
  children: ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div
      style={{
        minHeight: '100svh',
        background: 'var(--bg-primary)',
        paddingBottom: '5rem', // space for bottom nav
      }}
    >
      <main style={{ maxWidth: '640px', margin: '0 auto', padding: '1.5rem 1.25rem 0' }}>
        {children}
      </main>
      <Navigation />
    </div>
  )
}

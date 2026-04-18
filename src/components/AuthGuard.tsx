import { useState } from 'react'
import type { ReactNode } from 'react'
import { useStore } from '../store/useStore'
import Login from '../pages/Login'
import PinSetup from './auth/PinSetup'
import PinEntry from './auth/PinEntry'
import { getPinHash } from '../lib/pin'

interface AuthGuardProps {
  children: ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { session, isLoading } = useStore()
  const [pinState, setPinState] = useState<'setup' | 'locked' | 'unlocked'>(() => {
    if (typeof window === 'undefined') return 'unlocked'
    return getPinHash() ? 'locked' : 'setup'
  })

  if (isLoading) {
    return (
      <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid var(--border)', borderTop: '3px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!session) {
    return <Login />
  }

  if (pinState === 'setup') {
    return <PinSetup onDone={() => setPinState('unlocked')} />
  }

  if (pinState === 'locked') {
    return <PinEntry onUnlock={() => setPinState('unlocked')} />
  }

  return <>{children}</>
}

import { NavLink } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Target, MessageCircle, RotateCcw, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const NAV_ITEMS: { to: string; icon: LucideIcon; label: string; end?: boolean }[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/journal', icon: BookOpen, label: 'Journal' },
  { to: '/coach', icon: MessageCircle, label: 'Coach' },
  { to: '/goals', icon: Target, label: 'Ziele' },
  { to: '/review', icon: RotateCcw, label: 'Review' },
  { to: '/settings', icon: Settings, label: 'Einstellungen' },
]

function NavItem({ to, icon: Icon, label, end }: (typeof NAV_ITEMS)[0]) {
  return (
    <NavLink
      to={to}
      end={end}
      style={({ isActive }) => ({
        flex: 1,
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.6rem 0.25rem',
        textDecoration: 'none',
        color: isActive ? 'var(--accent)' : 'var(--text-muted)',
        gap: '0.2rem',
        transition: 'color 0.15s',
      })}
    >
      {({ isActive }) => (
        <>
          <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
          <span style={{ fontSize: '0.65rem', fontWeight: 500 }}>{label}</span>
        </>
      )}
    </NavLink>
  )
}

export default function Navigation() {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      aria-label="Hauptnavigation"
    >
      {NAV_ITEMS.map((item) => (
        <NavItem key={item.to} {...item} />
      ))}
    </nav>
  )
}

'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useT } from '@/lib/i18n'

const GREEN = '#22C55E'
const GRAY  = '#8A8F8F'

function HouseIcon({ color }: { color: string }) {
  const active = color === GREEN
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? color : 'none'} stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5L12 3l9 8.5V21h-6v-5H9v5H3z"/>
    </svg>
  )
}

function ChartIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4,18 9,12 13,15 20,6"/>
      <circle cx="20" cy="6" r="2" fill={color} stroke="none"/>
    </svg>
  )
}

function CalendarIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="3"  y1="9"  x2="21" y2="9"/>
      <line x1="8"  y1="2"  x2="8"  y2="6"/>
      <line x1="16" y1="2"  x2="16" y2="6"/>
    </svg>
  )
}

function FlaskIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6M9 3v7L4 20h16L15 10V3"/>
    </svg>
  )
}

export default function BottomNav() {
  const pathname = usePathname()
  const router   = useRouter()
  const t        = useT()
  const [pressed, setPressed] = useState<string | null>(null)

  const TABS = [
    { label: t.nav.home,     route: '/dashboard', Icon: HouseIcon    },
    { label: t.nav.progress, route: '/stats',     Icon: ChartIcon    },
    { label: t.nav.calendar, route: '/calendar',  Icon: CalendarIcon },
    { label: t.nav.quiz,     route: '/test',      Icon: FlaskIcon    },
  ]

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 768,
      background: '#131614', borderTop: '1px solid #252B28',
      borderRadius: '20px 20px 0 0', height: 66, zIndex: 40,
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      padding: '0 10px',
    }}>
      {TABS.map(({ label, route, Icon }) => {
        const active = pathname === route
        const color  = active ? GREEN : GRAY
        const isPressed = pressed === route
        return (
          <button
            key={route}
            onClick={() => router.push(route)}
            onPointerDown={() => setPressed(route)}
            onPointerUp={() => setPressed(null)}
            onPointerLeave={() => setPressed(null)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'Amiri, serif', color, gap: 2,
              transform: isPressed ? 'scale(0.95)' : 'scale(1)',
              transition: 'transform 0.12s ease',
            }}
          >
            <Icon color={color}/>
            <span style={{ fontSize: 10, marginTop: 2 }}>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}

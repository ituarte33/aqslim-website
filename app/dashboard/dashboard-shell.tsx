'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { useState } from 'react'
import { pt } from '@/lib/portal-type'

type Props = {
  user: { firstName: string | null; lastName: string | null } | null
  lang: 'es' | 'en'
  setLang: (l: 'es' | 'en') => void
  children: React.ReactNode
}

const NAV = [
  { href: '/dashboard', exact: true, es: 'Resumen', en: 'Overview' },
  { href: '/dashboard/appointments', exact: false, es: 'Citas', en: 'Appointments' },
  { href: '/dashboard/finances', exact: false, es: 'Finanzas', en: 'Finances' },
  { href: '/dashboard/patients', exact: false, es: 'Pacientes', en: 'Patients' },
  { href: '/dashboard/pilot-feedback', exact: false, es: 'Reportes', en: 'Reports' },
  { href: '/food-scanner', exact: false, es: '🍽 Mis Comidas', en: '🍽 My Meals' },
]

export function DashboardShell({ user, lang, setLang, children }: Props) {
  const pathname = usePathname()
  const [hovered, setHovered] = useState<string | null>(null)

  function isActive(item: typeof NAV[0]) {
    return item.exact ? pathname === item.href : pathname.startsWith(item.href)
  }

  const toggleBtn = (active: boolean) => ({
    background: 'none' as const,
    border: 'none' as const,
    cursor: 'pointer' as const,
    fontSize: pt.sm,
    letterSpacing: '0.12em',
    padding: '4px 8px',
    color: active ? '#C9A84C' : '#9A9590',
    borderBottom: active ? '1px solid #C9A84C' : '1px solid transparent',
    fontFamily: pt.sans,
    textTransform: 'uppercase' as const,
    transition: 'color 0.2s',
  })

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#FAFAF8' }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px', height: 64,
        borderBottom: '1px solid rgba(201,168,76,0.2)',
        position: 'fixed', top: 0, left: 0, right: 0,
        background: 'rgba(10,10,10,0.95)', zIndex: 10,
        gap: 32,
      }}>
        {/* Logo — links back to homepage */}
        <Link href="/" style={{ textDecoration: 'none', color: 'inherit', flexShrink: 0 }}>
          <span style={{ fontFamily: pt.serif, fontSize: pt.lg, letterSpacing: '0.08em' }}>
            AQ<span style={{ color: '#C9A84C' }}>SLIM</span>
            <span style={{ fontSize: pt.xs, color: '#9A9590', marginLeft: 10, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: pt.sans }}>
              Portal
            </span>
          </span>
        </Link>

        {/* Nav links — using div to avoid global nav { position: fixed } in globals.css */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
          {NAV.map(item => {
            const active = isActive(item)
            const isHov = hovered === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onMouseEnter={() => setHovered(item.href)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  padding: '0 16px',
                  height: 64,
                  display: 'flex',
                  alignItems: 'center',
                  color: active ? '#C9A84C' : isHov ? '#FAFAF8' : '#9A9590',
                  borderBottom: active ? '2px solid #C9A84C' : '2px solid transparent',
                  textDecoration: 'none',
                  fontSize: pt.sm,
                  fontFamily: pt.sans,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  transition: 'color 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {item[lang]}
              </Link>
            )
          })}
        </div>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <button style={toggleBtn(lang === 'es')} onClick={() => setLang('es')}>ES</button>
            <span style={{ color: 'rgba(154,149,144,0.4)', fontSize: pt.sm }}>|</span>
            <button style={toggleBtn(lang === 'en')} onClick={() => setLang('en')}>EN</button>
          </div>
          <span style={{ fontSize: pt.base, color: '#9A9590' }}>
            {user?.firstName} {user?.lastName}
          </span>
          <UserButton />
        </div>
      </header>

      <main style={{ paddingTop: 112, paddingBottom: 48, paddingLeft: 40, paddingRight: 40, maxWidth: 1400, margin: '0 auto' }}>
        {children}
      </main>

      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400&family=Montserrat:wght@300;400;500&display=swap" />
    </div>
  )
}

'use client'

import { usePathname } from 'next/navigation'

const ARIOS_URL = 'https://rom-executive-mission-control-preview.romit66.chatgpt.site'

export function ClinicAriosLauncher() {
  const pathname = usePathname()
  if (!pathname?.startsWith('/clinic-preview')) return null

  return (
    <a
      href={ARIOS_URL}
      target="_blank"
      rel="noreferrer"
      aria-label="Abrir ARIOS"
      style={{
        position: 'fixed',
        right: 24,
        bottom: 24,
        zIndex: 60,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 16px',
        borderRadius: 999,
        border: '1px solid rgba(201,168,76,.45)',
        background: 'rgba(10,10,10,.92)',
        color: '#E2C87A',
        textDecoration: 'none',
        fontFamily: 'Montserrat, Arial, sans-serif',
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: '.08em',
        boxShadow: '0 10px 28px rgba(0,0,0,.35)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <span style={{ fontSize: 15 }}>◉</span>
      ARIOS
    </a>
  )
}

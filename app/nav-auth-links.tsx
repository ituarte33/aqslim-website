'use client'

import { useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'

const AUTH_NAV_IDS = [
  'nav-dashboard-item',
  'nav-scanner-item',
  'mobile-dashboard-link',
  'mobile-scanner-link',
]

// Renders nothing — only toggles homepage nav link visibility based on auth state.
// Kept separate from HomeContent so a Clerk error can't break the cursor / animations.
export function NavAuthLinks() {
  const { isSignedIn } = useAuth()

  useEffect(() => {
    const display = isSignedIn ? 'block' : 'none'
    AUTH_NAV_IDS.forEach(id => {
      const el = document.getElementById(id)
      if (el) el.style.display = display
    })
  }, [isSignedIn])

  return null
}

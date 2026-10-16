'use client'

import { useAuth } from '@clerk/nextjs'
import { usePathname } from 'next/navigation'

export function ClientSignedIn({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useAuth()
  const pathname = usePathname()

  if (!isSignedIn) return null
  if (pathname?.startsWith('/clinic-preview')) return null

  return <>{children}</>
}

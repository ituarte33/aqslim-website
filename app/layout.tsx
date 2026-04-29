import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AQSLIM Wellness Center',
  description: 'Centro de bienestar y pérdida de peso — El Cajon, CA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <ClerkProvider afterSignOutUrl="/">
          {children}
        </ClerkProvider>
      </body>
    </html>
  )
}

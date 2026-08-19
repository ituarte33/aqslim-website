import { ClientSignedIn } from './client-signed-in'
import { ClerkLanguageProvider } from './clerk-language-provider'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { LanguageModal } from './language-modal'
import { ChatWidget } from './chat-widget'
import { NavAuthLinks } from './nav-auth-links'

export const metadata: Metadata = {
  title: 'AQSLIM Wellness Center — El Cajon, CA',
  description: 'Centro de bienestar y pérdida de peso — El Cajon, CA',
  applicationName: 'My AQSLIM',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'My AQSLIM',
  },
  icons: {
    icon: [
      { url: '/icons/myaqslim-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/myaqslim-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/myaqslim-apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: '#161513',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,700;1,400;1,500&family=Tenor+Sans&family=Montserrat:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="lang-es">
        <ClerkLanguageProvider>
          <LanguageModal />
          {children}
          <ClientSignedIn><ChatWidget /></ClientSignedIn>
          <NavAuthLinks />
        </ClerkLanguageProvider>
      </body>
    </html>
  )
}

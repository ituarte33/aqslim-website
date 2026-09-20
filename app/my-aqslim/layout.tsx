import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My AQSLIM',
  applicationName: 'My AQSLIM',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'My AQSLIM',
  },
}

export default function MyAqslimLayout({ children }: { children: React.ReactNode }) {
  return children
}

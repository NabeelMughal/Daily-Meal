import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { DM_Sans, Playfair_Display } from 'next/font/google'
import './globals.css'
import { OfflineShell, ServiceWorkerRegistration } from '@/components/offline-shell'

const bodyFont = DM_Sans({ subsets: ['latin'], variable: '--font-body' })
const displayFont = Playfair_Display({ subsets: ['latin'], variable: '--font-display' })

export const metadata: Metadata = {
  title: 'crumb. — Good food, remembered.',
  description: 'A thoughtful place for the recipes you love and the meals that become part of your story.',
  generator: 'v0.app',
  manifest: '/manifest.webmanifest',
}

export const viewport: Viewport = { colorScheme: 'light dark', themeColor: [{ media: '(prefers-color-scheme: light)', color: '#f7f5ef' }, { media: '(prefers-color-scheme: dark)', color: '#171714' }] }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${bodyFont.variable} ${displayFont.variable} bg-background`}><body className="antialiased"><ServiceWorkerRegistration /><OfflineShell />{children}{process.env.NODE_ENV === 'production' && <Analytics />}</body></html>
}

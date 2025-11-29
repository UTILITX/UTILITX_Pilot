import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import { ArcGISAuthProvider } from '@/contexts/ArcGISAuthContext'

// Force dynamic rendering for entire app - NO static generation
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'UTILITX',
  description: 'Utility map and planning workspace for UTILITX',
  generator: 'v0.app',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased ${GeistSans.variable} ${GeistMono.variable}`}>
        <ArcGISAuthProvider>
          <div className="h-screen w-screen overflow-hidden">
            <div className="flex h-full w-full">
              <Sidebar />
              <div className="flex flex-col flex-1">
                <main className="flex-1 bg-[var(--utilitx-gray-50)]">
                  <div className="h-full w-full overflow-auto">
                    {children}
                  </div>
                </main>
              </div>
            </div>
          </div>
        </ArcGISAuthProvider>
        <Analytics />
      </body>
    </html>
  )
}

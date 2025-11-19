import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import Sidebar from '@/components/Sidebar'

export const metadata: Metadata = {
  title: 'v0 App',
  description: 'Created with v0',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased ${GeistSans.variable} ${GeistMono.variable}`}>
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
        <Analytics />
      </body>
    </html>
  )
}

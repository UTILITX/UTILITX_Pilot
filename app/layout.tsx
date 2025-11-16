import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'

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
              <Topbar />
              <main className="flex-1 overflow-auto bg-[var(--utilitx-gray-50)] [&:has(>div[data-fullscreen-map])]:p-0 [&:has(>div[data-fullscreen-map])]:m-0 [&:has(>div[data-fullscreen-map])]:overflow-hidden">
                {children}
              </main>
            </div>
          </div>
        </div>
        <Analytics />
      </body>
    </html>
  )
}

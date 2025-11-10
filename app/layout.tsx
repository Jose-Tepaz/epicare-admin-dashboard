import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import { AdminAuthProvider } from '@/contexts/admin-auth-context'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'EpiCare Admin Dashboard',
  description: 'Panel de administración para gestión de usuarios y aplicaciones',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased ${GeistSans.variable} ${GeistMono.variable}`}>
        <AdminAuthProvider>
          {children}
          <Toaster />
        </AdminAuthProvider>
        <Analytics />
      </body>
    </html>
  )
}

import type { Metadata } from 'next'
import { AdminDataProvider } from '@/contexts/admin-data-context'
import { AdminLayout } from '@/components/admin-layout'

export const metadata: Metadata = {
  title: 'Admin Dashboard',
  description: 'Admin management panel',
}

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  console.log("AdminRootLayout rendering")
  return (
    <AdminDataProvider>
        <AdminLayout>
            {children}
        </AdminLayout>
    </AdminDataProvider>
  )
}

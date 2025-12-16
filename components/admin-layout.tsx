"use client"

import type React from "react"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Menu, X, Settings, Users, FileText, ClipboardList, BarChart3, Bell, LogOut } from "lucide-react"
import Link from "next/link"
import { useAdminAuth } from "@/contexts/admin-auth-context"
import { NotificationsDropdown } from "@/components/notifications-dropdown"
import { RoleSwitcher } from "@/components/role-switcher"
import { useNotifications } from "@/lib/hooks/use-notifications"

const adminNavigationItems = [
  { name: "Dashboard", href: "/admin", icon: BarChart3, active: false },
  { name: "Requests", href: "/admin/requests", icon: ClipboardList, active: false },
  { name: "Documents", href: "/admin/documents", icon: FileText, active: false },
  { name: "Users", href: "/admin/users", icon: Users, active: false },
  { name: "Support", href: "/admin/support", icon: Bell, active: false },
]

interface AdminLayoutProps {
  children: React.ReactNode
  currentPage?: string
}

export function AdminLayout({ children, currentPage = "Dashboard" }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, signOut } = useAdminAuth()
  
  // Hook de notificaciones a nivel de layout para evitar múltiples suscripciones
  const notificationsData = useNotifications()

  const getInitials = (email: string | undefined | null) => {
    if (!email) return 'U'
    return email.slice(0, 2).toUpperCase()
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black bg-opacity-50 opacity-60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-[#2E3438] transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6">
            <Link href="/admin" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#F26023] rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">E</span>
              </div>
              <div className="text-white">
                <div className="font-bold text-lg">epicare</div>
                <div className="text-sm opacity-90 text-orange-300">Admin Panel</div>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-white hover:bg-[#3a4145]"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-2">
            {adminNavigationItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                    item.name === currentPage
                      ? "bg-[#F26023] text-white"
                      : "text-slate-300 hover:bg-[#3a4145] hover:text-white",
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User Profile & Logout */}
          <div className="p-4 border-t border-[#3a4145]">
            {user && (
              <div className="mb-3 p-3 bg-[#3a4145] rounded-lg space-y-3">
                {/* User info */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-medium">{getInitials(user.email)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{user.email}</p>
                  </div>
                </div>
                {/* Role Switcher in Sidebar */}
                <RoleSwitcher variant="sidebar" />
              </div>
            )}
            <Link
              href="/admin/settings"
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-300 hover:bg-[#3a4145] hover:text-white rounded-lg transition-colors mb-2"
            >
              <Settings className="h-5 w-5" />
              Settings
            </Link>
            <Button
              onClick={signOut}
              variant="ghost"
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-300 hover:bg-red-900/20 hover:text-red-400 rounded-lg transition-colors justify-start"
            >
              <LogOut className="h-5 w-5" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-medium text-gray-900">Admin Panel</span>
          <div className="flex items-center gap-2">
            <RoleSwitcher variant="header" />
            <NotificationsDropdown notificationsData={notificationsData} />
          </div>
        </div>

        {/* Desktop header */}
        <div className="hidden lg:flex items-center justify-between bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900">Admin Panel</h1>
            <span className="text-sm text-gray-500">Internal Management System</span>
          </div>
          <div className="flex items-center gap-3">
            <NotificationsDropdown notificationsData={notificationsData} />
            {user && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">{getInitials(user.email)}</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium text-gray-700">
                    {user.email ? user.email.split('@')[0] : 'Usuario'}
                  </span>
                  <RoleSwitcher variant="header" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}

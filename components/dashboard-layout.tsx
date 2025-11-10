"use client"

import type React from "react"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Menu, X, Settings } from "lucide-react"
import Link from "next/link"

const navigationItems = [
  { name: "Dashboard", href: "/", active: false },
  { name: "Applications", href: "/applications", active: false },
  { name: "My policies", href: "/policies", active: false },
  { name: "Family", href: "/family", active: false },
  { name: "Profile", href: "/profile", active: false },
  { name: "Support", href: "/support", active: false },
]

interface DashboardLayoutProps {
  children: React.ReactNode
  currentPage?: string
}

export function DashboardLayout({ children, currentPage = "Dashboard" }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-orange-500 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <span className="text-orange-500 font-bold text-sm">E</span>
              </div>
              <div className="text-white">
                <div className="font-bold text-lg">epicare</div>
                <div className="text-sm opacity-90">Plans</div>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-white hover:bg-orange-600"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-2">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                  item.name === currentPage ? "bg-orange-400 text-white" : "text-white hover:bg-orange-400",
                )}
                onClick={() => setSidebarOpen(false)}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Settings */}
          <div className="p-4">
            <Link
              href="/settings"
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-white hover:bg-orange-400 rounded-lg transition-colors"
            >
              <Settings className="h-5 w-5" />
              Settings
            </Link>
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
          <span className="font-medium text-gray-900">Jose Tepaz</span>
          <div className="flex items-center gap-2">
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
              Buy New Insurance
            </Button>
          </div>
        </div>

        {/* Desktop header */}
        <div className="hidden lg:flex items-center justify-between bg-white border-b border-gray-200 px-6 py-4">
          <span className="font-medium text-gray-900">Jose Tepaz</span>
          <div className="flex items-center gap-3">
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">Buy New Insurance</Button>
            <Button variant="outline" className="flex items-center gap-2 bg-transparent">
              Back
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}

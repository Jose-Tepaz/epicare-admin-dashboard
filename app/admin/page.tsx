"use client"

import { AdminLayout } from "@/components/admin-layout"
import { AdminOverview } from "@/components/admin-overview"
import { AdminStats } from "@/components/admin-stats"
import { RecentActivity } from "@/components/recent-activity"
import { useAdminAuth } from "@/contexts/admin-auth-context"

export default function AdminDashboard() {
  const { isAgent, isSuperAdmin, isAdmin, isSupportStaff, userScope } = useAdminAuth()

  // Mensajes contextuales según rol
  const getDashboardMessages = () => {
    if (isAgent) {
      return {
        title: "Portal del Agent",
        description: "Vista general de tus clientes y applications"
      }
    } else if (isSupportStaff) {
      if (userScope === 'agent_specific') {
        return {
          title: "Dashboard de Soporte",
          description: "Gestiona tickets y consultas de clientes asignados"
        }
      }
      return {
        title: "Dashboard de Soporte",
        description: "Gestiona tickets y consultas de todos los clientes"
      }
    } else if (isSuperAdmin) {
      return {
        title: "Super Admin Dashboard",
        description: "Control total del sistema y métricas globales"
      }
    } else if (isAdmin) {
      return {
        title: "Admin Dashboard",
        description: "Vista general del rendimiento del sistema y métricas clave"
      }
    }
    return {
      title: "Dashboard",
      description: "Vista general del sistema"
    }
  }

  const messages = getDashboardMessages()

  return (
    <AdminLayout currentPage="Dashboard">
      <div className="flex-1 space-y-6 p-4 md:p-6">
        {/* Dashboard Title */}
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-gray-900">{messages.title}</h2>
          <p className="text-gray-600">{messages.description}</p>
        </div>

        {/* Stats Cards */}
        <AdminStats />

        {/* Overview Section */}
        <div className="grid gap-6 md:grid-cols-2">
          <AdminOverview />
          <RecentActivity />
        </div>
      </div>
    </AdminLayout>
  )
}

import { AdminLayout } from "@/components/admin-layout"
import { AdminOverview } from "@/components/admin-overview"
import { AdminStats } from "@/components/admin-stats"
import { RecentActivity } from "@/components/recent-activity"

export default function HomePage() {
  return (
    <AdminLayout currentPage="Dashboard">
      <div className="flex-1 space-y-6 p-4 md:p-6">
        {/* Dashboard Title */}
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-gray-900">Admin Dashboard</h2>
          <p className="text-gray-600">Overview of system performance and key metrics</p>
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

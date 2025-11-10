import { AdminLayout } from "@/components/admin-layout"
import { RequestsTable } from "@/components/requests-table"
import { RequestsStats } from "@/components/requests-stats"

export default function AdminRequestsPage() {
  return (
    <AdminLayout currentPage="Requests">
      <div className="flex-1 space-y-6 p-4 md:p-6">
        {/* Page Header */}
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-gray-900">Requests Management</h2>
          <p className="text-gray-600">Manage and process insurance application requests</p>
        </div>

        {/* Stats Cards */}
        <RequestsStats />

        {/* Requests Table */}
        <RequestsTable />
      </div>
    </AdminLayout>
  )
}

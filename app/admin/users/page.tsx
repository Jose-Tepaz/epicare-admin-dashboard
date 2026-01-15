import { UsersTable } from "@/components/users-table"
import { UsersStats } from "@/components/users-stats"

export default function AdminUsersPage() {
  return (
      <div className="flex-1 space-y-6 p-4 md:p-6">
        {/* Page Header */}
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-gray-900">Users Management</h2>
          <p className="text-gray-600">Manage customer accounts and user information</p>
        </div>

        {/* Stats Cards */}
        <UsersStats />

        {/* Users Table */}
        <UsersTable />
      </div>
  )
}

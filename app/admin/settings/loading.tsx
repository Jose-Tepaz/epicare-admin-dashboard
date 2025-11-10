import { AdminLayout } from "@/components/admin-layout"

export default function SettingsLoading() {
  return (
    <AdminLayout currentPage="Settings">
      <div className="p-6">
        <div className="mb-6">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-96 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="space-y-6">
          <div className="h-96 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    </AdminLayout>
  )
}

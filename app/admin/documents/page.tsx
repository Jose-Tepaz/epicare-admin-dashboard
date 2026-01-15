import { DocumentsManager } from "@/components/documents-manager"
import { DocumentsStats } from "@/components/documents-stats"

export default function AdminDocumentsPage() {
  return (
      <div className="flex-1 space-y-6 p-4 md:p-6">
        {/* Page Header */}
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-gray-900">Documents Administration</h2>
          <p className="text-gray-600">Manage document requests and submissions</p>
        </div>

        {/* Stats Cards */}
        <DocumentsStats />

        {/* Documents Manager */}
        <DocumentsManager />
      </div>
  )
}

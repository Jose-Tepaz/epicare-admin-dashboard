import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Eye, Edit } from "lucide-react"

const applications = [
  {
    id: "APP-001",
    type: "Health Insurance",
    provider: "Ameritas",
    status: "Pending",
    progress: 45,
    submitted: "2024-01-15",
  },
  {
    id: "APP-002",
    type: "Dental Insurance",
    provider: "Allstate",
    status: "Approved",
    progress: 100,
    submitted: "2024-01-15",
  },
  {
    id: "APP-003...",
    type: "Vision Insurance",
    provider: "Ameritas...",
    status: "in progress",
    progress: 65,
    submitted: "2024-01-15",
  },
]

export function ApplicationsTable() {
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">{status}</Badge>
      case "approved":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{status}</Badge>
      case "in progress":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{status}</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getProgressBar = (progress: number, status: string) => {
    const isCompleted = status.toLowerCase() === "approved"
    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${isCompleted ? "bg-orange-500" : "bg-orange-500"}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Application ID</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Type</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Provider</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Status</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Progress</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Submitted</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {applications.map((app) => (
              <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{app.id}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{app.type}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{app.provider}</td>
                <td className="px-6 py-4">{getStatusBadge(app.status)}</td>
                <td className="px-6 py-4">
                  <div className="w-24">{getProgressBar(app.progress, app.status)}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">{app.submitted}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0 bg-transparent">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" className="h-8 w-8 p-0 bg-orange-500 hover:bg-orange-600">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

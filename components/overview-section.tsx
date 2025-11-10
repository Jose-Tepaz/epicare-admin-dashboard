import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const recentApplications = [
  {
    type: "Health Insurance",
    provider: "Ameritas",
    status: "Pending",
    progress: 60,
    statusColor: "bg-orange-100 text-orange-800",
  },
  {
    type: "Dental Insurance",
    provider: "Allstate",
    status: "Approved",
    progress: 100,
    statusColor: "bg-green-100 text-green-800",
  },
]

const activePolicies = [
  {
    type: "Health Insurance",
    provider: "Ameritas",
    amount: "$299/month",
    status: "active",
    statusColor: "bg-green-100 text-green-800",
  },
  {
    type: "Dental Insurance",
    provider: "Allstate",
    amount: "$89/month",
    status: "active",
    statusColor: "bg-green-100 text-green-800",
  },
]

export function OverviewSection() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Overview</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Applications */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Recent Applications</h3>
            <p className="text-sm text-gray-600">Track your insurance application progress</p>
          </div>

          <div className="space-y-4">
            {recentApplications.map((application, index) => (
              <Card key={index} className="p-4 bg-white border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{application.type}</h4>
                    <p className="text-sm text-gray-600">{application.provider}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${application.statusColor}`}>
                    {application.status}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${application.progress}%` }}
                  />
                </div>
              </Card>
            ))}
          </div>

          <Button variant="outline" className="w-full border-blue-300 text-blue-600 hover:bg-blue-50 bg-transparent">
            View all applications
          </Button>
        </div>

        {/* Active Policies */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Active Policies</h3>
            <p className="text-sm text-gray-600">Your current insurance coverage</p>
          </div>

          <div className="space-y-4">
            {activePolicies.map((policy, index) => (
              <Card key={index} className="p-4 bg-white border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">{policy.type}</h4>
                    <p className="text-sm text-gray-600">{policy.provider}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${policy.statusColor}`}>
                    {policy.status}
                  </span>
                </div>
                <p className="text-lg font-semibold text-orange-500">{policy.amount}</p>
              </Card>
            ))}
          </div>

          <Button variant="outline" className="w-full border-blue-300 text-blue-600 hover:bg-blue-50 bg-transparent">
            Manage Policies
          </Button>
        </div>
      </div>
    </div>
  )
}

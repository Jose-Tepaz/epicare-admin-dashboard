import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Upload, Download, AlertTriangle } from "lucide-react"

export function DocumentsStats() {
  const stats = [
    {
      title: "Pending Documents",
      value: "32",
      change: "+5%",
      changeType: "increase" as const,
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Uploaded Today",
      value: "14",
      change: "+12%",
      changeType: "increase" as const,
      icon: Upload,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Downloaded",
      value: "89",
      change: "+8%",
      changeType: "increase" as const,
      icon: Download,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Missing Documents",
      value: "12",
      change: "-2%",
      changeType: "decrease" as const,
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <p className={`text-xs ${stat.changeType === "increase" ? "text-green-600" : "text-red-600"}`}>
                {stat.change} from last week
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

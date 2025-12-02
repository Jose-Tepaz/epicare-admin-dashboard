"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Upload, Download, AlertTriangle, Loader2, CheckCircle } from "lucide-react"
import { useDocumentStats } from "@/lib/hooks/use-documents"

export function DocumentsStats() {
  const { stats, loading } = useDocumentStats()

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const statsConfig = [
    {
      title: "Total Documents",
      value: stats?.total.toString() || "0",
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Under Review",
      value: stats?.under_review.toString() || "0",
      icon: AlertTriangle,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
    {
      title: "Approved",
      value: stats?.approved.toString() || "0",
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Expired",
      value: stats?.expired.toString() || "0",
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statsConfig.map((stat) => {
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
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

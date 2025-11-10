import { Card } from "@/components/ui/card"

const stats = [
  {
    title: "Active Applications",
    value: "3",
    subtitle: "2 pending review",
    color: "text-orange-500",
  },
  {
    title: "Active Policies",
    value: "2",
    subtitle: "$388/month total",
    color: "text-orange-500",
  },
  {
    title: "Family Members",
    value: "2",
    subtitle: "Covered members",
    color: "text-orange-500",
  },
  {
    title: "Next Payment",
    value: "Sep 30",
    subtitle: "$89 due",
    color: "text-orange-500",
  },
]

export function StatsCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className="p-6 bg-white border border-gray-200">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-600">{stat.title}</h3>
            <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
            <p className="text-sm text-gray-500">{stat.subtitle}</p>
          </div>
        </Card>
      ))}
    </div>
  )
}

"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Calendar,
  FileText,
  Users,
  TrendingUp,
  Loader2,
} from "lucide-react"
import {
  useAgentProfile,
  useAgentStats,
} from "@/lib/hooks/use-agents"
import { AgentInfoTab } from "./agent-detail/agent-info-tab"
import { AppointmentsTab } from "./agent-detail/appointments-tab"
import { LicensesTab } from "./agent-detail/licenses-tab"
import { ClientsTab } from "./agent-detail/clients-tab"
import { SalesTab } from "./agent-detail/sales-tab"

interface AgentDetailViewProps {
  userId: string
  showClientsTab?: boolean
  showSalesTab?: boolean
}

export function AgentDetailView({ 
  userId, 
  showClientsTab = true, 
  showSalesTab = true 
}: AgentDetailViewProps) {
  console.log('🔍 AgentDetailView: Rendering for userId:', userId)
  const { agent, loading: agentLoading, refetch: refetchAgent } = useAgentProfile(userId)
  const { stats, loading: statsLoading } = useAgentStats(agent?.id || null)

  console.log('🔍 AgentDetailView: Agent data:', { agent: agent?.id, loading: agentLoading })

  if (agentLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!agent) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-gray-500">
            Este usuario no tiene un perfil de agente configurado.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {showClientsTab && (
      <div className="grid gap-4 md:grid-cols-4">
        
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClients}</div>
          </CardContent>
          </Card>
        
          <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAppointments}</div>
          </CardContent>
          </Card>
          <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Licencias Activas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeLicenses}</div>
          </CardContent>
          </Card>
          <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSales}</div>
          </CardContent>
          </Card>
        
        
      </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList className={`${
          showClientsTab && showSalesTab ? 'grid-cols-5' :
          showClientsTab || showSalesTab ? 'grid-cols-4' :
          'grid-cols-3'
        }`}>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="licenses">Licencias</TabsTrigger>
          {showClientsTab && <TabsTrigger value="clients">Clientes</TabsTrigger>}
          {showSalesTab && <TabsTrigger value="sales">Applications</TabsTrigger>}
        </TabsList>

        <TabsContent value="info">
          <AgentInfoTab agent={agent} onUpdate={refetchAgent} />
        </TabsContent>

        <TabsContent value="appointments">
          <AppointmentsTab agentProfileId={agent.id} />
        </TabsContent>

        <TabsContent value="licenses">
          <LicensesTab agentProfileId={agent.id} />
        </TabsContent>

        {showClientsTab && (
          <TabsContent value="clients">
            <ClientsTab agentProfileId={agent.id} />
          </TabsContent>
        )}

        {showSalesTab && (
          <TabsContent value="sales">
            <SalesTab agentProfileId={agent.id} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

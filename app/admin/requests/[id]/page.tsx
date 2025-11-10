"use client"

import { useRouter, useParams } from "next/navigation"
import { AdminLayout } from "@/components/admin-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useApplicationDetails, useUpdateApplicationStatus } from "@/lib/hooks/use-applications"
import { useAdminAuth } from "@/contexts/admin-auth-context"
import {
  UserInformationCard,
  InsuranceCompanyCard,
  ApplicantsCard,
  CoveragesCard,
  BeneficiariesCard,
  StatusUpdateCard,
  SubmissionResultsCard,
  MetadataCard,
  statusConfig,
} from "@/components/request-details"

export default function RequestDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const applicationId = params?.id as string
  const { application, loading, error, refetch } = useApplicationDetails(applicationId)
  const { updateStatus } = useUpdateApplicationStatus()
  const { permissions } = useAdminAuth()

  if (loading) {
    return (
      <AdminLayout currentPage="Requests">
        <div className="flex-1 p-4 md:p-6 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
        </div>
      </AdminLayout>
    )
  }

  if (error || !application) {
    return (
      <AdminLayout currentPage="Requests">
        <div className="flex-1 p-4 md:p-6">
          <Card>
            <CardContent className="p-6">
              <p className="text-red-600">
                {error || "Application no encontrada"}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push("/admin/requests")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver a Applications
              </Button>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    )
  }

  const status = statusConfig[application.status as keyof typeof statusConfig] || statusConfig.draft
  const StatusIcon = status.icon

  return (
    <AdminLayout currentPage="Requests">
      <div className="flex-1 space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/admin/requests")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Detalle de Application</h2>
              <p className="text-sm text-gray-500 font-mono">{application.id}</p>
            </div>
          </div>
          <Badge className={status.color}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {status.label}
          </Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            <UserInformationCard application={application} />
            
            {application.insurance_companies && (
              <InsuranceCompanyCard insuranceCompany={application.insurance_companies} />
            )}
            
            <ApplicantsCard 
              applicants={application.applicants || []} 
              permissions={permissions as any} 
            />
            
            <CoveragesCard coverages={application.coverages || []} />
            
            <BeneficiariesCard beneficiaries={application.beneficiaries || []} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <StatusUpdateCard
              applicationId={application.id}
              currentStatus={application.status}
              permissions={permissions as any}
              onStatusUpdate={updateStatus}
              onSuccess={refetch}
            />
            
            <SubmissionResultsCard 
              submissionResults={application.application_submission_results || []} 
            />
            
            <MetadataCard application={application} />
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

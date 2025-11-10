"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users } from "lucide-react"
import { format } from "date-fns"
import { maskSensitiveData } from "@/lib/types/admin"
import { relationshipLabels } from "./constants"
import type { ApplicantData, AdminPermissions } from "./types"

interface ApplicantsCardProps {
  applicants: ApplicantData[]
  permissions: AdminPermissions
}

export function ApplicantsCard({ applicants, permissions }: ApplicantsCardProps) {
  if (!applicants || applicants.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Miembros de la Aplicación ({applicants.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {applicants.map((applicant) => (
            <div key={applicant.id} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="secondary">
                  {relationshipLabels[applicant.relationship] || applicant.relationship || 'Dependiente'}
                </Badge>
              </div>
              
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Nombre:</span>
                  <span className="ml-2 font-medium">
                    {applicant.first_name} {applicant.middle_initial ? `${applicant.middle_initial}. ` : ''}{applicant.last_name}
                  </span>
                </div>
                
                <div>
                  <span className="text-gray-500">Fecha de Nacimiento:</span>
                  <span className="ml-2 font-medium">
                    {applicant.date_of_birth ? format(new Date(applicant.date_of_birth), 'dd/MM/yyyy') : 'N/A'}
                  </span>
                </div>
                
                <div>
                  <span className="text-gray-500">Género:</span>
                  <span className="ml-2 font-medium">{applicant.gender || 'N/A'}</span>
                </div>
                
                {applicant.ssn && (
                  <div>
                    <span className="text-gray-500">SSN:</span>
                    <span className="ml-2 font-medium">
                      {maskSensitiveData(applicant.ssn, permissions.canViewSensitiveData)}
                    </span>
                  </div>
                )}
                
                <div>
                  <span className="text-gray-500">Fumador:</span>
                  <span className="ml-2 font-medium">{applicant.smoker ? 'Sí' : 'No'}</span>
                </div>
                
                {applicant.weight && (
                  <div>
                    <span className="text-gray-500">Peso:</span>
                    <span className="ml-2 font-medium">{applicant.weight} lbs</span>
                  </div>
                )}
                
                {(applicant.height_feet || applicant.height_inches) && (
                  <div>
                    <span className="text-gray-500">Altura:</span>
                    <span className="ml-2 font-medium">
                      {applicant.height_feet}'{applicant.height_inches || 0}"
                    </span>
                  </div>
                )}
                
                {applicant.phone_numbers && (
                  <div>
                    <span className="text-gray-500">Teléfono:</span>
                    <span className="ml-2 font-medium">
                      {typeof applicant.phone_numbers === 'string' 
                        ? applicant.phone_numbers 
                        : JSON.stringify(applicant.phone_numbers)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}


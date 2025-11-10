"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import type { BeneficiaryData } from "./types"

interface BeneficiariesCardProps {
  beneficiaries: BeneficiaryData[]
}

export function BeneficiariesCard({ beneficiaries }: BeneficiariesCardProps) {
  if (!beneficiaries || beneficiaries.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Beneficiarios</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {beneficiaries.map((beneficiary) => (
            <div key={beneficiary.id} className="flex items-center justify-between p-3 border rounded">
              <div>
                <p className="font-medium">
                  {beneficiary.first_name} {beneficiary.middle_name ? `${beneficiary.middle_name} ` : ''}{beneficiary.last_name}
                </p>
                <p className="text-sm text-gray-500">{beneficiary.relationship}</p>
                {beneficiary.date_of_birth && (
                  <p className="text-xs text-gray-400">
                    {format(new Date(beneficiary.date_of_birth), 'dd/MM/yyyy')}
                  </p>
                )}
              </div>
              <Badge variant="secondary">{beneficiary.allocation_percentage || 0}%</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}


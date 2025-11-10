"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { InsuranceCompanyData } from "./types"

interface InsuranceCompanyCardProps {
  insuranceCompany: InsuranceCompanyData
}

export function InsuranceCompanyCard({ insuranceCompany }: InsuranceCompanyCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Aseguradora</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-lg font-semibold">{insuranceCompany.name}</p>
      </CardContent>
    </Card>
  )
}


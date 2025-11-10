"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import type { CoverageData } from "./types"

interface CoveragesCardProps {
  coverages: CoverageData[]
}

export function CoveragesCard({ coverages }: CoveragesCardProps) {
  if (!coverages || coverages.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Coberturas Contratadas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {coverages.map((coverage) => (
            <div key={coverage.id} className="p-3 border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Plan: {coverage.plan_key}</p>
                  {coverage.carrier_name && (
                    <p className="text-sm text-gray-500">{coverage.carrier_name}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    Efectiva: {coverage.effective_date ? format(new Date(coverage.effective_date), 'dd/MM/yyyy') : 'N/A'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">
                    ${coverage.monthly_premium || 0}
                  </p>
                  <p className="text-xs text-gray-500">{coverage.payment_frequency}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}


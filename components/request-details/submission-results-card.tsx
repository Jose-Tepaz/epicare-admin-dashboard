"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import type { SubmissionResultData } from "./types"

interface SubmissionResultsCardProps {
  submissionResults: SubmissionResultData[]
}

export function SubmissionResultsCard({ submissionResults }: SubmissionResultsCardProps) {
  if (!submissionResults || submissionResults.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Envíos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {submissionResults.map((result) => (
            <div key={result.id} className="p-3 border-l-2 border-blue-500 bg-blue-50 rounded">
              {result.plan_key && (
                <p className="font-medium text-sm">Plan: {result.plan_key}</p>
              )}
              <p className="text-xs text-gray-600">
                Estado: {result.submission_received ? 'Recibido' : 'Pendiente'}
              </p>
              {result.policy_no && (
                <p className="text-xs text-gray-600 mt-1">
                  Política: {result.policy_no}
                </p>
              )}
              {result.total_rate && (
                <p className="text-xs text-gray-600">
                  Tasa Total: ${result.total_rate}
                </p>
              )}
              {result.effective_date && (
                <p className="text-xs text-gray-600">
                  Fecha Efectiva: {format(new Date(result.effective_date), 'dd/MM/yyyy')}
                </p>
              )}
              {result.submission_errors && result.submission_errors.length > 0 && (
                <p className="text-xs text-red-600 mt-1">
                  Errores: {result.submission_errors.length}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {format(new Date(result.created_at), 'dd/MM/yyyy HH:mm')}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}


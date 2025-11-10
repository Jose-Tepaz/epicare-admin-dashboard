"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { ApplicationData } from "./types"

interface MetadataCardProps {
  application: ApplicationData
}

export function MetadataCard({ application }: MetadataCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Información Adicional</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div>
          <span className="text-gray-500">Creada:</span>
          <p className="font-medium">
            {format(new Date(application.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
          </p>
        </div>
        <div>
          <span className="text-gray-500">Última actualización:</span>
          <p className="font-medium">
            {format(new Date(application.updated_at), 'dd/MM/yyyy HH:mm', { locale: es })}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}


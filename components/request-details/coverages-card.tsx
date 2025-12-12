"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Shield, Calendar, DollarSign, Clock, Percent, User } from "lucide-react"
import type { CoverageData } from "./types"

interface CoveragesCardProps {
  coverages: CoverageData[]
}

export function CoveragesCard({ coverages }: CoveragesCardProps) {
  if (!coverages || coverages.length === 0) return null

  const formatPremium = (premium: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(premium)
  }

  const formatRiders = (riders: any) => {
    if (!riders) return null
    if (typeof riders === 'string') {
      try {
        const parsed = JSON.parse(riders)
        return Array.isArray(parsed) ? parsed : [parsed]
      } catch {
        return [riders]
      }
    }
    return Array.isArray(riders) ? riders : [riders]
  }

  const formatDiscounts = (discounts: any) => {
    if (!discounts) return null
    if (typeof discounts === 'string') {
      try {
        const parsed = JSON.parse(discounts)
        return Array.isArray(parsed) ? parsed : [parsed]
      } catch {
        return [discounts]
      }
    }
    return Array.isArray(discounts) ? discounts : [discounts]
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Planes Contratados ({coverages.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {coverages.map((coverage) => {
            const riders = formatRiders(coverage.riders)
            const discounts = formatDiscounts(coverage.discounts)
            
            return (
              <div key={coverage.id} className="p-4 border rounded-lg bg-gray-50/50 hover:bg-gray-50 transition-colors">
                {/* Header con Plan y Precio */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{coverage.plan_key}</h3>
                      {coverage.carrier_name && (
                        <Badge variant="secondary" className="text-xs">
                          {coverage.carrier_name}
                        </Badge>
                      )}
                    </div>
                    {coverage.agent_number && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <User className="h-3 w-3" />
                        <span>Agente: {coverage.agent_number}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="flex items-baseline gap-1">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <p className="font-bold text-xl text-green-600">
                        {formatPremium(coverage.monthly_premium || 0)}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 capitalize">
                      {coverage.payment_frequency || 'Monthly'}
                    </p>
                  </div>
                </div>

                {/* Información Detallada */}
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  {/* Fechas */}
                  <div className="space-y-2">
                    {coverage.effective_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div>
                          <span className="text-gray-500">Fecha Efectiva:</span>
                          <span className="ml-2 font-medium">
                            {format(new Date(coverage.effective_date), 'dd/MM/yyyy')}
                          </span>
                        </div>
                      </div>
                    )}
                    {coverage.termination_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div>
                          <span className="text-gray-500">Fecha de Terminación:</span>
                          <span className="ml-2 font-medium">
                            {format(new Date(coverage.termination_date), 'dd/MM/yyyy')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Términos */}
                  <div className="space-y-2">
                    {coverage.term && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <div>
                          <span className="text-gray-500">Término:</span>
                          <span className="ml-2 font-medium">{coverage.term} años</span>
                        </div>
                      </div>
                    )}
                    {coverage.number_of_terms && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <div>
                          <span className="text-gray-500">Número de Términos:</span>
                          <span className="ml-2 font-medium">{coverage.number_of_terms}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Riders */}
                {riders && riders.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs font-medium text-gray-500 mb-2">Riders Adicionales:</p>
                    <div className="flex flex-wrap gap-2">
                      {riders.map((rider: any, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {typeof rider === 'object' ? rider.name || rider.type || JSON.stringify(rider) : rider}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Descuentos */}
                {discounts && discounts.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs font-medium text-gray-500 mb-2">Descuentos Aplicados:</p>
                    <div className="flex flex-wrap gap-2">
                      {discounts.map((discount: any, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs text-green-600">
                          {typeof discount === 'object' 
                            ? `${discount.name || discount.type || 'Descuento'}: ${discount.amount || discount.percentage || ''}`
                            : discount
                          }
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Opciones Adicionales */}
                {coverage.is_automatic_loan_provision_opted_in && (
                  <div className="mt-3 pt-3 border-t">
                    <Badge variant="outline" className="text-xs">
                      Préstamo Automático Habilitado
                    </Badge>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}


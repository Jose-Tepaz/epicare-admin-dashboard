"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Mail, Phone, MapPin, Calendar } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { ApplicationData } from "./types"

interface UserInformationCardProps {
  application: ApplicationData
}

export function UserInformationCard({ application }: UserInformationCardProps) {
  const userName = application.users
    ? `${application.users.first_name || ''} ${application.users.last_name || ''}`.trim() || application.users.email
    : 'N/A'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Información del Usuario
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <User className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Nombre</p>
              <p className="font-medium">{userName}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <Mail className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{application.users?.email || 'N/A'}</p>
            </div>
          </div>
          
          {application.users?.phone && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Phone className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Teléfono</p>
                <p className="font-medium">{application.users.phone}</p>
              </div>
            </div>
          )}
          
          {application.users?.date_of_birth && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-50 rounded-lg">
                <Calendar className="h-4 w-4 text-pink-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Fecha de Nacimiento</p>
                <p className="font-medium">
                  {format(new Date(application.users.date_of_birth), 'dd/MM/yyyy')}
                </p>
              </div>
            </div>
          )}
          
          {application.users?.gender && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <User className="h-4 w-4 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Género</p>
                <p className="font-medium">{application.users.gender}</p>
              </div>
            </div>
          )}
          
          {(application.users?.address || application.users?.city || application.users?.state) && (
            <div className="flex items-start gap-3 md:col-span-2">
              <div className="p-2 bg-teal-50 rounded-lg">
                <MapPin className="h-4 w-4 text-teal-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Dirección</p>
                <p className="font-medium">
                  {[
                    application.users.address,
                    application.users.city,
                    application.users.state,
                    application.users.zip_code
                  ].filter(Boolean).join(', ')}
                </p>
                {application.users.country && (
                  <p className="text-sm text-gray-500 mt-1">{application.users.country}</p>
                )}
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <Calendar className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Fecha de Solicitud</p>
              <p className="font-medium">
                {format(new Date(application.created_at), 'dd MMMM yyyy', { locale: es })}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


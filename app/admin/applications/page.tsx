'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import type { Application } from '@/lib/types/admin'

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadApplications()
  }, [])
  
  async function loadApplications() {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        users:user_id(email, first_name, last_name),
        insurance_companies:company_id(name, logo_url)
      `)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error loading applications:', error)
    } else {
      setApplications(data || [])
    }
    
    setLoading(false)
  }
  
  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending_approval: 'bg-yellow-500',
      approved: 'bg-green-500',
      submitted: 'bg-blue-500',
      active: 'bg-green-700',
      rejected: 'bg-red-500',
      cancelled: 'bg-gray-500',
      submission_failed: 'bg-orange-500',
      draft: 'bg-gray-400',
    }
    
    return (
      <Badge className={colors[status] || 'bg-gray-400'}>
        {status.replace('_', ' ')}
      </Badge>
    )
  }
  
  async function handleApprove(appId: string) {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('applications')
      .update({ status: 'approved' })
      .eq('id', appId)
    
    if (error) {
      console.error('Error approving application:', error)
      alert('Error al aprobar la aplicación')
    } else {
      alert('Aplicación aprobada exitosamente')
      loadApplications()
    }
  }
  
  async function handleSubmit(appId: string) {
    if (!confirm('¿Estás seguro de enviar esta aplicación a la aseguradora?')) {
      return
    }
    
    try {
      const response = await fetch(`/api/applications/${appId}/submit-enrollment`, {
        method: 'POST',
      })
      
      const result = await response.json()
      
      if (response.ok) {
        alert('Enrollment enviado exitosamente')
        loadApplications()
      } else {
        alert(`Error: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error submitting enrollment:', error)
      alert('Error al enviar enrollment')
    }
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }
  
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Applications</h1>
      
      {applications.length === 0 ? (
        <p className="text-gray-500">No hay aplicaciones disponibles</p>
      ) : (
        <div className="grid gap-4">
          {applications.map((app) => (
            <Card key={app.id} className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">
                    {app.users?.first_name} {app.users?.last_name}
                  </h3>
                  <p className="text-sm text-gray-600">{app.users?.email}</p>
                  <p className="text-sm mt-2">
                    {app.insurance_companies?.name || 'N/A'} - {app.carrier_name || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    ID: {app.id}
                  </p>
                </div>
                
                <div className="text-right">
                  {getStatusBadge(app.status)}
                  <p className="text-sm text-gray-500 mt-2">
                    {new Date(app.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.location.href = `/admin/applications/${app.id}`}
                >
                  Ver Detalles
                </Button>
                
                {app.status === 'pending_approval' && (
                  <Button onClick={() => handleApprove(app.id)}>
                    Aprobar
                  </Button>
                )}
                
                {app.status === 'approved' && (
                  <Button onClick={() => handleSubmit(app.id)}>
                    Enviar a Aseguradora
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}


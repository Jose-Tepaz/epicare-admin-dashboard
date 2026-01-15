"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { User, Shield, Loader2, Eye, EyeOff } from "lucide-react"
import { useAdminAuth } from "@/contexts/admin-auth-context"
import { AgentDetailView } from "@/components/agent-detail-view"
import { useUpdateUser } from "@/lib/hooks/use-users"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

export default function SettingsPage() {
  const { user, isAgent } = useAdminAuth()
  const { updateUser, updating } = useUpdateUser()
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [changingPassword, setChangingPassword] = useState(false)
  
  // Estado del formulario de perfil
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
  })
  
  // Estado del formulario de contraseña
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  
  // Estado para mostrar/ocultar contraseñas
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })

  // Función para cargar datos del usuario
  const loadUserData = async () => {
    if (!user) return
    
    try {
      setLoadingProfile(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from('users')
        .select('first_name, last_name, phone')
        .eq('id', user.id)
        .single()
      
      if (error) throw error
      
      setProfileData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        phone: data.phone || '',
      })
    } catch (error) {
      console.error('Error loading user data:', error)
      toast.error('Error al cargar datos del perfil')
    } finally {
      setLoadingProfile(false)
    }
  }

  // Cargar datos del usuario al montar
  useEffect(() => {
    loadUserData()
  }, [user])

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    
    try {
      // 1. Actualizar tabla users
      const success = await updateUser(user.id, profileData)
      if (!success) return
      
      // 2. Si es agente, también actualizar agent_profiles
      if (isAgent) {
        const supabase = createClient()
        
        // Obtener el agent_profile_id
        const { data: agentProfile, error: agentError } = await supabase
          .from('agent_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single()
        
        if (agentError || !agentProfile) {
          console.error('Error obteniendo agent profile:', agentError)
          toast.warning('Perfil actualizado, pero no se pudo actualizar información de agente')
          return
        }
        
        // Actualizar agent_profiles
        const { error: updateAgentError } = await supabase
          .from('agent_profiles')
          .update({
            first_name: profileData.first_name,
            last_name: profileData.last_name,
            phone: profileData.phone,
          })
          .eq('id', agentProfile.id)
        
        if (updateAgentError) {
          console.error('Error actualizando agent profile:', updateAgentError)
          toast.warning('Perfil de usuario actualizado, pero no se pudo actualizar perfil de agente')
          return
        }
      }
      
      toast.success('Perfil actualizado correctamente')
    } catch (error) {
      console.error('Error in handleProfileSubmit:', error)
      toast.error('Error al actualizar el perfil')
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    
    // Validaciones
    if (passwordData.newPassword.length < 8) {
      toast.error('La nueva contraseña debe tener al menos 8 caracteres')
      return
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    
    try {
      setChangingPassword(true)
      
      // Llamar al endpoint de cambio de contraseña
      const response = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: passwordData.newPassword,
          userId: user.id,
        }),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Error al cambiar la contraseña')
      }
      
      toast.success('Contraseña actualizada correctamente')
      
      // Limpiar el formulario
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } catch (error: any) {
      console.error('Error changing password:', error)
      toast.error(error.message || 'Error al cambiar la contraseña')
    } finally {
      setChangingPassword(false)
    }
  }

  // Si es agente, mostrar su perfil de agente + configuración estándar
  if (isAgent && user) {
    return (
        <div className="p-6 space-y-8">
          {/* Sección: Perfil de Agente */}
          <div>
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Mi Perfil de Agente</h1>
              <p className="text-gray-600 mt-1">Gestiona tu información profesional, licencias y citas</p>
            </div>
            <AgentDetailView 
              userId={user.id} 
              showClientsTab={false} 
              showSalesTab={false} 
            />
          </div>

          {/* Sección: Configuración de Cuenta */}
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Configuración de Cuenta</h2>
              <p className="text-gray-600 mt-1">Administra tu perfil personal y seguridad</p>
            </div>

            <Tabs defaultValue="profile" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 lg:w-auto">
                <TabsTrigger value="profile" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">General</span>
                </TabsTrigger>
                <TabsTrigger value="security" className="gap-2">
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">Security</span>
                </TabsTrigger>
              </TabsList>

              {/* Profile Settings */}
              <TabsContent value="profile">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>Update your personal information and contact details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {loadingProfile ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                      </div>
                    ) : (
                      <form onSubmit={handleProfileSubmit} className="space-y-6">
                        <div className="flex items-center gap-6">
                          <div className="w-20 h-20 bg-slate-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-2xl font-medium">
                              {user?.email ? user.email[0].toUpperCase() : 'A'}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <Button type="button" variant="outline" size="sm" disabled>
                              Change Photo
                            </Button>
                            <p className="text-sm text-gray-500">Coming soon</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input 
                              id="firstName" 
                              placeholder="John" 
                              value={profileData.first_name}
                              onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input 
                              id="lastName" 
                              placeholder="Doe" 
                              value={profileData.last_name}
                              onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address</Label>
                          <Input id="email" type="email" value={user?.email || ''} disabled />
                          <p className="text-xs text-gray-500">Email cannot be changed</p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input 
                            id="phone" 
                            type="tel" 
                            placeholder="+1 (555) 000-0000" 
                            value={profileData.phone}
                            onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                          />
                        </div>

                        <div className="flex justify-end gap-3">
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => {
                              // Reset form
                              loadUserData()
                            }}
                            disabled={updating}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" disabled={updating}>
                            {updating ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              'Save Changes'
                            )}
                          </Button>
                        </div>
                      </form>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Security Settings */}
              <TabsContent value="security">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Change Password</CardTitle>
                      <CardDescription>Update your password to keep your account secure</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="currentPassword">Current Password</Label>
                          <div className="relative">
                            <Input 
                              id="currentPassword" 
                              type={showPasswords.current ? "text" : "password"}
                              value={passwordData.currentPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                              placeholder="Enter your current password"
                              className="pr-12"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                              className="absolute right-0 top-0 h-full px-3 flex items-center justify-center text-gray-600 hover:text-gray-900 focus:outline-none cursor-pointer bg-transparent hover:bg-gray-50 transition-colors"
                              tabIndex={-1}
                              aria-label="Toggle password visibility"
                            >
                              {showPasswords.current ? (
                                <EyeOff className="h-5 w-5" />
                              ) : (
                                <Eye className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                          <p className="text-xs text-gray-500">Not verified, but recommended for security</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="newPassword">New Password</Label>
                          <div className="relative">
                            <Input 
                              id="newPassword" 
                              type={showPasswords.new ? "text" : "password"}
                              value={passwordData.newPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                              placeholder="At least 8 characters"
                              className="pr-12"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                              className="absolute right-0 top-0 h-full px-3 flex items-center justify-center text-gray-600 hover:text-gray-900 focus:outline-none cursor-pointer bg-transparent hover:bg-gray-50 transition-colors"
                              tabIndex={-1}
                              aria-label="Toggle password visibility"
                            >
                              {showPasswords.new ? (
                                <EyeOff className="h-5 w-5" />
                              ) : (
                                <Eye className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">Confirm New Password</Label>
                          <div className="relative">
                            <Input 
                              id="confirmPassword" 
                              type={showPasswords.confirm ? "text" : "password"}
                              value={passwordData.confirmPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                              placeholder="Re-enter your new password"
                              className="pr-12"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                              className="absolute right-0 top-0 h-full px-3 flex items-center justify-center text-gray-600 hover:text-gray-900 focus:outline-none cursor-pointer bg-transparent hover:bg-gray-50 transition-colors"
                              tabIndex={-1}
                              aria-label="Toggle password visibility"
                            >
                              {showPasswords.confirm ? (
                                <EyeOff className="h-5 w-5" />
                              ) : (
                                <Eye className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button type="submit" disabled={changingPassword}>
                            {changingPassword ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Updating...
                              </>
                            ) : (
                              'Update Password'
                            )}
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
    )
  }

  // Para admin, super_admin, support_staff: mostrar configuración genérica
  return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account and application preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-auto">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Settings */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal information and contact details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {loadingProfile ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <form onSubmit={handleProfileSubmit} className="space-y-6">
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 bg-slate-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-2xl font-medium">
                          {user?.email ? user.email[0].toUpperCase() : 'A'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <Button type="button" variant="outline" size="sm" disabled>
                          Change Photo
                        </Button>
                        <p className="text-sm text-gray-500">Coming soon</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName2">First Name</Label>
                        <Input 
                          id="firstName2" 
                          placeholder="John" 
                          value={profileData.first_name}
                          onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName2">Last Name</Label>
                        <Input 
                          id="lastName2" 
                          placeholder="Doe" 
                          value={profileData.last_name}
                          onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email2">Email Address</Label>
                      <Input id="email2" type="email" value={user?.email || ''} disabled />
                      <p className="text-xs text-gray-500">Email cannot be changed</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone2">Phone Number</Label>
                      <Input 
                        id="phone2" 
                        type="tel" 
                        placeholder="+1 (555) 000-0000" 
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      />
                    </div>

                    <div className="flex justify-end gap-3">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={loadUserData}
                        disabled={updating}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={updating}>
                        {updating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>Update your password to keep your account secure</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword2">Current Password</Label>
                      <div className="relative">
                        <Input 
                          id="currentPassword2" 
                          type={showPasswords.current ? "text" : "password"}
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                          placeholder="Enter your current password"
                          className="pr-12"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                          className="absolute right-0 top-0 h-full px-3 flex items-center justify-center text-gray-600 hover:text-gray-900 focus:outline-none cursor-pointer bg-transparent hover:bg-gray-50 transition-colors"
                          tabIndex={-1}
                          aria-label="Toggle password visibility"
                        >
                          {showPasswords.current ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">Not verified, but recommended for security</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword2">New Password</Label>
                      <div className="relative">
                        <Input 
                          id="newPassword2" 
                          type={showPasswords.new ? "text" : "password"}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                          placeholder="At least 8 characters"
                          className="pr-12"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                          className="absolute right-0 top-0 h-full px-3 flex items-center justify-center text-gray-600 hover:text-gray-900 focus:outline-none cursor-pointer bg-transparent hover:bg-gray-50 transition-colors"
                          tabIndex={-1}
                          aria-label="Toggle password visibility"
                        >
                          {showPasswords.new ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword2">Confirm New Password</Label>
                      <div className="relative">
                        <Input 
                          id="confirmPassword2" 
                          type={showPasswords.confirm ? "text" : "password"}
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                          placeholder="Re-enter your new password"
                          className="pr-12"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                          className="absolute right-0 top-0 h-full px-3 flex items-center justify-center text-gray-600 hover:text-gray-900 focus:outline-none cursor-pointer bg-transparent hover:bg-gray-50 transition-colors"
                          tabIndex={-1}
                          aria-label="Toggle password visibility"
                        >
                          {showPasswords.confirm ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button type="submit" disabled={changingPassword}>
                        {changingPassword ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          'Update Password'
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
  )
}

"use client"

import { AdminLayout } from "@/components/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { User, Shield } from "lucide-react"
import { useAdminAuth } from "@/contexts/admin-auth-context"
import { AgentDetailView } from "@/components/agent-detail-view"

export default function SettingsPage() {
  const { user, isAgent } = useAdminAuth()

  // Si es agente, mostrar su perfil de agente + configuración estándar
  if (isAgent && user) {
    return (
      <AdminLayout currentPage="Settings">
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
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 bg-slate-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-2xl font-medium">
                          {user.email ? user.email[0].toUpperCase() : 'A'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <Button variant="outline" size="sm">
                          Change Photo
                        </Button>
                        <p className="text-sm text-gray-500">JPG, PNG or GIF. Max size 2MB</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input id="firstName" placeholder="John" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input id="lastName" placeholder="Doe" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input id="email" type="email" value={user.email || ''} disabled />
                      <p className="text-xs text-gray-500">Email cannot be changed</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" />
                    </div>

                    

                    <div className="flex justify-end gap-3">
                      <Button variant="outline">Cancel</Button>
                      <Button>Save Changes</Button>
                    </div>
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
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <Input id="currentPassword" type="password" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input id="newPassword" type="password" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <Input id="confirmPassword" type="password" />
                      </div>
                      <div className="flex justify-end">
                        <Button>Update Password</Button>
                      </div>
                    </CardContent>
                  </Card>

                  
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </AdminLayout>
    )
  }

  // Para admin, super_admin, support_staff: mostrar configuración genérica
  return (
    <AdminLayout currentPage="Settings">
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
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-slate-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-2xl font-medium">A</span>
                  </div>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm">
                      Change Photo
                    </Button>
                    <p className="text-sm text-gray-500">JPG, PNG or GIF. Max size 2MB</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" placeholder="John" defaultValue="Admin" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" placeholder="Doe" defaultValue="User" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="admin@epicare.com" defaultValue="admin@epicare.com" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" defaultValue="+1 (555) 123-4567" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us about yourself"
                    defaultValue="System administrator for Epicare insurance platform"
                    rows={4}
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="outline">Cancel</Button>
                  <Button>Save Changes</Button>
                </div>
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
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input id="currentPassword" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input id="newPassword" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input id="confirmPassword" type="password" />
                  </div>
                  <div className="flex justify-end">
                    <Button>Update Password</Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Two-Factor Authentication</CardTitle>
                  <CardDescription>Add an extra layer of security to your account</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable 2FA</Label>
                      <p className="text-sm text-gray-500">Require authentication code in addition to password</p>
                    </div>
                    <Switch />
                  </div>
                  <Button variant="outline">Configure 2FA</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Active Sessions</CardTitle>
                  <CardDescription>Manage your active sessions across devices</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Current Session</p>
                        <p className="text-sm text-gray-500">Chrome on Windows - Miami, FL</p>
                      </div>
                      <span className="text-sm text-green-600">Active now</span>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Mobile Device</p>
                        <p className="text-sm text-gray-500">Safari on iPhone - Miami, FL</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Revoke
                      </Button>
                    </div>
                  </div>
                  <Button variant="destructive" className="w-full">
                    Sign Out All Other Sessions
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  )
}

"use client"

import { useState } from "react"
import { useAdminAuth } from "@/contexts/admin-auth-context"
import { RoleName, ROLE_INFO } from "@/lib/types/admin"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Crown, 
  Shield, 
  UserCog, 
  Headphones, 
  User, 
  Loader2,
  ChevronDown,
  RefreshCw
} from "lucide-react"
import { cn } from "@/lib/utils"

interface RoleSwitcherProps {
  variant?: "header" | "sidebar"
  className?: string
}

const RoleIcon = ({ role, className }: { role: RoleName; className?: string }) => {
  const iconProps = { className: cn("h-4 w-4", className) }
  
  switch (role) {
    case 'super_admin':
      return <Crown {...iconProps} />
    case 'admin':
      return <Shield {...iconProps} />
    case 'agent':
      return <UserCog {...iconProps} />
    case 'support_staff':
      return <Headphones {...iconProps} />
    case 'client':
    default:
      return <User {...iconProps} />
  }
}

export function RoleSwitcher({ variant = "header", className }: RoleSwitcherProps) {
  const { 
    activeRole, 
    availableRoles, 
    canSwitchRoles, 
    switchingRole, 
    switchRole 
  } = useAdminAuth()
  
  const [isOpen, setIsOpen] = useState(false)

  if (!activeRole) {
    return null
  }

  const roleInfo = ROLE_INFO[activeRole]

  const handleRoleChange = async (newRole: string) => {
    if (newRole === activeRole) return
    
    const success = await switchRole(newRole as RoleName)
    if (success) {
      setIsOpen(false)
    }
  }

  // Si solo tiene un rol, mostrar solo el badge sin dropdown
  if (!canSwitchRoles) {
    if (variant === "sidebar") {
      return (
        <div className={cn("flex items-center gap-2 px-3 py-2 bg-[#3a4145] rounded-lg", className)}>
          <div className={cn("p-1.5 rounded", roleInfo.color)}>
            <RoleIcon role={activeRole} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">{roleInfo.displayName}</p>
            <p className="text-xs text-slate-400 truncate">{roleInfo.description}</p>
          </div>
        </div>
      )
    }

    // Header variant - single role
    return (
      <Badge 
        variant="secondary" 
        className={cn("text-xs flex items-center gap-1", className)}
      >
        <RoleIcon role={activeRole} className="h-3 w-3" />
        {roleInfo.displayName}
      </Badge>
    )
  }

  // Múltiples roles - mostrar selector
  if (variant === "sidebar") {
    return (
      <div className={cn("space-y-2", className)}>
        <p className="text-xs text-slate-400 px-1">Rol Activo</p>
        <Select 
          value={activeRole} 
          onValueChange={handleRoleChange}
          disabled={switchingRole}
        >
          <SelectTrigger 
            className="w-full bg-[#3a4145] border-[#4a5155] text-white hover:bg-[#4a5155] focus:ring-orange-500"
          >
            <div className="flex items-center gap-2">
              {switchingRole ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RoleIcon role={activeRole} />
              )}
              <SelectValue>
                {ROLE_INFO[activeRole]?.displayName || activeRole}
              </SelectValue>
            </div>
          </SelectTrigger>
          <SelectContent className="bg-[#2E3438] border-[#4a5155]">
            {availableRoles.map((role) => {
              const info = ROLE_INFO[role]
              return (
                <SelectItem 
                  key={role} 
                  value={role}
                  className="text-white hover:bg-[#4a5155] focus:bg-[#4a5155] focus:text-white cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <RoleIcon role={role} className="h-4 w-4" />
                    <div>
                      <span className="font-medium">{info.displayName}</span>
                    </div>
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
        {switchingRole && (
          <p className="text-xs text-orange-400 flex items-center gap-1 px-1">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Cambiando rol...
          </p>
        )}
      </div>
    )
  }

  // Header variant - multiple roles
  return (
    <div className={cn("relative", className)}>
      <Select 
        value={activeRole} 
        onValueChange={handleRoleChange}
        disabled={switchingRole}
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <SelectTrigger 
          className="h-auto py-1 px-2 bg-transparent border-gray-200 hover:bg-gray-50 min-w-[120px]"
        >
          <div className="flex items-center gap-1.5">
            {switchingRole ? (
              <Loader2 className="h-3 w-3 animate-spin text-gray-500" />
            ) : (
              <div className={cn("p-1 rounded", roleInfo.color)}>
                <RoleIcon role={activeRole} className="h-3 w-3" />
              </div>
            )}
            <span className="text-xs font-medium text-gray-700">
              {ROLE_INFO[activeRole]?.displayName || activeRole}
            </span>
          </div>
        </SelectTrigger>
        <SelectContent align="end" className="min-w-[200px]">
          <div className="px-2 py-1.5 text-xs text-gray-500 font-medium border-b">
            Cambiar rol activo
          </div>
          {availableRoles.map((role) => {
            const info = ROLE_INFO[role]
            const isActive = role === activeRole
            return (
              <SelectItem 
                key={role} 
                value={role}
                className={cn(
                  "cursor-pointer",
                  isActive && "bg-gray-50"
                )}
              >
                <div className="flex items-center gap-2 py-0.5">
                  <div className={cn("p-1 rounded", info.color)}>
                    <RoleIcon role={role} className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{info.displayName}</span>
                    <span className="text-xs text-gray-500">{info.description}</span>
                  </div>
                  {isActive && (
                    <Badge variant="secondary" className="ml-auto text-[10px] px-1.5">
                      Activo
                    </Badge>
                  )}
                </div>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}


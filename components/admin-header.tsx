"use client"

import { useSession, signOut } from "next-auth/react"
import { Shield, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { UserRole } from "@prisma/client"

export function AdminHeader() {
  const { data: session } = useSession()

  const user = session?.user as
    | {
        name?: string | null
        email?: string | null
        role?: UserRole | null
      }
    | null

  const isAdmin = user?.role === "ADMIN"

  if (!user || !isAdmin) return null

  const displayName = user.name || user.email || "Administrador"

  const handleLogout = () => {
    signOut({ callbackUrl: "/" })
  }

  return (
    <header className="w-full border-b border-border bg-card px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none">Área de Administração</p>
          <p className="text-xs text-muted-foreground">
            Autenticado como <span className="font-medium">{displayName}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium tracking-wide">
          ADMIN
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Terminar sessão
        </Button>
      </div>
    </header>
  )
}

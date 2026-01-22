"use client"

import { Calendar, DoorOpen, CalendarDays, User, LogOut } from "lucide-react"
import { useSession, signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { toast } from "sonner"

interface SidebarNavProps {
  activeView: "rooms" | "reservations" | "calendar"
  onViewChange: (view: "rooms" | "reservations" | "calendar") => void
  onOpenProfile: () => void
}

export function SidebarNav({ activeView, onViewChange, onOpenProfile }: SidebarNavProps) {
  const { data: session, status } = useSession()

  const user = session?.user as {
    name?: string | null
    email?: string | null
    role?: string | null
  } | null

  const getInitials = (nameOrEmail: string) => {
    const source = nameOrEmail || ""
    if (!source) return "U"
    const parts = source.split(" ").filter(Boolean)

    if (parts.length > 1) {
      return parts
        .map((p) => p[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }

    return source.slice(0, 2).toUpperCase() || "U"
  }

  const displayName = user?.name || user?.email || "Utilizador"
  const displayEmail = user?.email || ""
  const displayRole =
    (user?.role === "admin" && "Administrador") ||
    (user?.role === "user" && "Utilizador") ||
    (user?.role === "guest" && "Convidado") ||
    null

  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: "/" })
      toast.success("Sessão terminada com sucesso")
    } catch (err) {
      console.error(err)
      toast.error("Não foi possível terminar a sessão")
    }
  }

  return (
    <div className="w-64 border-r border-border bg-card h-screen flex flex-col fixed left-0 top-0">
      {/* User Info at Top */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">
              {status === "loading" ? "A carregar..." : displayName}
            </p>
            {displayEmail && (
              <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
            )}
            {displayRole && (
              <p className="text-[10px] text-primary mt-0.5 uppercase tracking-wide">
                {displayRole}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
        <button
          onClick={() => onViewChange("rooms")}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors",
            activeView === "rooms"
              ? "bg-primary text-primary-foreground"
              : "hover:bg-accent text-foreground",
          )}
        >
          <DoorOpen className="h-5 w-5" />
          <span className="font-medium cursor-pointer">Salas Disponíveis</span>
        </button>

        <button
          onClick={() => onViewChange("reservations")}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors",
            activeView === "reservations"
              ? "bg-primary text-primary-foreground"
              : "hover:bg-accent text-foreground",
          )}
        >
          <Calendar className="h-5 w-5" />
          <span className="font-medium cursor-pointer">Minhas Reservas</span>
        </button>

        <button
          onClick={() => onViewChange("calendar")}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors",
            activeView === "calendar"
              ? "bg-primary text-primary-foreground"
              : "hover:bg-accent text-foreground",
          )}
        >
          <CalendarDays className="h-5 w-5" />
          <span className="font-medium cursor-pointer">Vista de Calendário</span>
        </button>
      </nav>

      {/* Footer: profile + logout */}
      <div className="p-4 border-t border-border space-y-2">
        <Button
          variant="outline"
          className="w-full bg-transparent cursor-pointer"
          onClick={onOpenProfile}
        >
          <User className="h-4 w-4 mr-2" />
          Perfil
        </Button>
        <Button
          variant="outline"
          className="w-full bg-transparent text-destructive hover:bg-destructive hover:text-white cursor-pointer"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Terminar Sessão
        </Button>
      </div>
    </div>
  )
}

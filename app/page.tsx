// app/page.tsx
"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"

import { SidebarNav } from "@/components/sidebar-nav"
import { RoomsGrid } from "@/components/rooms-grid"
import { MyReservations } from "@/components/my-reservations"
import { CalendarView } from "@/components/calendar-view"
import { CalendarHeader } from "@/components/calendar-header"
import { ProfileSettingsDialog } from "@/components/profile-settings-dialog"
import { LoginDialog } from "@/components/login-dialog"

import { LogIn, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  const { data: session, status } = useSession()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [profileOpen, setProfileOpen] = useState(false)
  const [activeView, setActiveView] = useState<"rooms" | "reservations" | "calendar">("rooms")
  const [loginOpen, setLoginOpen] = useState(false)

  const handlePreviousDay = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() - 1)
    setCurrentDate(newDate)
  }

  const handleNextDay = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + 1)
    setCurrentDate(newDate)
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const handleDateSelect = (date: Date) => {
    setCurrentDate(date)
  }

  const handleRoomsUpdate = () => {
    window.location.reload()
  }

  const handleLoginSuccess = () => {
    window.location.reload()
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">A verificar sessão...</p>
      </div>
    )
  }

  if (status === "unauthenticated" || !session?.user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Lock className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Room Reservation System</CardTitle>
            <CardDescription>
              Por favor inicie sessão para aceder ao sistema de reservas.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Button className="w-full" size="lg" onClick={() => setLoginOpen(true)}>
              <LogIn className="mr-2 h-5 w-5" />
              Iniciar sessão
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              Apenas emails <span className="font-medium">@legendary.pt</span> e{" "}
              <span className="font-medium">@silver-lining.pt</span> são permitidos para contas corporativas.
            </p>
          </CardContent>
        </Card>

        {/* Dialog de Login (Google / Outlook / etc) */}
        <LoginDialog
          open={loginOpen}
          onOpenChange={setLoginOpen}
          onLoginSuccess={handleLoginSuccess}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar fixa */}
      <SidebarNav
        activeView={activeView}
        onViewChange={setActiveView}
        onOpenProfile={() => setProfileOpen(true)}
      />

      {/* Conteúdo scrollable */}
      <main className="flex-1 ml-64 overflow-y-auto">
        <div className="container mx-auto px-6 py-6">
          {activeView !== "calendar" && (
            <CalendarHeader
              currentDate={currentDate}
              onPreviousDay={handlePreviousDay}
              onNextDay={handleNextDay}
              onToday={handleToday}
              onDateSelect={handleDateSelect}
            />
          )}

          {activeView === "rooms" && (
            <div className="mt-6">
              <h2 className="text-2xl font-bold mb-6">Salas Disponíveis</h2>
              <RoomsGrid />
            </div>
          )}

          {activeView === "reservations" && (
            <div className="mt-6">
              <MyReservations onEditReservation={() => {}} currentDate={currentDate} />
            </div>
          )}

          {activeView === "calendar" && (
            <div className="mt-6">
              <h2 className="text-2xl font-bold mb-6">Vista de Calendário</h2>
              <CalendarView currentDate={currentDate} />
            </div>
          )}
        </div>
      </main>

      <ProfileSettingsDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        onRoomsUpdate={handleRoomsUpdate}
      />
    </div>
  )
}

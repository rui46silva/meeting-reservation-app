// components/my-reservations.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import useSWR, { useSWRConfig } from "swr"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, Clock, MapPin, Users, Pencil, X, RefreshCcw } from "lucide-react"
import type { Reservation, Room } from "@/lib/types"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { EditReservationDialog } from "./edit-reservation-dialog"
import { ReservationsCalendar } from "./reservations-calendar"
import { useRooms } from "@/lib/hooks"
import { apiFetch } from "@/lib/api"

interface MyReservationsProps {
  onEditReservation?: (reservation: Reservation) => void
  currentDate: Date
}

function toReservationClient(r: any): Reservation {
  return {
    ...r,
    startTime: new Date(r.startTime),
    endTime: new Date(r.endTime),
    attendees: r.attendees ?? [],
  }
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("pt-PT", { weekday: "short", year: "numeric", month: "2-digit", day: "2-digit" })
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", hour12: false })
}

export function MyReservations({ onEditReservation, currentDate }: MyReservationsProps) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { mutate: mutateGlobal } = useSWRConfig()

  const { data: rooms = [], error: roomsError, isLoading: roomsLoading } = useRooms()

  const userId = (session?.user as any)?.id as string | undefined
  const userEmail = session?.user?.email ?? ""

  const reservationsKey = useMemo(() => {
    if (status !== "authenticated") return null

    const params = new URLSearchParams()
    if (userId) params.set("userId", userId)
    else if (userEmail) params.set("organizerEmail", userEmail)
    else return null

    return `/api/reservations?${params.toString()}`
  }, [status, userId, userEmail])

  const {
    data: reservationsRaw,
    error: reservationsError,
    isLoading: reservationsLoading,
    mutate: mutateReservations,
  } = useSWR<any[]>(reservationsKey, apiFetch, {
    revalidateOnFocus: false,
    dedupingInterval: 10_000,
    keepPreviousData: true,
  })

  const reservations: Reservation[] = useMemo(() => {
    return Array.isArray(reservationsRaw) ? reservationsRaw.map(toReservationClient) : []
  }, [reservationsRaw])

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [reservationToDelete, setReservationToDelete] = useState<Reservation | null>(null)

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [reservationToEdit, setReservationToEdit] = useState<Reservation | null>(null)

  const [selectedRooms, setSelectedRooms] = useState<string[]>([])
  const [showFilter, setShowFilter] = useState(false)

  useEffect(() => {
    if (roomsError) {
      console.error(roomsError)
      toast.error("Erro ao carregar salas")
    }
  }, [roomsError])

  useEffect(() => {
    if (reservationsError) {
      console.error(reservationsError)
      toast.error("Falha ao carregar reservas")
    }
  }, [reservationsError])

  useEffect(() => {
    if (rooms.length === 0) return
    setSelectedRooms((prev) => (prev.length ? prev : rooms.map((r: Room) => r.id)))
  }, [rooms])

  const safeSelectedRooms = Array.isArray(selectedRooms) ? selectedRooms : []

  const getRoom = (roomId: string) => rooms.find((r) => r.id === roomId) || null

  const refreshAllReservationsAndUI = async () => {
    await mutateGlobal((key) => typeof key === "string" && key.startsWith("/api/reservations"))
    await mutateGlobal((key) => typeof key === "string" && key.startsWith("/api/rooms"))
    router.refresh()
  }

  const handleDeleteClick = (reservation: Reservation) => {
    setReservationToDelete(reservation)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!reservationToDelete) {
      setDeleteDialogOpen(false)
      return
    }

    const id = reservationToDelete.id

    await mutateReservations(
      (current) => (Array.isArray(current) ? current.filter((r: any) => r.id !== id) : current),
      { revalidate: false },
    )

    try {
      const res = await fetch(`/api/reservations/${id}`, { method: "DELETE" })
      if (!res.ok) {
        console.error(await res.text().catch(() => ""))
        throw new Error("Erro ao cancelar reserva")
      }

      toast.success("Reserva cancelada", { description: "A sua reserva foi cancelada com sucesso." })
      await refreshAllReservationsAndUI()
    } catch (err) {
      console.error(err)
      toast.error("Ocorreu um erro ao cancelar a reserva.")
      await mutateReservations() 
    } finally {
      setDeleteDialogOpen(false)
      setReservationToDelete(null)
    }
  }

  const handleEditClick = (reservation: Reservation) => {
    setReservationToEdit(reservation)
    setEditDialogOpen(true)
    onEditReservation?.(reservation)
  }

  const handleUpdateReservation = async (
    reservationId: string,
    updates: Partial<Omit<Reservation, "id">>,
  ) => {
    await mutateReservations(
      (current: any[] | undefined) => {
        if (!Array.isArray(current)) return current
        return current.map((r) => (r.id === reservationId ? { ...r, ...updates } : r))
      },
      { revalidate: false },
    )

    try {
      const res = await fetch(`/api/reservations/${reservationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      if (!res.ok) {
        console.error(await res.text().catch(() => ""))
        throw new Error("Erro ao atualizar reserva")
      }

      const updated = await res.json()

      await mutateReservations(
        (current) =>
          Array.isArray(current)
            ? current.map((r: any) => (r.id === reservationId ? { ...r, ...updated } : r))
            : current,
        { revalidate: false },
      )

      toast.success("Reserva atualizada", { description: "A sua reserva foi atualizada com sucesso." })
      setEditDialogOpen(false)
      setReservationToEdit(null)

      await refreshAllReservationsAndUI()
    } catch (err) {
      console.error(err)
      toast.error("Ocorreu um erro ao atualizar a reserva.")
      await mutateReservations() 
    }
  }

  const handleRoomToggle = (roomId: string) => {
    setSelectedRooms((prev) => {
      const safePrev = Array.isArray(prev) ? prev : []
      return safePrev.includes(roomId) ? safePrev.filter((id) => id !== roomId) : [...safePrev, roomId]
    })
  }

  const handleSelectAllRooms = () => setSelectedRooms(rooms.map((r) => r.id))
  const handleDeselectAllRooms = () => setSelectedRooms([])

  const sortedReservations = useMemo(() => {
    return [...reservations].sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
  }, [reservations])

  const filteredReservations = useMemo(() => {
    if (safeSelectedRooms.length === 0) return sortedReservations
    return sortedReservations.filter((r) => safeSelectedRooms.includes(r.roomId))
  }, [sortedReservations, safeSelectedRooms])

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

  const todayReservations = filteredReservations.filter((r) => r.startTime >= todayStart && r.startTime <= todayEnd)
  const futureReservations = filteredReservations.filter((r) => r.startTime > todayEnd)

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">A carregar sessão...</p>
        </Card>
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div className="space-y-6">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Inicie sessão para ver as suas reservas.</p>
        </Card>
      </div>
    )
  }

  if (roomsLoading || reservationsLoading) {
    return (
      <div className="space-y-6">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">A carregar as suas reservas...</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-2xl font-bold">Calendário de Reservas de Salas</h3>
        <Button
          variant="outline"
          onClick={async () => {
            await refreshAllReservationsAndUI()
            toast.success("Atualizado")
          }}
        >
          <RefreshCcw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* ✅ CALENDÁRIO NOVO: salas em cima, horas à esquerda, blocos clicáveis */}
      <ReservationsCalendar
        currentDate={currentDate}
        rooms={rooms}
        reservations={filteredReservations}
        selectedRooms={safeSelectedRooms}
        onReservationClick={(r) => handleEditClick(r)}
      />

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Minhas Reservas</h3>
          <Button variant="outline" size="sm" onClick={() => setShowFilter(!showFilter)}>
            Filtrar Salas
          </Button>
        </div>

        {showFilter && (
          <Card className="p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">Filtrar por Sala</div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleSelectAllRooms}>
                  Selecionar Todas
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDeselectAllRooms}>
                  Desselecionar Todas
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {rooms.map((room) => (
                <div key={room.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`room-${room.id}`}
                    checked={safeSelectedRooms.includes(room.id)}
                    onChange={() => handleRoomToggle(room.id)}
                    className="accent-primary"
                  />
                  <label htmlFor={`room-${room.id}`} className="text-sm cursor-pointer">
                    {room.name}
                  </label>
                </div>
              ))}
            </div>
          </Card>
        )}

        {todayReservations.length === 0 && futureReservations.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Ainda não tem reservas.</p>
          </Card>
        )}

        {/* HOJE */}
        {todayReservations.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold">Hoje</h4>
            {todayReservations.map((r) => {
              const room = getRoom(r.roomId)
              return (
                <Card key={r.id} className="p-4 flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="font-semibold">{r.title}</div>
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        {fmtDate(r.startTime)}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {fmtTime(r.startTime)} – {fmtTime(r.endTime)}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {room?.name ?? "Sala"}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {(r.attendees?.length ?? 0) + 1} participantes
                      </span>
                    </div>

                    {r.googleEventId ? (
                        <Badge variant="secondary">Evento criado</Badge>
                      ) : (
                        <Badge variant="outline">Evento: —</Badge>
                      )}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleEditClick(r)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    <Button variant="outline" className="text-destructive" onClick={() => handleDeleteClick(r)}>
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {/* FUTURO */}
        {futureReservations.length > 0 && (
          <div className="space-y-3 mt-6">
            <h4 className="font-semibold">Próximas</h4>
            {futureReservations.map((r) => {
              const room = getRoom(r.roomId)
              return (
                <Card key={r.id} className="p-4 flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="font-semibold">{r.title}</div>
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        {fmtDate(r.startTime)}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {fmtTime(r.startTime)} – {fmtTime(r.endTime)}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {room?.name ?? "Sala"}
                      </span>
                    </div>

                    {r.googleEventId ? (
                      <Badge variant="secondary">Evento criado</Badge>
                    ) : (
                      <Badge variant="outline">Evento: —</Badge>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleEditClick(r)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    <Button variant="outline" className="text-destructive" onClick={() => handleDeleteClick(r)}>
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Reserva</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja cancelar esta reserva? Esta ação não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter Reserva</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Cancelar Reserva</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {reservationToEdit && (
        <EditReservationDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          reservation={reservationToEdit}
          onUpdate={handleUpdateReservation}
        />
      )}
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import type { Room, Reservation, TimeSlot } from "@/lib/types"
import { TimeSlotCard } from "./time-slot-card"
import { ReservationDialog } from "./reservation-dialog"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Info } from "lucide-react"

async function syncReservationToGoogleCalendar(reservation: {
  id?: string
  roomId: string
  title: string
  startTime: Date
  endTime: Date
  attendees: string[]
}) {
  const res = await fetch("/api/sync-google-calendar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reservation: {
        ...reservation,
        startTime: reservation.startTime.toISOString(),
        endTime: reservation.endTime.toISOString(),
      },
    }),
  })

  if (!res.ok) {
    throw new Error("Erro ao sincronizar com Google Calendar")
  }

  const data = await res.json()
  return data.googleEventId as string | undefined
}

interface RoomCalendarProps {
  room: Room
  currentDate: Date
  editingReservation?: Reservation
  onReservationComplete?: () => void
}

export function RoomCalendar({ room, currentDate, editingReservation, onReservationComplete }: RoomCalendarProps) {
  const { data: session } = useSession()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedSlots, setSelectedSlots] = useState<{ hour: number; minute: number }[]>([])

  useEffect(() => {
    const fetchReservations = async () => {
      try {
        setLoading(true)

        const from = new Date(currentDate)
        from.setHours(0, 0, 0, 0)
        const to = new Date(currentDate)
        to.setHours(23, 59, 59, 999)

        const params = new URLSearchParams({
          roomId: room.id,
          from: from.toISOString(),
          to: to.toISOString(),
        })

        const res = await fetch(`/api/reservations?${params.toString()}`)
        if (!res.ok) throw new Error("Falha ao carregar reservas")
        const data = await res.json()

        const normalized: Reservation[] = data.map((r: any) => ({
          ...r,
          startTime: new Date(r.startTime),
          endTime: new Date(r.endTime),
          attendees: r.attendees ?? [],
        }))

        setReservations(normalized)
      } catch (err) {
        console.error(err)
        toast.error("Erro ao carregar reservas desta sala")
      } finally {
        setLoading(false)
      }
    }

    fetchReservations()
  }, [room.id, currentDate])

  useEffect(() => {
    if (editingReservation) {
      const start = new Date(editingReservation.startTime)
      const end = new Date(editingReservation.endTime)
      const slots: { hour: number; minute: number }[] = []

      let current = new Date(start)
      while (current < end) {
        slots.push({ hour: current.getHours(), minute: current.getMinutes() })
        current = new Date(current.getTime() + 30 * 60 * 1000) 
      }

      setSelectedSlots(slots)
      setDialogOpen(true)
    }
  }, [editingReservation])

  const buildTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = []

    for (let hour = 9; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 9 && minute === 0) continue

        const slotDate = new Date(currentDate)
        slotDate.setHours(hour, minute, 0, 0)

        const reservation = reservations.find((r) => {
          const start = new Date(r.startTime)
          const end = new Date(r.endTime)
          return slotDate >= start && slotDate < end
        })

        slots.push({
          time: slotDate.toLocaleTimeString("pt-PT", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          hour,
          minute,
          isAvailable: !reservation,
          reservation,
        })
      }
    }

    return slots
  }

  const timeSlots = buildTimeSlots()

  const handleSlotSelect = (hour: number, minute: number) => {
    const slotIndex = selectedSlots.findIndex((s) => s.hour === hour && s.minute === minute)

    if (selectedSlots.length === 0) {
      setSelectedSlots([{ hour, minute }])
    } else if (slotIndex !== -1) {
      setSelectedSlots(selectedSlots.filter((_, i) => i !== slotIndex))
    } else {
      const allSlots = [...selectedSlots, { hour, minute }].sort((a, b) => {
        if (a.hour !== b.hour) return a.hour - b.hour
        return a.minute - b.minute
      })

      const isRangeAvailable = allSlots.every((slot) => {
        const s = timeSlots.find((ts) => ts.hour === slot.hour && ts.minute === slot.minute)
        return s?.isAvailable
      })

      if (isRangeAvailable) {
        const firstSlot = allSlots[0]
        const lastSlot = allSlots[allSlots.length - 1]
        const range: { hour: number; minute: number }[] = []

        let current = new Date(currentDate)
        current.setHours(firstSlot.hour, firstSlot.minute, 0, 0)
        const endTime = new Date(currentDate)
        endTime.setHours(lastSlot.hour, lastSlot.minute + 30, 0, 0)

        while (current < endTime) {
          range.push({ hour: current.getHours(), minute: current.getMinutes() })
          current = new Date(current.getTime() + 30 * 60 * 1000)
        }

        setSelectedSlots(range)
      } else {
        toast.error("Seleção inválida", {
          description: "Selecione apenas slots consecutivos e disponíveis.",
        })
      }
    }
  }

  const handleOpenReservationDialog = () => {
    if (selectedSlots.length > 0) {
      setDialogOpen(true)
    }
  }

  const handleSaveReservation = async (
    newReservation: Omit<Reservation, "id">,
    syncOptions: { google: boolean; microsoft: boolean },
  ) => {
    const user = session?.user as { id?: string; email?: string | null; name?: string | null } | undefined

    if (!user?.id || !user.email) {
      toast.error("Autenticação necessária", {
        description: "Inicie sessão para criar uma reserva.",
      })
      return
    }

    const newStart = new Date(newReservation.startTime)
    const newEnd = new Date(newReservation.endTime)

    const hasConflict = reservations.some((r) => {
      if (r.roomId !== room.id) return false
      const existingStart = new Date(r.startTime)
      const existingEnd = new Date(r.endTime)
      return newStart < existingEnd && newEnd > existingStart
    })

    if (hasConflict) {
      toast.error("Conflito de horário", {
        description: "Este horário já está reservado. Escolha outro horário.",
      })
      return
    }

    let googleEventId: string | undefined

    if (syncOptions.google) {
      try {
        googleEventId = await syncReservationToGoogleCalendar({
          roomId: room.id,
          title: newReservation.title,
          startTime: newStart,
          endTime: newEnd,
          attendees: newReservation.attendees,
        })
        if (googleEventId) {
          toast.success("Sincronizado com Google Calendar")
        }
      } catch (e) {
        console.error(e)
        toast.error("Falha ao sincronizar com Google Calendar")
      }
    }

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: room.id,
          title: newReservation.title,
          description: null,
          startTime: newStart.toISOString(),
          endTime: newEnd.toISOString(),
          organizerId: user.id,
          organizerEmail: user.email,
          organizerName: user.name ?? user.email,
          attendees: newReservation.attendees,
          googleEventId,
        }),
      })

      if (!res.ok) {
        console.error(await res.text())
        throw new Error("Erro ao criar reserva")
      }

      const created = await res.json()

      const createdReservation: Reservation = {
        ...created,
        startTime: new Date(created.startTime),
        endTime: new Date(created.endTime),
        attendees: created.attendees ?? [],
      }

      setReservations((prev) => [...prev, createdReservation])

      toast.success("Reserva criada", {
        description: `${room.name} foi reservada com sucesso.`,
      })

      setSelectedSlots([])
      setDialogOpen(false)
      onReservationComplete?.()
    } catch (err) {
      console.error(err)
      toast.error("Ocorreu um erro ao criar a reserva.")
    }
  }

  const handleUpdateReservation = async (
    reservationId: string,
    updates: Partial<Omit<Reservation, "id">>,
  ) => {
    try {
      const res = await fetch(`/api/reservations/${reservationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      if (!res.ok) {
        console.error(await res.text())
        throw new Error("Erro ao atualizar reserva")
      }

      const updated = await res.json()

      const updatedReservation: Reservation = {
        ...updated,
        startTime: new Date(updated.startTime),
        endTime: new Date(updated.endTime),
        attendees: updated.attendees ?? [],
      }

      setReservations((prev) => prev.map((r) => (r.id === reservationId ? updatedReservation : r)))

      toast.success("Reserva atualizada", {
        description: "A reserva foi atualizada com sucesso.",
      })

      setSelectedSlots([])
      setDialogOpen(false)
      onReservationComplete?.()
    } catch (err) {
      console.error(err)
      toast.error("Ocorreu um erro ao atualizar a reserva.")
    }
  }

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setSelectedSlots([])
      onReservationComplete?.()
    }
  }

  const getSelectedTimeRange = () => {
    if (selectedSlots.length === 0) return ""
    const first = selectedSlots[0]
    const last = selectedSlots[selectedSlots.length - 1]

    const formatTime = (h: number, m: number) => {
      const period = h >= 12 ? "PM" : "AM"
      const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h
      return `${displayHour}:${m.toString().padStart(2, "0")} ${period}`
    }

    return `${formatTime(first.hour, first.minute)} - ${formatTime(last.hour, last.minute + 30)}`
  }

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">{room.name}</h3>
        <p className="text-sm text-muted-foreground">
          Capacity: {room.capacity} people • {room.amenities.join(", ")}
        </p>
        {room.description && <p className="text-sm text-muted-foreground mt-1">{room.description}</p>}
        {(room.building || room.floor) && (
          <p className="text-sm text-muted-foreground">
            {room.building}
            {room.floor && ` - Floor ${room.floor}`}
          </p>
        )}

        {loading && (
          <p className="mt-2 text-sm text-muted-foreground">A carregar reservas...</p>
        )}

        {!loading && selectedSlots.length === 0 && (
          <div className="mt-2 flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              Clique nos horários disponíveis para selecionar. Selecione vários slots consecutivos
              para reservar períodos maiores.
            </p>
          </div>
        )}

        {!loading && selectedSlots.length > 0 && (
          <div className="mt-2 flex items-center justify-between bg-primary/10 p-3 rounded-md gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-primary">
                Selecionado: {getSelectedTimeRange()} ({selectedSlots.length} slot
                {selectedSlots.length !== 1 ? "s" : ""})
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedSlots([])}>
                Limpar
              </Button>
              <Button size="sm" onClick={handleOpenReservationDialog}>
                Reservar
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Lista dos slots */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {timeSlots.map((slot) => (
          <TimeSlotCard
            key={`${slot.hour}-${slot.minute}`}
            slot={slot}
            onSelect={handleSlotSelect}
            isSelected={selectedSlots.some((s) => s.hour === slot.hour && s.minute === slot.minute)}
            isInRange={
              selectedSlots.length > 1 &&
              selectedSlots.some((s) => s.hour === slot.hour && s.minute === slot.minute)
            }
          />
        ))}
      </div>

      <ReservationDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        roomId={room.id}
        roomName={room.name}
        selectedDate={currentDate}
        selectedSlots={selectedSlots}
        onSave={handleSaveReservation}
        editingReservation={editingReservation}
        onUpdate={handleUpdateReservation}
      />
    </div>
  )
}

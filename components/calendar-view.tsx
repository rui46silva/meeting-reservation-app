"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ReservationDetailDialog } from "@/components/reservation-detail-dialog"
import type { Room, Reservation } from "@/lib/types"
import { Clock } from "lucide-react"
import { toast } from "sonner"
import { useRooms, useReservations } from "@/lib/hooks"

interface CalendarViewProps {
  currentDate: Date
}

const ROOM_COLORS = [
  { bg: "bg-blue-100 dark:bg-blue-900/30", border: "border-blue-500", text: "text-blue-700 dark:text-blue-300" },
  { bg: "bg-green-100 dark:bg-green-900/30", border: "border-green-500", text: "text-green-700 dark:text-green-300" },
  { bg: "bg-purple-100 dark:bg-purple-900/30", border: "border-purple-500", text: "text-purple-700 dark:text-purple-300" },
  { bg: "bg-orange-100 dark:bg-orange-900/30", border: "border-orange-500", text: "text-orange-700 dark:text-orange-300" },
  { bg: "bg-pink-100 dark:bg-pink-900/30", border: "border-pink-500", text: "text-pink-700 dark:text-pink-300" },
  { bg: "bg-cyan-100 dark:bg-cyan-900/30", border: "border-cyan-500", text: "text-cyan-700 dark:text-cyan-300" },
]

type TimeSlot = { hour: number; minute: number }

function pad2(n: number) {
  return n.toString().padStart(2, "0")
}

function formatTimeSlot(hour: number, minute: number) {
  return `${pad2(hour)}:${pad2(minute)}`
}

function dayKey(d: Date) {
  const y = d.getFullYear()
  const m = pad2(d.getMonth() + 1)
  const day = pad2(d.getDate())
  return `${y}-${m}-${day}`
}

export function CalendarView({ currentDate }: CalendarViewProps) {
  const [selectedRooms, setSelectedRooms] = useState<string[]>([])
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)

  const { data: rooms = [], error: roomsError, isLoading: roomsLoading } = useRooms()

  useEffect(() => {
    if (roomsError) {
      console.error(roomsError)
      toast.error("Erro ao carregar salas")
    }
  }, [roomsError])

  const weekDays = useMemo(() => {
    const days: Date[] = []
    const startOfWeek = new Date(currentDate)
    startOfWeek.setHours(0, 0, 0, 0)
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay()) 

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek)
      d.setDate(startOfWeek.getDate() + i)
      days.push(d)
    }
    return days
  }, [currentDate])

  const { fromISO, toISO } = useMemo(() => {
    const start = new Date(weekDays[0] ?? currentDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(weekDays[6] ?? currentDate)
    end.setHours(23, 59, 59, 999)
    return { fromISO: start.toISOString(), toISO: end.toISOString() }
  }, [weekDays, currentDate])

  const {
    data: reservationsRaw = [],
    error: reservationsError,
    isLoading: reservationsLoading,
  } = useReservations({ from: fromISO, to: toISO })

  useEffect(() => {
    if (reservationsError) {
      console.error(reservationsError)
      toast.error("Erro ao carregar calendário de reservas")
    }
  }, [reservationsError])

  const reservations: Reservation[] = useMemo(() => {
    if (!Array.isArray(reservationsRaw)) return []
    return reservationsRaw.map((r: any) => ({
      ...r,
      startTime: new Date(r.startTime),
      endTime: new Date(r.endTime),
      attendees: r.attendees ?? [],
    }))
  }, [reservationsRaw])

  useEffect(() => {
    if (rooms.length === 0) return
    setSelectedRooms((prev) => {
      if (prev.length === 0) return rooms.map((r) => r.id)
      const roomIds = new Set(rooms.map((r) => r.id))
      return prev.filter((id) => roomIds.has(id))
    })
  }, [rooms])

  const timeSlots: TimeSlot[] = useMemo(() => {
    const slots: TimeSlot[] = []
    for (let hour = 9; hour <= 18; hour++) {
      if (hour === 9) {
        slots.push({ hour: 9, minute: 30 })
      } else if (hour === 18) {
        slots.push({ hour: 18, minute: 0 })
        slots.push({ hour: 18, minute: 30 })
        break
      } else {
        slots.push({ hour, minute: 0 })
        slots.push({ hour, minute: 30 })
      }
    }
    return slots
  }, [])

  const selectedRoomsSet = useMemo(() => new Set(selectedRooms), [selectedRooms])

  const roomMap = useMemo(() => {
    const m = new Map<string, Room>()
    for (const r of rooms) m.set(r.id, r)
    return m
  }, [rooms])

  const roomColorMap = useMemo(() => {
    const m = new Map<string, (typeof ROOM_COLORS)[number]>()
    for (let i = 0; i < rooms.length; i++) {
      m.set(rooms[i].id, ROOM_COLORS[i % ROOM_COLORS.length])
    }
    return m
  }, [rooms])

  const getRoomColor = useCallback(
    (roomId: string) => roomColorMap.get(roomId) ?? ROOM_COLORS[0],
    [roomColorMap],
  )

  const getRoomById = useCallback((roomId: string) => roomMap.get(roomId) ?? null, [roomMap])

  const startIndex = useMemo(() => {
    const map = new Map<string, Reservation[]>()

    for (const res of reservations) {
      if (!selectedRoomsSet.has(res.roomId)) continue

      const dKey = dayKey(res.startTime)
      const tKey = `${pad2(res.startTime.getHours())}:${pad2(res.startTime.getMinutes())}`
      const key = `${dKey}|${tKey}`

      const arr = map.get(key)
      if (arr) arr.push(res)
      else map.set(key, [res])
    }

    return map
  }, [reservations, selectedRoomsSet])

  const spanSlots = useCallback((res: Reservation) => {
    const start = res.startTime instanceof Date ? res.startTime : new Date(res.startTime)
    const end = res.endTime instanceof Date ? res.endTime : new Date(res.endTime)
    const mins = (end.getTime() - start.getTime()) / 60000
    return Math.max(1, Math.round(mins / 30))
  }, [])

  const toggleRoom = useCallback((roomId: string) => {
    setSelectedRooms((prev) => (prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]))
  }, [])

  const selectAll = useCallback(() => setSelectedRooms(rooms.map((r) => r.id)), [rooms])
  const deselectAll = useCallback(() => setSelectedRooms([]), [])

  const handleReservationClick = useCallback((reservation: Reservation) => {
    setSelectedReservation(reservation)
    setDetailDialogOpen(true)
  }, [])

  const formatDayHeader = useCallback((day: Date) => {
    const isToday = day.toDateString() === new Date().toDateString()
    const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
    return { dayName: dayNames[day.getDay()], dayNumber: day.getDate(), isToday }
  }, [])

  const loading = roomsLoading || reservationsLoading

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">Filtrar Salas</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAll} disabled={rooms.length === 0}>
              Selecionar Todas
            </Button>
            <Button variant="outline" size="sm" onClick={deselectAll} disabled={rooms.length === 0}>
              Desselecionar Todas
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          {rooms.map((room) => {
            const color = getRoomColor(room.id)
            return (
              <div key={room.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`room-${room.id}`}
                  checked={selectedRooms.includes(room.id)}
                  onCheckedChange={() => toggleRoom(room.id)}
                />
                <Label htmlFor={`room-${room.id}`} className="cursor-pointer flex items-center gap-2">
                  <div className={`w-3 h-3 rounded ${color.bg} ${color.border} border-2`} />
                  {room.name}
                </Label>
              </div>
            )
          })}
        </div>
      </Card>

      {loading ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">A carregar calendário...</p>
        </Card>
      ) : selectedRooms.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            Nenhuma sala selecionada. Selecione pelo menos uma sala para visualizar o calendário.
          </p>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-background shadow-sm">
          {/* Header */}
          <div className="grid grid-cols-[100px_1fr] divide-x border-b">
            <div className="bg-muted/50 p-3 font-semibold text-sm sticky left-0 z-10 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
            <div className="grid divide-x" style={{ gridTemplateColumns: `repeat(7, 1fr)` }}>
              {weekDays.map((day) => {
                const { dayName, dayNumber, isToday } = formatDayHeader(day)
                return (
                  <div
                    key={day.toISOString()}
                    className={`p-3 text-center ${
                      isToday ? "bg-primary/10 border-b-4 border-primary" : "bg-muted/30 border-b-2 border-border"
                    }`}
                  >
                    <div className={`font-semibold text-sm ${isToday ? "text-primary" : "text-foreground"}`}>
                      {dayName}
                    </div>
                    <div
                      className={[
                        "text-lg font-bold mt-1",
                        isToday ? "text-primary" : "text-muted-foreground",
                        isToday
                          ? "bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto"
                          : "",
                      ].join(" ")}
                    >
                      {dayNumber}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Body */}
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {timeSlots.map(({ hour, minute }) => {
              const slotLabel = formatTimeSlot(hour, minute)
              return (
                <div key={slotLabel} className="grid grid-cols-[100px_1fr] divide-x min-h-[60px]">
                  <div className="bg-muted/30 p-2 text-xs text-muted-foreground flex items-center justify-center sticky left-0 z-10 font-medium">
                    {slotLabel}
                  </div>

                  <div className="grid divide-x" style={{ gridTemplateColumns: `repeat(7, 1fr)` }}>
                    {weekDays.map((day) => {
                      const key = `${dayKey(day)}|${slotLabel}`
                      const startingReservations = startIndex.get(key) ?? []

                      return (
                        <div key={day.toISOString()} className="relative p-1 hover:bg-muted/30 transition-colors">
                          {startingReservations.map((reservation) => {
                            const span = spanSlots(reservation)
                            const color = getRoomColor(reservation.roomId)
                            const room = getRoomById(reservation.roomId)

                            return (
                              <div
                                key={reservation.id}
                                className={`absolute inset-1 ${color.bg} border-l-4 ${color.border} rounded p-1 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden`}
                                style={{ height: `calc(${span * 60}px - 8px)` }}
                                onClick={() => handleReservationClick(reservation)}
                              >
                                <div className={`text-xs font-semibold ${color.text} line-clamp-1`}>
                                  {reservation.title}
                                </div>
                                <div className="text-xs text-muted-foreground line-clamp-1">{room?.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {formatTimeSlot(reservation.startTime.getHours(), reservation.startTime.getMinutes())}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <ReservationDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        reservation={selectedReservation}
        room={selectedReservation ? getRoomById(selectedReservation.roomId) : null}
      />
    </div>
  )
}

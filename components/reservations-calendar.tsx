// components/reservations-calendar.tsx
"use client"

import { useMemo } from "react"
import { Card } from "@/components/ui/card"
import type { Room, Reservation } from "@/lib/types"
import { Clock } from "lucide-react"

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart
}

function buildTimeSlots() {
  const slots: { hour: number; minute: number }[] = []
  for (let hour = 9; hour <= 18; hour++) {
    if (hour === 9) slots.push({ hour: 9, minute: 30 })
    else if (hour === 18) {
      slots.push({ hour: 18, minute: 0 })
      slots.push({ hour: 18, minute: 30 })
      break
    } else {
      slots.push({ hour, minute: 0 })
      slots.push({ hour, minute: 30 })
    }
  }
  return slots
}

function slotDate(baseDay: Date, hour: number, minute: number) {
  const d = new Date(baseDay)
  d.setHours(hour, minute, 0, 0)
  return d
}

function hhmm(d: Date) {
  return d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", hour12: false })
}

function getSpanInSlots(start: Date, end: Date) {
  const mins = (end.getTime() - start.getTime()) / 60000
  return Math.max(1, Math.round(mins / 30))
}

export function ReservationsCalendar({
  currentDate,
  rooms,
  reservations,
  selectedRooms,
  onReservationClick,
}: {
  currentDate: Date
  rooms: Room[]
  reservations: Reservation[]
  selectedRooms: string[]
  onReservationClick?: (r: Reservation) => void
}) {
  const day = useMemo(() => new Date(currentDate), [currentDate])
  const timeSlots = useMemo(() => buildTimeSlots(), [])

  const visibleRooms = useMemo(() => {
    if (!Array.isArray(rooms)) return []
    if (!Array.isArray(selectedRooms) || selectedRooms.length === 0) return rooms
    const set = new Set(selectedRooms)
    return rooms.filter((r) => set.has(r.id))
  }, [rooms, selectedRooms])

  const reservationsByRoom = useMemo(() => {
    const map = new Map<string, Reservation[]>()
    for (const r of reservations || []) {
      if (!visibleRooms.find((vr) => vr.id === r.roomId)) continue
      const arr = map.get(r.roomId) || []
      arr.push(r)
      map.set(r.roomId, arr)
    }
    for (const [k, arr] of map) {
      arr.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
      map.set(k, arr)
    }
    return map
  }, [reservations, visibleRooms])

  const cellHeightPx = 56

  if (visibleRooms.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        Nenhuma sala selecionada.
      </Card>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-background shadow-sm">
      {/* HEADER */}
      <div className="grid grid-cols-[90px_1fr] divide-x border-b">
        <div className="bg-muted/50 p-3 text-sm font-semibold sticky left-0 z-10 flex items-center justify-center">
          <Clock className="h-4 w-4" />
        </div>
        <div
          className="grid divide-x"
          style={{ gridTemplateColumns: `repeat(${visibleRooms.length}, minmax(220px, 1fr))` }}
        >
          {visibleRooms.map((room) => (
            <div key={room.id} className="p-3 text-center font-semibold text-sm bg-muted/30">
              {room.name}
            </div>
          ))}
        </div>
      </div>

      {/* BODY */}
      <div className="max-h-[650px] overflow-auto">
        {timeSlots.map(({ hour, minute }) => {
          const slotStart = slotDate(day, hour, minute)
          const slotEnd = new Date(slotStart.getTime() + 30 * 60000)

          return (
            <div
              key={`${hour}-${minute}`}
              className="grid grid-cols-[90px_1fr] divide-x border-b"
              style={{ minHeight: cellHeightPx }}
            >
              <div className="bg-muted/30 px-2 text-xs text-muted-foreground flex items-center justify-center sticky left-0 z-10">
                {hhmm(slotStart)}
              </div>

              <div
                className="grid divide-x"
                style={{ gridTemplateColumns: `repeat(${visibleRooms.length}, minmax(220px, 1fr))` }}
              >
                {visibleRooms.map((room) => {
                  const roomRes = reservationsByRoom.get(room.id) || []

                  const inSlot = roomRes.filter((r) =>
                    overlaps(slotStart, slotEnd, r.startTime, r.endTime),
                  )

                  const starting = inSlot.filter((r) => {
                    const st = r.startTime
                    return st.getHours() === hour && st.getMinutes() === minute
                  })

                  return (
                    <div key={room.id} className="relative p-1 hover:bg-muted/20">
                      {starting.map((r) => {
                        const span = getSpanInSlots(r.startTime, r.endTime)
                        return (
                          <button
                            key={r.id}
                            onClick={() => onReservationClick?.(r)}
                            className="absolute inset-x-1 top-1 rounded border-l-4 border-primary bg-primary/10 p-2 text-left hover:opacity-90 transition overflow-hidden"
                            style={{ height: span * cellHeightPx - 8 }}
                            title={r.title}
                          >
                            <div className="text-xs font-semibold line-clamp-1">{r.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {hhmm(r.startTime)} – {hhmm(r.endTime)}
                            </div>
                          </button>
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
  )
}

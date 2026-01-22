"use client"

import { RoomCard } from "@/components/room-card"
import { BookingDialog } from "@/components/booking-dialog"
import type { Room } from "@/lib/types"
import { toast } from "sonner"
import { useEffect, useState } from "react"
import { useRooms } from "@/lib/hooks"

export function RoomsGrid() {
  const { data: rooms, isLoading, error } = useRooms()
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [bookingOpen, setBookingOpen] = useState(false)

  useEffect(() => {
    if (error) toast.error("Erro ao carregar salas")
  }, [error])

  const handleRoomClick = (room: Room) => {
    setSelectedRoom(room)
    setBookingOpen(true)
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">A carregar salas...</p>
  }

  if (!rooms?.length) {
    return <p className="text-sm text-muted-foreground">Ainda não existem salas configuradas.</p>
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.map((room) => (
          <RoomCard key={room.id} room={room} onClick={() => handleRoomClick(room)} />
        ))}
      </div>

      {selectedRoom && (
        <BookingDialog open={bookingOpen} onOpenChange={setBookingOpen} room={selectedRoom} />
      )}
    </>
  )
}

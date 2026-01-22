"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import type { Reservation, Room } from "@/lib/types"
import { Calendar, Clock, MapPin, Users, Building } from "lucide-react"

interface ReservationDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reservation: Reservation | null
  room: Room | null
}

export function ReservationDetailDialog({
  open,
  onOpenChange,
  reservation,
  room,
}: ReservationDetailDialogProps) {
  if (!reservation || !room) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reserva não encontrada</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Não foi possível carregar os detalhes da reserva.
          </p>
        </DialogContent>
      </Dialog>
    )
  }

  const startTime = new Date(reservation.startTime)
  const endTime = new Date(reservation.endTime)

  const formatTime = (date: Date) => {
    return `${date.getHours().toString().padStart(2, "0")}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}`
  }

  const formatDate = (date: Date) => {
    const dayNames = [
      "Domingo",
      "Segunda-feira",
      "Terça-feira",
      "Quarta-feira",
      "Quinta-feira",
      "Sexta-feira",
      "Sábado",
    ]
    const monthNames = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ]

    return `${dayNames[date.getDay()]}, ${date.getDate()} de ${
      monthNames[date.getMonth()]
    } de ${date.getFullYear()}`
  }

  const attendees = reservation.attendees ?? []
  const amenities = room.amenities ?? []

  const durationMinutes = Math.round(
    (endTime.getTime() - startTime.getTime()) / (1000 * 60),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">{reservation.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sala / Local */}
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="font-semibold text-foreground">{room.name}</div>
              <div className="text-sm text-muted-foreground">
                {room.building && `${room.building}`}
                {room.building && room.floor && ", "}
                {room.floor && `Piso ${room.floor}`}
              </div>
            </div>
          </div>

          {/* Data */}
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="font-medium text-foreground">
                {formatDate(startTime)}
              </div>
            </div>
          </div>

          {/* Horário */}
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="font-medium text-foreground">
                {formatTime(startTime)} - {formatTime(endTime)}
              </div>
              <div className="text-sm text-muted-foreground">
                Duração: {durationMinutes} minutos
              </div>
            </div>
          </div>

          {/* Participantes */}
          {attendees.length > 0 && (
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <div className="font-medium text-foreground mb-2">
                  Participantes ({attendees.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {attendees.map((attendee, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {attendee}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Comodidades */}
          {amenities.length > 0 && (
            <div className="flex items-start gap-3">
              <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <div className="font-medium text-foreground mb-2">
                  Comodidades da Sala
                </div>
                <div className="flex flex-wrap gap-1">
                  {amenities.map((amenity, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {amenity}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Descrição da sala */}
          {room.description && (
            <div className="pt-2 border-t">
              <div className="text-sm text-muted-foreground">
                {room.description}
              </div>
            </div>
          )}

          {/* Capacidade */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Capacidade: {room.capacity} pessoas
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

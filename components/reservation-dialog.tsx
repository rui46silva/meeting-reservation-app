"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import type { Reservation } from "@/lib/types"

interface ReservationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roomId: string
  roomName: string
  selectedDate: Date
  selectedSlots: { hour: number; minute: number }[]
  onSave: (
    reservation: Omit<Reservation, "id">,
    syncOptions: { google: boolean; microsoft: boolean },
  ) => void
  editingReservation?: Reservation
  onUpdate?: (reservationId: string, updates: Partial<Omit<Reservation, "id">>) => void
}

export function ReservationDialog({
  open,
  onOpenChange,
  roomId,
  roomName,
  selectedDate,
  selectedSlots,
  onSave,
  editingReservation,
  onUpdate,
}: ReservationDialogProps) {
  const [title, setTitle] = useState("")
  const [attendees, setAttendees] = useState("")
  const [syncGoogle, setSyncGoogle] = useState(false)
  const [syncMicrosoft, setSyncMicrosoft] = useState(false)

  useEffect(() => {
    if (editingReservation) {
      setTitle(editingReservation.title)
      setAttendees((editingReservation.attendees ?? []).join(", "))
    } else {
      setTitle("")
      setAttendees("")
    }
  }, [editingReservation])

  const handleSave = () => {
    if (!selectedSlots || selectedSlots.length === 0) return

    const firstSlot = selectedSlots[0]
    const lastSlot = selectedSlots[selectedSlots.length - 1]

    const startTime = new Date(selectedDate)
    startTime.setHours(firstSlot.hour, firstSlot.minute, 0, 0)

    const endTime = new Date(selectedDate)
    endTime.setHours(lastSlot.hour, lastSlot.minute + 30, 0, 0)

    const attendeesArray = attendees
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean)

    if (editingReservation && onUpdate) {
      onUpdate(editingReservation.id, {
        title,
        startTime,
        endTime,
        attendees: attendeesArray,
      })
    } else {
      onSave(
        {
          roomId,
          title,
          startTime,
          endTime,
          attendees: attendeesArray,
          userId: "",
        } as Omit<Reservation, "id">,
        { google: syncGoogle, microsoft: syncMicrosoft },
      )
    }

    setTitle("")
    setAttendees("")
    setSyncGoogle(false)
    setSyncMicrosoft(false)
    onOpenChange(false)
  }

  const formatTimeDisplay = () => {
    if (!selectedSlots || selectedSlots.length === 0) {
      return { start: "", end: "", duration: "" }
    }

    const firstSlot = selectedSlots[0]
    const lastSlot = selectedSlots[selectedSlots.length - 1]

    const formatTime = (hour: number, minute: number) => {
      return `${hour.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}`
    }

    const durationMinutes = selectedSlots.length * 30
    const hours = Math.floor(durationMinutes / 60)
    const minutes = durationMinutes % 60
    const durationText =
      hours > 0
        ? `${hours} hora${hours !== 1 ? "s" : ""}${
            minutes > 0 ? ` ${minutes} min` : ""
          }`
        : `${minutes} min`

    return {
      start: formatTime(firstSlot.hour, firstSlot.minute),
      end: formatTime(lastSlot.hour, lastSlot.minute + 30),
      duration: durationText,
    }
  }

  const timeDisplay = formatTimeDisplay()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingReservation ? "Editar Reserva" : `Reservar ${roomName}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título da reunião</Label>
            <Input
              id="title"
              placeholder="Reunião de equipa"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="attendees">
              Participantes (emails separados por vírgulas)
            </Label>
            <Input
              id="attendees"
              placeholder="joao@example.com, maria@example.com"
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
            />
          </div>

          {!editingReservation && (
            <div className="space-y-3 pt-2 border-t border-border">
              <Label className="text-sm font-medium">Sincronizar com Calendário</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sync-google"
                  checked={syncGoogle}
                  onCheckedChange={(checked) =>
                    setSyncGoogle(checked as boolean)
                  }
                />
                <Label
                  htmlFor="sync-google"
                  className="cursor-pointer text-sm font-normal"
                >
                  Google Calendar
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sync-microsoft"
                  checked={syncMicrosoft}
                  onCheckedChange={(checked) =>
                    setSyncMicrosoft(checked as boolean)
                  }
                />
                <Label
                  htmlFor="sync-microsoft"
                  className="cursor-pointer text-sm font-normal"
                >
                  Microsoft Calendar
                </Label>
              </div>
            </div>
          )}

          {timeDisplay.start && (
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
              <p className="font-medium mb-1">Detalhes da reserva:</p>
              <p>
                Data:{" "}
                {selectedDate.toLocaleDateString("pt-PT", {
                  weekday: "short",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </p>
              <p>
                Horário: {timeDisplay.start} - {timeDisplay.end}
              </p>
              <p>Duração: {timeDisplay.duration}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!title || !selectedSlots || selectedSlots.length === 0}
          >
            {editingReservation ? "Atualizar Reserva" : "Confirmar Reserva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

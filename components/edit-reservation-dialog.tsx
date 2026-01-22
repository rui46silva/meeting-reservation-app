"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Reservation, Room } from "@/lib/types"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

interface EditReservationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reservation: Reservation
  onUpdate: (reservationId: string, updates: Partial<Omit<Reservation, "id">>) => void
}

export function EditReservationDialog({
  open,
  onOpenChange,
  reservation,
  onUpdate,
}: EditReservationDialogProps) {
  const [title, setTitle] = useState(reservation.title)
  const [attendees, setAttendees] = useState((reservation.attendees ?? []).join(", "))
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(reservation.startTime))
  const [startHour, setStartHour] = useState(new Date(reservation.startTime).getHours())
  const [endHour, setEndHour] = useState(new Date(reservation.endTime).getHours())
  const [selectedRoomId, setSelectedRoomId] = useState(reservation.roomId)
  const [rooms, setRooms] = useState<Room[]>([])
  const [hasConflict, setHasConflict] = useState(false)
  const [checkingConflict, setCheckingConflict] = useState(false)

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await fetch("/api/rooms")
        if (!res.ok) throw new Error("Falha ao carregar salas")
        const data = await res.json()
        setRooms(data)
      } catch (err) {
        console.error("[EditReservationDialog] erro a carregar salas", err)
        toast.error("Falha ao carregar salas")
      }
    }

    fetchRooms()
  }, [])

  useEffect(() => {
    setTitle(reservation.title)
    setAttendees((reservation.attendees ?? []).join(", "))
    setSelectedDate(new Date(reservation.startTime))
    setStartHour(new Date(reservation.startTime).getHours())
    setEndHour(new Date(reservation.endTime).getHours())
    setSelectedRoomId(reservation.roomId)
  }, [reservation])

  useEffect(() => {
    if (!open) return
    if (!selectedRoomId) {
      setHasConflict(false)
      return
    }
  
    const checkConflicts = async () => {
      try {
        setCheckingConflict(true)
  
        const startTime = new Date(selectedDate)
        startTime.setHours(startHour, 0, 0, 0)
  
        const endTime = new Date(selectedDate)
        endTime.setHours(endHour, 0, 0, 0)
  
        if (endTime <= startTime) {
          setHasConflict(false)
          return
        }
  
        const params = new URLSearchParams({
          roomId: selectedRoomId,
          from: startTime.toISOString(),
          to: endTime.toISOString(),
        })
  
        const res = await fetch(`/api/reservations?${params.toString()}`)
        if (!res.ok) throw new Error("Falha ao verificar conflitos")
  
        const data: Reservation[] = await res.json()
  
        const conflict = data.some((r) => {
          if (r.id === reservation.id) return false
          const rStart = new Date(r.startTime)
          const rEnd = new Date(r.endTime)
          return startTime < rEnd && endTime > rStart
        })
  
        setHasConflict(conflict)
      } catch (err) {
        console.error("[EditReservationDialog] erro a verificar conflitos", err)
        setHasConflict(false)
      } finally {
        setCheckingConflict(false)
      }
    }
  
    checkConflicts()
  }, [open, selectedDate, startHour, endHour, selectedRoomId, reservation.id])
  

  const handleSave = () => {
    if (hasConflict) {
      toast.error("Conflito de horário", {
        description: "Este horário já está reservado. Por favor escolha outro horário ou sala.",
      })
      return
    }

    if (!title.trim()) {
      toast.error("Título obrigatório", {
        description: "Por favor introduza um título para a reserva.",
      })
      return
    }

    if (endHour <= startHour) {
      toast.error("Intervalo de horas inválido", {
        description: "A hora de fim deve ser posterior à hora de início.",
      })
      return
    }

    const startTime = new Date(selectedDate)
    startTime.setHours(startHour, 0, 0, 0)

    const endTime = new Date(selectedDate)
    endTime.setHours(endHour, 0, 0, 0)

    onUpdate(reservation.id, {
      title: title.trim(),
      roomId: selectedRoomId,
      startTime,
      endTime,
      attendees: attendees
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
    })

    onOpenChange(false)
  }

  const hours = Array.from({ length: 24 }, (_, i) => i)
  const availableEndHours = hours.filter((h) => h > startHour)

  const isSaveDisabled = !title.trim() || endHour <= startHour || hasConflict || checkingConflict

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Reserva</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Título da reunião</Label>
            <Input
              id="edit-title"
              placeholder="Team Standup"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-room">Sala</Label>
            <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
              <SelectTrigger id="edit-room">
                <SelectValue placeholder="Selecione uma sala" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-start-hour">Hora de início</Label>
              <Select value={startHour.toString()} onValueChange={(v) => setStartHour(Number.parseInt(v))}>
                <SelectTrigger id="edit-start-hour">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hours.map((h) => (
                    <SelectItem key={h} value={h.toString()}>
                      {h.toString().padStart(2, "0")}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-end-hour">Hora de fim</Label>
              <Select value={endHour.toString()} onValueChange={(v) => setEndHour(Number.parseInt(v))}>
                <SelectTrigger id="edit-end-hour">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableEndHours.map((h) => (
                    <SelectItem key={h} value={h.toString()}>
                      {h.toString().padStart(2, "0")}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {hasConflict && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
              <p className="text-sm text-destructive">
                Este horário já está reservado. Escolha outro horário ou sala.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-attendees">Participantes (separar emails por vírgulas)</Label>
            <Input
              id="edit-attendees"
              placeholder="john@example.com, jane@example.com"
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaveDisabled}>
            {checkingConflict ? "A verificar..." : "Atualizar Reserva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

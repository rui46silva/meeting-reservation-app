// components/booking-dialog.tsx
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, MapPin, Clock, Video, Mail } from "lucide-react"
import type { Room } from "@/lib/types"
import { toast } from "sonner"
import { useRooms } from "@/lib/hooks"

type LightReservation = {
  id: string
  startTime: Date
  endTime: Date
  title?: string
}

async function sendReservationEmailsViaApi(payload: any) {
  const res = await fetch("/api/reservation-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error("Falha ao enviar emails de reserva")
  return res.json()
}

interface BookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  room?: Room
  preselectedRoom?: string
  preselectedDate?: Date
  preselectedTime?: { hour: number; minute: number }
  onReservationCreated?: () => void
}

const DURATION_OPTIONS = [
  { label: "30 min", minutes: 30 },
  { label: "1 hora", minutes: 60 },
  { label: "1.5 horas", minutes: 90 },
  { label: "2 horas", minutes: 120 },
  { label: "2.5 horas", minutes: 150 },
  { label: "3 horas", minutes: 180 },
  { label: "3.5 horas", minutes: 210 },
  { label: "4 horas", minutes: 240 },
]

function formatHHMM(hour: number, minute: number) {
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
}

function parseHHMM(value: string) {
  const [h, m] = value.split(":").map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  if (h < 0 || h > 23 || m < 0 || m > 59) return null
  return { h, m }
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart
}

function isValidDate(d: any): d is Date {
  return d instanceof Date && !Number.isNaN(d.getTime())
}

function stableHash(input: string) {
  let h = 5381
  for (let i = 0; i < input.length; i++) h = (h * 33) ^ input.charCodeAt(i)
  return `req-${(h >>> 0).toString(16)}`
}

export function BookingDialog({
  open,
  onOpenChange,
  room,
  preselectedRoom,
  preselectedDate,
  preselectedTime,
  onReservationCreated,
}: BookingDialogProps) {
  const { data: session } = useSession()
  const currentUser = session?.user as any | undefined

  const { data: rooms = [], error: roomsError } = useRooms()

  useEffect(() => {
    if (roomsError) {
      console.error(roomsError)
      toast.error("Erro ao carregar salas")
    }
  }, [roomsError])

  const [selectedRoomId, setSelectedRoomId] = useState<string>("")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())

  const [timeMode, setTimeMode] = useState<"slot" | "manual">("slot")

  const [startTime, setStartTime] = useState<string>("")
  const [duration, setDuration] = useState<number | null>(null)

  const [manualStart, setManualStart] = useState<string>("")
  const [manualEnd, setManualEnd] = useState<string>("")

  const [titleDraft, setTitleDraft] = useState("")
  const [titleCommitted, setTitleCommitted] = useState("")

  const [description, setDescription] = useState("")
  const [attendees, setAttendees] = useState("")

  const [videoLink, setVideoLink] = useState("")
  const [isGeneratingLink, setIsGeneratingLink] = useState(false)
  const [googleEventId, setGoogleEventId] = useState<string | null>(null)

  const [dayReservations, setDayReservations] = useState<LightReservation[]>([])
  const [loadingDayReservations, setLoadingDayReservations] = useState(false)

  const lastMeetKeyRef = useRef<string>("")
  const inflightMeetKeyRef = useRef<string>("")
  const meetAbortRef = useRef<AbortController | null>(null)

  const selectedRoom = useMemo(() => {
    return rooms.find((r) => r.id === selectedRoomId) || room
  }, [rooms, selectedRoomId, room])

  useEffect(() => {
    if (room) setSelectedRoomId(room.id)
    else if (preselectedRoom) setSelectedRoomId(preselectedRoom)

    if (preselectedDate) setSelectedDate(preselectedDate)

    if (preselectedTime) {
      setTimeMode("slot")
      setStartTime(formatHHMM(preselectedTime.hour, preselectedTime.minute))
      setDuration(null)
    }
  }, [room, preselectedRoom, preselectedDate, preselectedTime])

  useEffect(() => {
    if (!open) {
      if (!room && !preselectedRoom) setSelectedRoomId("")
      setSelectedDate(new Date())

      setTimeMode("slot")
      setStartTime("")
      setDuration(null)
      setManualStart("")
      setManualEnd("")

      setTitleDraft("")
      setTitleCommitted("")
      setDescription("")
      setAttendees("")

      setVideoLink("")
      setIsGeneratingLink(false)
      setGoogleEventId(null)

      setDayReservations([])
      setLoadingDayReservations(false)

      lastMeetKeyRef.current = ""
      inflightMeetKeyRef.current = ""
      if (meetAbortRef.current) meetAbortRef.current.abort()
      meetAbortRef.current = null
    }
  }, [open, room, preselectedRoom])

  const generateTimeSlots = () => {
    const slots: string[] = []
    for (let hour = 9; hour < 18; hour++) {
      for (const minute of [0, 30]) {
        if (hour === 9 && minute === 0) continue
        slots.push(formatHHMM(hour, minute))
      }
    }
    slots.push("18:30")
    return slots
  }

  useEffect(() => {
    if (!open) return
    if (!selectedRoomId) return
    if (!selectedDate) return

    const controller = new AbortController()

    ;(async () => {
      try {
        setLoadingDayReservations(true)

        const from = new Date(selectedDate)
        from.setHours(0, 0, 0, 0)
        const to = new Date(selectedDate)
        to.setHours(23, 59, 59, 999)

        const params = new URLSearchParams({
          roomId: selectedRoomId,
          from: from.toISOString(),
          to: to.toISOString(),
        })

        const res = await fetch(`/api/reservations?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        })

        if (!res.ok) throw new Error("Falha ao carregar reservas do dia")

        const data = await res.json()
        const processed: LightReservation[] = Array.isArray(data)
          ? data.map((r: any) => ({
              id: String(r.id),
              title: r.title,
              startTime: new Date(r.startTime),
              endTime: new Date(r.endTime),
            }))
          : []

        setDayReservations(processed)
      } catch (e: any) {
        if (e?.name === "AbortError") return
        console.error(e)
        toast.error("Erro ao carregar disponibilidade do dia")
        setDayReservations([])
      } finally {
        setLoadingDayReservations(false)
      }
    })()

    return () => controller.abort()
  }, [open, selectedRoomId, selectedDate])

  const computedTimes = useMemo(() => {
    if (!selectedDate) return null

    const mk = (hhmm: string) => {
      const p = parseHHMM(hhmm)
      if (!p) return null
      const d = new Date(selectedDate)
      d.setHours(p.h, p.m, 0, 0)
      if (!isValidDate(d)) return null
      return d
    }

    if (timeMode === "slot") {
      if (!startTime || !duration) return null
      const start = mk(startTime)
      if (!start) return null

      const end = new Date(start)
      end.setMinutes(end.getMinutes() + duration)
      if (!isValidDate(end) || end <= start) return null

      return { start, end }
    }

    if (!manualStart || !manualEnd) return null
    const start = mk(manualStart)
    const end = mk(manualEnd)
    if (!start || !end) return null
    if (end <= start) return null
    return { start, end }
  }, [selectedDate, timeMode, startTime, duration, manualStart, manualEnd])

  const computedStartIso = computedTimes && isValidDate(computedTimes.start) ? computedTimes.start.toISOString() : ""
  const computedEndIso = computedTimes && isValidDate(computedTimes.end) ? computedTimes.end.toISOString() : ""

  const endTimeLabel = useMemo(() => {
    if (!computedTimes) return ""
    return computedTimes.end.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", hour12: false })
  }, [computedTimes])

  const currentConflict = useMemo(() => {
    if (!computedTimes) return null
    for (const r of dayReservations) {
      if (overlaps(computedTimes.start, computedTimes.end, r.startTime, r.endTime)) return r
    }
    return null
  }, [computedTimes, dayReservations])

  const isStartSlotDisabled = useMemo(() => {
    if (!selectedDate) return (_t: string) => true
    return (t: string) => {
      const p = parseHHMM(t)
      if (!p) return true
      const s = new Date(selectedDate)
      s.setHours(p.h, p.m, 0, 0)
      const e = new Date(s)
      e.setMinutes(e.getMinutes() + 30)
      return dayReservations.some((r) => overlaps(s, e, r.startTime, r.endTime))
    }
  }, [selectedDate, dayReservations])

  const isDurationDisabled = useMemo(() => {
    if (!selectedDate) return (_m: number) => true
    return (minutes: number) => {
      if (!startTime) return true
      const p = parseHHMM(startTime)
      if (!p) return true
      const s = new Date(selectedDate)
      s.setHours(p.h, p.m, 0, 0)
      const e = new Date(s)
      e.setMinutes(e.getMinutes() + minutes)
      return dayReservations.some((r) => overlaps(s, e, r.startTime, r.endTime))
    }
  }, [selectedDate, dayReservations, startTime])

  useEffect(() => {
    if (!open) return
    if (!selectedRoomId || !computedStartIso || !computedEndIso) return
    setVideoLink("")
    setGoogleEventId(null)
    lastMeetKeyRef.current = ""
    inflightMeetKeyRef.current = ""
  }, [open, selectedRoomId, computedStartIso, computedEndIso, titleCommitted])

  useEffect(() => {
    if (!open) return
    if (!selectedRoomId) return
    if (!selectedRoom) return
    if (!currentUser?.email) return
    if (!computedTimes) return
    if (currentConflict) return

    const titleOk = (titleCommitted || "").trim()
    if (!titleOk) return

    const meetKey = JSON.stringify({
      roomId: selectedRoomId,
      start: computedTimes.start.toISOString(),
      end: computedTimes.end.toISOString(),
      title: titleOk,
      organizer: currentUser.email,
    })

    if (meetKey === lastMeetKeyRef.current) return
    if (meetKey === inflightMeetKeyRef.current) return

    ;(async () => {
      try {
        inflightMeetKeyRef.current = meetKey

        if (meetAbortRef.current) meetAbortRef.current.abort()
        const controller = new AbortController()
        meetAbortRef.current = controller

        setIsGeneratingLink(true)

        const location = `${selectedRoom.building || ""} - ${selectedRoom.name}`.trim() || selectedRoom.name || "Sala"

        const res = await fetch("/api/create-meet-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            title: titleOk,
            description,
            location,
            startTime: computedTimes.start.toISOString(),
            endTime: computedTimes.end.toISOString(),
            organizerEmail: currentUser.email,
            attendees: [],
            requestId: stableHash(meetKey),
          }),
        })

        const data = await res.json().catch(() => null)

        if (!res.ok || !data?.ok) {
          console.error("[create-meet-link] resposta:", data)
          throw new Error(data?.error || "Falha ao criar link de videochamada")
        }

        lastMeetKeyRef.current = meetKey
        inflightMeetKeyRef.current = ""

        setVideoLink(String(data.meetLink ?? ""))
        setGoogleEventId((data.googleEventId ?? data.eventId ?? null) as string | null)
      } catch (err: any) {
        inflightMeetKeyRef.current = ""
        if (err?.name === "AbortError") return
        console.error(err)
        toast.error(err?.message || "Não foi possível gerar o link de videochamada automaticamente.")
      } finally {
        setIsGeneratingLink(false)
      }
    })()
  }, [
    open,
    selectedRoomId,
    selectedRoom,
    currentUser?.email,
    computedStartIso,
    computedEndIso,
    titleCommitted,
    currentConflict,
  ])

  const handleConfirmBooking = async () => {
    if (!selectedRoomId || !selectedDate || !computedTimes) {
      toast.error("Por favor preencha todos os campos obrigatórios")
      return
    }
    if (!currentUser?.email) {
      toast.error("Deve estar autenticado para fazer uma reserva")
      return
    }

    const finalTitle = (titleCommitted || titleDraft).trim()
    if (!finalTitle) {
      toast.error("O título é obrigatório")
      return
    }

    if (currentConflict) {
      toast.error("Conflito de horário", { description: "Já existe reserva nesse intervalo." })
      return
    }

    if (!videoLink && !isGeneratingLink) {
      toast.error("Ainda não foi possível gerar o link de videochamada. Confirma o horário e o título (Enter/blur).")
      return
    }

    const attendeesList = attendees
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean)

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: selectedRoomId,
          title: finalTitle,
          description,
          startTime: computedTimes.start.toISOString(),
          endTime: computedTimes.end.toISOString(),
          organizerId: currentUser?.id,
          organizerEmail: currentUser.email,
          organizerName: currentUser.name,
          attendees: attendeesList,
          googleEventId,
        }),
      })

      if (res.status === 409) {
        const data = await res.json().catch(() => null)
        toast.error("Conflito de horário", { description: data?.details || "Já existe reserva nesse intervalo." })
        return
      }

      if (!res.ok) {
        console.error(await res.text().catch(() => ""))
        throw new Error("Falha ao guardar a reserva na base de dados")
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Erro ao guardar a reserva.")
      return
    }

    const roomName = selectedRoom?.name || "Sala"
    const location = selectedRoom ? `${selectedRoom.building ?? ""} - ${selectedRoom.name}` : roomName

    try {
      await sendReservationEmailsViaApi({
        title: finalTitle,
        description,
        roomName,
        location,
        startTime: computedTimes.start.toISOString(),
        endTime: computedTimes.end.toISOString(),
        attendees: attendeesList,
        organizerEmail: currentUser.email,
        organizerName: currentUser.name,
        videoLink,
        googleEventId,
      })
      toast.success("Reserva confirmada e emails enviados!")
    } catch (err) {
      console.error(err)
      toast.error("Reserva guardada, mas ocorreu um erro ao enviar os emails.")
    }

    onOpenChange(false)
    onReservationCreated?.()
  }

  const canConfirm =
    !!selectedRoomId &&
    !!selectedDate &&
    !!computedTimes &&
    (titleCommitted || titleDraft).trim().length > 0 &&
    !isGeneratingLink &&
    !currentConflict

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{selectedRoom ? `Reservar ${selectedRoom.name}` : "Reservar uma Sala"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!room && (
            <div>
              <Label htmlFor="room-select" className="text-base font-semibold">Selecionar Sala *</Label>
              <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                <SelectTrigger id="room-select" className="mt-2">
                  <SelectValue placeholder="Escolha uma sala" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {r.name} - {r.capacity} pessoas
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedRoom && (
            <div className="space-y-3 pb-4 border-b">
              <p className="text-sm text-muted-foreground">{selectedRoom.description}</p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedRoom.capacity} pessoas</span>
                </div>
                {(selectedRoom.building || selectedRoom.floor) && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {selectedRoom.building}
                      {selectedRoom.floor && `, Piso ${selectedRoom.floor}`}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedRoom.amenities.map((amenity) => (
                  <Badge key={amenity} variant="secondary">{amenity}</Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-row gap-4">
            <div>
              <Label className="text-base font-semibold mb-3 block">Selecionar Data</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              />
            </div>

            <div className="flex flex-col gap-4 flex-1">
              <div className="flex gap-2">
                <Button type="button" variant={timeMode === "slot" ? "default" : "outline"} onClick={() => setTimeMode("slot")}>Slots</Button>
                <Button type="button" variant={timeMode === "manual" ? "default" : "outline"} onClick={() => setTimeMode("manual")}>Manual</Button>
              </div>

              {loadingDayReservations && <div className="text-xs text-muted-foreground">A verificar disponibilidade do dia...</div>}

              {timeMode === "slot" && (
                <>
                  <div>
                    <Label htmlFor="start-time" className="text-base font-semibold">Hora de Início</Label>
                    <Select value={startTime} onValueChange={(v) => { setStartTime(v); setDuration(null) }}>
                      <SelectTrigger id="start-time" className="mt-2">
                        <SelectValue placeholder="Selecionar hora de início" />
                      </SelectTrigger>
                      <SelectContent>
                        {generateTimeSlots().map((time) => (
                          <SelectItem key={time} value={time} disabled={isStartSlotDisabled(time)}>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              {time}
                              {isStartSlotDisabled(time) && <span className="ml-2 text-xs text-muted-foreground">(ocupado)</span>}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {startTime && (
                    <div>
                      <Label className="text-base font-semibold mb-3 block">Duração</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {DURATION_OPTIONS.map((option) => {
                          const disabled = isDurationDisabled(option.minutes)
                          return (
                            <Button
                              key={option.minutes}
                              type="button"
                              variant={duration === option.minutes ? "default" : "outline"}
                              onClick={() => setDuration(option.minutes)}
                              className="w-full"
                              disabled={disabled}
                            >
                              {option.label}
                            </Button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ✅ RECOMENDADO: inputs time para nunca haver HH:MM inválido */}
              {timeMode === "manual" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-base font-semibold">Início</Label>
                    <Input
                      type="time"
                      step={60}
                      value={manualStart}
                      onChange={(e) => setManualStart(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-base font-semibold">Fim</Label>
                    <Input
                      type="time"
                      step={60}
                      value={manualEnd}
                      onChange={(e) => setManualEnd(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                </div>
              )}

              {computedTimes && (
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="h-4 w-4" />
                    <span>Hora de Fim: {endTimeLabel}</span>
                  </div>
                  {currentConflict && <div className="text-sm text-destructive">Conflito de horário: já existe uma reserva a ocupar este intervalo.</div>}
                </div>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="title" className="text-base font-semibold">Título da Reunião *</Label>
            <Input
              id="title"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => setTitleCommitted(titleDraft.trim())}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  setTitleCommitted(titleDraft.trim())
                  ;(e.target as HTMLInputElement).blur()
                }
              }}
              placeholder="Introduza o título"
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-base font-semibold">Descrição</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição (opcional)" className="mt-2" rows={3} />
          </div>

          <div>
            <Label htmlFor="video-link" className="text-base font-semibold">Link de Videochamada</Label>
            <div className="flex gap-2 mt-2">
              <div className="relative flex-1">
                <Video className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="video-link"
                  value={videoLink ? videoLink : isGeneratingLink ? "A gerar link de videochamada..." : ""}
                  readOnly
                  className="pl-10"
                  placeholder="O link será gerado automaticamente"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={!videoLink}
                onClick={() => {
                  if (!videoLink) return
                  navigator.clipboard.writeText(videoLink).then(
                    () => toast.success("Link copiado para a área de transferência"),
                    () => toast.error("Não foi possível copiar o link"),
                  )
                }}
              >
                Copiar
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="attendees" className="text-base font-semibold">Participantes</Label>
            <div className="relative mt-2">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Textarea id="attendees" value={attendees} onChange={(e) => setAttendees(e.target.value)} placeholder="Emails separados por vírgulas" className="pl-10" rows={2} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Separe múltiplos emails com vírgulas</p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleConfirmBooking} className="flex-1" disabled={!canConfirm}>
              {isGeneratingLink ? "A gerar link..." : currentConflict ? "Horário Ocupado" : "Confirmar Reserva"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

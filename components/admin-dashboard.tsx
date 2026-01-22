"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import type { Room } from "@/lib/types"
import { useSWRConfig } from "swr"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

import { Plus, Save, Trash2, RefreshCcw } from "lucide-react"
import { useRooms } from "@/lib/hooks"

export interface AdminDashboardProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  embedded?: boolean
  onRoomsUpdate?: () => void
}

type RoomDraft = {
  id?: string
  name: string
  description?: string
  capacity: number
  building?: string
  floor?: number
  imageUrl?: string
  calendarId?: string
  amenities: string
}

const emptyDraft = (): RoomDraft => ({
  name: "",
  description: "",
  capacity: 4,
  building: "",
  floor: undefined,
  imageUrl: "",
  calendarId: "",
  amenities: "",
})

function draftToPayload(d: RoomDraft) {
  const amenities = d.amenities
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean)

  return {
    name: d.name.trim(),
    description: d.description?.trim() || null,
    capacity: Number(d.capacity) || 0,
    building: d.building?.trim() || null,
    floor: d.floor ?? null,
    imageUrl: d.imageUrl?.trim() || null,
    calendarId: d.calendarId?.trim() || null,
    amenities,
  }
}

function roomToDraft(r: Room): RoomDraft {
  return {
    id: r.id,
    name: r.name ?? "",
    description: r.description ?? "",
    capacity: r.capacity ?? 0,
    building: r.building ?? "",
    floor: r.floor ?? undefined,
    imageUrl: r.imageUrl ?? "",
    calendarId: r.calendarId ?? "",
    amenities: Array.isArray(r.amenities) ? r.amenities.join(", ") : "",
  }
}

export function AdminDashboard({ open, onOpenChange, embedded, onRoomsUpdate }: AdminDashboardProps) {
  const { mutate } = useSWRConfig()
  const { data: rooms = [], error, isLoading, mutate: mutateRooms } = useRooms() as any

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<RoomDraft>(emptyDraft())
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const selectedRoom = useMemo(() => {
    return rooms.find((r: Room) => r.id === selectedId) ?? null
  }, [rooms, selectedId])

  useEffect(() => {
    if (error) {
      console.error(error)
      toast.error("Erro ao carregar salas")
    }
  }, [error])

  useEffect(() => {
    if (!selectedId && rooms.length > 0) setSelectedId(rooms[0].id)
  }, [rooms.length])

  useEffect(() => {
    if (selectedRoom) setDraft(roomToDraft(selectedRoom))
  }, [selectedRoom])

  const handleNewRoom = () => {
    setSelectedId(null)
    setDraft(emptyDraft())
  }

  const handleRefresh = async () => {
    await mutateRooms()
    toast.success("Salas atualizadas")
  }

  const invalidateReservations = async () => {
    await mutate((key) => typeof key === "string" && key.startsWith("/api/reservations?"))
  }

  const handleSave = async () => {
    if (!draft.name.trim()) return toast.error("Nome é obrigatório")
    if (!draft.capacity || Number(draft.capacity) <= 0) return toast.error("Capacidade inválida")

    setSaving(true)
    try {
      const payload = draftToPayload(draft)

      if (!draft.id) {
        const res = await fetch("/api/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error((await res.text().catch(() => "")) || "Falha ao criar sala")
        toast.success("Sala criada")
      } else {
        const res = await fetch(`/api/rooms/${draft.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error((await res.text().catch(() => "")) || "Falha ao atualizar sala")
        toast.success("Sala atualizada")
      }

      await mutateRooms()
      await invalidateReservations()
      onRoomsUpdate?.()
    } catch (e: any) {
      console.error(e)
      toast.error("Erro ao guardar", { description: e?.message ?? "Tenta novamente" })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!draft.id) return
    const ok = confirm(`Eliminar a sala "${draft.name}"?`)
    if (!ok) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/rooms/${draft.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error((await res.text().catch(() => "")) || "Falha ao eliminar sala")

      toast.success("Sala eliminada")
      setSelectedId(null)
      setDraft(emptyDraft())

      await mutateRooms()
      await invalidateReservations()
      onRoomsUpdate?.()
    } catch (e: any) {
      console.error(e)
      toast.error("Erro ao eliminar", { description: e?.message ?? "Tenta novamente" })
    } finally {
      setDeleting(false)
    }
  }

  const content = (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={handleNewRoom}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Sala
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {!!draft.id && (
            <Button
              variant="outline"
              className="text-destructive hover:bg-destructive hover:text-white"
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleting ? "A eliminar..." : "Eliminar"}
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "A guardar..." : "Guardar"}
          </Button>
        </div>
      </div>

      {/* TOP: Rooms list as simple buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Salas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">A carregar...</p>}
          {!isLoading && rooms.length === 0 && <p className="text-sm text-muted-foreground">Sem salas.</p>}

          {!isLoading && rooms.length > 0 && (
            <div className="flex flex-row gap-2">
              {rooms.map((r: Room) => {
                const active = selectedId === r.id
                return (
                  <Button
                    key={r.id}
                    type="button"
                    variant={active ? "default" : "outline"}
                    className="justify-center w-fit truncate"
                    onClick={() => setSelectedId(r.id)}
                    title={r.name}
                  >
                    {r.name}
                  </Button>
                )
              })}
            </div>
          )}

          {/* opcional: resumo rápido da sala selecionada */}
          {selectedRoom && (
            <div className="text-xs text-muted-foreground">
              {selectedRoom.building ? selectedRoom.building : "—"}
              {typeof selectedRoom.floor === "number" ? ` · Piso ${selectedRoom.floor}` : ""}
              {" · "}
              {selectedRoom.capacity} pax
            </div>
          )}
        </CardContent>
      </Card>

      {/* BOTTOM: Editable form */}
      <Card>
        <CardHeader>
          <CardTitle>{draft.id ? "Editar Sala" : "Criar Sala"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>Capacidade *</Label>
              <Input
                type="number"
                min={1}
                value={draft.capacity}
                onChange={(e) => setDraft((p) => ({ ...p, capacity: Number(e.target.value) }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Edifício</Label>
              <Input value={draft.building ?? ""} onChange={(e) => setDraft((p) => ({ ...p, building: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>Piso</Label>
              <Input
                type="number"
                value={draft.floor ?? ""}
                onChange={(e) => {
                  const v = e.target.value
                  setDraft((p) => ({ ...p, floor: v === "" ? undefined : Number(v) }))
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea rows={3} value={draft.description ?? ""} onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))} />
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input value={draft.imageUrl ?? ""} onChange={(e) => setDraft((p) => ({ ...p, imageUrl: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>Calendar ID (Google)</Label>
              <Input value={draft.calendarId ?? ""} onChange={(e) => setDraft((p) => ({ ...p, calendarId: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Comodidades (separadas por vírgulas)</Label>
            <Input
              value={draft.amenities}
              onChange={(e) => setDraft((p) => ({ ...p, amenities: e.target.value }))}
              placeholder="TV, Quadro, HDMI, ..."
            />
            <div className="flex flex-wrap gap-2 pt-2">
              {draft.amenities
                .split(",")
                .map((a) => a.trim())
                .filter(Boolean)
                .map((a) => (
                  <Badge key={a} variant="secondary">
                    {a}
                  </Badge>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  if (embedded) return content

  return (
    <Dialog open={!!open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestão de Salas</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  )
}

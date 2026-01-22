// app/api/reservations/[id]/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

function mapReservationForClient(r: any) {
  if (!r) return r
  return {
    ...r,
    attendees: r.attendees ?? [],
  }
}

function getIdFromContext(ctx: any): string | null {
  const id = ctx?.params?.id
  return typeof id === "string" && id.length > 0 ? id : null
}

// GET /api/reservations/[id]
export async function GET(_req: Request, ctx: any) {
  try {
    const id = getIdFromContext(ctx)
    if (!id) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

    const reservation = await prisma.reservation.findUnique({
      where: { id },
    })

    if (!reservation) {
      return NextResponse.json({ error: "Reserva não encontrada" }, { status: 404 })
    }

    return NextResponse.json(mapReservationForClient(reservation))
  } catch (error) {
    console.error("[GET /api/reservations/[id]] error", error)
    return NextResponse.json({ error: "Erro ao carregar reserva" }, { status: 500 })
  }
}

// PUT /api/reservations/[id]
export async function PUT(req: Request, ctx: any) {
  try {
    const id = getIdFromContext(ctx)
    if (!id) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

    const body = await req.json().catch(() => ({}))

    const {
      roomId,
      title,
      description,
      startTime,
      endTime,
      attendees,
      googleEventId,
    } = body ?? {}

    const data: any = {}

    if (roomId !== undefined) data.roomId = roomId
    if (title !== undefined) data.title = String(title)
    if (description !== undefined) data.description = description ? String(description) : null
    if (startTime !== undefined) data.startTime = new Date(startTime)
    if (endTime !== undefined) data.endTime = new Date(endTime)
    if (attendees !== undefined) data.attendees = Array.isArray(attendees) ? attendees : []
    if (googleEventId !== undefined) data.googleEventId = googleEventId || null

    const updated = await prisma.reservation.update({
      where: { id },
      data,
    })

    return NextResponse.json(mapReservationForClient(updated))
  } catch (error) {
    console.error("[PUT /api/reservations/[id]] error", error)
    return NextResponse.json({ error: "Erro ao atualizar reserva" }, { status: 500 })
  }
}

// DELETE /api/reservations/[id]
export async function DELETE(_req: Request, ctx: any) {
  try {
    const id = getIdFromContext(ctx)
    if (!id) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

    await prisma.reservation.delete({
      where: { id },
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("[DELETE /api/reservations/[id]] error", error)
    return NextResponse.json({ error: "Erro ao eliminar reserva" }, { status: 500 })
  }
}

// app/api/reservations/route.ts
import { NextResponse, NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { randomUUID } from "node:crypto"
import { UserRole } from "@prisma/client"

// GET /api/reservations?userId=&organizerEmail=&roomId=&from=&to=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const userId = searchParams.get("userId") || undefined
    const organizerEmail = searchParams.get("organizerEmail") || undefined
    const roomId = searchParams.get("roomId") || undefined

    const fromRaw = searchParams.get("from")
    const toRaw = searchParams.get("to")

    const from = fromRaw ? new Date(fromRaw) : undefined
    const to = toRaw ? new Date(toRaw) : undefined

    const where: any = {}
    if (userId) where.userId = userId
    if (roomId) where.roomId = roomId
    if (organizerEmail) where.user = { email: organizerEmail }

    if (from || to) {
      where.AND = []
      if (to) where.AND.push({ startTime: { lt: to } })
      if (from) where.AND.push({ endTime: { gt: from } })
    }

    const reservations = await prisma.reservation.findMany({
      where,
      orderBy: { startTime: "asc" },
      select: {
        id: true,
        roomId: true,
        userId: true,
        title: true,
        description: true,
        startTime: true,
        endTime: true,
        attendees: true,
        googleEventId: true,
      },
    })

    return NextResponse.json(
      reservations.map((r) => ({ ...r, attendees: r.attendees ?? [] })),
      {
        headers: {
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=60",
        },
      },
    )
  } catch (error: any) {
    console.error("[GET /api/reservations] error", error)
    return NextResponse.json(
      { error: "Erro ao carregar reservas", details: error?.message ?? String(error) },
      { status: 500 },
    )
  }
}

// POST /api/reservations
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      roomId,
      title,
      description,
      startTime,
      endTime,
      organizerId,
      organizerEmail,
      organizerName,
      attendees,
      googleEventId,
    } = body as {
      roomId: string
      title: string
      description?: string
      startTime: string
      endTime: string
      organizerId?: string
      organizerEmail: string
      organizerName?: string
      attendees?: string[]
      googleEventId?: string | null
    }

    if (!roomId || !title || !startTime || !endTime || !organizerEmail) {
      return NextResponse.json({ error: "Campos obrigatórios em falta" }, { status: 400 })
    }

    const start = new Date(startTime)
    const end = new Date(endTime)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return NextResponse.json({ error: "Datas inválidas" }, { status: 400 })
    }
    if (end <= start) {
      return NextResponse.json({ error: "A hora de fim tem de ser maior que a de início" }, { status: 400 })
    }

    const safeAttendees: string[] = Array.isArray(attendees)
      ? attendees.map((e) => String(e).trim()).filter(Boolean)
      : []

    const dbUser = await prisma.user.upsert({
      where: { email: organizerEmail },
      update: { name: organizerName ?? organizerEmail },
      create: {
        id: organizerId || randomUUID(),
        email: organizerEmail,
        name: organizerName ?? organizerEmail,
        role: UserRole.USER,
      },
    })

    const conflict = await prisma.reservation.findFirst({
      where: {
        roomId,
        AND: [{ startTime: { lt: end } }, { endTime: { gt: start } }],
      },
      select: { id: true, startTime: true, endTime: true, title: true },
    })

    if (conflict) {
      return NextResponse.json(
        {
          error: "Conflito de horário",
          details: "Já existe uma reserva nessa sala para o intervalo selecionado.",
          conflict,
        },
        { status: 409 },
      )
    }

    const reservation = await prisma.reservation.create({
      data: {
        roomId,
        title: title.trim(),
        description: description || null,
        startTime: start,
        endTime: end,
        userId: dbUser.id,
        attendees: safeAttendees,
        googleEventId: googleEventId || null,
      },
      select: {
        id: true,
        roomId: true,
        userId: true,
        title: true,
        description: true,
        startTime: true,
        endTime: true,
        attendees: true,
        googleEventId: true,
      },
    })

    return NextResponse.json({ ...reservation, attendees: reservation.attendees ?? [] }, { status: 201 })
  } catch (error: any) {
    console.error("[POST /api/reservations] error", error)
    return NextResponse.json(
      { error: "Erro ao criar reserva", details: error?.message ?? String(error) },
      { status: 500 },
    )
  }
}

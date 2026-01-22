// app/api/rooms/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const rooms = await prisma.room.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        capacity: true,
        building: true,
        floor: true,
        amenities: true,
        imageUrl: true,
        calendarId: true,
      },
    })

    return NextResponse.json(rooms, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600", 
      },
    })
  } catch (error: any) {
    console.error("[GET /api/rooms] error", error)
    return NextResponse.json(
      { error: "Erro ao carregar salas", details: error?.message || "unknown" },
      { status: 500 },
    )
  }
}

// POST /api/rooms 
export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      id,
      name,
      capacity,
      amenities,
      description,
      floor,
      building,
      imageUrl,
      calendarId,
    } = body

    if (!name || !capacity) {
      return NextResponse.json(
        { error: "Nome e capacidade são obrigatórios" },
        { status: 400 },
      )
    }

    const room = await prisma.room.create({
      data: {
        ...(id ? { id } : {}),
        name,
        capacity,
        amenities: amenities ?? [],
        description: description ?? null,
        floor: floor ?? null,
        building: building ?? null,
        imageUrl: imageUrl ?? null,
        calendarId: calendarId ?? null,
      },
    })

    return NextResponse.json(room, { status: 201 })
  } catch (error) {
    console.error("[POST /api/rooms] error", error)
    return NextResponse.json(
      { error: "Erro ao criar sala" },
      { status: 500 },
    )
  }
}

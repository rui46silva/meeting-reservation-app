// app/api/rooms/[id]/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

function getIdFromRequest(req: Request) {
  const url = new URL(req.url)
  const segments = url.pathname.split("/")
  return segments[segments.length - 1] 
}

export async function PUT(req: Request) {
  const id = getIdFromRequest(req)
  const body = await req.json()

  const room = await prisma.room.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description || null,
      capacity: Number(body.capacity) || 1,
      building: body.building || null,
      floor:
        body.floor !== undefined && body.floor !== null
          ? Number(body.floor)
          : null,
      imageUrl: body.imageUrl || null,
      amenities: body.amenities ?? [],
      calendarId: body.calendarId || null,
    },
  })

  return NextResponse.json(room)
}

export async function DELETE(req: Request) {
  const id = getIdFromRequest(req)

  await prisma.reservation.deleteMany({
    where: { roomId: id },
  })

  await prisma.room.delete({
    where: { id },
  })

  return NextResponse.json({ ok: true })
}

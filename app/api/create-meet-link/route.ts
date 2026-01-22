// app/api/create-meet-link/route.ts
import { NextResponse, NextRequest } from "next/server"
import { createMeetEvent } from "@/lib/google-calendar"

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()

    const {
      title,
      description,
      location,
      startTime,
      endTime,
      attendees,
      organizerEmail,
      requestId,
    } = data as {
      title: string
      description?: string
      location?: string
      startTime: string
      endTime: string
      attendees?: string[]
      organizerEmail: string
      requestId?: string
    }

    if (!title || !startTime || !endTime || !organizerEmail) {
      return NextResponse.json(
        { ok: false, error: "Campos obrigatórios em falta (title, startTime, endTime, organizerEmail)" },
        { status: 400 },
      )
    }

    const start = new Date(startTime)
    const end = new Date(endTime)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return NextResponse.json({ ok: false, error: "Datas inválidas" }, { status: 400 })
    }
    if (end <= start) {
      return NextResponse.json({ ok: false, error: "endTime tem de ser maior que startTime" }, { status: 400 })
    }

    const { meetLink, eventId } = await createMeetEvent({
      summary: title,
      description,
      location,
      start,
      end,
      attendees: Array.isArray(attendees) ? attendees : [],
      organizerEmail,
      requestId,
    })

    return NextResponse.json({
      ok: true,
      meetLink: meetLink || "",
      googleEventId: eventId || null,
      eventId,
    })
  } catch (error: any) {
    console.error("[create-meet-link] ERRO:", error)
    return NextResponse.json(
      {
        ok: false,
        error: error?.response?.data?.error?.message || error?.message || "Erro ao criar link de videochamada",
      },
      { status: 500 },
    )
  }
}

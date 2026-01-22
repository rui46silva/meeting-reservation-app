// app/api/reservation-email/route.ts
import { NextResponse, NextRequest } from "next/server"
import { sendReservationEmail, generateICSFile } from "@/lib/email-service"
import { createMeetEvent } from "@/lib/google-calendar"

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()

    const {
      title,
      description,
      roomName,
      location,
      startTime,
      endTime,
      attendees,
      organizerEmail,
      organizerName,
      videoLink: videoLinkInput,
      googleEventId: googleEventIdInput,
      roomCalendarId,
      organizerBody,
      attendeesBody,
    } = data as {
      title: string
      description?: string
      roomName?: string
      location?: string
      startTime: string
      endTime: string
      attendees?: string[]
      organizerEmail: string
      organizerName?: string
      videoLink?: string
      googleEventId?: string | null
      roomCalendarId?: string | null
      organizerBody?: string
      attendeesBody?: string
    }

    if (!title || !startTime || !endTime || !organizerEmail) {
      return NextResponse.json(
        { ok: false, error: "Campos obrigatórios em falta (título, datas ou email do organizador)" },
        { status: 400 },
      )
    }

    const startDate = new Date(startTime)
    const endDate = new Date(endTime)

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ ok: false, error: "Datas inválidas" }, { status: 400 })
    }
    if (endDate <= startDate) {
      return NextResponse.json({ ok: false, error: "A hora de fim tem de ser maior que a de início" }, { status: 400 })
    }

    const organizerLower = organizerEmail.toLowerCase()

    const safeAttendees: string[] = Array.isArray(attendees)
      ? Array.from(
          new Set(
            attendees
              .map((email) => email?.trim())
              .filter((email): email is string => !!email)
              .filter((email) => email.toLowerCase() !== organizerLower),
          ),
        )
      : []

    const finalLocation = location || roomName || "Sala"

    let finalMeetLink = videoLinkInput || ""
    let finalGoogleEventId = googleEventIdInput || null

    if (!finalGoogleEventId) {
      const calendarId = roomCalendarId || undefined

      const created = await createMeetEvent({
        summary: title,
        description,
        location: finalLocation,
        start: startDate,
        end: endDate,
        attendees: safeAttendees,
        organizerEmail,
      })

      finalMeetLink = created.meetLink || finalMeetLink
      finalGoogleEventId = created.eventId || null
    }

    const icsFile = generateICSFile({
      title,
      description,
      location: finalLocation,
      startTime: startDate,
      endTime: endDate,
      attendees: safeAttendees,
      organizer: organizerEmail,
      videoLink: finalMeetLink || undefined,
    } as any)

    const organizerHtml =
      organizerBody ||
      `
      <p>Olá ${organizerName || organizerEmail},</p>
      <p>A tua reserva foi confirmada com sucesso.</p>
      <p><strong>Título:</strong> ${title}</p>
      ${roomName ? `<p><strong>Sala:</strong> ${roomName}</p>` : ""}
      <p><strong>Local:</strong> ${finalLocation}</p>
      <p><strong>Início:</strong> ${startDate.toLocaleString("pt-PT")}</p>
      <p><strong>Fim:</strong> ${endDate.toLocaleString("pt-PT")}</p>
      ${
        finalMeetLink
          ? `<p><strong>Link de videochamada:</strong> <a href="${finalMeetLink}">${finalMeetLink}</a></p>`
          : ""
      }
      <p>Em anexo encontra o convite de calendário (.ics).</p>
    `

    const attendeesHtml =
      attendeesBody ||
      `
      <p>Foi convidado para uma reunião.</p>
      <p><strong>Título:</strong> ${title}</p>
      <p><strong>Organizado por:</strong> ${organizerName || organizerEmail}</p>
      ${roomName ? `<p><strong>Sala:</strong> ${roomName}</p>` : ""}
      <p><strong>Local:</strong> ${finalLocation}</p>
      <p><strong>Início:</strong> ${startDate.toLocaleString("pt-PT")}</p>
      <p><strong>Fim:</strong> ${endDate.toLocaleString("pt-PT")}</p>
      ${
        finalMeetLink
          ? `<p><strong>Link de videochamada:</strong> <a href="${finalMeetLink}">${finalMeetLink}</a></p>`
          : ""
      }
      <p>Em anexo encontra o convite de calendário (.ics).</p>
    `

    await sendReservationEmail({
      to: [organizerEmail],
      subject: `Confirmação de Reserva: ${title}`,
      body: organizerHtml,
      icsAttachment: icsFile,
    })

    if (safeAttendees.length > 0) {
      await sendReservationEmail({
        to: safeAttendees,
        subject: `Convite: ${title}`,
        body: attendeesHtml,
        icsAttachment: icsFile,
      })
    }

    return NextResponse.json({
      ok: true,
      meetLink: finalMeetLink,
      googleEventId: finalGoogleEventId,
    })
  } catch (error) {
    console.error("[api/reservation-email] erro:", error)
    return NextResponse.json({ ok: false, error: "Erro ao enviar emails de reserva" }, { status: 500 })
  }
}

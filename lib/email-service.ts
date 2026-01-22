// lib/email-service.ts
import "server-only"
import { google } from "googleapis"

export interface EmailData {
  to: string[]
  subject: string
  body: string
  icsAttachment?: string
}


function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
  const redirectUri = process.env.GOOGLE_REDIRECT_URI!
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN!

  const oAuth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri,
  )

  oAuth2Client.setCredentials({ refresh_token: refreshToken })
  return oAuth2Client
}


function toBase64Url(input: string) {
  return Buffer.from(input, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

function encodeMimeWord(subject: string) {
  const b64 = Buffer.from(subject, "utf-8").toString("base64")
  return `=?UTF-8?B?${b64}?=`
}


function createRawEmail({ to, subject, body, icsAttachment }: EmailData): string {
  const boundary = "mixed-boundary-123456"
  const from = process.env.GMAIL_SENDER!

  const headers = [
    `From: ${from}`,
    `To: ${to.join(", ")}`,
    `Subject: ${encodeMimeWord(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
  ]

  const htmlPart = [
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(body, "utf-8").toString("base64"),
    "",
  ]

  const parts: string[] = [...headers, ...htmlPart]

  if (icsAttachment) {
    const icsBase64 = Buffer.from(icsAttachment, "utf-8").toString("base64")

    parts.push(
      `--${boundary}`,
      'Content-Type: text/calendar; charset="UTF-8"; method=REQUEST',
      "Content-Transfer-Encoding: base64",
      'Content-Disposition: attachment; filename="reserva.ics"',
      "",
      icsBase64,
      "",
    )
  }

  parts.push(`--${boundary}--`, "")

  const rawMessage = parts.join("\r\n")

  return toBase64Url(rawMessage)
}


export async function sendReservationEmail(emailData: EmailData) {
  try {
    const auth = getOAuth2Client()
    const gmail = google.gmail({ version: "v1", auth })

    const raw = createRawEmail(emailData)

    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    })

    console.log("[gmail] Email enviado:", res.data.id)

    return { success: true, messageId: res.data.id }
  } catch (error) {
    console.error("[gmail] Erro a enviar email:", error)
    return { success: false, error }
  }
}

export function generateICSFile(reservation: {
  title: string
  description?: string
  location: string
  startTime: Date
  endTime: Date
  attendees: string[]
  organizer: string
}) {
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
  }

  const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Room Reservation System//PT
METHOD:REQUEST
BEGIN:VEVENT
UID:${Date.now()}@roomreservation.com
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(reservation.startTime)}
DTEND:${formatDate(reservation.endTime)}
SUMMARY:${reservation.title}
DESCRIPTION:${reservation.description || ""}
LOCATION:${reservation.location}
ORGANIZER:mailto:${reservation.organizer}
${reservation.attendees.map((email) => `ATTENDEE:mailto:${email}`).join("\n")}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`

  return ics
}

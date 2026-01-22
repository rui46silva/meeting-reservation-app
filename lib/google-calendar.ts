// lib/google-calendar.ts
import "server-only"
import { google } from "googleapis"
import { randomUUID } from "crypto"

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
  const redirectUri = process.env.GOOGLE_REDIRECT_URI!
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN!

  const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)
  oAuth2Client.setCredentials({ refresh_token: refreshToken })
  return oAuth2Client
}

export async function createMeetEvent(options: {
  summary: string
  description?: string
  location?: string
  start: Date
  end: Date
  attendees: string[]
  organizerEmail: string
  requestId?: string
}) {
  const auth = getOAuth2Client()
  const calendar = google.calendar({ version: "v3", auth })

  const calendarId = "primary"

  const event = {
    summary: options.summary,
    description: options.description,
    location: options.location,
    start: { dateTime: options.start.toISOString(), timeZone: "Europe/Lisbon" },
    end: { dateTime: options.end.toISOString(), timeZone: "Europe/Lisbon" },
    attendees: (options.attendees || []).map((email) => ({ email })),
    // organizer: { email: options.organizerEmail }, 
    conferenceData: {
      createRequest: {
        requestId: options.requestId || `meet-${randomUUID()}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  }

  const res = await calendar.events.insert({
    calendarId,
    requestBody: event,
    conferenceDataVersion: 1,
    sendUpdates: "none", 
  })

  const created = res.data

  const meetLink =
    created.hangoutLink ||
    created.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ||
    ""

  return {
    eventId: created.id || "",
    meetLink,
  }
}

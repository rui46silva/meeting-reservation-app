import type { Reservation } from "./types"

interface MicrosoftCalendarEvent {
  subject: string
  body: {
    contentType: string
    content: string
  }
  start: {
    dateTime: string
    timeZone: string
  }
  end: {
    dateTime: string
    timeZone: string
  }
  attendees?: Array<{
    emailAddress: { address: string }
    type: string
  }>
}

export async function syncToMicrosoftCalendar(reservation: Reservation, accessToken: string): Promise<string | null> {
  try {
    const event: MicrosoftCalendarEvent = {
      subject: reservation.title,
      body: {
        contentType: "text",
        content: `Room: ${reservation.roomId}`,
      },
      start: {
        dateTime: reservation.startTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: reservation.endTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      attendees: reservation.attendees.map((email) => ({
        emailAddress: { address: email },
        type: "required",
      })),
    }

    const response = await fetch("https://graph.microsoft.com/v1.0/me/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    })

    if (!response.ok) {
      throw new Error("Failed to create Microsoft Calendar event")
    }

    const data = await response.json()
    return data.id
  } catch (error) {
    console.error("Error syncing to Microsoft Calendar:", error)
    return null
  }
}

export async function deleteFromMicrosoftCalendar(eventId: string, accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(`https://graph.microsoft.com/v1.0/me/events/${eventId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    return response.ok
  } catch (error) {
    console.error("Error deleting from Microsoft Calendar:", error)
    return false
  }
}

export function getMicrosoftAuthUrl(): string {
  const clientId = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID || ""
  const redirectUri = typeof window !== "undefined" ? `${window.location.origin}/api/auth/microsoft/callback` : ""

  const scope = "Calendars.ReadWrite"

  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}`
}

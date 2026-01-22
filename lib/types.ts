export interface Room {
  id: string
  name: string
  capacity: number
  amenities: string[]
  description?: string
  floor?: number
  building?: string
  imageUrl?: string
  calendarId?: string
}

export interface Reservation {
  id: string
  roomId: string
  title: string
  startTime: Date
  endTime: Date
  attendees: string[]

  googleEventId?: string | null

  microsoftCalendarId?: string | null

  userId: string
}

export interface TimeSlot {
  time: string
  hour: number
  minute: number
  isAvailable: boolean
  reservation?: Reservation
}

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
}

export type UserRole = "admin" | "user" | "guest"
import type { Reservation, TimeSlot } from "./types"

export function getTimeSlots(date: Date, reservations: Reservation[]): TimeSlot[] {
  const slots: TimeSlot[] = []
  const startHour = 8 // 8 AM
  const endHour = 18 // 6 PM

  for (let hour = startHour; hour < endHour; hour++) {
    // Create two 30-minute slots per hour
    for (let minute = 0; minute < 60; minute += 30) {
      const slotTime = new Date(date)
      slotTime.setHours(hour, minute, 0, 0)

      const reservation = reservations.find((res) => {
        const resStart = new Date(res.startTime)
        const resEnd = new Date(res.endTime)
        return slotTime >= resStart && slotTime < resEnd
      })

      slots.push({
        time: formatTime(hour, minute),
        hour,
        minute,
        isAvailable: !reservation,
        reservation,
      })
    }
  }

  return slots
}

export function formatTime(hour: number, minute = 0): string {
  const period = hour >= 12 ? "PM" : "AM"
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return `${displayHour}:${minute.toString().padStart(2, "0")} ${period}`
}

export function isTimeSlotAvailable(
  roomId: string,
  startTime: Date,
  endTime: Date,
  reservations: Reservation[],
  excludeReservationId?: string,
): boolean {
  return !reservations.some((res) => {
    if (res.roomId !== roomId) return false
    if (excludeReservationId && res.id === excludeReservationId) return false

    const resStart = new Date(res.startTime)
    const resEnd = new Date(res.endTime)

    return (
      (startTime >= resStart && startTime < resEnd) ||
      (endTime > resStart && endTime <= resEnd) ||
      (startTime <= resStart && endTime >= resEnd)
    )
  })
}

export function saveReservations(reservations: Reservation[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("reservations", JSON.stringify(reservations))
  }
}

export function saveReservation(reservation: Reservation): void {
  const reservations = loadReservations()
  reservations.push(reservation)
  saveReservations(reservations)
}

export function loadReservations(): Reservation[] {
  if (typeof window === "undefined") return []

  const stored = localStorage.getItem("reservations")
  if (!stored) return []

  return JSON.parse(stored).map((res: any) => ({
    ...res,
    startTime: new Date(res.startTime),
    endTime: new Date(res.endTime),
  }))
}

export function getUserReservations(userId: string, reservations: Reservation[]): Reservation[] {
  return reservations.filter((res) => res.userId === userId)
}

export function deleteReservation(reservationId: string, reservations: Reservation[]): Reservation[] {
  return reservations.filter((res) => res.id !== reservationId)
}

export function updateReservation(
  reservationId: string,
  updates: Partial<Omit<Reservation, "id">>,
  reservations: Reservation[],
): Reservation[] {
  return reservations.map((res) => (res.id === reservationId ? { ...res, ...updates } : res))
}

import type { Room } from "./types"

export const rooms: Room[] = [
  {
    id: "room-1",
    name: "Conference Room A",
    capacity: 10,
    amenities: ["Projector", "Whiteboard", "Video Conference"],
  },
  {
    id: "room-2",
    name: "Meeting Room B",
    capacity: 6,
    amenities: ["TV Screen", "Whiteboard"],
  },
  {
    id: "room-3",
    name: "Board Room",
    capacity: 20,
    amenities: ["Projector", "Video Conference", "Catering"],
  },
  {
    id: "room-4",
    name: "Focus Room",
    capacity: 4,
    amenities: ["Whiteboard", "Phone"],
  },
]

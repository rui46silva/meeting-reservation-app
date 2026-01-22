"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, MapPin } from "lucide-react"
import type { Room } from "@/lib/types"
import Image from "next/image"

interface RoomCardProps {
  room: Room
  onClick: () => void
}

export function RoomCard({ room, onClick }: RoomCardProps) {
  const hasAmenities = Array.isArray(room.amenities) && room.amenities.length > 0

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <div className="relative h-48 w-full bg-muted">
        {room.imageUrl ? (
          <Image
            src={room.imageUrl || "/placeholder.svg"}
            alt={room.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gradient-to-br from-primary/20 to-primary/5">
            <span className="text-4xl font-bold text-primary/40">
              {room.name?.charAt(0) ?? "S"}
            </span>
          </div>
        )}
      </div>

      <CardHeader>
        <CardTitle>{room.name}</CardTitle>
        {room.description && (
          <CardDescription className="line-clamp-2">
            {room.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>Capacidade: {room.capacity} pessoas</span>
        </div>

        {(room.building || room.floor) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>
              {room.building}
              {room.building && room.floor ? " • " : ""}
              {room.floor && `Piso ${room.floor}`}
            </span>
          </div>
        )}

        {hasAmenities && (
          <div className="flex flex-wrap gap-2">
            {room.amenities.map((amenity) => (
              <Badge key={amenity} variant="secondary" className="text-xs">
                {amenity}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

"use client"

import type { TimeSlot } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Clock, Users } from "lucide-react"
import { cn } from "@/lib/utils"

interface TimeSlotCardProps {
  slot: TimeSlot
  onSelect: (hour: number, minute: number) => void
  isSelected?: boolean
  isInRange?: boolean
}

export function TimeSlotCard({ slot, onSelect, isSelected, isInRange }: TimeSlotCardProps) {
  return (
    <Card
      className={cn(
        "p-4 cursor-pointer transition-all hover:shadow-md",
        slot.isAvailable
          ? "bg-card hover:bg-accent border-border"
          : "bg-muted border-muted-foreground/20 cursor-not-allowed",
        isSelected && "ring-2 ring-primary bg-primary/10",
        isInRange && "bg-primary/5 border-primary/30",
      )}
      onClick={() => slot.isAvailable && onSelect(slot.hour, slot.minute)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-foreground">{slot.time}</span>
        </div>
        {slot.isAvailable ? (
          <span className="text-xs font-medium text-green-600 dark:text-green-400">Available</span>
        ) : (
          <span className="text-xs font-medium text-red-600 dark:text-red-400">Reserved</span>
        )}
      </div>
      {slot.reservation && (
        <div className="mt-3 space-y-1">
          <p className="text-sm font-medium text-foreground">{slot.reservation.title}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{slot.reservation.attendees.length} attendees</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date(slot.reservation.startTime).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}{" "}
            -{" "}
            {new Date(slot.reservation.endTime).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
      )}
    </Card>
  )
}

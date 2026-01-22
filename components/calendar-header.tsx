"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"

interface CalendarHeaderProps {
  currentDate: Date
  onPreviousDay: () => void
  onNextDay: () => void
  onToday: () => void
  onDateSelect?: (date: Date) => void
}

export function CalendarHeader({ currentDate, onPreviousDay, onNextDay, onToday, onDateSelect }: CalendarHeaderProps) {
  const formattedDate = currentDate.toLocaleDateString("pt-PT", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2 bg-transparent">
              <CalendarIcon className="h-4 w-4" />
              <span className="text-lg font-semibold">{formattedDate}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={currentDate}
              onSelect={(date) => {
                if (date && onDateSelect) {
                  onDateSelect(date)
                }
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onToday}>
          Hoje
        </Button>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={onPreviousDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={onNextDay}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

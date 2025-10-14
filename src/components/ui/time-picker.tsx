"use client"

import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"

interface TimePickerProps {
  value?: string
  onChange?: (time: string) => void
  placeholder?: string
  className?: string
  id?: string
}

export function TimePicker({
  value,
  onChange,
  placeholder = "Sélectionner l'heure",
  className,
  id,
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  // Generate time options (every 15 minutes for 24 hours)
  const generateTimeOptions = () => {
    const times = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        times.push(timeString)
      }
    }
    return times
  }

  const timeOptions = generateTimeOptions()

  const formatTimeDisplay = (time: string) => {
    if (!time) return placeholder
    return time
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
          id={id}
        >
          <Clock className="mr-2 h-4 w-4" />
          {formatTimeDisplay(value || '')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Hour Selection */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-2 block">Heure</label>
              <Select
                value={value?.split(':')[0] || ''}
                onValueChange={(hour) => {
                  const currentMinute = value?.split(':')[1] || '00'
                  const newTime = `${hour}:${currentMinute}`
                  onChange?.(newTime)
                }}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="--" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                    <SelectItem key={hour} value={hour.toString().padStart(2, '0')}>
                      {hour.toString().padStart(2, '0')}h
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Minute Selection */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-2 block">Minutes</label>
              <Select
                value={value?.split(':')[1] || ''}
                onValueChange={(minute) => {
                  const currentHour = value?.split(':')[0] || '08'
                  const newTime = `${currentHour}:${minute}`
                  onChange?.(newTime)
                }}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="--" />
                </SelectTrigger>
                <SelectContent>
                  {['00', '15', '30', '45'].map(minute => (
                    <SelectItem key={minute} value={minute}>
                      {minute}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quick Time Buttons */}
          <div className="mt-4 pt-3 border-t">
            <label className="text-xs font-medium text-gray-600 mb-2 block">Heures fréquentes</label>
            <div className="grid grid-cols-3 gap-1">
              {['08:00', '09:00', '10:00', '14:00', '15:00', '16:00'].map(time => (
                <Button
                  key={time}
                  variant={value === time ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    onChange?.(time)
                    setIsOpen(false)
                  }}
                >
                  {time}
                </Button>
              ))}
            </div>
            
            {/* Urgent/Night Time Buttons */}
            <label className="text-xs font-medium text-red-600 mb-2 block mt-3">Heures d'urgence</label>
            <div className="grid grid-cols-3 gap-1">
              {['22:00', '00:00', '02:00', '03:00', '04:00', '06:00'].map(time => (
                <Button
                  key={time}
                  variant={value === time ? "destructive" : "outline"}
                  size="sm"
                  className={cn(
                    "h-7 text-xs",
                    value !== time && "text-red-600 border-red-200 hover:bg-red-50"
                  )}
                  onClick={() => {
                    onChange?.(time)
                    setIsOpen(false)
                  }}
                >
                  {time}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
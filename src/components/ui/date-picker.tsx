"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  className?: string;
  buttonClassName?: string; // Allow custom styling for the button
  disabled?: boolean | ((date: Date) => boolean); // Add disabled prop
}

export function DatePicker({ date, setDate, className, buttonClassName, disabled }: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSelect = (selectedDate: Date | undefined) => {
     setDate(selectedDate);
     setIsOpen(false); // Close popover on date selection
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal border-input", // Base classes
            !date && "text-muted-foreground", // Style when no date is selected
             buttonClassName // Allow overriding button styles
          )}
          disabled={typeof disabled === 'boolean' ? disabled : undefined} // Disable button if boolean disabled is true
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-auto p-0 bg-card border-border", className)} align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          disabled={disabled} // Pass disabled prop to Calendar
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

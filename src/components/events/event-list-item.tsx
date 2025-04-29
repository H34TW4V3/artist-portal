
import type React from 'react';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { Calendar, Clock, MapPin, Edit, Trash2, MoreVertical, Loader2 } from 'lucide-react';

import type { Event } from '@/types/event';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EventListItemProps {
  event: Event;
  onEdit: (event: Event) => void;
  onDelete: (eventId: string) => void;
  isDeleting: boolean; // Flag to show loading state during delete
  className?: string;
}

export function EventListItem({ event, onEdit, onDelete, isDeleting, className }: EventListItemProps) {

  const formatDate = (dateValue: Date | Timestamp): string => {
    try {
      const date = dateValue instanceof Timestamp ? dateValue.toDate() : dateValue;
      return format(date, 'PPP'); // e.g., Jan 1, 2024
    } catch {
      return "Invalid Date";
    }
  };

   const formatTime = (timeString: string | null | undefined): string | null => {
     if (!timeString) return null;
     try {
       // Create a dummy date object to parse the time string
       const dummyDate = new Date(`1970-01-01T${timeString}`);
       if (isNaN(dummyDate.getTime())) return null; // Invalid time format
       return format(dummyDate, 'p'); // e.g., 1:00 PM
     } catch {
       return null; // Handle parsing errors
     }
   };

  const displayDate = formatDate(event.date);
  const displayStartTime = formatTime(event.startTime);
  const displayEndTime = formatTime(event.endTime);

  const timeString = displayStartTime
    ? `${displayStartTime}${displayEndTime ? ` - ${displayEndTime}` : ''}`
    : null;

  return (
    <div className={cn(
      "flex items-start justify-between gap-4 p-3 border-b border-border/30 last:border-b-0 hover:bg-muted/50 transition-colors",
      className
    )}>
      <div className="flex-grow space-y-1">
        <p className="font-semibold text-foreground">{event.title}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{displayDate}</span>
        </div>
        {timeString && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{timeString}</span>
          </div>
        )}
        {event.location && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{event.location}</span>
          </div>
        )}
        {event.description && (
          <p className="text-xs text-muted-foreground pt-1">{event.description}</p>
        )}
      </div>

      {/* Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
           <Button
             variant="ghost"
             size="icon"
             className="h-8 w-8 flex-shrink-0 text-muted-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground"
             disabled={isDeleting}
           >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
            <span className="sr-only">Event Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-popover border-border">
          <DropdownMenuItem onClick={() => onEdit(event)} className="cursor-pointer focus:bg-accent focus:text-accent-foreground">
            <Edit className="mr-2 h-4 w-4" />
            <span>Edit</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-border/50" />
          <DropdownMenuItem
            onClick={() => onDelete(event.id)}
            className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
             disabled={isDeleting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

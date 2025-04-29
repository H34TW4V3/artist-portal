
"use client";

import type React from 'react';
import { useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button'; // Import Button for AlertDialogAction
import { Loader2, Trash2 } from 'lucide-react'; // Import Loader2 and Trash2

import type { Event } from '@/types/event';
import { EventListItem } from './event-list-item';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { removeEvent } from '@/services/events'; // Import removeEvent service
// Import EditEventForm and EditEventModal later if needed
// import { EditEventForm } from './edit-event-form';
// import { EditEventModal } from './edit-event-modal';

interface EventListProps {
  events: Event[];
  isLoading: boolean;
  className?: string;
}

export function EventList({ events, isLoading, className }: EventListProps) {
  const { toast } = useToast();
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [isPerformingDelete, setIsPerformingDelete] = useState(false);

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setIsEditModalOpen(true);
    // TODO: Implement EditEventModal and Form
    toast({ title: "Edit Action", description: `Editing "${event.title}" (Placeholder)` });
  };

   const handleDeleteRequest = (eventId: string) => {
     setDeletingEventId(eventId); // Open confirmation dialog
   };

   const handleDeleteConfirm = async () => {
     if (!deletingEventId) return;

     setIsPerformingDelete(true);
     const eventToDelete = events.find(e => e.id === deletingEventId); // Find event for toast message

     try {
       await removeEvent(deletingEventId);
       toast({
         title: "Event Deleted",
         description: `"${eventToDelete?.title || 'The event'}" has been removed.`,
         variant: "default",
       });
       setDeletingEventId(null); // Close dialog
       // Parent component should refetch events after success callback
       // Consider adding an optional onDeleteSuccess callback prop if needed here

     } catch (error) {
       console.error("Error deleting event:", error);
       toast({
         title: "Deletion Failed",
         description: error instanceof Error ? error.message : "Could not delete the event.",
         variant: "destructive",
       });
     } finally {
       setIsPerformingDelete(false);
     }
   };

  const handleEditSuccess = () => {
     setIsEditModalOpen(false);
     setEditingEvent(null);
     // Parent component should refetch events after success callback
  }


  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={`skel-${index}`} className="flex items-start gap-4 p-3">
             <Skeleton className="h-6 w-6 rounded-full mt-1" /> {/* Icon placeholder */}
             <div className="flex-grow space-y-2">
                <Skeleton className="h-4 w-3/4" />
                 <Skeleton className="h-3 w-1/2" />
                 <Skeleton className="h-3 w-1/3" />
             </div>
             <Skeleton className="h-8 w-8 flex-shrink-0" /> {/* Actions placeholder */}
           </div>
        ))}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className={cn("text-center py-6 text-muted-foreground", className)}>
        No upcoming events scheduled yet.
      </div>
    );
  }

  return (
     <>
        <div className={cn("flow-root", className)}>
             <ul role="list" className="-my-3 divide-y divide-border/30"> {/* Use ul/li for semantic list */}
                {events.map((event) => (
                 <li key={event.id} className="py-3"> {/* Wrap EventListItem in li */}
                    <EventListItem
                    event={event}
                    onEdit={handleEdit}
                    onDelete={handleDeleteRequest}
                    isDeleting={isPerformingDelete && deletingEventId === event.id}
                    />
                 </li>
                ))}
             </ul>
        </div>

       {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deletingEventId} onOpenChange={(open) => !open && setDeletingEventId(null)}>
          <AlertDialogContent className="bg-card/85 dark:bg-card/70 border-border"> {/* Adjusted opacity */}
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                This action cannot be undone. This will permanently remove the event
                 &quot;{events.find(e => e.id === deletingEventId)?.title}&quot;.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPerformingDelete} className="border-input hover:bg-muted/50">Cancel</AlertDialogCancel>
              <AlertDialogAction
                 onClick={handleDeleteConfirm}
                 disabled={isPerformingDelete}
                 className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                 {isPerformingDelete ? (
                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                 ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                 )}
                 {isPerformingDelete ? 'Deleting...' : 'Confirm Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Event Modal (Placeholder Structure) */}
        {/*
        <EditEventModal
             isOpen={isEditModalOpen}
             onClose={() => setIsEditModalOpen(false)}
             eventData={editingEvent}
             onSuccess={handleEditSuccess}
         />
         */}

     </>
  );
}

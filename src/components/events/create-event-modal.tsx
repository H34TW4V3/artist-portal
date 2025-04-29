
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { CreateEventForm } from "./create-event-form"; // Import the form

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // Callback after successful creation
}

export function CreateEventModal({ isOpen, onClose, onSuccess }: CreateEventModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md md:max-w-lg bg-card/95 dark:bg-card/80 backdrop-blur-sm border-border/50">
        <DialogHeader>
          <DialogTitle className="text-primary">Create New Event</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Add the details for your upcoming event.
          </DialogDescription>
        </DialogHeader>

        <CreateEventForm
          onSuccess={onSuccess} // Pass the success callback
          onCancel={onClose}   // Pass the close callback for cancel action
          className="pt-4"     // Add some top padding to the form within the modal
        />

        {/* Footer might not be needed if form handles Cancel/Submit */}
        {/* <DialogFooter>
          <DialogClose asChild>
             <Button type="button" variant="outline">Cancel</Button>
           </DialogClose>
           // Submit button is inside the form now
        </DialogFooter> */}
      </DialogContent>
    </Dialog>
  );
}

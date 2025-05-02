
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
import { CreatePostForm } from "@/components/pineapple/create-post-form"; // Corrected import path
import { Button } from "@/components/ui/button"; // Import Button for close

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // Callback after successful creation
}

export function CreatePostModal({ isOpen, onClose, onSuccess }: CreatePostModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md md:max-w-lg bg-card/85 dark:bg-card/70 border-border/50"> {/* Adjusted opacity */}
        <DialogHeader>
          <DialogTitle className="text-primary">Create New Post</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Share your thoughts, questions, or collaboration ideas with the community.
          </DialogDescription>
        </DialogHeader>

        {/* Embed the form directly */}
        <CreatePostForm
          onSuccess={onSuccess} // Pass the success callback
          onCancel={onClose}   // Pass the close callback for the form's cancel logic if it has one
          className="pt-4 border-0 shadow-none p-0 bg-transparent" // Remove card styling from form itself
        />

        {/* Footer might not be needed if form handles Cancel/Submit, but good for explicit close */}
        {/*
        <DialogFooter>
           // The form now likely includes its own submit/cancel buttons
           <DialogClose asChild>
             <Button type="button" variant="outline">Close</Button>
           </DialogClose>
        </DialogFooter>
        */}
      </DialogContent>
    </Dialog>
  );
}


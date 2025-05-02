"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SubmitDemoForm } from "./submit-demo-form"; // Import the form

interface SubmitDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // Callback after successful submission
}

export function SubmitDemoModal({ isOpen, onClose, onSuccess }: SubmitDemoModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg md:max-w-2xl bg-card/85 dark:bg-card/70 border-border/50"> {/* Increased width */}
        <DialogHeader>
          <DialogTitle className="text-primary">Submit Your Demo</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Fill out the form below to submit your demo track for review.
          </DialogDescription>
        </DialogHeader>

        <SubmitDemoForm
          onSuccess={onSuccess} // Pass the success callback
          onCancel={onClose}   // Pass the close callback for cancel action
          className="pt-4"     // Add some top padding to the form within the modal
        />

        {/* Footer might not be needed if form handles Cancel/Submit */}
      </DialogContent>
    </Dialog>
  );
}
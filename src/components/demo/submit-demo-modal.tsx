
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
      <DialogContent className="sm:max-w-lg md:max-w-xl bg-card/85 dark:bg-card/70 border-border/50"> {/* Adjusted width slightly */}
        <DialogHeader>
          <DialogTitle className="text-primary">Submit Your Demo</DialogTitle>
           {/* Description moved below progress bar in the form */}
           <DialogDescription className="text-muted-foreground pt-1"> {/* Adjusted description slightly */}
              Follow the steps below to submit your track for review.
          </DialogDescription>
        </DialogHeader>

        <SubmitDemoForm
          onSuccess={onSuccess} // Pass the success callback
          onCancel={onClose}   // Pass the close callback for cancel action
          className="pt-2"     // Reduced top padding slightly
        />

        {/* Footer is now handled within the multi-step form */}
      </DialogContent>
    </Dialog>
  );
}

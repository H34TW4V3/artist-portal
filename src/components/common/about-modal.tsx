
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
import { Button } from "@/components/ui/button";

// Placeholder version - Getting the commit ID requires build-time configuration.
const APP_VERSION = process.env.NEXT_PUBLIC_COMMIT_SHA || "Development Build"; // Use env var if available, else placeholder

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-card/85 dark:bg-card/70 border-border/50">
        <DialogHeader>
          <DialogTitle className="text-primary">About Artist Hub</DialogTitle>
          <DialogDescription className="text-muted-foreground pt-2">
            Your central platform for managing music releases, viewing stats, and connecting with others.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 text-center text-foreground">
          <p className="text-lg font-semibold">Version: {APP_VERSION}</p>
           {APP_VERSION === "Development Build" && (
             <p className="text-xs text-muted-foreground mt-1">
                 (Set NEXT_PUBLIC_COMMIT_SHA at build time for commit ID)
             </p>
           )}
          <p className="text-sm text-muted-foreground mt-2">
            © {new Date().getFullYear()} Oxygen Group PLC. All rights reserved.
          </p>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


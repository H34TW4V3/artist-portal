
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
import { ExternalLink, LineChart } from "lucide-react";

interface DashboardRedirectModalProps {
  isOpen: boolean;
  onClose: () => void;
  spotifyUrl: string;
}

export function DashboardRedirectModal({ isOpen, onClose, spotifyUrl }: DashboardRedirectModalProps) {
  const handleRedirect = () => {
    window.open(spotifyUrl, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-card/85 dark:bg-card/70 border-border/50">
        <DialogHeader className="items-center text-center">
          <LineChart className="h-12 w-12 text-primary mb-3" />
          <DialogTitle className="text-primary">Streaming Statistics</DialogTitle>
          <DialogDescription className="text-muted-foreground pt-2">
            Your detailed streaming statistics are currently available on Spotify for Artists.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 text-center text-foreground space-y-3">
          <p className="text-sm">
            To view your latest performance overview, including total streams, revenue, and listener data, please visit your Spotify for Artists dashboard.
          </p>
        </div>

        <DialogFooter className="sm:justify-center gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleRedirect}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Go to Spotify for Artists <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

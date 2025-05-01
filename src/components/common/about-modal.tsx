
"use client";

import { useState, useEffect } from 'react'; // Import hooks
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
const APP_CODENAME = process.env.NEXT_PUBLIC_CODENAME || "Unspecified"; // Get codename from env var

// Array of quotes
const quotes = [
    "Music expresses that which cannot be put into words and that which cannot remain silent.", // Victor Hugo
    "Where words fail, music speaks.", // Hans Christian Andersen
    "Without music, life would be a mistake.", // Friedrich Nietzsche
    "Music is the universal language of mankind.", // Henry Wadsworth Longfellow
    "The only truth is music.", // Jack Kerouac
    "Music can change the world because it can change people.", // Bono
    "One good thing about music, when it hits you, you feel no pain.", // Bob Marley
    "Music is the strongest form of magic.", // Marilyn Manson
    "If music be the food of love, play on.", // William Shakespeare
    "Music is the wine that fills the cup of silence.", // Robert Fripp
];


interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const [randomQuote, setRandomQuote] = useState<string | null>(null);

  // Generate random quote only on the client-side after mount
  useEffect(() => {
      if (isOpen) {
         const randomIndex = Math.floor(Math.random() * quotes.length);
         setRandomQuote(quotes[randomIndex]);
      } else {
          setRandomQuote(null); // Reset when closed
      }
  }, [isOpen]); // Re-run when modal opens/closes


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-card/85 dark:bg-card/70 border-border/50">
        <DialogHeader>
          <DialogTitle className="text-primary">About Artist Hub</DialogTitle>
          <DialogDescription className="text-muted-foreground pt-2">
            Your central platform for managing music releases, viewing stats, and connecting with others.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 text-center text-foreground space-y-1">
          {/* Version and Codename */}
          <p className="text-base font-medium">Version: {APP_VERSION}</p>
          <p className="text-base font-medium">Codename: {APP_CODENAME}</p>
           {APP_VERSION === "Development Build" && (
             <p className="text-xs text-muted-foreground mt-1">
                 (Set NEXT_PUBLIC_COMMIT_SHA at build time for commit ID)
             </p>
           )}
            {APP_CODENAME === "Unspecified" && (
             <p className="text-xs text-muted-foreground mt-1">
                 (Set NEXT_PUBLIC_CODENAME at build time for codename)
             </p>
           )}

           {/* Random Quote */}
            {randomQuote && (
               <blockquote className="mt-4 border-l-4 border-primary pl-4 italic text-muted-foreground text-sm">
                  "{randomQuote}"
               </blockquote>
            )}


          <p className="text-sm text-muted-foreground pt-4"> {/* Increased padding top */}
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



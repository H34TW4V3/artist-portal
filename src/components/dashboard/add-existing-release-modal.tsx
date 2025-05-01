
"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Link as LinkIcon } from "lucide-react"; // Import icons

// Placeholder function - replace with actual logic
async function addExistingReleaseByLink(link: string): Promise<void> {
    console.log("Mock adding existing release with link:", link);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
    if (Math.random() < 0.1) { // Simulate failure
        throw new Error("Failed to find or add release from link.");
    }
}

interface AddExistingReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // Callback after successful addition
}

export function AddExistingReleaseModal({ isOpen, onClose, onSuccess }: AddExistingReleaseModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [releaseLink, setReleaseLink] = useState("");

  const handleSubmit = async () => {
    if (!releaseLink.trim()) {
      toast({ title: "Missing Link", description: "Please enter a valid release link.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await addExistingReleaseByLink(releaseLink); // Call placeholder function
      toast({
        title: "Release Added",
        description: "The existing release has been linked successfully.",
        variant: "default",
      });
      setReleaseLink(""); // Clear input
      onSuccess(); // Call success callback
      onClose();   // Close modal
    } catch (error) {
      console.error("Error adding existing release:", error);
      toast({
        title: "Failed to Add Release",
        description: error instanceof Error ? error.message : "Could not link the release.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

   // Reset state when modal closes
   useState(() => {
     if (!isOpen) {
       setReleaseLink("");
       setIsSubmitting(false);
     }
   });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-card/85 dark:bg-card/70 border-border/50">
        <DialogHeader>
          <DialogTitle className="text-primary">Add Existing Release</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Paste the link to your release on a supported platform (e.g., Spotify, Apple Music).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
            <div className="space-y-2">
                 <Label htmlFor="release-link">Release Link</Label>
                 <div className="flex items-center space-x-2">
                     <LinkIcon className="h-4 w-4 text-muted-foreground" />
                     <Input
                        id="release-link"
                        placeholder="https://open.spotify.com/album/..."
                        value={releaseLink}
                        onChange={(e) => setReleaseLink(e.target.value)}
                        disabled={isSubmitting}
                        className="focus:ring-accent"
                     />
                 </div>
            </div>
            {/* Add more fields if needed, e.g., platform selection */}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !releaseLink.trim()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Adding...' : 'Add Release'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

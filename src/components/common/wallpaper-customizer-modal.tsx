
"use client";

import { useState, useEffect } from "react";
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
import { RotateCcw } from "lucide-react";

interface WallpaperCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUrl: string; // The current non-default URL, or empty string if default
  onApply: (newUrl: string) => void;
  onReset: () => void;
  defaultUrl: string;
}

export function WallpaperCustomizerModal({
  isOpen,
  onClose,
  currentUrl,
  onApply,
  onReset,
  defaultUrl,
}: WallpaperCustomizerModalProps) {
  const [inputUrl, setInputUrl] = useState(currentUrl);
  const { toast } = useToast();

  // Reset input field when modal opens with a new currentUrl
  useEffect(() => {
    setInputUrl(currentUrl);
  }, [currentUrl, isOpen]);

  const handleApplyClick = () => {
    // Basic URL validation (can be improved)
    if (inputUrl && !inputUrl.startsWith('http://') && !inputUrl.startsWith('https://')) {
        toast({
            title: "Invalid URL",
            description: "Please enter a valid image URL starting with http:// or https://",
            variant: "destructive",
        });
        return;
    }
    onApply(inputUrl);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] bg-card/95 dark:bg-card/80 backdrop-blur-sm border-border/50">
        <DialogHeader>
          <DialogTitle className="text-primary">Customize Background</DialogTitle>
          <DialogDescription>
            Enter the URL of an image to set as your site background. Leave blank or reset to use the default.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="wallpaper-url">Image URL</Label>
            <Input
              id="wallpaper-url"
              type="url"
              placeholder="https://example.com/your-image.jpg"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              className="focus:ring-accent"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Current default:{" "}
              <a
                href={defaultUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-primary truncate max-w-[200px] inline-block align-bottom"
              >
                {defaultUrl.split('/').pop()}
              </a>
            </p>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onReset}
            className="flex items-center gap-1.5"
            aria-label="Reset to default wallpaper"
          >
             <RotateCcw className="h-4 w-4" /> Reset to Default
          </Button>
          <Button
            type="button"
            onClick={handleApplyClick}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            aria-label="Apply new wallpaper"
           >
            Apply
          </Button>
          {/* Removed explicit close button, handled by Dialog overlay click or X icon */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

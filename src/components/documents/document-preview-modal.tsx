
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
import { Loader2 } from "lucide-react";
import { useState } from "react";

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string | null;
  title?: string;
}

export function DocumentPreviewModal({ isOpen, onClose, url, title = "Document Preview" }: DocumentPreviewModalProps) {
    const [isLoading, setIsLoading] = useState(true);

    // Transform Google Drive /view URL to /preview for embedding
    const getEmbedUrl = (originalUrl: string | null): string | null => {
        if (!originalUrl) return null;
        if (originalUrl.includes("drive.google.com") && originalUrl.includes("/view")) {
            return originalUrl.replace("/view", "/preview");
        }
        return originalUrl; // Return original if not a typical GDrive view link
    };

    const embedUrl = getEmbedUrl(url);

    const handleIframeLoad = () => {
        setIsLoading(false);
    };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* Increase max width for better document viewing */}
      <DialogContent className="sm:max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-7xl h-[90vh] flex flex-col bg-card/90 dark:bg-card/80 border-border/50">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-primary">{title}</DialogTitle>
          {/* Removed the DialogDescription that showed the URL */}
          {/* {url && (
            <DialogDescription className="text-muted-foreground text-xs truncate">
              Viewing: <a href={url} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">{url}</a>
            </DialogDescription>
          )} */}
        </DialogHeader>

        <div className="flex-grow relative border border-border/30 rounded-md overflow-hidden mt-2">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {embedUrl ? (
            <iframe
              src={embedUrl}
              width="100%"
              height="100%"
              className={isLoading ? "opacity-0" : "opacity-100 transition-opacity duration-300"}
              onLoad={handleIframeLoad}
              title={title}
              // Basic sandbox for security, adjust as needed
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
               Invalid document URL.
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 flex-shrink-0">
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


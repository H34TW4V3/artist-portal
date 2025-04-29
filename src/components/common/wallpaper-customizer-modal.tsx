
"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { RotateCcw, Upload, Image as ImageIcon, X } from "lucide-react"; // Import necessary icons
import { ScrollArea } from "@/components/ui/scroll-area"; // Import ScrollArea
import { cn } from "@/lib/utils";

// Generate some random image URLs for predefined options
const generatePicsumUrls = (count: number): string[] => {
  return Array.from({ length: count }, (_, i) => `https://picsum.photos/seed/${i + 1 * Date.now()}/600/400`);
};

const predefinedWallpapers = generatePicsumUrls(8); // Generate 8 random picsum URLs

interface WallpaperCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUrl: string; // Can be URL or data URI, empty if default
  onApply: (newUrlOrDataUri: string) => void;
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
  const [inputUrl, setInputUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null); // For uploaded image preview
  const [selectedPredefined, setSelectedPredefined] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Sync state when modal opens or currentUrl changes
  useEffect(() => {
    if (isOpen) {
        // Reset states based on currentUrl
        const isDataUri = currentUrl.startsWith('data:image');
        const isPredefined = predefinedWallpapers.includes(currentUrl);

        setInputUrl(isDataUri || isPredefined ? "" : currentUrl); // Only show URL if it's a custom URL input
        setSelectedFile(null);
        setPreviewDataUrl(isDataUri ? currentUrl : null); // Show preview if current is data URI
        setSelectedPredefined(isPredefined ? currentUrl : null);
    } else {
        // Clear everything on close to avoid stale previews/selections
        setInputUrl("");
        setSelectedFile(null);
        setPreviewDataUrl(null);
        setSelectedPredefined(null);
    }
  }, [currentUrl, isOpen]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "Image Too Large", description: "Please select an image under 5MB.", variant: "destructive" });
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast({ title: "Invalid File Type", description: "Please select an image file.", variant: "destructive" });
        return;
      }

      setSelectedFile(file);
      setInputUrl(""); // Clear URL input when file is selected
      setSelectedPredefined(null); // Clear predefined selection

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewDataUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyClick = () => {
    let finalUrlOrDataUri = "";

    if (selectedFile && previewDataUrl) {
      finalUrlOrDataUri = previewDataUrl;
    } else if (selectedPredefined) {
        finalUrlOrDataUri = selectedPredefined;
    } else if (inputUrl) {
      if (!inputUrl.startsWith('http://') && !inputUrl.startsWith('https://')) {
        toast({ title: "Invalid URL", description: "URL must start with http:// or https://.", variant: "destructive" });
        return;
      }
      finalUrlOrDataUri = inputUrl;
    }
    // If nothing selected/input, finalUrlOrDataUri remains empty, onApply will handle it (use default)
    onApply(finalUrlOrDataUri);
  };

  const handlePredefinedClick = (url: string) => {
    setSelectedPredefined(url);
    setInputUrl(""); // Clear other inputs
    setSelectedFile(null);
    setPreviewDataUrl(null);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const clearUpload = () => {
     setSelectedFile(null);
     setPreviewDataUrl(null);
     if (fileInputRef.current) {
         fileInputRef.current.value = ""; // Clear the file input visually
     }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg md:max-w-2xl bg-card/95 dark:bg-card/80 backdrop-blur-sm border-border/50">
        <DialogHeader>
          <DialogTitle className="text-primary">Customize Background</DialogTitle>
          <DialogDescription>
            Choose a preset image, upload your own, or enter an image URL.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="grid gap-6 py-4">

            {/* Predefined Images Section */}
            <div>
                <Label className="text-muted-foreground text-sm font-medium">Presets</Label>
                <div className="grid grid-cols-4 gap-3 mt-2">
                    {predefinedWallpapers.map((url) => (
                    <button
                        key={url}
                        onClick={() => handlePredefinedClick(url)}
                        className={cn(
                            "aspect-video rounded-md overflow-hidden border-2 transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                            selectedPredefined === url ? "border-primary ring-2 ring-primary ring-offset-2" : "border-transparent hover:border-primary/50"
                        )}
                    >
                        <Image
                            src={url}
                            alt="Predefined wallpaper option"
                            width={150}
                            height={100}
                            className="object-cover w-full h-full"
                            unoptimized // Avoid optimization for external URLs if needed
                        />
                    </button>
                    ))}
                </div>
            </div>

            {/* Separator */}
            <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center">
                    <span className="bg-card px-2 text-sm text-muted-foreground">Or</span>
                </div>
            </div>

            {/* Upload Image Section */}
            <div>
                <Label htmlFor="wallpaper-upload" className="text-muted-foreground text-sm font-medium">Upload Image</Label>
                <div className={cn(
                     "mt-2 flex rounded-md border-2 border-dashed px-4 py-4 items-center gap-4",
                     previewDataUrl ? "border-solid border-primary/30" : "border-input hover:border-accent justify-center"
                 )}>
                    {previewDataUrl ? (
                         <div className="flex items-center gap-3 w-full">
                             <Image src={previewDataUrl} alt="Uploaded preview" width={100} height={67} className="rounded-md object-cover aspect-video border border-border" />
                             <div className="text-sm text-foreground truncate flex-grow">{selectedFile?.name}</div>
                             <Button variant="ghost" size="icon" onClick={clearUpload} className="h-7 w-7 text-muted-foreground hover:text-destructive">
                                 <X className="h-4 w-4" />
                                 <span className="sr-only">Clear Upload</span>
                             </Button>
                         </div>
                    ) : (
                         <div className="text-center">
                              <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
                              <div className="mt-2 flex text-sm text-muted-foreground">
                                <button
                                    type="button"
                                    onClick={triggerFileInput}
                                    className="relative cursor-pointer rounded-md bg-background px-1 font-medium text-primary hover:text-primary/90 focus-within:outline-none focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2"
                                >
                                    <span>Upload a file</span>
                                </button>
                                <input id="wallpaper-upload" ref={fileInputRef} name="wallpaper-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                                <p className="pl-1">or drag and drop</p>
                              </div>
                              <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 5MB</p>
                         </div>
                     )}
                </div>
            </div>


            {/* URL Input Section */}
            <div>
                <Label htmlFor="wallpaper-url" className="text-muted-foreground text-sm font-medium">Image URL</Label>
                <Input
                  id="wallpaper-url"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={inputUrl}
                  onChange={(e) => {
                      setInputUrl(e.target.value);
                      setSelectedFile(null); // Clear file/preview if URL is typed
                      setPreviewDataUrl(null);
                      setSelectedPredefined(null); // Clear predefined selection
                  }}
                  className="mt-2 focus:ring-accent"
                  disabled={!!selectedFile || !!selectedPredefined} // Disable if file or preset is selected
                />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-border/50">
           <div className="flex items-center text-xs text-muted-foreground mr-auto">
              Default: <a href={defaultUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary ml-1 truncate max-w-[150px]">{defaultUrl.split('/').pop()}</a>
           </div>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

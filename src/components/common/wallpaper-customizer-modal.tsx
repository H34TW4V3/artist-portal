
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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { RotateCcw, Upload, Image as ImageIcon, X, Music, Loader2 } from "lucide-react"; // Import necessary icons
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getLatestReleaseArtwork } from "@/services/music-platform"; // Import the new service
import { useAuth } from "@/context/auth-context"; // Import useAuth to get user
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton

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
  const { user } = useAuth(); // Get user for fetching
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null); // For uploaded image preview
  const [selectedPredefined, setSelectedPredefined] = useState<string | null>(null); // Holds URL of selected preset OR release artwork
  const [latestReleaseArtworkUrl, setLatestReleaseArtworkUrl] = useState<string | null>(null);
  const [isLoadingArtwork, setIsLoadingArtwork] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Fetch latest release artwork when modal opens
   useEffect(() => {
     const fetchArtwork = async () => {
       if (isOpen && user) {
         setIsLoadingArtwork(true);
         setLatestReleaseArtworkUrl(null); // Reset on open
         try {
           const url = await getLatestReleaseArtwork();
           setLatestReleaseArtworkUrl(url);
         } catch (error) {
           console.error("Error fetching latest release artwork:", error);
           // Optionally show a toast
         } finally {
           setIsLoadingArtwork(false);
         }
       }
     };

     fetchArtwork();
   }, [isOpen, user]);


  // Sync state when modal opens or currentUrl changes
  useEffect(() => {
    if (isOpen) {
        // Reset states based on currentUrl
        const isDataUri = currentUrl.startsWith('data:image');
        const isPredefined = predefinedWallpapers.includes(currentUrl);
        const isLatestRelease = currentUrl === latestReleaseArtworkUrl && latestReleaseArtworkUrl !== null;

        setSelectedFile(null);
        setPreviewDataUrl(isDataUri ? currentUrl : null); // Show preview if current is data URI
        // Set selectedPredefined if current matches predefined OR latest release artwork
        setSelectedPredefined(isPredefined || isLatestRelease ? currentUrl : null);

    } else {
        // Clear everything on close
        setSelectedFile(null);
        setPreviewDataUrl(null);
        setSelectedPredefined(null);
        // Don't reset latestReleaseArtworkUrl, it's fetched on open
        setIsLoadingArtwork(false); // Ensure loading is reset
    }
  }, [currentUrl, isOpen, latestReleaseArtworkUrl]); // Add latestReleaseArtworkUrl dependency


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "Image Too Large", description: "Please select an image under 5MB.", variant: "destructive" });
        return;
      }
      // Keep image/* to allow GIF
      if (!file.type.startsWith('image/')) {
        toast({ title: "Invalid File Type", description: "Please select an image file (PNG, JPG, GIF).", variant: "destructive" });
        return;
      }

      setSelectedFile(file);
      setSelectedPredefined(null); // Clear predefined/release selection

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
    } else if (selectedPredefined) { // This now covers presets AND release artwork
        finalUrlOrDataUri = selectedPredefined;
    }
    onApply(finalUrlOrDataUri);
  };

  // Generalized handler for selecting predefined or release artwork
  const handlePredefinedOrReleaseClick = (url: string) => {
    setSelectedPredefined(url);
    setSelectedFile(null);
    setPreviewDataUrl(null);
     if (fileInputRef.current) { // Also clear the file input visually
         fileInputRef.current.value = "";
     }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
     // Clear other selections when opening file input
     setSelectedPredefined(null);
     // Preview URL will be set on file selection
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
      <DialogContent className="sm:max-w-lg md:max-w-2xl bg-card/85 dark:bg-card/70 border-border/50">
        <DialogHeader>
          <DialogTitle className="text-primary">Customize Background</DialogTitle>
          <DialogDescription>
            Choose a preset image, use your latest release artwork, or upload your own (including GIFs).
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="grid gap-6 py-4">

            {/* Predefined & Release Artwork Section */}
            <div>
                <Label className="text-muted-foreground text-sm font-medium">Choose Wallpaper</Label>
                 <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-2">
                    {/* Latest Release Artwork Option */}
                    {isLoadingArtwork ? (
                        <Skeleton className="aspect-video rounded-md bg-muted/50" />
                    ) : latestReleaseArtworkUrl ? (
                         <button
                             onClick={() => handlePredefinedOrReleaseClick(latestReleaseArtworkUrl)}
                             className={cn(
                                 "aspect-video rounded-md overflow-hidden border-2 transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 relative group", // Added relative group
                                 selectedPredefined === latestReleaseArtworkUrl ? "border-primary ring-2 ring-primary ring-offset-2" : "border-transparent hover:border-primary/50"
                             )}
                             title="Use Latest Release Artwork"
                         >
                             <Image
                                 src={latestReleaseArtworkUrl}
                                 alt="Latest release artwork"
                                 width={150}
                                 height={100}
                                 className="object-cover w-full h-full"
                                 unoptimized // Good idea for potentially dynamic URLs
                                 onError={(e) => { e.currentTarget.src = '/placeholder-artwork.png'; }} // Fallback
                             />
                             {/* Subtle icon overlay */}
                             <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <Music className="h-6 w-6 text-white/80" />
                             </div>
                         </button>
                    ) : (
                         // Placeholder if no artwork found or user not logged in
                         <div className="aspect-video rounded-md border-2 border-dashed border-border/40 flex items-center justify-center text-muted-foreground text-xs text-center p-2">
                           No latest artwork found
                         </div>
                     )}

                    {/* Predefined Wallpapers */}
                    {predefinedWallpapers.map((url) => (
                        <button
                            key={url}
                            onClick={() => handlePredefinedOrReleaseClick(url)}
                            className={cn(
                                "aspect-video rounded-md overflow-hidden border-2 transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                                selectedPredefined === url ? "border-primary ring-2 ring-primary ring-offset-2" : "border-transparent hover:border-primary/50"
                            )}
                            title="Use Preset Wallpaper"
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
                      // Highlight border if this section is active (file selected or being dragged over)
                      previewDataUrl ? "border-solid border-primary/30" : "border-input hover:border-accent justify-center"
                 )}>
                    {previewDataUrl ? (
                         <div className="flex items-center gap-3 w-full">
                             <Image src={previewDataUrl} alt="Uploaded preview" width={100} height={67} className="rounded-md object-cover aspect-video border border-border" unoptimized={selectedFile?.type === 'image/gif'} />
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
                              {/* Explicitly mention GIF support */}
                              <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 5MB</p>
                         </div>
                     )}
                </div>
            </div>

          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-border/50">
           <div className="flex-grow"></div> {/* Add spacer */}
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
             // Disable apply if nothing is selected (no preview, no predefined/release)
             disabled={!previewDataUrl && !selectedPredefined}
           >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


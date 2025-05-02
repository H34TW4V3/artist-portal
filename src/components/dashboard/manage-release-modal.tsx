
"use client";

import React, { useState, useRef, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, parseISO } from "date-fns";
// Added AlertTriangle for takedown button
import { Loader2, Link as LinkIcon, Upload, CalendarIcon, Music, Trash2, PlusCircle, X, Save, ExternalLink, AlertTriangle } from "lucide-react";
import Image from 'next/image';
import { Timestamp } from "firebase/firestore";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
// Added AlertDialog imports
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // Keep Label for standalone labels
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
// Updated import to include initiateTakedown service function
import { updateRelease, initiateTakedown, type ReleaseWithId, type TrackInfo, type ReleaseMetadata } from "@/services/music-platform";
import { storage } from "@/services/firebase-config"; // Import storage instance (if needed, maybe not here)
import { useAuth } from "@/context/auth-context"; // To get user ID for storage path
// Removed direct storage function imports as updateRelease handles it now
// import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Schema for managing/editing an existing release
const manageReleaseSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters.").max(100, "Title must be 100 characters or less."),
  artist: z.string().min(2, "Artist name must be at least 2 characters.").max(100, "Artist name must be 100 characters or less."),
  releaseDate: z.date({ required_error: "A release date is required." }), // Use date object for picker
  artworkFile: z.instanceof(File).optional().nullable() // New artwork file is optional
    .refine(file => !file || file.size <= 5 * 1024 * 1024, 'Artwork must be 5MB or less.')
    .refine(file => !file || file.type.startsWith('image/'), 'Artwork must be an image file.'),
  tracks: z.array(z.object({ name: z.string().min(1, "Track name cannot be empty.").max(100, "Track name too long.") })).min(1, "At least one track is required."),
  spotifyLink: z.string().url("Invalid Spotify link URL.").optional().nullable(),
  // artworkUrl is handled separately, not directly in the Zod schema for form submission
});

type ManageReleaseFormValues = z.infer<typeof manageReleaseSchema>;

interface ManageReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  releaseData: ReleaseWithId | null; // The release being managed
  onSuccess: () => void; // Callback after successful update
  onTakedownSuccess: () => void; // Added callback for successful takedown
}

export function ManageReleaseModal({ isOpen, onClose, releaseData, onSuccess, onTakedownSuccess }: ManageReleaseModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTakedownSubmitting, setIsTakedownSubmitting] = useState(false); // State for takedown action
  const [isTakedownConfirmOpen, setIsTakedownConfirmOpen] = useState(false); // State for takedown confirmation dialog
  const [artworkPreviewUrl, setArtworkPreviewUrl] = useState<string | null>(null); // For new uploads
  const [currentArtworkUrl, setCurrentArtworkUrl] = useState<string | null>(null); // From initialData
  const artworkInputRef = useRef<HTMLInputElement>(null);
  const placeholderArtwork = "/placeholder-artwork.png";

  // Function to safely parse initial date (string YYYY-MM-DD or Timestamp) into a Date object
  const parseInitialDate = (dateValue: string | Date | Timestamp | undefined): Date => {
      if (!dateValue) return new Date();
      try {
          if (dateValue instanceof Timestamp) {
              return dateValue.toDate();
          } else if (typeof dateValue === 'string') {
               // Try parsing ISO string (which YYYY-MM-DD is a subset of)
                const parsed = new Date(dateValue + 'T00:00:00Z'); // Assume UTC if only date part
                // Check if parseISO worked, otherwise fallback
                return isNaN(parsed.getTime()) ? new Date() : parsed; // Fallback to current date if parsing fails
          } else if (dateValue instanceof Date) {
              return dateValue;
          }
      } catch (e) {
          console.error("Error parsing initial date in manage modal:", dateValue, e);
      }
      return new Date(); // Fallback
  };


  const form = useForm<ManageReleaseFormValues>({
    resolver: zodResolver(manageReleaseSchema),
    defaultValues: { // Initialize with empty/default values
      title: "",
      artist: "",
      releaseDate: new Date(),
      artworkFile: null,
      tracks: [{ name: "" }],
      spotifyLink: "",
    },
    mode: "onChange",
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "tracks",
  });

   // Reset form when modal opens with new data or closes
   useEffect(() => {
     if (isOpen && releaseData) {
         form.reset({
             title: releaseData.title || "",
             artist: releaseData.artist || "",
             releaseDate: parseInitialDate(releaseData.releaseDate),
             artworkFile: null, // Reset file input
             // Map existing tracks or provide default if none
             tracks: releaseData.tracks && releaseData.tracks.length > 0 ? releaseData.tracks : [{ name: "" }],
             spotifyLink: releaseData.spotifyLink || "",
         });
         setCurrentArtworkUrl(releaseData.artworkUrl || null);
         setArtworkPreviewUrl(null); // Clear preview on open
         setIsTakedownConfirmOpen(false); // Ensure confirm dialog is closed on reopen
         setIsTakedownSubmitting(false); // Reset takedown loading state
     } else if (!isOpen) {
          // Optionally reset form on close after a delay
           setTimeout(() => {
                form.reset({
                    title: "", artist: "", releaseDate: new Date(), artworkFile: null,
                    tracks: [{ name: "" }], spotifyLink: ""
                });
                setCurrentArtworkUrl(null);
                setArtworkPreviewUrl(null);
                setIsTakedownConfirmOpen(false);
                setIsTakedownSubmitting(false);
           }, 150);
     }
     setIsSubmitting(false); // Reset submitting state
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [isOpen, releaseData]); // Rerun when isOpen or releaseData changes


  // Handle artwork file selection
  const handleArtworkChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) {
            toast({ title: "Image Too Large", description: "Artwork must be 5MB or less.", variant: "destructive" });
            form.setValue("artworkFile", null);
            setArtworkPreviewUrl(null);
            return;
        }
        if (!file.type.startsWith('image/')) {
             toast({ title: "Invalid File Type", description: "Please select an image file (PNG, JPG, GIF).", variant: "destructive" });
             form.setValue("artworkFile", null);
             setArtworkPreviewUrl(null);
             return;
        }

        form.setValue("artworkFile", file, { shouldValidate: true, shouldDirty: true });
        const reader = new FileReader();
        reader.onloadend = () => {
            setArtworkPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
    } else {
         clearArtwork();
    }
  };

  // Clear artwork selection
  const clearArtwork = () => {
    form.setValue("artworkFile", null, { shouldValidate: true, shouldDirty: true });
    setArtworkPreviewUrl(null); // Clear preview
    // Note: We don't clear currentArtworkUrl here, it represents the saved state
    if (artworkInputRef.current) {
      artworkInputRef.current.value = "";
    }
  };

  const handleSubmit = async (values: ManageReleaseFormValues) => {
    if (!user || !releaseData) {
      toast({ title: "Error", description: "User or release data missing.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    try {
      // Prepare data for the update function
      const dataToUpdate: Partial<Omit<ReleaseMetadata, 'userId' | 'createdAt' | 'zipUrl' | 'status' | 'artworkUrl' >> & { releaseDate?: string | Date } = {
        title: values.title,
        artist: values.artist,
        releaseDate: values.releaseDate, // Pass Date object, service function handles formatting
        tracks: values.tracks,
        spotifyLink: values.spotifyLink || null,
      };

      // Call the update service function, passing the new artwork file if selected
      await updateRelease(releaseData.id, dataToUpdate, values.artworkFile || undefined);

      toast({
        title: "Release Updated",
        description: `"${values.title}" has been updated successfully.`,
        variant: "default",
      });
      onSuccess(); // Call success callback
      onClose();   // Close modal

    } catch (error) {
      console.error("Error updating release:", error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Could not update the release.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Takedown Request using the service function
  const handleTakedownRequest = async () => {
      if (!releaseData) return;
      setIsTakedownSubmitting(true);
      console.log(`Submitting takedown request for release: ${releaseData.id} - ${releaseData.title}`);

      try {
          // Call the service function to update status and trigger backend (simulation)
          await initiateTakedown(releaseData.id);

          toast({
              title: "Takedown Requested",
              description: `Request to takedown "${releaseData.title}" submitted. This may take some time to reflect on platforms.`,
              variant: "default",
          });
          setIsTakedownConfirmOpen(false); // Close confirmation dialog
          onClose(); // Close the main manage modal
          onTakedownSuccess(); // Notify parent to refetch/update list

      } catch (error) {
          console.error("Error submitting takedown request:", error);
          toast({
              title: "Takedown Failed",
              description: error instanceof Error ? error.message : "Could not submit takedown request.",
              variant: "destructive",
          });
      } finally {
          setIsTakedownSubmitting(false);
      }
  };


  // Determine image source: preview > current > placeholder
  const displayArtworkSrc = artworkPreviewUrl || currentArtworkUrl || placeholderArtwork;
  const formIsDirty = form.formState.isDirty;
  const formIsValid = form.formState.isValid;

  if (!releaseData) return null; // Don't render if no release data

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg md:max-w-2xl bg-card/85 dark:bg-card/70 border-border/50">
        <DialogHeader>
          <DialogTitle className="text-primary">Manage Release: {releaseData?.title}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            View and edit the details for this release.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-5">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4 pr-1">

                {/* Artwork Display/Upload */}
                 <FormItem>
                    <FormLabel>Release Artwork</FormLabel>
                     <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-1">
                         <Image
                             src={displayArtworkSrc}
                             alt={`${releaseData.title} artwork`}
                             width={120} // Larger size in modal
                             height={120}
                             className="rounded-md object-cover aspect-square border border-border bg-muted/20"
                             onError={(e) => { e.currentTarget.src = placeholderArtwork; e.currentTarget.srcset = ""; }}
                             unoptimized // Good for dynamic or external URLs
                             priority={false} // Only use priority if it's critical LCP
                         />
                         <div className="flex flex-col gap-2 flex-grow">
                             <Button
                                 type="button"
                                 variant="outline"
                                 size="sm"
                                 onClick={() => artworkInputRef.current?.click()}
                                 disabled={isSubmitting}
                             >
                                 <Upload className="mr-2 h-4 w-4" /> Change Artwork
                             </Button>
                             {artworkPreviewUrl && ( // Show clear button only when previewing new image
                                  <Button
                                     type="button"
                                     variant="ghost"
                                     size="sm"
                                     onClick={clearArtwork}
                                     disabled={isSubmitting}
                                     className="text-destructive hover:text-destructive/90"
                                 >
                                     <X className="mr-2 h-4 w-4" /> Clear Selection
                                  </Button>
                              )}
                             <FormControl>
                                 <Input
                                     id="artwork-upload-manage"
                                     ref={artworkInputRef}
                                     name="artwork-upload-manage"
                                     type="file"
                                     className="sr-only"
                                     accept="image/*"
                                     onChange={handleArtworkChange}
                                     disabled={isSubmitting}
                                 />
                             </FormControl>
                             <FormDescription className="text-xs">Upload a new image file (PNG, JPG, GIF, max 5MB).</FormDescription>
                         </div>
                     </div>
                    {/* Hidden field for artworkFile, handled by react-hook-form */}
                    <FormField name="artworkFile" control={form.control} render={() => null} />
                     <FormMessage>{form.formState.errors.artworkFile?.message}</FormMessage>
                 </FormItem>


                {/* Release Title */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Release Title</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                 {/* Artist Name */}
                 <FormField
                    control={form.control}
                    name="artist"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Artist Name</FormLabel>
                        <FormControl>
                            <Input {...field} disabled={isSubmitting} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Release Date (Read-only for now, consider allowing edits carefully) */}
                <FormField
                  control={form.control}
                  name="releaseDate"
                  render={({ field }) => (
                    <FormItem>
                        <FormLabel>Original Release Date</FormLabel>
                        <FormControl>
                            {/* Displaying as read-only text */}
                            <Input
                                type="text"
                                // Use UTC date formatting for consistency
                                value={field.value instanceof Date && !isNaN(field.value.getTime()) ? format(field.value, "PPP", { useAdditionalDayOfYearTokens: false }) : "Invalid Date"}
                                readOnly
                                disabled
                                className="bg-muted/50 cursor-not-allowed"
                             />
                         </FormControl>
                         <FormDescription className="text-xs">Original release date (cannot be changed).</FormDescription>
                         <FormMessage />
                    </FormItem>
                  )}
                />


                {/* Tracks List (Editable) */}
                <div className="space-y-3">
                  <FormLabel>Tracks</FormLabel>
                  {fields.map((field, index) => (
                    <FormField
                      key={field.id}
                      control={form.control}
                      name={`tracks.${index}.name`}
                      render={({ field: trackField }) => (
                        <FormItem>
                           <div className="flex items-center gap-2">
                                <Music className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <FormControl>
                                    <Input
                                    placeholder={`Track ${index + 1} Name`}
                                    {...trackField}
                                    disabled={isSubmitting}
                                    className="flex-grow"
                                    />
                                </FormControl>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => remove(index)}
                                    disabled={isSubmitting || fields.length <= 1} // Keep at least one track
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Remove Track</span>
                                </Button>
                            </div>
                           <FormMessage className="pl-6" />
                        </FormItem>
                      )}
                    />
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ name: "" })}
                    disabled={isSubmitting}
                    className="mt-2"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Track
                  </Button>
                  <FormMessage>{form.formState.errors.tracks?.root?.message || form.formState.errors.tracks?.message}</FormMessage>
                </div>


                {/* Spotify Link (Editable) */}
                <FormField
                  control={form.control}
                  name="spotifyLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Spotify Link (Optional)</FormLabel>
                      <FormControl>
                         <div className="flex items-center space-x-2">
                             <LinkIcon className="h-4 w-4 text-muted-foreground" />
                             <Input
                                placeholder="https://open.spotify.com/album/..."
                                {...field}
                                value={field.value ?? ""}
                                disabled={isSubmitting}
                             />
                             {field.value && ( // Show external link button if link exists
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    asChild
                                    className="h-9 w-9"
                                >
                                    <a href={field.value} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-4 w-4" />
                                        <span className="sr-only">Open Spotify Link</span>
                                    </a>
                                </Button>
                              )}
                         </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                 {/* Takedown Request Section */}
                 <div className="pt-4 border-t border-border/50">
                     <h4 className="text-sm font-medium text-destructive mb-2">Danger Zone</h4>
                     <div className="flex items-center justify-between">
                         <div>
                             <p className="text-sm text-muted-foreground">Submit a request to remove this release from all platforms.</p>
                             <p className="text-xs text-destructive">This action is permanent and cannot be easily undone.</p>
                         </div>
                         <Button
                             type="button"
                             variant="destructive"
                             onClick={() => setIsTakedownConfirmOpen(true)}
                             disabled={isSubmitting || isTakedownSubmitting || releaseData.status === 'takedown_requested'} // Disable if already requested
                         >
                              {releaseData.status === 'takedown_requested' ? 'Takedown In Progress' :
                                <>
                                 <AlertTriangle className="mr-2 h-4 w-4" /> Submit Takedown Request
                                </>
                              }
                         </Button>
                     </div>
                 </div>


                {/* Footer with Save/Close */}
                <DialogFooter className="pt-6 mt-4 border-t border-border/50"> {/* Added margin top */}
                    <DialogClose asChild>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting || isTakedownSubmitting}>
                        Close
                        </Button>
                    </DialogClose>
                    <Button
                        type="submit"
                        disabled={isSubmitting || isTakedownSubmitting || !formIsDirty || !formIsValid} // Disable if no changes or invalid or takedown in progress
                        className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" />
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogFooter>
              </form>
            </Form>
        </ScrollArea>

        {/* Takedown Confirmation Dialog */}
        <AlertDialog open={isTakedownConfirmOpen} onOpenChange={setIsTakedownConfirmOpen}>
            <AlertDialogContent className="bg-card/85 dark:bg-card/70 border-border">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-destructive">Confirm Takedown Request</AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground">
                        Are you absolutely sure you want to request a takedown for
                        &quot;{releaseData?.title}&quot;? This action is permanent and will remove the release
                        from all streaming platforms. This process cannot be easily reversed.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isTakedownSubmitting} className="border-input hover:bg-muted/50">
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleTakedownRequest}
                        disabled={isTakedownSubmitting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isTakedownSubmitting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <AlertTriangle className="mr-2 h-4 w-4" />
                        )}
                        {isTakedownSubmitting ? 'Submitting...' : 'Yes, Submit Takedown'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

      </DialogContent>
    </Dialog>
  );
}

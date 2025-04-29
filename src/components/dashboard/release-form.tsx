
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { format } from "date-fns"
import Image from 'next/image';
import type React from 'react';
import { useState, useEffect } from "react";
import { Loader2, UploadCloud, X, CalendarIcon } from "lucide-react"; // Added CalendarIcon

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { uploadRelease, updateReleaseMetadata, type ReleaseMetadata } from "@/services/music-platform";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// Removed DatePicker import, using ShadCN Calendar+Popover directly now
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; // Import Popover components
import { Calendar } from "@/components/ui/calendar"; // Import Calendar

// Schema for new release (both files required)
const newReleaseSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters.").max(100, "Title must be 100 characters or less."),
  artist: z.string().min(2, "Artist name must be at least 2 characters.").max(100, "Artist name must be 100 characters or less."),
  releaseDate: z.date({ required_error: "A release date is required." }),
  artwork: z.instanceof(File).refine(file => file.size > 0, 'Artwork image is required.')
                           .refine(file => file.size <= 10 * 1024 * 1024, 'Artwork must be 10MB or less.') // Max 10MB
                           .refine(file => ["image/jpeg", "image/png", "image/gif"].includes(file.type), 'Only JPG, PNG, GIF allowed.'),
  audioFile: z.instanceof(File).refine(file => file.size > 0, 'Audio file is required.')
                             .refine(file => file.size <= 100 * 1024 * 1024, 'Audio file must be 100MB or less.') // Max 100MB
                             .refine(file => ["audio/mpeg", "audio/wav", "audio/flac"].includes(file.type), 'Only MP3, WAV, FLAC allowed.'),
});

// Schema for editing (files optional)
const editReleaseSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters.").max(100, "Title must be 100 characters or less."),
  artist: z.string().min(2, "Artist name must be at least 2 characters.").max(100, "Artist name must be 100 characters or less."),
  releaseDate: z.date({ required_error: "A release date is required." }),
  artwork: z.instanceof(File).optional() // Optional File
                             .refine(file => !file || file.size <= 10 * 1024 * 1024, 'Artwork must be 10MB or less.') // Validate if present
                             .refine(file => !file || ["image/jpeg", "image/png", "image/gif"].includes(file.type), 'Only JPG, PNG, GIF allowed.'), // Validate if present
  audioFile: z.instanceof(File).optional(), // Technically not used for metadata edit, but keep for type consistency
});


// Combined type for form values
type ReleaseFormValues = z.infer<typeof newReleaseSchema> | z.infer<typeof editReleaseSchema>;


interface ReleaseFormProps {
  releaseId?: string; // If provided, we are in edit mode
  initialData?: ReleaseMetadata & { id: string }; // Initial data for editing
  onSuccess?: () => void; // Optional callback after successful submission
  className?: string; // Allow passing custom classes
}

export function ReleaseForm({ releaseId, initialData, onSuccess, className }: ReleaseFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [artworkPreview, setArtworkPreview] = useState<string | null>(initialData?.artworkUrl || null);
  const [audioFileName, setAudioFileName] = useState<string | null>(null); // To show uploaded audio file name

  const isEditMode = !!releaseId;

  // Choose the correct schema based on the mode
  const formSchema = isEditMode ? editReleaseSchema : newReleaseSchema;

  const form = useForm<ReleaseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
        ...initialData,
        releaseDate: initialData.releaseDate ? new Date(initialData.releaseDate) : new Date(),
        artwork: undefined, // Reset file inputs for edit
        audioFile: undefined,
    } : {
      title: "",
      artist: "",
      releaseDate: new Date(),
      artwork: undefined,
      audioFile: undefined,
    },
  });

   // Reset form state if initialData changes (e.g., when opening edit dialog for different items)
    useEffect(() => {
        if (initialData) {
            form.reset({
                ...initialData,
                releaseDate: initialData.releaseDate ? new Date(initialData.releaseDate) : new Date(),
                artwork: undefined,
                audioFile: undefined,
            });
            setArtworkPreview(initialData.artworkUrl || null);
            setAudioFileName(null); // Reset audio file name on edit
        } else {
             form.reset({ // Reset to empty for upload form
                 title: "",
                 artist: "",
                 releaseDate: new Date(),
                 artwork: undefined,
                 audioFile: undefined,
             });
             setArtworkPreview(null);
             setAudioFileName(null);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialData]); // Depend only on initialData to reset

   // Register file inputs explicitly - this might not be strictly necessary with Controller but ensures they are known
   useEffect(() => {
     form.register('artwork');
     form.register('audioFile');
   }, [form]);


  async function onSubmit(values: ReleaseFormValues) {
     setIsSubmitting(true);

     // Ensure releaseDate is valid before formatting
     let formattedReleaseDate = '';
     if (values.releaseDate instanceof Date && !isNaN(values.releaseDate.getTime())) {
       formattedReleaseDate = format(values.releaseDate, 'yyyy-MM-dd');
     } else {
        toast({
            title: "Invalid Date",
            description: "Please select a valid release date.",
            variant: "destructive",
        });
        setIsSubmitting(false);
        return; // Stop submission if date is invalid
     }


     const metadataBase: Omit<ReleaseMetadata, 'artworkUrl'> = {
      title: values.title,
      artist: values.artist,
      releaseDate: formattedReleaseDate,
    };

    try {
      if (isEditMode && releaseId && initialData) {
        console.log("Updating release:", releaseId, metadataBase);
        let newArtworkUrl: string | undefined = initialData.artworkUrl; // Start with existing URL

        // 1. Handle optional artwork update (if a new file was selected)
        if (values.artwork instanceof File && values.artwork.size > 0) {
          console.log("Updating artwork for release:", releaseId);
          // TODO: Implement actual artwork upload/update logic here
          // For now, simulate upload and generate a new unique URL
           await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate upload
           newArtworkUrl = `https://picsum.photos/seed/${releaseId}/${Date.now()}/200/200`; // Simulate new URL
           console.log("Simulated artwork update successful, new URL:", newArtworkUrl);
        } else {
           console.log("No new artwork file selected for update.");
        }

        // 2. Update Metadata (potentially with the new artwork URL)
        const finalMetadata: ReleaseMetadata = {
            ...metadataBase,
            artworkUrl: newArtworkUrl || "", // Use new URL if available, otherwise keep old one (or empty if none existed)
        };
        await updateReleaseMetadata(releaseId, finalMetadata);


        toast({
          title: "Release Updated",
          description: `"${values.title}" metadata updated successfully.`,
          variant: "default", // Use "default" which adapts to theme
        });
        onSuccess?.(); // Call callback on success

      } else if (!isEditMode && values.audioFile instanceof File && values.artwork instanceof File) {
         console.log("Uploading new release:", metadataBase);

         // 1. Upload Release (Metadata + Audio + Artwork)
         // Pass both files to uploadRelease for it to handle
         const { id: newReleaseId, artworkUrl: finalArtworkUrl } = await uploadRelease(metadataBase, values.audioFile, values.artwork);


        toast({
          title: "Release Uploaded",
          description: `"${values.title}" has been submitted successfully.`,
           variant: "default", // Use "default"
        });
        form.reset({ // Reset form to default empty state after upload
            title: "",
            artist: "",
            releaseDate: new Date(),
            artwork: undefined,
            audioFile: undefined,
        });
        setArtworkPreview(null);
        setAudioFileName(null);
        // Clear file input visual state (more reliable way)
        form.setValue('artwork', undefined);
        form.setValue('audioFile', undefined);
        const artworkInput = document.getElementById('artwork') as HTMLInputElement | null;
        if (artworkInput) artworkInput.value = '';
        const audioInput = document.getElementById('audioFile') as HTMLInputElement | null;
        if (audioInput) audioInput.value = '';

        onSuccess?.(); // Call callback on success
      } else if (!isEditMode && !(values.artwork instanceof File)) {
          throw new Error("Artwork image is required for a new release.");
      } else if (!isEditMode && !(values.audioFile instanceof File)) {
          throw new Error("Audio file is required for a new release.");
      } else {
         throw new Error("Invalid form state for submission.");
      }
    } catch (error) {
      console.error("Error submitting release:", error);
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
       // Restore original preview if submission fails during edit
       if (isEditMode && initialData?.artworkUrl) {
           setArtworkPreview(initialData.artworkUrl);
       }
    } finally {
       setIsSubmitting(false);
    }
  }

   // Handle file input changes and update previews
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, fieldName: "artwork" | "audioFile") => {
    const file = event.target.files?.[0];
    if (file) {
        form.setValue(fieldName, file, { shouldValidate: true, shouldDirty: true }); // Trigger validation and mark as dirty
        if (fieldName === "artwork") {
            const reader = new FileReader();
            reader.onloadend = () => {
                setArtworkPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else if (fieldName === "audioFile") {
            setAudioFileName(file.name);
        }
    } else {
        // If user cancels/clears file selection
        clearFile(fieldName); // Use the clearFile function
    }
  };

   // Function to clear a file input and its preview
  const clearFile = (fieldName: "artwork" | "audioFile") => {
      form.setValue(fieldName, undefined, { shouldValidate: true, shouldDirty: true }); // Set to undefined and validate
      if (fieldName === "artwork") {
          // Revert to initial artwork in edit mode, or clear in new mode
          setArtworkPreview(isEditMode && initialData ? initialData.artworkUrl : null);
      } else {
          setAudioFileName(null);
      }
       // Also clear the underlying input element's value for visual consistency
      const inputElement = document.getElementById(fieldName) as HTMLInputElement | null;
      if (inputElement) {
        inputElement.value = ""; // Clear the native input
      }
  }

  return (
     // Adjusted background/opacity for dark mode and consistency
     <Card className={cn("shadow-md rounded-lg", className)}>
       <CardHeader>
        <CardTitle className="text-xl font-semibold text-primary">{isEditMode ? "Edit Release" : "Upload New Release"}</CardTitle>
        <CardDescription className="text-muted-foreground">
            {isEditMode ? "Update the details for this release." : "Fill in the details and upload your music."}
        </CardDescription>
       </CardHeader>
       <CardContent>
            <Form {...form}>
              {/* Added error logging for debugging */}
              <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
                  console.log("Form validation errors:", errors);
                   toast({ // Show validation errors in a toast
                       title: "Validation Error",
                       description: "Please check the form for errors.",
                       variant: "destructive",
                   });
               })} className="space-y-6">
                 {/* Title */}
                 <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        {/* Use standard input background */}
                        <Input placeholder="Enter release title" {...field} className="focus:ring-accent" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Artist */}
                <FormField
                  control={form.control}
                  name="artist"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Artist</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter artist name" {...field} className="focus:ring-accent" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Release Date */}
                 <FormField
                  control={form.control}
                  name="releaseDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Release Date</FormLabel>
                      {/* Use ShadCN Popover + Calendar directly */}
                       <Popover>
                         <PopoverTrigger asChild>
                           <FormControl>
                             <Button
                               variant={"outline"}
                               className={cn(
                                 "w-full justify-start text-left font-normal border-input focus:ring-accent", // Use input border color
                                 !field.value && "text-muted-foreground"
                               )}
                             >
                               <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                               {field.value && field.value instanceof Date && !isNaN(field.value.getTime()) ? ( // Check if valid date
                                 format(field.value, "PPP")
                               ) : (
                                 <span>Pick a date</span>
                               )}
                             </Button>
                           </FormControl>
                         </PopoverTrigger>
                         <PopoverContent className="w-auto p-0 bg-popover border-border" align="start">
                           <Calendar
                             mode="single"
                             selected={field.value instanceof Date && !isNaN(field.value.getTime()) ? field.value : undefined}
                             onSelect={(date) => field.onChange(date)} // Pass selected date to RHF
                             disabled={(date) => date > new Date()} // Disable future dates
                             initialFocus
                           />
                         </PopoverContent>
                       </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />


                {/* Artwork Upload */}
                 <FormField
                    control={form.control}
                    name="artwork"
                    render={({ fieldState }) => ( // Use fieldState to access error
                      <FormItem>
                        <FormLabel>Artwork Image</FormLabel>
                        <FormControl>
                              {/* Use bg-muted/20 for a subtle background */}
                             <div className={cn(
                                 "mt-1 flex justify-center rounded-md border-2 border-dashed px-6 pb-6 pt-5 bg-muted/20",
                                 fieldState.error ? "border-destructive" : "border-input hover:border-accent",
                                 artworkPreview ? "border-solid p-2" : "" // Adjust padding when preview is shown
                             )}>
                                <div className="space-y-1 text-center w-full">
                                    {artworkPreview ? (
                                        <div className="relative group mx-auto max-w-[200px]">
                                            <Image
                                                src={artworkPreview}
                                                alt="Artwork preview"
                                                width={200}
                                                height={200}
                                                className="mx-auto h-auto w-full max-h-48 rounded-md object-contain border border-border/50"
                                            />
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="icon"
                                                className="absolute -right-2 -top-2 h-6 w-6 opacity-80 group-hover:opacity-100 transition-opacity rounded-full shadow-md"
                                                onClick={() => clearFile("artwork")}
                                                aria-label="Remove artwork"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                             {/* Hidden label for changing artwork */}
                                             <label htmlFor="artwork" className="absolute inset-0 cursor-pointer rounded-md focus-within:outline-none focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 group-hover:bg-black/60 transition-colors flex items-center justify-center">
                                                <span className="text-sm font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity">Change</span>
                                                <input id="artwork" name="artwork" type="file" className="sr-only" accept="image/jpeg, image/png, image/gif" onChange={(e) => handleFileChange(e, "artwork")} />
                                            </label>
                                        </div>
                                    ) : (
                                        <>
                                            <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden="true" />
                                            <div className="flex text-sm text-muted-foreground justify-center">
                                                <label
                                                    htmlFor="artwork"
                                                    className="relative cursor-pointer rounded-md bg-background px-2 py-1 font-medium text-primary hover:text-primary/90 focus-within:outline-none focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2"
                                                >
                                                    <span>Upload artwork</span>
                                                    <input id="artwork" name="artwork" type="file" className="sr-only" accept="image/jpeg, image/png, image/gif" onChange={(e) => handleFileChange(e, "artwork")} />
                                                </label>
                                            </div>
                                            <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </FormControl>
                         <FormDescription className="text-xs">
                           {isEditMode ? "Upload a new image to replace the current one (optional)." : "Cover image for the release (JPG, PNG, GIF)."}
                         </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                />

                {/* Audio File Upload (only for new releases) */}
                {!isEditMode && (
                    <FormField
                        control={form.control}
                        name="audioFile"
                        render={({ fieldState }) => ( // Use fieldState to access error
                          <FormItem>
                            <FormLabel>Audio File</FormLabel>
                            <FormControl>
                                  {/* Use bg-muted/20 for a subtle background */}
                                 <div className={cn(
                                     "mt-1 flex justify-center rounded-md border-2 border-dashed px-6 pb-6 pt-5 bg-muted/20",
                                     fieldState.error ? "border-destructive" : "border-input hover:border-accent",
                                     audioFileName ? "border-solid p-4 items-center" : "" // Adjust when file selected
                                 )}>
                                    {audioFileName ? (
                                         <div className="flex items-center justify-between w-full">
                                            <p className="text-sm font-medium text-foreground truncate mr-4">{audioFileName}</p>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-muted-foreground hover:text-destructive rounded-full"
                                                onClick={() => clearFile("audioFile")}
                                                aria-label="Remove audio file"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-1 text-center">
                                            <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden="true" />
                                            <div className="flex text-sm text-muted-foreground justify-center">
                                                <label
                                                    htmlFor="audioFile"
                                                     className="relative cursor-pointer rounded-md bg-background px-2 py-1 font-medium text-primary hover:text-primary/90 focus-within:outline-none focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2"
                                                >
                                                    <span>Upload audio file</span>
                                                     <input id="audioFile" name="audioFile" type="file" className="sr-only" accept="audio/mpeg, audio/wav, audio/flac" onChange={(e) => handleFileChange(e, "audioFile")} />
                                                </label>
                                            </div>
                                            <p className="text-xs text-muted-foreground">MP3, WAV, FLAC up to 100MB</p>
                                        </div>
                                    )}
                                </div>
                            </FormControl>
                             <FormDescription className="text-xs">The main audio track for the release (MP3, WAV, FLAC).</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                    />
                )}

                {/* Submit Button */}
                <Button
                    type="submit"
                    disabled={isSubmitting || (!form.formState.isDirty && isEditMode)}
                    className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-md disabled:shadow-none disabled:bg-muted disabled:text-muted-foreground" // Improved disabled styles
                >
                 {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 {isSubmitting ? 'Submitting...' : (isEditMode ? 'Update Release' : 'Upload Release')}
                </Button>
              </form>
            </Form>
       </CardContent>
     </Card>
  )
}

// No longer need dummy components, using ShadCN directly

"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { format } from "date-fns"
import Image from 'next/image';
import type React from 'react';
import { useState, useEffect } from "react";
import { Loader2, UploadCloud, X } from "lucide-react";

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
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";

// Schema for new release (both files required)
const newReleaseSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters."),
  artist: z.string().min(2, "Artist name must be at least 2 characters."),
  releaseDate: z.date({ required_error: "A release date is required." }),
  artwork: z.instanceof(File).refine(file => file.size > 0, 'Artwork image is required.'),
  audioFile: z.instanceof(File).refine(file => file.size > 0, 'Audio file is required.'),
});

// Schema for editing (files optional)
const editReleaseSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters."),
  artist: z.string().min(2, "Artist name must be at least 2 characters."),
  releaseDate: z.date({ required_error: "A release date is required." }),
  artwork: z.instanceof(File).optional(), // Allow undefined or File
  audioFile: z.instanceof(File).optional(), // Technically not used for metadata edit, but keep for type consistency
});

// Combined type for form values
type ReleaseFormValues = z.infer<typeof newReleaseSchema> | z.infer<typeof editReleaseSchema>;


interface ReleaseFormProps {
  releaseId?: string; // If provided, we are in edit mode
  initialData?: ReleaseMetadata & { id: string }; // Initial data for editing
  onSuccess?: () => void; // Optional callback after successful submission
}

export function ReleaseForm({ releaseId, initialData, onSuccess }: ReleaseFormProps) {
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

   // Register file inputs explicitly
   useEffect(() => {
     form.register('artwork');
     form.register('audioFile');
   }, [form]);


  async function onSubmit(values: ReleaseFormValues) {
     setIsSubmitting(true);
     setArtworkPreview(null); // Clear preview during submission
     setAudioFileName(null);

     const metadata: ReleaseMetadata = {
      title: values.title,
      artist: values.artist,
      releaseDate: format(values.releaseDate, 'yyyy-MM-dd'),
      artworkUrl: initialData?.artworkUrl || "" // Keep existing URL initially
    };

    try {
      if (isEditMode && releaseId && initialData) {
        console.log("Updating release:", releaseId, metadata);
        // 1. Update Metadata
        await updateReleaseMetadata(releaseId, metadata);

        // 2. Handle optional artwork update (if a new file was selected)
        if (values.artwork instanceof File) {
          console.log("Updating artwork for release:", releaseId);
          // TODO: Implement actual artwork upload/update logic here
          // const newArtworkUrl = await uploadArtworkForRelease(releaseId, values.artwork);
          // metadata.artworkUrl = newArtworkUrl; // Update metadata if needed, or refetch
           await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate upload
           console.log("Simulated artwork update successful");
        }

        toast({
          title: "Release Updated",
          description: `"${values.title}" metadata updated successfully.`,
          variant: "default",
        });
        onSuccess?.(); // Call callback on success

      } else if (!isEditMode && values.audioFile instanceof File && values.artwork instanceof File) {
         console.log("Uploading new release:", metadata);
        // 1. Upload Release (Metadata + Audio)
        const newReleaseId = await uploadRelease(metadata, values.audioFile);

        // 2. Upload Artwork (could be part of uploadRelease or separate)
        console.log("Uploading artwork for new release:", newReleaseId);
         // TODO: Implement actual artwork upload logic here
        // const artworkUrl = await uploadArtworkForRelease(newReleaseId, values.artwork);
         await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate upload
         console.log("Simulated artwork upload successful");

        toast({
          title: "Release Uploaded",
          description: `"${values.title}" has been submitted successfully.`,
          variant: "default",
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
        onSuccess?.(); // Call callback on success
      } else {
         // This case should ideally be prevented by validation, but handle defensively
         throw new Error("Missing required files for new release.");
      }
    } catch (error) {
      console.error("Error submitting release:", error);
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
       // Restore preview if submission fails and it was an edit
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
        form.setValue(fieldName, file, { shouldValidate: true, shouldDirty: true });
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
       // If user cancels file selection, reset the field and preview
       form.setValue(fieldName, undefined, { shouldValidate: true, shouldDirty: true });
        if (fieldName === "artwork") {
             // Revert to initial artwork in edit mode, or clear in new mode
             setArtworkPreview(isEditMode && initialData ? initialData.artworkUrl : null);
        } else if (fieldName === "audioFile") {
             setAudioFileName(null);
        }
    }
     // Clear the other file input value visually if needed, though react-hook-form handles the state
     // event.target.value = ''; // Be cautious with this, might interfere
  };

   // Function to clear a file input and its preview
  const clearFile = (fieldName: "artwork" | "audioFile") => {
      form.setValue(fieldName, undefined, { shouldValidate: true, shouldDirty: true });
      if (fieldName === "artwork") {
          // Revert to initial artwork in edit mode, or clear in new mode
          setArtworkPreview(isEditMode && initialData ? initialData.artworkUrl : null);
      } else {
          setAudioFileName(null);
      }
       // Also clear the underlying input element's value if possible
      const inputElement = document.getElementById(fieldName) as HTMLInputElement | null;
      if (inputElement) {
        inputElement.value = "";
      }
  }

  return (
     <Card className="bg-card shadow-md rounded-lg transition-subtle">
       <CardHeader>
        <CardTitle className="text-xl font-semibold text-primary">{isEditMode ? "Edit Release" : "Upload New Release"}</CardTitle>
        <CardDescription className="text-muted-foreground">
            {isEditMode ? "Update the details for this release." : "Fill in the details and upload your music."}
        </CardDescription>
       </CardHeader>
       <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit, (errors) => console.log("Form validation errors:", errors))} className="space-y-6">
                 {/* Title */}
                 <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter release title" {...field} className="bg-background border-input focus:ring-accent" />
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
                        <Input placeholder="Enter artist name" {...field} className="bg-background border-input focus:ring-accent" />
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
                      <DatePicker
                        date={field.value}
                        setDate={(date) => field.onChange(date)}
                        className="bg-background border-input focus:ring-accent [&>button]:text-left [&>button]:font-normal"
                       />
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
                             <div className={cn(
                                 "mt-1 flex justify-center rounded-md border-2 border-dashed px-6 pb-6 pt-5",
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
                                                className="mx-auto h-auto w-full max-h-48 rounded-md object-contain"
                                            />
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="icon"
                                                className="absolute -right-2 -top-2 h-6 w-6 opacity-80 group-hover:opacity-100 transition-opacity"
                                                onClick={() => clearFile("artwork")}
                                                aria-label="Remove artwork"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                            <label htmlFor="artwork" className="absolute inset-0 cursor-pointer rounded-md focus-within:outline-none focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                                <span className="text-sm font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity">Change Artwork</span>
                                                <input id="artwork" name="artwork" type="file" className="sr-only" accept="image/jpeg, image/png, image/gif" onChange={(e) => handleFileChange(e, "artwork")} />
                                            </label>
                                        </div>
                                    ) : (
                                        <>
                                            <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden="true" />
                                            <div className="flex text-sm text-muted-foreground justify-center">
                                                <label
                                                    htmlFor="artwork"
                                                    className="relative cursor-pointer rounded-md bg-background font-medium text-primary hover:text-primary/90 focus-within:outline-none focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2"
                                                >
                                                    <span>Upload artwork</span>
                                                    <input id="artwork" name="artwork" type="file" className="sr-only" accept="image/jpeg, image/png, image/gif" onChange={(e) => handleFileChange(e, "artwork")} />
                                                </label>
                                                {/* <p className="pl-1">or drag and drop</p> */}
                                            </div>
                                            <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </FormControl>
                         <FormDescription>
                           {isEditMode ? "Upload a new image to replace the current one (optional)." : "Image file for the release cover."}
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
                                 <div className={cn(
                                     "mt-1 flex justify-center rounded-md border-2 border-dashed px-6 pb-6 pt-5",
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
                                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
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
                                                    className="relative cursor-pointer rounded-md bg-background font-medium text-primary hover:text-primary/90 focus-within:outline-none focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2"
                                                >
                                                    <span>Upload audio file</span>
                                                     <input id="audioFile" name="audioFile" type="file" className="sr-only" accept="audio/mpeg, audio/wav, audio/flac" onChange={(e) => handleFileChange(e, "audioFile")} />
                                                </label>
                                                {/* <p className="pl-1">or drag and drop</p> */}
                                            </div>
                                            <p className="text-xs text-muted-foreground">MP3, WAV, FLAC up to 100MB</p>
                                        </div>
                                    )}
                                </div>
                            </FormControl>
                             <FormDescription>The main audio track for the release.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                    />
                )}

                {/* Submit Button */}
                <Button type="submit" disabled={isSubmitting || !form.formState.isDirty} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
                 {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 {isSubmitting ? 'Submitting...' : (isEditMode ? 'Update Release' : 'Upload Release')}
                </Button>
              </form>
            </Form>
       </CardContent>
     </Card>
  )
}


"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { format } from "date-fns"
import type React from 'react';
import { useState, useEffect } from "react";
import { Loader2, CalendarIcon } from "lucide-react"; // Keep CalendarIcon

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
// Import only updateReleaseMetadata, as upload is handled elsewhere
import { updateReleaseMetadata, type ReleaseMetadata } from "@/services/music-platform";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; // Import Popover components
import { Calendar } from "@/components/ui/calendar"; // Import Calendar

// Schema for editing metadata only
const editMetadataSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters.").max(100, "Title must be 100 characters or less."),
  artist: z.string().min(2, "Artist name must be at least 2 characters.").max(100, "Artist name must be 100 characters or less."),
  releaseDate: z.date({ required_error: "A release date is required." }),
  // artworkUrl is part of the initial data but not directly editable here
});

// Type for form values (metadata only)
type EditMetadataFormValues = z.infer<typeof editMetadataSchema>;

interface ReleaseFormProps {
  releaseId: string; // Must be provided for editing
  initialData: ReleaseMetadata & { id: string }; // Initial data for editing
  onSuccess?: () => void; // Optional callback after successful submission
  className?: string; // Allow passing custom classes
}

// Renamed component to be more specific (optional, but good practice)
// export function EditReleaseMetadataForm({ releaseId, initialData, onSuccess, className }: ReleaseFormProps) {
// Keeping original name for now to minimize refactoring elsewhere immediately
export function ReleaseForm({ releaseId, initialData, onSuccess, className }: ReleaseFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use the metadata editing schema
  const form = useForm<EditMetadataFormValues>({
    resolver: zodResolver(editMetadataSchema),
    defaultValues: {
      title: initialData?.title || "",
      artist: initialData?.artist || "",
      // Ensure date is parsed correctly from string or Date
      releaseDate: initialData?.releaseDate ? new Date(initialData.releaseDate instanceof Date ? initialData.releaseDate : initialData.releaseDate + 'T00:00:00Z') : new Date(),
    },
     mode: "onChange", // Validate on change for better feedback
  });

   // Reset form state if initialData changes
    useEffect(() => {
        form.reset({
            title: initialData?.title || "",
            artist: initialData?.artist || "",
            releaseDate: initialData?.releaseDate ? new Date(initialData.releaseDate instanceof Date ? initialData.releaseDate : initialData.releaseDate + 'T00:00:00Z') : new Date(),
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialData]); // Depend only on initialData to reset


  async function onSubmit(values: EditMetadataFormValues) {
     setIsSubmitting(true);

     // Ensure releaseDate is valid before formatting
     let formattedReleaseDate = '';
     if (values.releaseDate instanceof Date && !isNaN(values.releaseDate.getTime())) {
        // Format as YYYY-MM-DD, preserving the local date intended by the user
        // Get year, month (0-indexed), and day
        const year = values.releaseDate.getFullYear();
        const month = (values.releaseDate.getMonth() + 1).toString().padStart(2, '0'); // Add 1 for month, pad with 0
        const day = values.releaseDate.getDate().toString().padStart(2, '0'); // Pad day with 0
        formattedReleaseDate = `${year}-${month}-${day}`;
     } else {
        toast({
            title: "Invalid Date",
            description: "Please select a valid release date.",
            variant: "destructive",
        });
        setIsSubmitting(false);
        return; // Stop submission if date is invalid
     }

     // Construct metadata including the original artworkUrl
     const metadataToUpdate: ReleaseMetadata = {
        title: values.title,
        artist: values.artist,
        releaseDate: formattedReleaseDate,
        artworkUrl: initialData.artworkUrl, // Keep the existing artwork URL
     };

    try {
        console.log("Updating release metadata:", releaseId, metadataToUpdate);
        await updateReleaseMetadata(releaseId, metadataToUpdate);

        toast({
          title: "Release Metadata Updated",
          description: `"${values.title}" metadata updated successfully.`,
          variant: "default",
        });
        onSuccess?.(); // Call callback on success

    } catch (error) {
      console.error("Error updating release metadata:", error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
       setIsSubmitting(false);
    }
  }


  return (
     <div className={cn(className)}> {/* Use div instead of Card if needed */}
        <Form {...form}>
           <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
               console.log("Form validation errors:", errors);
                toast({
                    title: "Validation Error",
                    description: "Please check the form for errors.",
                    variant: "destructive",
                });
            })} className="space-y-4"> {/* Reduced spacing */}
              {/* Title */}
              <FormField
               control={form.control}
               name="title"
               render={({ field }) => (
                 <FormItem>
                   <FormLabel>Title</FormLabel>
                   <FormControl>
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
                           onSelect={(date) => field.onChange(date || new Date())} // Ensure a date object is always passed
                           // Disable dates before today + 1 day (allow today)
                           disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))} // Disable past dates
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                   <FormMessage />
                 </FormItem>
               )}
             />

             {/* Removed Artwork and Audio File Upload Fields */}

             {/* Submit Button */}
             <Button
                 type="submit"
                 disabled={isSubmitting || !form.formState.isDirty} // Disable if submitting or form hasn't changed
                 className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-md disabled:shadow-none disabled:bg-muted disabled:text-muted-foreground" // Improved disabled styles
             >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Updating...' : 'Update Metadata'}
             </Button>
           </form>
         </Form>
     </div>
  )
}

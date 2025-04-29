
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { format } from "date-fns"
import type React from 'react';
import { useState, useEffect } from "react";
import { Loader2, CalendarIcon } from "lucide-react"; // Keep CalendarIcon
import { Timestamp } from "firebase/firestore"; // Import Timestamp for initial data typing

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
import { updateReleaseMetadata, type ReleaseMetadata, type ReleaseWithId } from "@/services/music-platform"; // Import updated service and types
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; // Import Popover components
import { Calendar } from "@/components/ui/calendar"; // Import Calendar

// Schema for editing metadata only
const editMetadataSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters.").max(100, "Title must be 100 characters or less."),
  artist: z.string().min(2, "Artist name must be at least 2 characters.").max(100, "Artist name must be 100 characters or less."),
  releaseDate: z.date({ required_error: "A release date is required." }),
  // artworkUrl and other fields are part of the initial data but not directly editable here
});

// Type for form values (metadata only)
type EditMetadataFormValues = z.infer<typeof editMetadataSchema>;

interface ReleaseFormProps {
  releaseId: string; // Must be provided for editing
  initialData: ReleaseWithId; // Use ReleaseWithId for initial data (includes ID and potentially Timestamp)
  onSuccess?: () => void; // Optional callback after successful submission
  className?: string; // Allow passing custom classes
}


// Keeping original name for now to minimize refactoring elsewhere immediately
export function ReleaseForm({ releaseId, initialData, onSuccess, className }: ReleaseFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Function to safely parse initial date (string, Date, or Timestamp) into a Date object
  const parseInitialDate = (dateValue: string | Date | Timestamp | undefined): Date => {
      if (!dateValue) return new Date(); // Default to today if undefined
      try {
          if (dateValue instanceof Timestamp) {
              return dateValue.toDate();
          } else if (typeof dateValue === 'string') {
              // Assume 'YYYY-MM-DD', parse as UTC date part
              const parts = dateValue.split('-');
              if (parts.length === 3) {
                   return new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
              }
               // Fallback parsing attempt
               const parsed = new Date(dateValue);
               return isNaN(parsed.getTime()) ? new Date() : parsed;
          } else if (dateValue instanceof Date) {
              return dateValue; // Already a Date object
          }
      } catch (e) {
          console.error("Error parsing initial date:", dateValue, e);
      }
      return new Date(); // Fallback to today on error
  };


  // Use the metadata editing schema
  const form = useForm<EditMetadataFormValues>({
    resolver: zodResolver(editMetadataSchema),
    defaultValues: {
      title: initialData?.title || "",
      artist: initialData?.artist || "",
      // Use the helper function to parse the initial date
      releaseDate: parseInitialDate(initialData?.releaseDate),
    },
     mode: "onChange", // Validate on change for better feedback
  });

   // Reset form state if initialData changes
    useEffect(() => {
        form.reset({
            title: initialData?.title || "",
            artist: initialData?.artist || "",
            releaseDate: parseInitialDate(initialData?.releaseDate),
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialData]); // Depend only on initialData to reset


  async function onSubmit(values: EditMetadataFormValues) {
     setIsSubmitting(true);

     // Ensure releaseDate is valid before formatting
     let formattedReleaseDate = '';
     if (values.releaseDate instanceof Date && !isNaN(values.releaseDate.getTime())) {
        // Format as YYYY-MM-DD for Firestore consistency
        formattedReleaseDate = format(values.releaseDate, "yyyy-MM-dd");
     } else {
        toast({
            title: "Invalid Date",
            description: "Please select a valid release date.",
            variant: "destructive",
        });
        setIsSubmitting(false);
        return; // Stop submission if date is invalid
     }

     // Construct metadata for update (only title, artist, releaseDate)
     const metadataToUpdate: Partial<Pick<ReleaseMetadata, 'title' | 'artist' | 'releaseDate'>> = {
        title: values.title,
        artist: values.artist,
        releaseDate: formattedReleaseDate, // Send formatted string
     };

    try {
        console.log("Updating release metadata in Firestore:", releaseId, metadataToUpdate);
        // Call the updated Firestore service function
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
                           // Optionally adjust disabled dates logic if needed
                           // disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                           disabled={(date) => date < new Date("1900-01-01")} // Allow past dates, but maybe not *too* far past
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


"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Loader2, UploadCloud, X, CalendarIcon, FileArchive } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { uploadReleaseZip } from "@/services/music-platform"; // Use the new service function
import { cn } from "@/lib/utils";

// Schema for the upload modal
const uploadSchema = z.object({
  releaseName: z.string().min(2, "Release name must be at least 2 characters.").max(100, "Name must be 100 characters or less."),
  releaseDate: z.date({ required_error: "A release date is required." }),
  releaseZip: z.instanceof(File).refine(file => file.size > 0, 'Release ZIP file is required.')
                           .refine(file => file.size <= 500 * 1024 * 1024, 'ZIP file must be 500MB or less.') // Max 500MB (adjust as needed)
                           .refine(file => file.type === "application/zip" || file.type === "application/x-zip-compressed", 'File must be a ZIP archive.'),
});

type UploadFormValues = z.infer<typeof uploadSchema>;

interface UploadReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // Callback after successful upload
}

export function UploadReleaseModal({ isOpen, onClose, onSuccess }: UploadReleaseModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [zipFileName, setZipFileName] = useState<string | null>(null);

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      releaseName: "",
      releaseDate: new Date(), // Default to today
      releaseZip: undefined,
    },
     mode: "onChange", // Validate on change
  });

  // Reset form when modal opens/closes
  useState(() => {
    if (!isOpen) {
      form.reset();
      setZipFileName(null);
      setIsSubmitting(false);
    }
  });

  // Handle file input changes and update state
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        form.setValue("releaseZip", file, { shouldValidate: true, shouldDirty: true });
        setZipFileName(file.name);
    } else {
        clearFile();
    }
  };

  // Function to clear file input and state
  const clearFile = () => {
      form.setValue("releaseZip", undefined, { shouldValidate: true, shouldDirty: true });
      setZipFileName(null);
      const inputElement = document.getElementById("releaseZip") as HTMLInputElement | null;
      if (inputElement) {
        inputElement.value = ""; // Clear the native input
      }
  }

  async function onSubmit(values: UploadFormValues) {
    setIsSubmitting(true);

    // Ensure releaseDate is valid
     let formattedReleaseDate = '';
     if (values.releaseDate instanceof Date && !isNaN(values.releaseDate.getTime())) {
        const year = values.releaseDate.getFullYear();
        const month = (values.releaseDate.getMonth() + 1).toString().padStart(2, '0');
        const day = values.releaseDate.getDate().toString().padStart(2, '0');
        formattedReleaseDate = `${year}-${month}-${day}`;
     } else {
        toast({ title: "Invalid Date", description: "Please select a valid release date.", variant: "destructive" });
        setIsSubmitting(false);
        return;
     }

    if (!(values.releaseZip instanceof File)) {
        toast({ title: "Missing File", description: "Please select a ZIP file to upload.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }

    try {
      console.log("Uploading release ZIP:", { name: values.releaseName, date: formattedReleaseDate, fileName: values.releaseZip.name });

      // Call the new service function
      await uploadReleaseZip({
          releaseName: values.releaseName,
          releaseDate: formattedReleaseDate,
      }, values.releaseZip);

      toast({
        title: "Upload Successful",
        description: `"${values.releaseName}" submitted for processing.`,
        variant: "default",
      });
      onSuccess(); // Call the success callback (refreshes list)
      onClose(); // Close the modal

    } catch (error) {
      console.error("Error uploading release ZIP:", error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred during upload.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md md:max-w-lg bg-card/95 dark:bg-card/80 backdrop-blur-sm border-border/50">
        <DialogHeader>
          <DialogTitle className="text-primary">Upload New Release</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Provide the release name, date, and upload a single ZIP file containing the audio and artwork.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
                console.log("Form validation errors:", errors);
                 toast({ title: "Validation Error", description: "Please check the form for errors.", variant: "destructive" });
             })} className="space-y-4 pt-4">

            {/* Release Name */}
            <FormField
              control={form.control}
              name="releaseName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Release Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter release name (e.g., album or single title)" {...field} className="focus:ring-accent" />
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
                            "w-full justify-start text-left font-normal border-input focus:ring-accent",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                          {field.value && field.value instanceof Date && !isNaN(field.value.getTime()) ? (
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
                        onSelect={(date) => field.onChange(date || new Date())}
                        disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))} // Disable past dates
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                   <FormDescription className="text-xs">The date the release should go live.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

             {/* ZIP File Upload */}
             <FormField
                control={form.control}
                name="releaseZip"
                render={({ fieldState }) => (
                  <FormItem>
                    <FormLabel>Release Package (ZIP)</FormLabel>
                    <FormControl>
                        <div className={cn(
                             "mt-1 flex justify-center rounded-md border-2 border-dashed px-6 pb-6 pt-5 bg-muted/20",
                             fieldState.error ? "border-destructive" : "border-input hover:border-accent",
                             zipFileName ? "border-solid p-4 items-center" : "" // Adjust style when file selected
                         )}>
                            {zipFileName ? (
                                <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-2 text-sm font-medium text-foreground truncate mr-4">
                                       <FileArchive className="h-5 w-5 text-muted-foreground" />
                                       <span>{zipFileName}</span>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-muted-foreground hover:text-destructive rounded-full"
                                        onClick={clearFile}
                                        aria-label="Remove ZIP file"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-1 text-center">
                                    <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden="true" />
                                    <div className="flex text-sm text-muted-foreground justify-center">
                                        <label
                                            htmlFor="releaseZip"
                                            className="relative cursor-pointer rounded-md bg-background px-2 py-1 font-medium text-primary hover:text-primary/90 focus-within:outline-none focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2"
                                        >
                                            <span>Select ZIP file</span>
                                            <input id="releaseZip" name="releaseZip" type="file" className="sr-only" accept=".zip,application/zip,application/x-zip-compressed" onChange={handleFileChange} />
                                        </label>
                                        <p className="pl-1">or drag and drop</p>
                                    </div>
                                    <p className="text-xs text-muted-foreground">ZIP archive up to 500MB</p>
                                </div>
                            )}
                        </div>
                    </FormControl>
                    <FormDescription className="text-xs">
                        Must be a ZIP file containing audio (WAV, FLAC, or MP3) and artwork (JPG, PNG). See guidelines.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
            />


            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={isSubmitting || !form.formState.isValid || !zipFileName} // Disable if submitting, invalid or no file
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md disabled:shadow-none disabled:bg-muted disabled:text-muted-foreground"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Uploading...' : 'Upload Release'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

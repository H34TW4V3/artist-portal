
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Loader2, CalendarIcon } from "lucide-react";
import { Timestamp } from "firebase/firestore";

import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { addEvent } from "@/services/events"; // Import the addEvent service
import { cn } from "@/lib/utils";

// Schema for the create event form
const eventSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters.").max(100, "Title must be 100 characters or less."),
  date: z.date({ required_error: "An event date is required." }),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)").optional().nullable(), // HH:MM format
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)").optional().nullable(),
  location: z.string().max(150, "Location must be 150 characters or less.").optional().nullable(),
  description: z.string().max(1000, "Description must be 1000 characters or less.").optional().nullable(),
});

type EventFormValues = z.infer<typeof eventSchema>;

interface CreateEventFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  className?: string;
}

export function CreateEventForm({ onSuccess, onCancel, className }: CreateEventFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      date: new Date(),
      startTime: "",
      endTime: "",
      location: "",
      description: "",
    },
    mode: "onChange",
  });

  async function onSubmit(values: EventFormValues) {
    setIsSubmitting(true);

    // Combine date and time if time is provided, otherwise use just the date (as Timestamp)
    let eventTimestamp: Timestamp;
    try {
        // Ensure date is valid
        if (!(values.date instanceof Date) || isNaN(values.date.getTime())) {
           throw new Error("Invalid date selected.");
        }

        // Create a base date object from the selected date
        const year = values.date.getFullYear();
        const month = values.date.getMonth();
        const day = values.date.getDate();

        let eventDate = new Date(Date.UTC(year, month, day)); // Start with date part in UTC

        // Add time if startTime exists
        if (values.startTime) {
            const [hours, minutes] = values.startTime.split(':').map(Number);
            if (!isNaN(hours) && !isNaN(minutes)) {
                // Set time according to UTC offset of the base date.
                // This assumes the user inputs time in their local timezone.
                // Firestore stores Timestamps as UTC.
                // Let's create the final date in local time then convert.
                 let localDateWithTime = new Date(year, month, day, hours, minutes);
                 eventTimestamp = Timestamp.fromDate(localDateWithTime);

            } else {
                 // Fallback if time parsing fails - just use the date
                 eventTimestamp = Timestamp.fromDate(eventDate);
            }
        } else {
             // No start time provided, use the date part (midnight UTC)
             eventTimestamp = Timestamp.fromDate(eventDate);
        }

        const eventData = {
            title: values.title,
            date: eventTimestamp,
            startTime: values.startTime || null, // Store as null if empty
            endTime: values.endTime || null,
            location: values.location || null,
            description: values.description || null,
        };


        await addEvent(eventData);

        toast({
            title: "Event Created",
            description: `"${values.title}" has been added to your schedule.`,
            variant: "default",
        });
        form.reset();
        onSuccess();

    } catch (error) {
        console.error("Error creating event:", error);
        toast({
            title: "Creation Failed",
            description: error instanceof Error ? error.message : "Could not create the event.",
            variant: "destructive",
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
            console.log("Form validation errors:", errors);
             toast({ title: "Validation Error", description: "Please check the form for errors.", variant: "destructive" });
         })} className={cn("space-y-4", className)}>

        {/* Event Title */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Album Launch Party" {...field} disabled={isSubmitting} className="focus:ring-accent" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Event Date */}
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal border-input focus:ring-accent",
                        !field.value && "text-muted-foreground"
                      )}
                       disabled={isSubmitting}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                      {field.value instanceof Date && !isNaN(field.value.getTime()) ? (
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
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Start & End Time (Optional) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time (Optional)</FormLabel>
                <FormControl>
                  <Input type="time" {...field} value={field.value ?? ""} disabled={isSubmitting} className="focus:ring-accent" />
                </FormControl>
                 <FormDescription className="text-xs">HH:MM format.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Time (Optional)</FormLabel>
                <FormControl>
                  <Input type="time" {...field} value={field.value ?? ""} disabled={isSubmitting} className="focus:ring-accent" />
                </FormControl>
                 <FormDescription className="text-xs">HH:MM format.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Location (Optional) */}
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., The Music Venue, City" {...field} value={field.value ?? ""} disabled={isSubmitting} className="focus:ring-accent" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description (Optional) */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add any extra details about the event..."
                  className="resize-y min-h-[80px] focus:ring-accent"
                  {...field}
                  value={field.value ?? ""}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !form.formState.isValid}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md disabled:shadow-none disabled:bg-muted disabled:text-muted-foreground"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Creating...' : 'Create Event'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

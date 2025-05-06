
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, User, Mail } from "lucide-react";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
// Placeholder for a function to create a new artist profile and potentially a new user
// import { createNewArtistAndUser } from "@/services/user"; 

const createArtistSchema = z.object({
  artistName: z.string().min(2, "Artist name must be at least 2 characters.").max(100, "Artist name too long."),
  artistEmail: z.string().email("Please enter a valid email address for the new artist user."),
});

type CreateArtistFormValues = z.infer<typeof createArtistSchema>;

interface CreateArtistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newArtistName: string) => void;
}

export function CreateArtistModal({ isOpen, onClose, onSuccess }: CreateArtistModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateArtistFormValues>({
    resolver: zodResolver(createArtistSchema),
    defaultValues: {
      artistName: "",
      artistEmail: "",
    },
    mode: "onChange",
  });

  async function onSubmit(values: CreateArtistFormValues) {
    setIsSubmitting(true);
    try {
      // Placeholder: Implement actual artist and user creation logic
      // For now, we'll just simulate success and pass the name back.
      console.log("Simulating creation of new artist:", values);
      // await createNewArtistAndUser(values.artistName, values.artistEmail); // Example
      await new Promise(resolve => setTimeout(resolve, 1500));


      toast({
        title: "Artist Profile Creation (Simulated)",
        description: `"${values.artistName}" would be created with email ${values.artistEmail}. This is a placeholder.`,
        variant: "default",
      });
      onSuccess(values.artistName);
      form.reset();
      // onClose(); // onSuccess should handle closing via parent state
    } catch (error) {
      console.error("Error creating new artist profile:", error);
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Could not create new artist profile.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {if (!open) {form.reset(); onClose();}}}>
      <DialogContent className="sm:max-w-md bg-card/85 dark:bg-card/70 border-border/50">
        <DialogHeader>
          <DialogTitle className="text-primary">Create New Artist Profile</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Set up a new artist. This will also create a new user account if the email isn't already in use.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="artistName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5"><User className="h-4 w-4" /> Artist Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., DJ SparklePony" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="artistEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5"><Mail className="h-4 w-4" /> Artist Login Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="artist@example.com" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={() => {form.reset(); onClose();}} disabled={isSubmitting}>
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={isSubmitting || !form.formState.isValid}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Creating...' : 'Create Artist'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


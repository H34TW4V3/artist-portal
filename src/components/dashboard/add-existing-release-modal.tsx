
"use client";

import React, { useState, useRef, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Loader2, Link as LinkIcon, Upload, CalendarIcon, Music, Trash2, PlusCircle, X } from "lucide-react";
import Image from 'next/image';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { addExistingRelease, type ExistingReleaseData } from "@/services/music-platform"; // Import service and type
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Import storage functions
import { storage } from "@/services/firebase-config"; // Import storage instance
import { useAuth } from "@/context/auth-context"; // To get user ID for storage path
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Import Select
import { getUserProfileByUid } from "@/services/user"; // To fetch profile for artist names
import type { ProfileFormValues } from "@/components/profile/profile-form"; // Import ProfileFormValues

// Schema for adding an existing release - artist field is now optional.
const existingReleaseSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters.").max(100, "Title must be 100 characters or less."),
  artist: z.string().min(2, "Artist name must be at least 2 characters.").max(100, "Artist name must be 100 characters or less.").optional().nullable(), // Artist is optional
  releaseDate: z.date({ required_error: "A release date is required." }),
  artworkFile: z.instanceof(File).optional().nullable() // Artwork file is optional
    .refine(file => !file || file.size <= 5 * 1024 * 1024, 'Artwork must be 5MB or less.')
    .refine(file => !file || file.type.startsWith('image/'), 'Artwork must be an image file.'),
  tracks: z.array(z.object({ name: z.string().min(1, "Track name cannot be empty.").max(100, "Track name too long.") })).min(1, "At least one track is required."),
  spotifyLink: z.string().url("Invalid Spotify link URL.").optional().nullable(),
});

type ExistingReleaseFormValues = z.infer<typeof existingReleaseSchema>;

interface AddExistingReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // Callback after successful addition
}

export function AddExistingReleaseModal({ isOpen, onClose, onSuccess }: AddExistingReleaseModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [artworkPreviewUrl, setArtworkPreviewUrl] = useState<string | null>(null);
  const artworkInputRef = useRef<HTMLInputElement>(null);
  const [userProfile, setUserProfile] = useState<ProfileFormValues | null>(null);

  const form = useForm<ExistingReleaseFormValues>({
    resolver: zodResolver(existingReleaseSchema),
    defaultValues: {
      title: "",
      artist: "", // Initialize as empty string
      releaseDate: new Date(),
      artworkFile: null,
      tracks: [{ name: "" }], // Start with one empty track
      spotifyLink: "",
    },
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "tracks",
  });

  useEffect(() => {
    const fetchProfile = async () => {
        if (user?.uid) {
            const profile = await getUserProfileByUid(user.uid);
            setUserProfile(profile);
            // Set default artist name after profile is fetched
            form.reset({
                ...form.getValues(), // Keep other form values
                artist: profile?.name || "", // Default to profile name
            });
        }
    };
    if (isOpen) {
        fetchProfile();
    }
  }, [isOpen, user, form]);


   // Reset form when modal closes or opens
   useEffect(() => {
     if (isOpen) {
         form.reset({
             title: "",
             artist: userProfile?.name || "", // Use fetched profile name or empty
             releaseDate: new Date(),
             artworkFile: null,
             tracks: [{ name: "" }],
             spotifyLink: "",
         });
         setArtworkPreviewUrl(null);
          if (artworkInputRef.current) { // Clear file input visually
             artworkInputRef.current.value = "";
          }
     } else {
          // Small delay before resetting on close to avoid flicker if reopening quickly
          setTimeout(() => {
            form.reset({
                title: "",
                artist: userProfile?.name || "",
                releaseDate: new Date(),
                artworkFile: null,
                tracks: [{ name: "" }],
                spotifyLink: "",
            });
             setArtworkPreviewUrl(null);
              if (artworkInputRef.current) { // Clear file input visually
                  artworkInputRef.current.value = "";
              }
          }, 150);
     }
     setIsSubmitting(false);
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [isOpen, userProfile]); // Add userProfile dependency to reset with artist name

  // Handle artwork file selection
  const handleArtworkChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) {
            toast({ title: "Image Too Large", description: "Artwork must be 5MB or less.", variant: "destructive" });
            form.setValue("artworkFile", null); // Clear value
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
    setArtworkPreviewUrl(null);
    if (artworkInputRef.current) {
      artworkInputRef.current.value = "";
    }
  };

  const handleSubmit = async (values: ExistingReleaseFormValues) => {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    let artworkUrl: string | null = null;

    try {
      // 1. Upload artwork if provided
      const artworkFile = values.artworkFile;
      if (artworkFile) {
        const artworkFileName = `${user.uid}_${Date.now()}_${artworkFile.name}`;
        const artworkStorageRef = ref(storage, `releaseArtwork/${user.uid}/${artworkFileName}`);
        const snapshot = await uploadBytes(artworkStorageRef, artworkFile);
        artworkUrl = await getDownloadURL(snapshot.ref);
        console.log("Artwork uploaded for existing release:", artworkUrl);
      }

      const releaseData: ExistingReleaseData = {
        title: values.title,
        artist: values.artist || userProfile?.name || null, // Use form value or profile name or null
        releaseDate: values.releaseDate,
        artworkUrl: artworkUrl,
        tracks: values.tracks,
        spotifyLink: values.spotifyLink || null,
      };

      await addExistingRelease(releaseData);

      toast({
        title: "Release Added",
        description: `"${values.title}" has been added successfully.`,
        variant: "default",
        duration: 2000,
      });
      onSuccess();
      onClose();

    } catch (error) {
      console.error("Error adding existing release:", error);
      toast({
        title: "Failed to Add Release",
        description: error instanceof Error ? error.message : "Could not add the release.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Placeholder for multiple artist names - replace with actual data source
  const artistNames = userProfile?.name ? [userProfile.name, "DJ Another Name", "Producer Alias"] : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg md:max-w-2xl bg-card/85 dark:bg-card/70 border-border/50">
        <DialogHeader>
          <DialogTitle className="text-primary">Add Existing Release</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enter the details for a release that's already on streaming platforms.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-5">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4 pr-1">

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Release Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Album or Single Title" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                 <FormField
                    control={form.control}
                    name="artist"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Artist Name</FormLabel>
                        {artistNames.length > 1 ? (
                            <Select onValueChange={field.onChange} defaultValue={field.value ?? userProfile?.name ?? ""} disabled={isSubmitting}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select an artist name" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {artistNames.map(name => (
                                        <SelectItem key={name} value={name}>{name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <FormControl>
                                <Input placeholder="Defaults to your profile name" {...field} value={field.value ?? userProfile?.name ?? ""} disabled={isSubmitting} />
                            </FormControl>
                        )}
                        <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                  control={form.control}
                  name="releaseDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Original Release Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal border-input",
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
                             disabled={(date) => date > new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                    control={form.control}
                    name="artworkFile"
                    render={({ fieldState }) => (
                        <FormItem>
                            <FormLabel>Release Artwork (Optional)</FormLabel>
                             <FormControl>
                                <div className={cn(
                                     "mt-1 flex rounded-md border-2 border-dashed px-4 py-4 items-center gap-4",
                                      fieldState.error ? "border-destructive" : "border-input hover:border-accent",
                                      artworkPreviewUrl ? "border-solid p-3 items-center" : "justify-center"
                                 )}>
                                    {artworkPreviewUrl ? (
                                         <div className="flex items-center gap-3 w-full">
                                             <Image src={artworkPreviewUrl} alt="Artwork preview" width={80} height={80} className="rounded-md object-cover aspect-square border border-border" data-ai-hint="artwork preview" />
                                             <div className="text-sm text-foreground truncate flex-grow">{form.watch('artworkFile')?.name}</div>
                                             <Button variant="ghost" size="icon" onClick={clearArtwork} className="h-7 w-7 text-muted-foreground hover:text-destructive" type="button">
                                                 <X className="h-4 w-4" />
                                                 <span className="sr-only">Clear Artwork</span>
                                             </Button>
                                         </div>
                                    ) : (
                                         <div className="text-center">
                                              <Upload className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
                                              <div className="mt-2 flex text-sm text-muted-foreground">
                                                <button
                                                    type="button"
                                                    onClick={() => artworkInputRef.current?.click()}
                                                    className="relative cursor-pointer rounded-md bg-background px-1 font-medium text-primary hover:text-primary/90 focus-within:outline-none focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2"
                                                >
                                                    <span>Upload artwork</span>
                                                </button>
                                                <input id="artwork-upload-existing" ref={artworkInputRef} name="artwork-upload-existing" type="file" className="sr-only" accept="image/*" onChange={handleArtworkChange} disabled={isSubmitting} />
                                              </div>
                                              <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 5MB</p>
                                         </div>
                                     )}
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                 />


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
                                {fields.length > 1 && (
                                    <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => remove(index)}
                                    disabled={isSubmitting}
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                                    >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Remove Track</span>
                                    </Button>
                                )}
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
                         </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-6">
                    <DialogClose asChild>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                        </Button>
                    </DialogClose>
                    <Button
                        type="submit"
                        disabled={isSubmitting || !form.formState.isValid}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md disabled:shadow-none disabled:bg-muted disabled:text-muted-foreground"
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isSubmitting ? 'Adding...' : 'Add Release'}
                    </Button>
                </DialogFooter>
              </form>
            </Form>
        </ScrollArea>

      </DialogContent>
    </Dialog>
  );
}


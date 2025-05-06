
"use client";

import React, { useState, useRef, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, parseISO, differenceInHours, isWithinInterval, addHours } from "date-fns"; 
import { Loader2, Link as LinkIcon, Upload, CalendarIcon, Music, Trash2, PlusCircle, X, Save, ExternalLink, AlertTriangle, RotateCcw, Ban, UserPlus } from "lucide-react"; 
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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { updateRelease, initiateTakedown, cancelTakedownRequest, type ReleaseWithId, type TrackInfo, type ReleaseMetadata } from "@/services/music-platform";
import { storage } from "@/services/firebase-config";
import { useAuth } from "@/context/auth-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; 
import { CreateArtistModal } from "./create-artist-modal";
import type { ProfileFormValues } from "@/components/profile/profile-form"; 
import { getUserProfileByUid } from "@/services/user";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";


const manageReleaseSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters.").max(100, "Title must be 100 characters or less."),
  primaryArtistName: z.string().min(2, "Primary artist name must be at least 2 characters.").max(100, "Artist name too long."),
  additionalArtistNames: z.array(z.string().min(2, "Artist name must be at least 2 characters.").max(100, "Artist name too long.")).optional(),
  releaseDate: z.date({ required_error: "A release date is required." }),
  artworkFile: z.instanceof(File).optional().nullable()
    .refine(file => !file || file.size <= 5 * 1024 * 1024, 'Artwork must be 5MB or less.')
    .refine(file => !file || file.type.startsWith('image/'), 'Artwork must be an image file.'),
  tracks: z.array(z.object({ name: z.string().min(1, "Track name cannot be empty.").max(100, "Track name too long.") })).min(1, "At least one track is required."),
  spotifyLink: z.string().url("Invalid Spotify link URL.").optional().nullable(),
});

type ManageReleaseFormValues = z.infer<typeof manageReleaseSchema>;

interface ManageReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  releaseData: ReleaseWithId | null;
  onSuccess: () => void;
  onTakedownSuccess: () => void;
}

export function ManageReleaseModal({ isOpen, onClose, releaseData, onSuccess, onTakedownSuccess }: ManageReleaseModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTakedownActionLoading, setIsTakedownActionLoading] = useState(false); 
  const [isTakedownConfirmOpen, setIsTakedownConfirmOpen] = useState(false);
  const [isCancelTakedownConfirmOpen, setIsCancelTakedownConfirmOpen] = useState(false);
  const [artworkPreviewUrl, setArtworkPreviewUrl] = useState<string | null>(null);
  const [currentArtworkUrl, setCurrentArtworkUrl] = useState<string | null>(null);
  const artworkInputRef = useRef<HTMLInputElement>(null);
  const placeholderArtwork = "/placeholder-artwork.png";
  const [userProfile, setUserProfile] = useState<ProfileFormValues | null>(null);
  const [isCreateArtistModalOpen, setIsCreateArtistModalOpen] = useState(false);
  const [availableArtistNames, setAvailableArtistNames] = useState<string[]>([]);
  const [selectedAdditionalArtists, setSelectedAdditionalArtists] = useState<string[]>([]);


  const parseInitialDate = (dateValue: string | Date | Timestamp | undefined): Date => {
      if (!dateValue) return new Date();
      try {
          if (dateValue instanceof Timestamp) {
              return dateValue.toDate();
          } else if (typeof dateValue === 'string') {
                if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
                     const [year, month, day] = dateValue.split('-').map(Number);
                     return new Date(Date.UTC(year, month - 1, day));
                }
                const parsed = new Date(dateValue);
                return isNaN(parsed.getTime()) ? new Date() : parsed;
          } else if (dateValue instanceof Date) {
              return dateValue;
          }
      } catch (e) {
          console.error("Error parsing initial date in manage modal:", dateValue, e);
      }
      return new Date();
  };

  const form = useForm<ManageReleaseFormValues>({
    resolver: zodResolver(manageReleaseSchema),
    defaultValues: {
      title: "",
      primaryArtistName: "",
      additionalArtistNames: [],
      releaseDate: new Date(),
      artworkFile: null,
      tracks: [{ name: "" }],
      spotifyLink: "",
    },
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "tracks",
  });

   useEffect(() => {
    const fetchProfileAndSetArtists = async () => {
        if (user?.uid) {
            const profile = await getUserProfileByUid(user.uid);
            setUserProfile(profile);
            const initialNames = profile?.name ? [profile.name] : [];
            const placeholderNames = ["DJ Another Name", "Producer Alias"]; // Example
            const allNames = Array.from(new Set([...initialNames, ...placeholderNames].filter(Boolean))) as string[];
            setAvailableArtistNames(allNames);

            if (releaseData) {
                 const primary = releaseData.artists?.[0] || profile?.name || "";
                 const additional = releaseData.artists?.slice(1) || [];
                 form.reset({
                    title: releaseData.title || "",
                    primaryArtistName: primary,
                    additionalArtistNames: additional,
                    releaseDate: parseInitialDate(releaseData.releaseDate),
                    artworkFile: null,
                    tracks: releaseData.tracks && releaseData.tracks.length > 0 ? releaseData.tracks : [{ name: "" }],
                    spotifyLink: releaseData.spotifyLink || "",
                });
                setSelectedAdditionalArtists(additional);
            } else {
                 form.reset({
                    ...form.getValues(),
                    primaryArtistName: profile?.name || "",
                    additionalArtistNames: [],
                });
                setSelectedAdditionalArtists([]);
            }
        }
    };
    if (isOpen) {
        fetchProfileAndSetArtists();
    }
   }, [isOpen, user, releaseData, form]);


   useEffect(() => {
     if (isOpen && releaseData) {
         const primary = releaseData.artists?.[0] || userProfile?.name || "";
         const additional = releaseData.artists?.slice(1) || [];
         form.reset({
             title: releaseData.title || "",
             primaryArtistName: primary,
             additionalArtistNames: additional,
             releaseDate: parseInitialDate(releaseData.releaseDate),
             artworkFile: null,
             tracks: releaseData.tracks && releaseData.tracks.length > 0 ? releaseData.tracks : [{ name: "" }],
             spotifyLink: releaseData.spotifyLink || "",
         });
         setCurrentArtworkUrl(releaseData.artworkUrl || null);
         setArtworkPreviewUrl(null);
         setSelectedAdditionalArtists(additional);
         setIsTakedownConfirmOpen(false);
         setIsCancelTakedownConfirmOpen(false);
         setIsTakedownActionLoading(false);
         if (artworkInputRef.current) {
             artworkInputRef.current.value = "";
         }
     } else if (!isOpen) {
           setTimeout(() => {
                form.reset({
                    title: "", primaryArtistName: userProfile?.name || "", additionalArtistNames:[], releaseDate: new Date(), artworkFile: null,
                    tracks: [{ name: "" }], spotifyLink: ""
                });
                setCurrentArtworkUrl(null);
                setArtworkPreviewUrl(null);
                setSelectedAdditionalArtists([]);
                setIsTakedownConfirmOpen(false);
                setIsCancelTakedownConfirmOpen(false);
                setIsTakedownActionLoading(false);
                 if (artworkInputRef.current) {
                     artworkInputRef.current.value = "";
                 }
           }, 150);
     }
     setIsSubmitting(false);
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [isOpen, releaseData, userProfile]);


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

  const clearArtwork = () => {
    form.setValue("artworkFile", null, { shouldValidate: true, shouldDirty: true });
    setArtworkPreviewUrl(null);
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

    const allArtistNames = [values.primaryArtistName, ...(values.additionalArtistNames || [])].filter(Boolean);

    try {
      const dataToUpdate: Partial<Omit<ReleaseMetadata, 'userId' | 'createdAt' | 'zipUrl' | 'status' >> & { releaseDate?: Date } = {
        title: values.title,
        artists: allArtistNames,
        releaseDate: values.releaseDate,
        tracks: values.tracks,
        spotifyLink: values.spotifyLink || null,
        // artworkUrl will be handled by updateRelease service if newArtworkFile is passed
      };

      await updateRelease(releaseData.id, dataToUpdate, values.artworkFile || undefined);

      toast({
        title: "Release Updated",
        description: `"${values.title}" has been updated successfully.`,
        variant: "default",
        duration: 2000,
      });
      onSuccess();
      onClose();

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

  const handleTakedownRequest = async () => {
      if (!releaseData) return;
      setIsTakedownActionLoading(true);
      console.log(`Submitting takedown request for release: ${releaseData.id} - ${releaseData.title}`);

      try {
          await initiateTakedown(releaseData.id);
          toast({
              title: "Takedown Requested",
              description: `Request to takedown "${releaseData.title}" submitted. This may take some time to reflect on platforms.`,
              variant: "default",
              duration: 4000,
          });
          setIsTakedownConfirmOpen(false);
          onClose();
          onTakedownSuccess();

      } catch (error) {
          console.error("Error submitting takedown request:", error);
          toast({
              title: "Takedown Failed",
              description: error instanceof Error ? error.message : "Could not submit takedown request.",
              variant: "destructive",
          });
      } finally {
          setIsTakedownActionLoading(false);
      }
  };

  const handleCancelTakedownRequest = async () => {
      if (!releaseData) return;
      setIsTakedownActionLoading(true);
      try {
          await cancelTakedownRequest(releaseData.id);
          toast({
              title: "Takedown Cancelled",
              description: `Takedown request for "${releaseData.title}" has been cancelled.`,
              variant: "default",
          });
          setIsCancelTakedownConfirmOpen(false);
          onClose();
          onTakedownSuccess(); // Refresh list
      } catch (error: any) {
          toast({
              title: "Cancellation Failed",
              description: error.message || "Could not cancel takedown request.",
              variant: "destructive",
          });
      } finally {
          setIsTakedownActionLoading(false);
      }
  };

  const displayArtworkSrc = artworkPreviewUrl || currentArtworkUrl || placeholderArtwork;
  const formIsDirty = form.formState.isDirty || !!form.watch('artworkFile');
  const formIsValid = form.formState.isValid;

  const isTakedownActive = releaseData?.status === 'takedown_requested';
  const takedownRequestedAtDate = releaseData?.takedownRequestedAt?.toDate();
  const canCancelTakedown = isTakedownActive && takedownRequestedAtDate && isWithinInterval(new Date(), { start: takedownRequestedAtDate, end: addHours(takedownRequestedAtDate, 24) });


  if (!releaseData) return null;
  
  
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

                 <FormItem>
                    <FormLabel>Release Artwork</FormLabel>
                     <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-1">
                         <Image
                             src={displayArtworkSrc}
                             alt={`${releaseData.title} artwork`}
                             width={120}
                             height={120}
                             className="rounded-md object-cover aspect-square border border-border bg-muted/20"
                             onError={(e) => { e.currentTarget.src = placeholderArtwork; e.currentTarget.srcset = ""; }}
                             unoptimized
                             priority={false}
                             data-ai-hint="album artwork"
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
                             {artworkPreviewUrl && (
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
                    <FormField name="artworkFile" control={form.control} render={() => null} />
                     <FormMessage>{form.formState.errors.artworkFile?.message}</FormMessage>
                 </FormItem>

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

                <FormField
                    control={form.control}
                    name="primaryArtistName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Primary Artist Name</FormLabel>
                        {availableArtistNames.length > 0 ? (
                             <div className="flex items-center gap-2">
                                <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                                    <FormControl>
                                        <SelectTrigger className="flex-grow">
                                            <SelectValue placeholder="Select primary artist" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {availableArtistNames.map(name => (
                                            <SelectItem key={`primary-${name}`} value={name}>{name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button type="button" variant="outline" size="icon" onClick={() => setIsCreateArtistModalOpen(true)} className="h-10 w-10 flex-shrink-0" title="Create New Artist Profile">
                                    <UserPlus className="h-4 w-4"/>
                                </Button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <FormControl>
                                    <Input {...field} disabled={isSubmitting} className="flex-grow" />
                                </FormControl>
                                <Button type="button" variant="outline" size="icon" onClick={() => setIsCreateArtistModalOpen(true)} className="h-10 w-10 flex-shrink-0" title="Create New Artist Profile">
                                    <UserPlus className="h-4 w-4"/>
                                </Button>
                            </div>
                        )}
                        <FormMessage />
                        </FormItem>
                    )}
                />

                 <FormField
                    control={form.control}
                    name="additionalArtistNames"
                    render={() => (
                        <FormItem>
                            <FormLabel>Additional Artists (Optional)</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal border-input" disabled={isSubmitting || availableArtistNames.length <=1}>
                                        {selectedAdditionalArtists.length > 0 
                                            ? selectedAdditionalArtists.map(artist => <Badge key={artist} variant="secondary" className="mr-1 mb-1">{artist}</Badge>)
                                            : "Select additional artists"}
                                        {selectedAdditionalArtists.length === 0 &&  <span className="ml-auto text-muted-foreground text-xs">Click to select</span> }
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover border-border">
                                    <ScrollArea className="max-h-48">
                                        {availableArtistNames.filter(name => name !== form.getValues("primaryArtistName")).map((artist) => (
                                            <div key={`additional-${artist}`} className="flex items-center space-x-2 p-2 hover:bg-accent hover:text-accent-foreground rounded-sm">
                                                <Checkbox
                                                    id={`artist-select-manage-${artist}`}
                                                    checked={selectedAdditionalArtists.includes(artist)}
                                                    onCheckedChange={(checked) => {
                                                        const newSelection = checked 
                                                            ? [...selectedAdditionalArtists, artist] 
                                                            : selectedAdditionalArtists.filter(name => name !== artist);
                                                        setSelectedAdditionalArtists(newSelection);
                                                        form.setValue("additionalArtistNames", newSelection, { shouldValidate: true, shouldDirty: true });
                                                    }}
                                                />
                                                <label htmlFor={`artist-select-manage-${artist}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                    {artist}
                                                </label>
                                            </div>
                                        ))}
                                        {availableArtistNames.filter(name => name !== form.getValues("primaryArtistName")).length === 0 && <p className="p-2 text-sm text-muted-foreground">No other artists available.</p>}
                                    </ScrollArea>
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )}
                />


                <FormField
                  control={form.control}
                  name="releaseDate"
                  render={({ field }) => (
                    <FormItem>
                        <FormLabel>Original Release Date</FormLabel>
                        <FormControl>
                            <Input
                                type="text"
                                value={field.value instanceof Date && !isNaN(field.value.getTime())
                                        ? format(field.value, "PPP", { timeZone: typeof releaseData.releaseDate === 'string' && releaseData.releaseDate.match(/^\d{4}-\d{2}-\d{2}$/) ? 'UTC' : undefined })
                                        : "Invalid Date"
                                }
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
                                    disabled={isSubmitting || fields.length <= 1}
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
                             {field.value && (
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

                 <div className="pt-4 border-t border-border/50">
                     <h4 className="text-sm font-medium text-destructive mb-2">Danger Zone</h4>
                     <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                         <div>
                             <p className="text-sm text-muted-foreground">Submit a request to remove this release from all platforms.</p>
                             <p className="text-xs text-destructive">This action is permanent unless cancelled within 24 hours.</p>
                         </div>
                         <div className="flex gap-2 flex-shrink-0">
                             {isTakedownActive && canCancelTakedown && (
                                 <Button
                                     type="button"
                                     variant="outline"
                                     onClick={() => setIsCancelTakedownConfirmOpen(true)}
                                     disabled={isSubmitting || isTakedownActionLoading}
                                     className="border-yellow-500 text-yellow-600 hover:bg-yellow-500/10"
                                 >
                                     <RotateCcw className="mr-2 h-4 w-4" /> Cancel Takedown
                                 </Button>
                             )}
                             {isTakedownActive && !canCancelTakedown && (
                                 <Button
                                    type="button"
                                    variant="outline"
                                    disabled={true}
                                    className="border-muted text-muted-foreground cursor-not-allowed"
                                 >
                                     <Ban className="mr-2 h-4 w-4" /> Takedown In Progress
                                 </Button>
                             )}
                             {!isTakedownActive && (
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={() => setIsTakedownConfirmOpen(true)}
                                    disabled={isSubmitting || isTakedownActionLoading}
                                >
                                    <AlertTriangle className="mr-2 h-4 w-4" /> Submit Takedown
                                </Button>
                             )}
                         </div>
                     </div>
                 </div>

                <DialogFooter className="pt-6 mt-4 border-t border-border/50">
                    <DialogClose asChild>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting || isTakedownActionLoading}>
                        Close
                        </Button>
                    </DialogClose>
                    <Button
                        type="submit"
                         disabled={isSubmitting || isTakedownActionLoading || !formIsDirty || !formIsValid}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md disabled:shadow-none disabled:bg-muted disabled:text-muted-foreground"
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" />
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogFooter>
              </form>
            </Form>
        </ScrollArea>

        <AlertDialog open={isTakedownConfirmOpen} onOpenChange={setIsTakedownConfirmOpen}>
            <AlertDialogContent className="bg-card/85 dark:bg-card/70 border-border">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-destructive">Confirm Takedown Request</AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground">
                        Are you absolutely sure you want to request a takedown for
                        &quot;{releaseData?.title}&quot;? This action is permanent and will remove the release
                        from all streaming platforms. You can cancel this request within 24 hours.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isTakedownActionLoading} className="border-input hover:bg-muted/50">
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleTakedownRequest}
                        disabled={isTakedownActionLoading}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isTakedownActionLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <AlertTriangle className="mr-2 h-4 w-4" />
                        )}
                        {isTakedownActionLoading ? 'Submitting...' : 'Yes, Submit Takedown'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isCancelTakedownConfirmOpen} onOpenChange={setIsCancelTakedownConfirmOpen}>
            <AlertDialogContent className="bg-card/85 dark:bg-card/70 border-border">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-yellow-600">Confirm Cancellation</AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground">
                        Are you sure you want to cancel the takedown request for &quot;{releaseData?.title}&quot;?
                        The release will remain live on platforms.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isTakedownActionLoading} className="border-input hover:bg-muted/50">
                        Back
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleCancelTakedownRequest}
                        disabled={isTakedownActionLoading}
                        className="bg-yellow-500 text-primary-foreground hover:bg-yellow-600"
                    >
                        {isTakedownActionLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <RotateCcw className="mr-2 h-4 w-4" />
                        )}
                        {isTakedownActionLoading ? 'Cancelling...' : 'Yes, Cancel Takedown'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
         <CreateArtistModal
            isOpen={isCreateArtistModalOpen}
            onClose={() => setIsCreateArtistModalOpen(false)}
            onSuccess={(newArtistName) => {
                setAvailableArtistNames(prev => Array.from(new Set([...prev, newArtistName])).sort());
                form.setValue("primaryArtistName", newArtistName, { shouldValidate: true, shouldDirty: true });
                setIsCreateArtistModalOpen(false);
                toast({ title: "Artist Profile Created", description: `${newArtistName} can now be selected.`});
            }}
        />

      </DialogContent>
    </Dialog>
  );
}


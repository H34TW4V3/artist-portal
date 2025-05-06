
"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Loader2, UploadCloud, X, CalendarIcon, FileArchive, HelpCircle, Info, ArrowLeft, ArrowRight, CheckCircle, AlertTriangle, UserPlus } from "lucide-react"; // Added UserPlus

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger
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
import { uploadReleaseZip, type ReleaseUploadMetadata } from "@/services/music-platform";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Import Select
import { CreateArtistModal } from "./create-artist-modal"; // Import CreateArtistModal
import { useAuth } from "@/context/auth-context";
import { getUserProfileByUid } from "@/services/user";
import type { ProfileFormValues } from "@/components/profile/profile-form";

const STEPS = [
  { id: 1, name: "Artist & Release Details" }, // Combined artist and release details
  { id: 2, name: "Upload Package" },
];

const uploadSchema = z.object({
  artistName: z.string().min(2, "Artist name must be at least 2 characters.").max(100, "Artist name must be 100 characters or less."),
  releaseName: z.string().min(2, "Release name must be at least 2 characters.").max(100, "Name must be 100 characters or less."),
  releaseDate: z.date({ required_error: "A release date is required." }),
  releaseZip: z.instanceof(File).refine(file => file?.size > 0, 'Release ZIP file is required.')
                           .refine(file => file?.size <= 500 * 1024 * 1024, 'ZIP file must be 500MB or less.')
                           .refine(file => file?.type === "application/zip" || file.type === "application/x-zip-compressed", 'File must be a ZIP archive.'),
});

type UploadFormValues = z.infer<typeof uploadSchema>;

interface UploadReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function UploadReleaseModal({ isOpen, onClose, onSuccess }: UploadReleaseModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [zipFileName, setZipFileName] = useState<string | null>(null);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [confirmedReleaseName, setConfirmedReleaseName] = useState<string>("");
  const [currentStep, setCurrentStep] = useState(1);
  const [previousStep, setPreviousStep] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userProfile, setUserProfile] = useState<ProfileFormValues | null>(null);
  const [isCreateArtistModalOpen, setIsCreateArtistModalOpen] = useState(false);
  const [artistNames, setArtistNames] = useState<string[]>([]); // State for artist names


  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      artistName: "",
      releaseName: "",
      releaseDate: new Date(),
      releaseZip: undefined,
    },
    mode: "onChange",
  });

  useEffect(() => {
    const fetchProfileAndSetArtists = async () => {
        if (user?.uid) {
            const profile = await getUserProfileByUid(user.uid);
            setUserProfile(profile);
            const initialArtistNames = profile?.name ? [profile.name] : [];
            // TODO: Fetch other associated artist names if applicable
            // For now, just using the primary profile name, and adding placeholders
            const placeholderArtistNames = ["DJ Another Name", "Producer Alias"];
            setArtistNames([...initialArtistNames, ...placeholderArtistNames].filter(Boolean) as string[]);

            form.reset({
                ...form.getValues(),
                artistName: profile?.name || "",
            });
        }
    };
    if (isOpen) {
        fetchProfileAndSetArtists();
    }
  }, [isOpen, user, form]);


   const goToStep = (step: number) => {
     setPreviousStep(currentStep);
     setCurrentStep(step);
   };

   const getAnimationClasses = (stepId: number): string => {
       if (stepId === currentStep && currentStep > previousStep) return "animate-slide-in-from-right";
       if (stepId === currentStep && currentStep < previousStep) return "animate-slide-in-from-left";
       if (stepId === previousStep && currentStep > previousStep) return "animate-slide-out-to-left absolute inset-0 px-6 pb-6 pt-4";
       if (stepId === previousStep && currentStep < previousStep) return "animate-slide-out-to-right absolute inset-0 px-6 pb-6 pt-4";
       return stepId === currentStep ? "px-6 pb-6 pt-4" : "opacity-0 pointer-events-none absolute inset-0 px-6 pb-6 pt-4";
   };

   useEffect(() => {
       if (!isOpen) {
           const timer = setTimeout(() => {
                form.reset({ artistName: userProfile?.name || "", releaseName: "", releaseDate: new Date(), releaseZip: undefined });
                setZipFileName(null);
                setIsSubmitting(false);
                setShowConfirmationDialog(false);
                setConfirmedReleaseName("");
                setCurrentStep(1);
                setPreviousStep(1);
                 if (fileInputRef.current) { fileInputRef.current.value = ""; }
           }, 150);
           return () => clearTimeout(timer);
       } else {
           form.reset({ artistName: userProfile?.name || "", releaseName: "", releaseDate: new Date(), releaseZip: undefined });
           setZipFileName(null);
           setIsSubmitting(false);
           setCurrentStep(1);
           setPreviousStep(1);
            if (fileInputRef.current) { fileInputRef.current.value = ""; }
       }
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [isOpen, userProfile]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        form.setValue("releaseZip", file, { shouldValidate: true, shouldDirty: true });
        setZipFileName(file.name);
    } else {
        clearFile();
    }
  };

  const clearFile = () => {
      form.setValue("releaseZip", undefined, { shouldValidate: true, shouldDirty: true });
      setZipFileName(null);
      if (fileInputRef.current) { fileInputRef.current.value = ""; }
  }

   const validateStep = async (step: number): Promise<boolean> => {
     let fieldsToValidate: (keyof UploadFormValues)[] = [];
     if (step === 1) fieldsToValidate = ["artistName", "releaseName", "releaseDate"];
     else if (step === 2) fieldsToValidate = ["releaseZip"];

     const isValid = await form.trigger(fieldsToValidate);
     if (!isValid) {
          const errors = form.formState.errors;
          const firstErrorField = fieldsToValidate.find(field => errors[field]);
          const errorMessage = firstErrorField ? errors[firstErrorField]?.message : "Please fix the errors before proceeding.";
          toast({ title: "Hold Up!", description: String(errorMessage), variant: "destructive", duration: 2000 });
     }
     return isValid;
   };

  const handleNext = async () => {
    if (await validateStep(currentStep)) {
      if (currentStep < STEPS.length) {
        goToStep(currentStep + 1);
      } else {
        await form.handleSubmit(onSubmit)();
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      goToStep(currentStep - 1);
    }
  };

  async function onSubmit(values: UploadFormValues) {
    setIsSubmitting(true);

    let formattedReleaseDate = '';
    if (values.releaseDate instanceof Date && !isNaN(values.releaseDate.getTime())) {
       formattedReleaseDate = format(values.releaseDate, "yyyy-MM-dd");
    } else {
       toast({ title: "Invalid Date", description: "Please select a valid release date.", variant: "destructive" });
       setIsSubmitting(false); return;
    }

    if (!(values.releaseZip instanceof File)) {
        toast({ title: "Missing File", description: "Please select a ZIP file to upload.", variant: "destructive" });
        setIsSubmitting(false); return;
    }

    const uploadData: ReleaseUploadMetadata = {
        artistName: values.artistName, // Include artist name
        releaseName: values.releaseName,
        releaseDate: formattedReleaseDate,
    };

    try {
      await uploadReleaseZip(uploadData, values.releaseZip);
      setConfirmedReleaseName(values.releaseName);
      setShowConfirmationDialog(true);
    } catch (error) {
      console.error("Error uploading release ZIP:", error);
      toast({ title: "Upload Failed", description: (error instanceof Error ? error.message : "An unexpected error occurred during upload.") + " Please try again.", variant: "destructive", duration: 4000 });
      setIsSubmitting(false);
    }
  }

  const handleConfirmationClose = () => {
        setShowConfirmationDialog(false);
        toast({ title: "Upload Submitted!", description: `Your release "${confirmedReleaseName}" is being processed.`, variant: "default", duration: 3000 });
        onSuccess();
        onClose();
  }

  const isFinalButtonDisabled = isSubmitting || (currentStep === STEPS.length && !form.formState.isValid && !zipFileName);

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md md:max-w-lg bg-card/85 dark:bg-card/70 border-border/50 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-primary">Upload New Release</DialogTitle>
           <DialogDescription className="text-muted-foreground">
             Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].name}
          </DialogDescription>
          <Progress value={(currentStep / STEPS.length) * 100} className="w-full h-1.5 mt-2" />
        </DialogHeader>

        {isSubmitting && (
            <div className="px-6 pb-2 pt-0">
                <Progress value={undefined} className="w-full h-1.5 animate-progress-indeterminate" />
                 <p className="text-xs text-center text-muted-foreground mt-1">Uploading, please wait...</p>
             </div>
        )}

        <Form {...form}>
            <div className="relative overflow-hidden min-h-[350px]">
              <form
                 onSubmit={(e) => { e.preventDefault(); handleNext(); }}
                 className="space-y-4"
                 aria-live="polite"
               >
                <div className={cn("space-y-4", getAnimationClasses(1))} aria-hidden={currentStep !== 1}>
                   {currentStep === 1 && (
                    <>
                    <FormField
                      control={form.control}
                      name="artistName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Artist Name</FormLabel>
                          {artistNames.length > 0 ? (
                            <div className="flex items-center gap-2">
                                <Select onValueChange={field.onChange} defaultValue={field.value || userProfile?.name || ""} disabled={isSubmitting}>
                                    <FormControl>
                                        <SelectTrigger className="flex-grow">
                                            <SelectValue placeholder="Select an artist name" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {artistNames.map(name => (
                                            <SelectItem key={name} value={name}>{name}</SelectItem>
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
                                    <Input placeholder="Enter artist name" {...field} className="focus:ring-accent flex-grow" disabled={isSubmitting} />
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
                    <FormField control={form.control} name="releaseName" render={({ field }) => ( <FormItem><FormLabel>Release Name</FormLabel><FormControl><Input placeholder="Enter release name" {...field} className="focus:ring-accent" disabled={isSubmitting} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="releaseDate" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Release Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal border-input focus:ring-accent", !field.value && "text-muted-foreground")} disabled={isSubmitting}><CalendarIcon className="mr-2 h-4 w-4 opacity-50" />{field.value && field.value instanceof Date && !isNaN(field.value.getTime()) ? format(field.value, "PPP") : <span>Pick a date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0 bg-popover border-border" align="start"><Calendar mode="single" selected={field.value instanceof Date && !isNaN(field.value.getTime()) ? field.value : undefined} onSelect={(date) => field.onChange(date || new Date())} disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))} initialFocus /></PopoverContent></Popover><FormDescription className="text-xs">The date the release should go live.</FormDescription><FormMessage /></FormItem> )} />
                    </>
                   )}
                </div>

                 <div className={cn("space-y-4", getAnimationClasses(2))} aria-hidden={currentStep !== 2}>
                   {currentStep === 2 && (
                    <>
                    <FormField control={form.control} name="releaseZip" render={({ fieldState }) => ( <FormItem><div className="flex justify-between items-center mb-1"><FormLabel>Release Package (ZIP)</FormLabel><Dialog><DialogTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary p-0"><HelpCircle className="h-4 w-4" /><span className="sr-only">View Release File Guidelines</span></Button></DialogTrigger><DialogContent className="max-w-lg bg-card/90 dark:bg-card/80 border-border"><DialogHeader><DialogTitle className="text-primary">Release File Guidelines</DialogTitle></DialogHeader><ScrollArea className="max-h-[60vh] pr-4"><div className="text-sm text-foreground space-y-4"><p>To speed up the release process and allow you to release via the artist app, we have created ‘release files’ to help us get all the necessary information we need to create your release.</p><p>Here is a guide on how to structure a release file:</p><ol className="list-decimal list-inside space-y-3 pl-2"><li><strong>Each track should be in its OWN folder</strong> (named after the track). The folder should contain the following files:<ul className="list-disc list-inside space-y-1 pl-4 mt-2"><li>If you have an explicit version of your track, place that in a separate folder with <code className="bg-muted px-1 rounded">(Expl)</code> added to the folder name.</li><li>Track file (<strong>24 Bit .WAV</strong> format).</li><li>A short 1 to 8 second video for Spotify Canvas (if applicable).</li><li>Brief text file (<code className="bg-muted px-1 rounded">.txt</code>) containing a description: BPM, Track Length, explicit status, and other relevant info.</li><li>A document (<code className="bg-muted px-1 rounded">.txt</code>) containing the lyrics (if your track has lyrics).</li></ul></li><li><strong>Place the track folders into a single main folder</strong> (use your release name as the main folder name). Place the <strong>album/release artwork</strong> directly inside this main folder:<ul className="list-disc list-inside space-y-1 pl-4 mt-2"><li>Artwork must be <strong>3000×3000 pixels</strong> (JPG or PNG).</li><li>Artwork must <strong>not</strong> contain social media/brand logos, social media handles, borders, or text other than your artist name or the album/track title.</li></ul></li><li>Finally, <strong>compress this main folder into a single ZIP file</strong> for upload.</li></ol></div></ScrollArea><DialogFooter className="mt-4"><DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose></DialogFooter></DialogContent></Dialog></div><FormControl><div className={cn("mt-1 flex justify-center rounded-md border-2 border-dashed px-6 pb-6 pt-5 bg-muted/20", fieldState.error ? "border-destructive" : "border-input hover:border-accent", zipFileName ? "border-solid items-center" : "")}>{zipFileName ? (<div className="flex items-center justify-between w-full"><div className="flex items-center gap-2 text-sm font-medium text-foreground truncate mr-4"><FileArchive className="h-5 w-5 text-muted-foreground" /><span>{zipFileName}</span></div><Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive rounded-full" onClick={clearFile} aria-label="Remove ZIP file" disabled={isSubmitting}><X className="h-4 w-4" /></Button></div>) : (<div className="space-y-1 text-center"><UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden="true" /><div className="mt-2 flex text-sm text-muted-foreground justify-center"><label htmlFor="releaseZip" className="relative cursor-pointer rounded-md bg-background px-2 py-1 font-medium text-primary hover:text-primary/90 focus-within:outline-none focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2"><span>Select ZIP file</span><input id="releaseZip" name="releaseZip" type="file" className="sr-only" accept=".zip,application/zip,application/x-zip-compressed" onChange={handleFileChange} ref={fileInputRef} disabled={isSubmitting} /></label></div><p className="text-xs text-muted-foreground">ZIP archive up to 500MB</p></div>)}</div></FormControl><FormDescription className="text-xs flex items-start gap-1"><Info className="h-3 w-3 mt-0.5 flex-shrink-0"/><span>Must be a ZIP file containing audio & artwork structured according to the guidelines (click <HelpCircle className="inline h-3 w-3 align-text-bottom" /> icon above).</span></FormDescription><FormMessage /></FormItem> )} />
                    </>
                   )}
                </div>
                 <button type="submit" style={{ display: 'none' }} aria-hidden="true"></button>
             </form>
            </div>
        </Form>

        <DialogFooter className="pt-4 border-t border-border/50">
           {currentStep > 1 && ( <Button type="button" variant="outline" onClick={handlePrevious} disabled={isSubmitting}><ArrowLeft className="mr-2 h-4 w-4" /> Previous</Button> )}
          <div className="flex-grow"></div>
          <DialogClose asChild><Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button></DialogClose>
          <Button type="button" onClick={handleNext} disabled={isFinalButtonDisabled} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md disabled:shadow-none disabled:bg-muted disabled:text-muted-foreground">
             {isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>) : currentStep === STEPS.length ? (<>Upload Release</>) : (<>Next <ArrowRight className="ml-2 h-4 w-4" /></>)}
           </Button>
        </DialogFooter>

        <AlertDialog open={showConfirmationDialog} onOpenChange={setShowConfirmationDialog}>
            <AlertDialogContent className="bg-card/85 dark:bg-card/70 border-border">
                <AlertDialogHeader className="items-center text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
                    <AlertDialogTitle className="text-primary">Upload Submitted!</AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground pt-2 space-y-3">
                         <p>Your release &quot;{confirmedReleaseName}&quot; has been submitted for processing.</p>
                         <p className="font-semibold text-foreground">What Happens Next?</p>
                         <p>It typically takes up to <strong>10 business days</strong> for your release to appear on all streaming platforms after our team reviews and processes it. You can track its status on the Releases page.</p>
                     </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="justify-center">
                     <AlertDialogAction onClick={handleConfirmationClose} className="bg-primary hover:bg-primary/90 text-primary-foreground">OK, Got It</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
    <CreateArtistModal
        isOpen={isCreateArtistModalOpen}
        onClose={() => setIsCreateArtistModalOpen(false)}
        onSuccess={(newArtistName) => {
            // Add new artist name to the list and select it
            setArtistNames(prev => [...prev, newArtistName].sort());
            form.setValue("artistName", newArtistName, { shouldValidate: true, shouldDirty: true });
            setIsCreateArtistModalOpen(false);
            toast({ title: "Artist Profile Created", description: `${newArtistName} can now be selected.`});
        }}
    />
    </>
  );
}


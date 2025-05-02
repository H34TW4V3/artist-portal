
"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Music, UploadCloud, X, ArrowLeft, ArrowRight, User, Mail, Link as LinkIcon, Info, FileText, HelpCircle } from "lucide-react"; // Import necessary icons, added HelpCircle

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
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress"; // Import Progress
import { DemoPolicyModal } from './demo-policy-modal'; // Import the new modal

// Define steps for the demo submission flow - Now 4 steps
const DEMO_SUBMISSION_STEPS = [
  { id: 1, name: "Your Name", icon: User }, // Changed name
  { id: 2, name: "Your Email", icon: Mail }, // Changed name
  { id: 3, name: "Links & Bio (Optional)", icon: LinkIcon }, // Changed name
  { id: 4, name: "Your Track", icon: Music }, // Changed name
];

// Schema remains the same, validation happens per step
const demoSchema = z.object({
  artistName: z.string().min(2, "Name needs at least 2 characters.").max(100), // Informal message
  email: z.string().email("Needs to be a valid email address."), // Informal message
  socialLinks: z.string().max(500, "Links section is a bit long.").optional().nullable(), // Informal message
  bio: z.string().max(1000, "Bio is a bit long (max 1000 chars).").optional().nullable(), // Informal message
  trackName: z.string().min(1, "Track name is required.").max(100),
  demoFile: z.instanceof(File).refine(file => file?.size > 0, 'Demo track file is required.') // Added non-null assertion
                         .refine(file => file?.size <= 50 * 1024 * 1024, 'MP3 needs to be 50MB or less.') // Informal message
                         .refine(file => file?.type === "audio/mpeg", 'File must be an MP3.'), // Informal message
});

type DemoFormValues = z.infer<typeof demoSchema>;

interface SubmitDemoFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  className?: string;
}

// Mock function for submission (replace with actual API call)
const submitDemoToApi = async (data: DemoFormValues, file: File) => {
    console.log("Submitting demo to mock API:", {
        artistName: data.artistName,
        email: data.email,
        socialLinks: data.socialLinks,
        bio: data.bio,
        trackName: data.trackName,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
    });
    await new Promise(resolve => setTimeout(resolve, 1500));
    if (Math.random() < 0.1) {
        throw new Error("Mock API Error: Failed to submit demo.");
    }
    console.log("Mock API: Demo submitted successfully.");
    return { success: true };
};


export function SubmitDemoForm({ onSuccess, onCancel, className }: SubmitDemoFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [previousStep, setPreviousStep] = useState(1); // For animation direction
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false); // State for policy modal

  const form = useForm<DemoFormValues>({
    resolver: zodResolver(demoSchema),
    defaultValues: {
      artistName: "",
      email: "",
      socialLinks: "",
      bio: "",
      trackName: "",
      demoFile: undefined,
    },
    mode: "onChange",
  });

  // Reset form when it becomes active (or if parent triggers a reset)
  useEffect(() => {
    form.reset();
    setCurrentStep(1);
    setPreviousStep(1);
    setFileName(null);
    setIsSubmitting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount or when activated by parent

  const goToStep = (step: number) => {
    setPreviousStep(currentStep);
    setCurrentStep(step);
  };

  // Use the same animation logic as LoginForm
  const getAnimationClasses = (stepId: number): string => {
       if (stepId === currentStep && currentStep > previousStep) {
           return "animate-slide-in-from-right"; // Entering from right
       }
       if (stepId === currentStep && currentStep < previousStep) {
           return "animate-slide-in-from-left"; // Entering from left
       }
       if (stepId === previousStep && currentStep > previousStep) {
           return "animate-slide-out-to-left"; // Exiting to left
       }
       if (stepId === previousStep && currentStep < previousStep) {
           return "animate-slide-out-to-right"; // Exiting to right
       }
       // Ensure non-current steps are hidden BUT TAKE UP SPACE INITIALLY for height calculation if needed
       // Using opacity and pointer-events might be better than 'hidden' for smoother height transitions if steps vary greatly
       return stepId === currentStep ? "opacity-100" : "opacity-0 pointer-events-none absolute inset-0"; // Keep in layout but invisible
   };


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        // Validate file type and size here before setting state
        if (file.type !== 'audio/mpeg') {
             toast({ title: "Whoops!", description: "Needs to be an MP3 file.", variant: "destructive", duration: 2000 }); // Informal
             clearFile();
             return;
        }
         if (file.size > 50 * 1024 * 1024) {
              toast({ title: "File's too big!", description: "Keep it under 50MB, please!", variant: "destructive", duration: 2000 }); // Informal
              clearFile();
              return;
         }
        form.setValue("demoFile", file, { shouldValidate: true, shouldDirty: true });
        setFileName(file.name);
    } else {
        clearFile();
    }
  };

  const clearFile = () => {
      form.setValue("demoFile", undefined, { shouldValidate: true, shouldDirty: true });
      setFileName(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
  }

  // Validate fields relevant to the current step
  const validateStep = async (step: number): Promise<boolean> => {
    let fieldsToValidate: (keyof DemoFormValues)[] = [];
    if (step === 1) fieldsToValidate = ["artistName"]; // Step 1: Artist Name
    else if (step === 2) fieldsToValidate = ["email"]; // Step 2: Email
    else if (step === 3) fieldsToValidate = ["socialLinks", "bio"]; // Step 3: Optional fields, but maybe check length limits if filled
    else if (step === 4) fieldsToValidate = ["trackName", "demoFile"]; // Step 4: Track info

    // Only trigger validation for required fields or fields with content
    const fieldsWithValues = fieldsToValidate.filter(field => {
        const value = form.getValues(field);
        if (field === 'socialLinks' || field === 'bio') return !!value; // Validate optional only if they have content
        return true; // Always validate required fields like name, email, track, file
    });

    // Step 3 is optional, allow skipping if empty
    if (fieldsWithValues.length === 0 && step === 3) return true;

    const result = await form.trigger(fieldsWithValues);

    if (!result) {
        const errors = form.formState.errors;
        const firstErrorField = fieldsWithValues.find(field => errors[field]);
        const errorMessage = firstErrorField ? errors[firstErrorField]?.message : "Please fix the errors before proceeding.";
        toast({ title: "Oops!", description: String(errorMessage), variant: "destructive", duration: 2000 }); // More informal title
    }
    return result;
  };

  const handleNext = async () => {
    if (await validateStep(currentStep)) {
      if (currentStep < DEMO_SUBMISSION_STEPS.length) {
        goToStep(currentStep + 1);
      } else {
        // On the last step, trigger final submission
        await form.handleSubmit(onSubmit)();
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      goToStep(currentStep - 1);
    }
  };

  async function onSubmit(values: DemoFormValues) {
    // Zod refinement should already ensure demoFile exists if validation passes
    if (!values.demoFile) {
         toast({ title: "Whoops!", description: "Don't forget your demo track!", variant: "destructive" }); // Informal
         setIsSubmitting(false); // Ensure loading stops
         return;
    }
    setIsSubmitting(true);
    const file = values.demoFile;
    try {
       await submitDemoToApi(values, file);
       toast({
           title: "Got it!", // Informal
           description: "Thanks for sending your track. We'll give it a listen!", // Informal
           variant: "default",
           duration: 5000,
       });
       onSuccess(); // Call parent success handler (e.g., hide form, show login)
    } catch (error) {
      console.error("Error submitting demo:", error);
      toast({
        title: "Uh oh...", // Informal
        description: error instanceof Error ? error.message : "Couldn't submit your demo. Maybe try again?", // Informal
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Define icons for steps
  const StepIcon = DEMO_SUBMISSION_STEPS[currentStep - 1].icon;

  return (
     // Ensure the container uses flex-col and has a defined height or uses flex-grow from parent
     <>
        <div className={cn("flex flex-col h-full", className)}>
            {/* Header Section - Icon, Title, Progress, and Policy Button */}
            {/* Adjusted padding and margin */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border/30">
                <div className="flex flex-col items-center flex-grow">
                    <div className="mb-1 transition-transform duration-300">
                        <StepIcon className="h-6 w-6 text-primary" /> {/* Adjusted size */}
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-foreground text-center"> {/* Adjusted size */}
                        {DEMO_SUBMISSION_STEPS[currentStep - 1].name}
                    </h3>
                    {/* Progress Bar */}
                    <Progress value={(currentStep / DEMO_SUBMISSION_STEPS.length) * 100} className="w-3/4 h-1 mt-2" /> {/* Adjusted size/margin */}
                </div>
                {/* Policy Icon Button - Positioned absolutely or use flex spacing */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-primary h-7 w-7 ml-2" // Adjusted size/margin
                    onClick={() => setIsPolicyModalOpen(true)}
                    aria-label="View Submission Policy"
                >
                    <HelpCircle className="h-4 w-4" /> {/* Adjusted size */}
                </Button>
            </div>

            {/* Form Area - Takes remaining space and scrolls */}
            {/* Use relative container for step animations - ensure sufficient min-height */}
            {/* Adjusted min-height to better fit content */}
            <div className="flex-grow overflow-y-auto p-4 sm:p-6 relative min-h-[250px] sm:min-h-[300px]">
                <Form {...form}>
                    {/* Forms are nested inside for step transition */}
                    <form onSubmit={(e) => {e.preventDefault(); handleNext();}} className="space-y-5" aria-live="polite"> {/* Increased space */}

                        {/* Step 1: Artist Name */}
                        <div className={cn("space-y-5", getAnimationClasses(1))} aria-hidden={currentStep !== 1}>
                            <FormField control={form.control} name="artistName" render={({ field }) => ( <FormItem><FormLabel>Your Artist/Band Name</FormLabel><FormControl><div className="relative"><User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="What name do you go by?" {...field} disabled={isSubmitting || currentStep !== 1} className="pl-8 text-base" /></div></FormControl><FormMessage /></FormItem> )} /> {/* Informal placeholder */}
                        </div>

                        {/* Step 2: Contact Email */}
                        <div className={cn("space-y-5", getAnimationClasses(2))} aria-hidden={currentStep !== 2}>
                            <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Your Best Email</FormLabel><FormControl><div className="relative"><Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="email" placeholder="Where can we reply?" {...field} disabled={isSubmitting || currentStep !== 2} className="pl-8 text-base" /></div></FormControl><FormMessage /></FormItem> )} /> {/* Informal placeholder */}
                        </div>


                        {/* Step 3: Socials & Bio */}
                        <div className={cn("space-y-5", getAnimationClasses(3))} aria-hidden={currentStep !== 3}>
                            <FormField control={form.control} name="socialLinks" render={({ field }) => ( <FormItem><FormLabel>Your Links (Optional)</FormLabel><FormControl><div className="relative"><LinkIcon className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" /><Textarea placeholder="Spotify, SoundCloud, Insta, Website... Drop 'em here!" className="resize-none pl-8 text-base" {...field} value={field.value ?? ""} disabled={isSubmitting || currentStep !== 3} rows={3}/></div></FormControl><FormDescription className="text-xs">Show us where you live online!</FormDescription><FormMessage /></FormItem> )} /> {/* Informal placeholder/desc */}
                            <FormField control={form.control} name="bio" render={({ field }) => ( <FormItem><FormLabel>Quick Bio (Optional)</FormLabel><FormControl><div className="relative"><FileText className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" /><Textarea placeholder="Tell us your story, what's your music about?" className="resize-none pl-8 text-base" {...field} value={field.value ?? ""} disabled={isSubmitting || currentStep !== 3} rows={4}/></div></FormControl><FormDescription className="text-xs">Keep it short and sweet!</FormDescription><FormMessage /></FormItem> )} /> {/* Informal placeholder/desc */}
                        </div>

                        {/* Step 4: Track Info & Upload */}
                        <div className={cn("space-y-5", getAnimationClasses(4))} aria-hidden={currentStep !== 4}>
                            <FormField control={form.control} name="trackName" render={({ field }) => ( <FormItem><FormLabel>Demo Track Name</FormLabel><FormControl><div className="relative"><Music className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="What's this banger called?" {...field} disabled={isSubmitting || currentStep !== 4} className="pl-8 text-base" /></div></FormControl><FormMessage /></FormItem> )} /> {/* Informal placeholder */}
                            <FormField control={form.control} name="demoFile" render={({ fieldState }) => (
                                <FormItem>
                                    <FormLabel>Your Demo (MP3, max 50MB)</FormLabel>
                                    <FormControl>
                                        <div className={cn("flex justify-center rounded-md border-2 border-dashed px-4 py-6 bg-muted/20", fieldState.error ? "border-destructive" : "border-input hover:border-accent", fileName ? "border-solid items-center" : "")}> {/* Adjusted padding */}
                                            {fileName ? (
                                                <div className="flex items-center justify-between w-full">
                                                    <div className="flex items-center gap-2 text-sm font-medium text-foreground truncate mr-2"><Music className="h-5 w-5 text-muted-foreground" /><span>{fileName}</span></div>
                                                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive rounded-full" onClick={clearFile} disabled={isSubmitting || currentStep !== 4}><X className="h-4 w-4" /></Button>
                                                </div>
                                            ) : (
                                                <div className="text-center">
                                                    <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground" /> {/* Adjusted size */}
                                                    <div className="mt-2 flex text-sm text-muted-foreground justify-center">
                                                        <label htmlFor="demoFile-input" className="relative cursor-pointer rounded-md bg-background px-1 font-medium text-primary hover:text-primary/90 focus-within:outline-none">
                                                            <span>Select MP3</span>
                                                            <input id="demoFile-input" name="demoFile" type="file" className="sr-only" accept="audio/mpeg" onChange={handleFileChange} ref={fileInputRef} disabled={isSubmitting || currentStep !== 4} />
                                                        </label>
                                                        {/* <p className="pl-1">or drag & drop</p> */}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">MP3 audio up to 50MB</p>
                                                </div>
                                            )}
                                        </div>
                                    </FormControl>
                                    <FormDescription className="text-xs flex items-start gap-1">
                                        <Info className="h-3 w-3 mt-0.5 flex-shrink-0"/>
                                        <span>Make sure it's 100% your original work (no remixes, covers, etc!). Check the policy <HelpCircle className="inline h-3 w-3 align-text-bottom cursor-pointer hover:text-primary" onClick={() => setIsPolicyModalOpen(true)} /> for deets.</span>
                                    </FormDescription> {/* Informal desc */}
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        {/* Hidden submit button for Enter key */}
                        <button type="submit" disabled={isSubmitting} style={{ display: 'none' }} aria-hidden="true"></button>
                    </form>
                </Form>
            </div>

            {/* Footer with Action Buttons - Adjusted padding */}
            <div className="flex justify-between p-4 border-t border-border/30 mt-auto">
                <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentStep === 1 || isSubmitting}
                    className={cn(currentStep === 1 && "invisible")} // Hide if on first step
                    size="lg" // Make buttons larger
                >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} size="lg"> {/* Make buttons larger */}
                        Cancel
                    </Button>
                    <Button
                        type="button" // Use button type and onClick for controlled step navigation/submission
                        onClick={handleNext}
                        disabled={isSubmitting || (currentStep === 4 && !fileName)} // Disable submit if no file on last step
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        size="lg" // Make buttons larger
                    >
                        {isSubmitting ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                        ) : currentStep === DEMO_SUBMISSION_STEPS.length ? (
                            'Send Demo!' // Informal
                        ) : (
                            <>Next <ArrowRight className="ml-2 h-4 w-4" /></>
                        )}
                    </Button>
                </div>
            </div>
        </div>
         <DemoPolicyModal isOpen={isPolicyModalOpen} onClose={() => setIsPolicyModalOpen(false)} />
     </>
  );
}


"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
// Updated icons: Added Send, removed Check
import { Loader2, Music, UploadCloud, X, ArrowLeft, ArrowRight, User, Mail, Link as LinkIcon, Info, FileText, HelpCircle, Phone, Send } from "lucide-react";

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

// Define steps for the demo submission flow - Now 6 steps
const DEMO_SUBMISSION_STEPS = [
  { id: 1, name: "Your Name", icon: User },
  { id: 2, name: "Your Email", icon: Mail },
  { id: 3, name: "Your Phone (Optional)", icon: Phone },
  { id: 4, name: "Links & Bio (Optional)", icon: LinkIcon },
  { id: 5, name: "Track Name", icon: Music }, // Changed Step 5
  { id: 6, name: "Track File", icon: UploadCloud }, // New Step 6
];

// Updated schema remains the same functionally, as validation handles optional fields
const demoSchema = z.object({
  artistName: z.string().min(2, "Name needs at least 2 characters.").max(100),
  email: z.string().email("Needs to be a valid email address."),
  phoneNumber: z.string().optional().nullable()
      .refine(val => !val || /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/.test(val), {
          message: "That phone number looks a bit weird.",
       }),
  socialLinks: z.string().max(500, "Links section is a bit long.").optional().nullable(),
  bio: z.string().max(1000, "Bio is a bit long (max 1000 chars).").optional().nullable(),
  trackName: z.string().min(1, "Track name is required.").max(100),
  demoFile: z.instanceof(File).refine(file => file?.size > 0, 'Demo track file is required.')
                         .refine(file => file?.size <= 50 * 1024 * 1024, 'MP3 needs to be 50MB or less.')
                         .refine(file => file?.type === "audio/mpeg", 'File must be an MP3.'),
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
        phoneNumber: data.phoneNumber,
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
  const [previousStep, setPreviousStep] = useState(1);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);

  const form = useForm<DemoFormValues>({
    resolver: zodResolver(demoSchema),
    defaultValues: {
      artistName: "",
      email: "",
      phoneNumber: "",
      socialLinks: "",
      bio: "",
      trackName: "",
      demoFile: undefined,
    },
    mode: "onChange",
  });

  useEffect(() => {
    // Reset form when component mounts or gets reused after success/cancel
    form.reset();
    setCurrentStep(1);
    setPreviousStep(1);
    setFileName(null);
    setIsSubmitting(false);
    // Ensure file input is visually cleared if needed
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
   // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const goToStep = (step: number) => {
    setPreviousStep(currentStep);
    setCurrentStep(step);
  };

  const getAnimationClasses = (stepId: number): string => {
       if (stepId === currentStep && currentStep > previousStep) return "animate-slide-in-from-right";
       if (stepId === currentStep && currentStep < previousStep) return "animate-slide-in-from-left";
       if (stepId === previousStep && currentStep > previousStep) return "animate-slide-out-to-left";
       if (stepId === previousStep && currentStep < previousStep) return "animate-slide-out-to-right";
       // Apply absolute positioning and opacity for non-active steps to allow smooth transition
       return stepId === currentStep ? "opacity-100" : "opacity-0 pointer-events-none absolute inset-0 px-4 sm:px-6"; // Keep padding consistent
   };


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        if (file.type !== 'audio/mpeg') {
             toast({ title: "Whoops!", description: "Needs to be an MP3 file.", variant: "destructive", duration: 2000 });
             clearFile();
             return;
        }
         if (file.size > 50 * 1024 * 1024) {
              toast({ title: "File's too big!", description: "Keep it under 50MB, please!", variant: "destructive", duration: 2000 });
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
    if (step === 1) fieldsToValidate = ["artistName"];
    else if (step === 2) fieldsToValidate = ["email"];
    else if (step === 3) fieldsToValidate = ["phoneNumber"];
    else if (step === 4) fieldsToValidate = ["socialLinks", "bio"];
    else if (step === 5) fieldsToValidate = ["trackName"]; // Step 5 is now only track name
    else if (step === 6) fieldsToValidate = ["demoFile"]; // Step 6 is file upload

    // Only validate optional fields if they have a value
    const fieldsWithValues = fieldsToValidate.filter(field => {
        const value = form.getValues(field);
        // Optional fields (phone, links, bio) only need validation if they are not empty/null/undefined
        if (field === 'phoneNumber' || field === 'socialLinks' || field === 'bio') {
            return !!value; // Validate only if there's content
        }
        // Required fields always need validation attempt
        return true;
    });

    // If no fields need validation on this step (e.g., optional step with no input), consider it valid.
     if (fieldsWithValues.length === 0 && (step === 3 || step === 4)) {
        return true; // Skip validation for empty optional steps
     }

    // Trigger validation only for relevant fields
    const result = await form.trigger(fieldsWithValues);

    if (!result) {
        const errors = form.formState.errors;
        // Find the first error among the fields we tried to validate
        const firstErrorField = fieldsWithValues.find(field => errors[field]);
        const errorMessage = firstErrorField ? errors[firstErrorField]?.message : "Please check the field before proceeding.";
        toast({ title: "Oops!", description: String(errorMessage), variant: "destructive", duration: 2000 });
    }
    return result;
  };

  const handleNext = async () => {
    if (await validateStep(currentStep)) {
      if (currentStep < DEMO_SUBMISSION_STEPS.length) {
        goToStep(currentStep + 1);
      } else {
        // If on the last step, trigger the actual submission
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
    // Ensure demoFile exists before submitting
    if (!values.demoFile) {
         toast({ title: "Whoops!", description: "Don't forget your demo track!", variant: "destructive" });
         // Optionally set currentStep back to file upload step if desired
         // setCurrentStep(DEMO_SUBMISSION_STEPS.length);
         return; // Stop submission
    }
    setIsSubmitting(true);
    const file = values.demoFile;
    try {
       await submitDemoToApi(values, file);
       toast({
           title: "Got it!",
           description: "Thanks for sending your track. We'll give it a listen!",
           variant: "default",
           duration: 5000,
       });
       onSuccess();
    } catch (error) {
      console.error("Error submitting demo:", error);
      toast({
        title: "Uh oh...",
        description: error instanceof Error ? error.message : "Couldn't submit your demo. Maybe try again?",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const StepIcon = DEMO_SUBMISSION_STEPS[currentStep - 1].icon;

  return (
     <>
        <div className={cn("flex flex-col h-full", className)}>
            {/* Header Section */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border/30">
                <div className="flex flex-col items-center flex-grow">
                    <div className="mb-1 transition-transform duration-300">
                        <StepIcon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-foreground text-center">
                        {DEMO_SUBMISSION_STEPS[currentStep - 1].name}
                    </h3>
                    <Progress value={(currentStep / DEMO_SUBMISSION_STEPS.length) * 100} className="w-3/4 h-1 mt-2" />
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-primary h-7 w-7 ml-2"
                    onClick={() => setIsPolicyModalOpen(true)}
                    aria-label="View Submission Policy"
                >
                    <HelpCircle className="h-4 w-4" />
                </Button>
            </div>

            {/* Form Area - Increased min-height and use relative positioning for transitions */}
            <div className="flex-grow p-4 sm:p-6 relative min-h-[300px] sm:min-h-[350px] overflow-hidden"> {/* Added overflow-hidden */}
                <Form {...form}>
                    {/* Note: Removed onSubmit from form tag, handled by button click */}
                    <form className="h-full" aria-live="polite"> {/* Ensure form takes full height */}

                        {/* Wrap each step's content in a div for absolute positioning and animation */}
                        <div className={cn("absolute inset-0 px-4 sm:px-6 space-y-5", getAnimationClasses(1))} aria-hidden={currentStep !== 1}>
                            <FormField control={form.control} name="artistName" render={({ field }) => ( <FormItem><FormLabel>Your Artist/Band Name</FormLabel><FormControl><div className="relative"><User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="What name do you go by?" {...field} disabled={isSubmitting || currentStep !== 1} className="pl-8 text-base" /></div></FormControl><FormMessage /></FormItem> )} />
                        </div>

                        <div className={cn("absolute inset-0 px-4 sm:px-6 space-y-5", getAnimationClasses(2))} aria-hidden={currentStep !== 2}>
                            <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Your Best Email</FormLabel><FormControl><div className="relative"><Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="email" placeholder="Where can we reply?" {...field} disabled={isSubmitting || currentStep !== 2} className="pl-8 text-base" /></div></FormControl><FormMessage /></FormItem> )} />
                        </div>

                        <div className={cn("absolute inset-0 px-4 sm:px-6 space-y-5", getAnimationClasses(3))} aria-hidden={currentStep !== 3}>
                            <FormField control={form.control} name="phoneNumber" render={({ field }) => ( <FormItem><FormLabel>Your Phone (Optional)</FormLabel><FormControl><div className="relative"><Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="tel" placeholder="Just in case email fails..." {...field} value={field.value ?? ""} disabled={isSubmitting || currentStep !== 3} className="pl-8 text-base" /></div></FormControl><FormDescription className="text-xs">Only used if we urgently need to reach you.</FormDescription><FormMessage /></FormItem> )} />
                        </div>

                        <div className={cn("absolute inset-0 px-4 sm:px-6 space-y-5", getAnimationClasses(4))} aria-hidden={currentStep !== 4}>
                            <FormField control={form.control} name="socialLinks" render={({ field }) => ( <FormItem><FormLabel>Your Links (Optional)</FormLabel><FormControl><div className="relative"><LinkIcon className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" /><Textarea placeholder="Spotify, SoundCloud, Insta, Website... Drop 'em here!" className="resize-none pl-8 text-base" {...field} value={field.value ?? ""} disabled={isSubmitting || currentStep !== 4} rows={3}/></div></FormControl><FormDescription className="text-xs">Show us where you live online!</FormDescription><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="bio" render={({ field }) => ( <FormItem><FormLabel>Quick Bio (Optional)</FormLabel><FormControl><div className="relative"><FileText className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" /><Textarea placeholder="Tell us your story, what's your music about?" className="resize-none pl-8 text-base" {...field} value={field.value ?? ""} disabled={isSubmitting || currentStep !== 4} rows={4}/></div></FormControl><FormDescription className="text-xs">Keep it short and sweet!</FormDescription><FormMessage /></FormItem> )} />
                        </div>

                        <div className={cn("absolute inset-0 px-4 sm:px-6 space-y-5", getAnimationClasses(5))} aria-hidden={currentStep !== 5}>
                            <FormField control={form.control} name="trackName" render={({ field }) => ( <FormItem><FormLabel>Demo Track Name</FormLabel><FormControl><div className="relative"><Music className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="What's this banger called?" {...field} disabled={isSubmitting || currentStep !== 5} className="pl-8 text-base" /></div></FormControl><FormMessage /></FormItem> )} />
                        </div>

                        <div className={cn("absolute inset-0 px-4 sm:px-6 space-y-5", getAnimationClasses(6))} aria-hidden={currentStep !== 6}>
                             <FormField control={form.control} name="demoFile" render={({ fieldState }) => (
                                <FormItem>
                                    <FormLabel>Your Demo (MP3, max 50MB)</FormLabel>
                                    <FormControl>
                                        <div className={cn("flex justify-center rounded-md border-2 border-dashed px-4 py-6 bg-muted/20", fieldState.error ? "border-destructive" : "border-input hover:border-accent", fileName ? "border-solid items-center" : "")}>
                                            {fileName ? (
                                                <div className="flex items-center justify-between w-full">
                                                    <div className="flex items-center gap-2 text-sm font-medium text-foreground truncate mr-2"><Music className="h-5 w-5 text-muted-foreground" /><span>{fileName}</span></div>
                                                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive rounded-full" onClick={clearFile} disabled={isSubmitting || currentStep !== 6}><X className="h-4 w-4" /></Button>
                                                </div>
                                            ) : (
                                                <div className="text-center">
                                                    <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground" />
                                                    <div className="mt-2 flex text-sm text-muted-foreground justify-center">
                                                        <label htmlFor="demoFile-input" className="relative cursor-pointer rounded-md bg-background px-1 font-medium text-primary hover:text-primary/90 focus-within:outline-none">
                                                            <span>Select MP3</span>
                                                            <input id="demoFile-input" name="demoFile" type="file" className="sr-only" accept="audio/mpeg" onChange={handleFileChange} ref={fileInputRef} disabled={isSubmitting || currentStep !== 6} />
                                                        </label>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">MP3 audio up to 50MB</p>
                                                </div>
                                            )}
                                        </div>
                                    </FormControl>
                                    <FormDescription className="text-xs flex items-start gap-1">
                                        <Info className="h-3 w-3 mt-0.5 flex-shrink-0"/>
                                        <span>Make sure it's 100% your original work (no remixes, covers, etc!). Check the policy <HelpCircle className="inline h-3 w-3 align-text-bottom cursor-pointer hover:text-primary" onClick={() => setIsPolicyModalOpen(true)} /> for deets.</span>
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>


                        {/* Hidden submit for Enter key */}
                        <button type="submit" onClick={(e) => { e.preventDefault(); handleNext(); }} disabled={isSubmitting} style={{ display: 'none' }} aria-hidden="true"></button>
                    </form>
                </Form>
            </div>

             {/* Footer with Action Buttons - Moved outside Form */}
             <div className="flex justify-between items-center p-4 border-t border-border/30 mt-auto h-16">
                 {/* Back Button */}
                 <Button
                     type="button"
                     variant="ghost"
                     size="icon" // Using size="icon" for consistency
                     onClick={handlePrevious}
                     disabled={currentStep === 1 || isSubmitting}
                     className={cn(
                         "h-10 w-10 text-muted-foreground hover:text-primary",
                         currentStep === 1 && "invisible" // Hide on first step
                     )}
                     aria-label="Previous Step"
                 >
                     <ArrowLeft className="h-5 w-5" /> {/* Standard icon size */}
                 </Button>

                 {/* Cancel Button */}
                 <Button
                     type="button"
                     variant="ghost"
                     size="icon" // Using size="icon"
                     onClick={onCancel}
                     disabled={isSubmitting}
                     className="h-10 w-10 text-destructive hover:bg-destructive/10"
                     aria-label="Cancel Submission"
                 >
                     <X className="h-5 w-5" /> {/* Standard icon size */}
                 </Button>

                 {/* Next/Submit Button */}
                 <Button
                     type="button" // Changed to type="button"
                     variant="ghost"
                     size="icon" // Using size="icon"
                     onClick={handleNext} // Call handleNext which validates and submits
                     disabled={isSubmitting || (currentStep === DEMO_SUBMISSION_STEPS.length && !fileName)} // Check fileName on last step
                     className={cn(
                         "h-10 w-10 text-primary hover:bg-primary/10 disabled:text-muted-foreground disabled:hover:bg-transparent",
                         isSubmitting && "animate-pulse"
                     )}
                     aria-label={currentStep === DEMO_SUBMISSION_STEPS.length ? "Send Demo" : "Next Step"}
                 >
                     {isSubmitting ? (
                         <Loader2 className="h-5 w-5 animate-spin" />
                     ) : currentStep === DEMO_SUBMISSION_STEPS.length ? (
                         <Send className="h-5 w-5" />
                     ) : (
                         <ArrowRight className="h-5 w-5" />
                     )}
                 </Button>
             </div>
        </div>
         <DemoPolicyModal isOpen={isPolicyModalOpen} onClose={() => setIsPolicyModalOpen(false)} />
     </>
  );
}

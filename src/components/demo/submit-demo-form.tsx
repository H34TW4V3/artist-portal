
"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Music, UploadCloud, X, ArrowLeft, ArrowRight } from "lucide-react"; // Added Arrow icons

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

// Define steps
const STEPS = [
  { id: 1, name: "Artist & Contact Info" },
  { id: 2, name: "Track Info & Upload" },
];


// Schema for the demo submission form - ADDED email
const demoSchema = z.object({
  artistName: z.string().min(2, "Artist name must be at least 2 characters.").max(100),
  email: z.string().email("Please enter a valid email address."), // Added email field
  socialLinks: z.string().max(500, "Social links section too long.").optional().nullable(),
  bio: z.string().max(1000, "Bio must be 1000 characters or less.").optional().nullable(),
  trackName: z.string().min(1, "Track name is required.").max(100),
  demoFile: z.instanceof(File).refine(file => file.size > 0, 'Demo track file is required.')
                         .refine(file => file.size <= 50 * 1024 * 1024, 'Demo track must be 50MB or less.')
                         .refine(file => file.type === "audio/mpeg", 'File must be an MP3 audio file.'),
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
        email: data.email, // Include email in log
        socialLinks: data.socialLinks,
        bio: data.bio,
        trackName: data.trackName,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
    });
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simulate potential error
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

  const form = useForm<DemoFormValues>({
    resolver: zodResolver(demoSchema),
    defaultValues: {
      artistName: "",
      email: "", // Initialize email
      socialLinks: "",
      bio: "",
      trackName: "",
      demoFile: undefined,
    },
    mode: "onChange",
  });

  // Reset step when form is reset (e.g., on modal close/reopen)
  useEffect(() => {
      // Simple check: if the form context changes significantly (like reset is called)
      // This might need refinement based on how the parent component handles state
       const resetListener = () => {
           console.log("SubmitDemoForm detecting reset, setting step to 1");
           setCurrentStep(1);
           setPreviousStep(1);
           setFileName(null);
           setIsSubmitting(false);
       };

       // Since we don't have a direct reset event, we can check default values or use a key prop on the component
       // For simplicity, we'll reset based on initial render/prop changes if needed
       // Or rely on the parent component remounting this form (e.g., via closing/opening the modal/card section)
       resetListener(); // Call initially

       // Clean up listener if needed (though this approach doesn't set up a persistent listener)
   // Monitor relevant form state properties or use a key in the parent
   }, [form]); // Re-run if form context object reference changes


  // Function to handle step change and animation state
  const goToStep = (step: number) => {
    setPreviousStep(currentStep);
    setCurrentStep(step);
  };

  // Determine animation classes based on step change direction
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
       // Keep current step visible, hide others unless animating out
       return stepId === currentStep ? "opacity-100" : "opacity-0 absolute pointer-events-none";
  };


  // Handle file input changes
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
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

  // Validate current step before proceeding
  const validateStep = async (step: number): Promise<boolean> => {
    let fieldsToValidate: (keyof DemoFormValues)[] = [];
    if (step === 1) {
        fieldsToValidate = ["artistName", "email", "socialLinks", "bio"]; // Validate step 1 fields
    } else if (step === 2) {
        fieldsToValidate = ["trackName", "demoFile"]; // Validate step 2 fields
    }

    // Need to trigger validation and wait for the result
    const result = await form.trigger(fieldsToValidate);
    console.log(`Step ${step} validation result:`, result, 'Errors:', form.formState.errors);

    if (!result) {
        // Get first error message
        const errors = form.formState.errors;
        const firstErrorField = fieldsToValidate.find(field => errors[field]);
        const errorMessage = firstErrorField ? errors[firstErrorField]?.message : "Please fill in all required fields for this step.";
        toast({ title: "Missing Information", description: String(errorMessage), variant: "destructive", duration: 2000 });
    }
    return result;
  };


  // Handle "Next" button click
  const handleNext = async () => {
    if (await validateStep(currentStep)) {
      if (currentStep < STEPS.length) {
        goToStep(currentStep + 1);
      } else {
        // If on last step, trigger submission
        await form.handleSubmit(onSubmit)();
      }
    }
  };

  // Handle "Previous" button click
  const handlePrevious = () => {
    if (currentStep > 1) {
      goToStep(currentStep - 1);
    }
  };


  async function onSubmit(values: DemoFormValues) {
    setIsSubmitting(true);
     const file = values.demoFile; // Already validated as File by Zod

    try {
       await submitDemoToApi(values, file);
       toast({
           title: "Demo Submitted!",
           description: "Thanks for sending us your track. We'll be in touch if it's a good fit!",
           variant: "default",
           duration: 5000,
       });
       // Reset happens via useEffect on modal close/success
       onSuccess();
    } catch (error) {
      console.error("Error submitting demo:", error);
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Could not submit your demo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
        {/* Progress Bar */}
        <Progress value={(currentStep / STEPS.length) * 100} className="w-full h-1.5 mb-4" />
      {/* Wrap form content for animation - Added transition-opacity */}
      <div className="relative overflow-hidden min-h-[450px]"> {/* Adjust min-height as needed */}
          {/* Form for Step 1 */}
           <form
               // Prevent default needed for forms inside forms or complex structures sometimes
               onSubmit={(e) => e.preventDefault()}
               className={cn("space-y-4 absolute w-full transition-opacity duration-300", getAnimationClasses(1), className)} // Added className prop here
               aria-hidden={currentStep !== 1}
           >
               {/* Step 1 Fields */}
               {/* Artist Name */}
               <FormField
                   control={form.control}
                   name="artistName"
                   render={({ field }) => (
                       <FormItem>
                           <FormLabel>Artist Name</FormLabel>
                           <FormControl>
                               <Input placeholder="Your stage name or band name" {...field} disabled={isSubmitting || currentStep !== 1} className="focus:ring-accent" />
                           </FormControl>
                           <FormMessage />
                       </FormItem>
                   )}
               />
               {/* Email Address */}
               <FormField
                   control={form.control}
                   name="email"
                   render={({ field }) => (
                       <FormItem>
                           <FormLabel>Contact Email</FormLabel>
                           <FormControl>
                               <Input type="email" placeholder="your.email@example.com" {...field} disabled={isSubmitting || currentStep !== 1} className="focus:ring-accent" />
                           </FormControl>
                           <FormMessage />
                       </FormItem>
                   )}
               />
               {/* Social Links */}
               <FormField
                   control={form.control}
                   name="socialLinks"
                   render={({ field }) => (
                       <FormItem>
                           <FormLabel>Social Links (Optional)</FormLabel>
                           <FormControl>
                               <Textarea
                                   placeholder="Links to your Spotify, SoundCloud, Instagram, etc. (one per line)"
                                   className="resize-y min-h-[80px] focus:ring-accent"
                                   {...field}
                                   value={field.value ?? ""}
                                   disabled={isSubmitting || currentStep !== 1}
                               />
                           </FormControl>
                           <FormDescription className="text-xs">Help us get a better sense of your online presence.</FormDescription>
                           <FormMessage />
                       </FormItem>
                   )}
               />
               {/* Bio */}
               <FormField
                   control={form.control}
                   name="bio"
                   render={({ field }) => (
                       <FormItem>
                           <FormLabel>Short Bio (Optional)</FormLabel>
                           <FormControl>
                               <Textarea
                                   placeholder="Briefly describe yourself or your music (max 1000 characters)."
                                   className="resize-y min-h-[100px] focus:ring-accent"
                                   {...field}
                                   value={field.value ?? ""}
                                   disabled={isSubmitting || currentStep !== 1}
                               />
                           </FormControl>
                           <FormMessage />
                       </FormItem>
                   )}
               />
           </form>

           {/* Form for Step 2 */}
           <form
               // Prevent default needed
               onSubmit={(e) => e.preventDefault()}
               className={cn("space-y-4 absolute w-full transition-opacity duration-300", getAnimationClasses(2), className)} // Added className prop here
               aria-hidden={currentStep !== 2}
           >
               {/* Step 2 Fields */}
               {/* Track Name */}
               <FormField
                   control={form.control}
                   name="trackName"
                   render={({ field }) => (
                       <FormItem>
                           <FormLabel>Demo Track Name</FormLabel>
                           <FormControl>
                               <Input placeholder="Title of your demo track" {...field} disabled={isSubmitting || currentStep !== 2} className="focus:ring-accent" />
                           </FormControl>
                           <FormMessage />
                       </FormItem>
                   )}
               />
               {/* Demo File Upload */}
               <FormField
                   control={form.control}
                   name="demoFile"
                   render={({ fieldState }) => (
                       <FormItem>
                           <FormLabel>Demo Track (MP3)</FormLabel>
                           <FormControl>
                               <div className={cn(
                                   "mt-1 flex justify-center rounded-md border-2 border-dashed px-6 pb-6 pt-5 bg-muted/20",
                                   fieldState.error ? "border-destructive" : "border-input hover:border-accent",
                                   fileName ? "border-solid p-4 items-center" : ""
                               )}>
                                   {fileName ? (
                                       <div className="flex items-center justify-between w-full">
                                           <div className="flex items-center gap-2 text-sm font-medium text-foreground truncate mr-4">
                                               <Music className="h-5 w-5 text-muted-foreground" />
                                               <span>{fileName}</span>
                                           </div>
                                           <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive rounded-full" onClick={clearFile} aria-label="Remove MP3 file" disabled={isSubmitting || currentStep !== 2}>
                                               <X className="h-4 w-4" />
                                           </Button>
                                       </div>
                                   ) : (
                                       <div className="space-y-1 text-center">
                                           <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
                                           <div className="flex text-sm text-muted-foreground justify-center">
                                               <label htmlFor="demoFile" className="relative cursor-pointer rounded-md bg-background px-2 py-1 font-medium text-primary hover:text-primary/90 focus-within:outline-none focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2">
                                                   <span>Select MP3 file</span>
                                                   <input id="demoFile" name="demoFile" type="file" className="sr-only" accept="audio/mpeg" onChange={handleFileChange} ref={fileInputRef} disabled={isSubmitting || currentStep !== 2} />
                                               </label>
                                               {/* <p className="pl-1">or drag and drop</p> */}
                                           </div>
                                           <p className="text-xs text-muted-foreground">MP3 audio up to 50MB</p>
                                       </div>
                                   )}
                               </div>
                           </FormControl>
                           <FormDescription className="text-xs">Your best demo track in MP3 format.</FormDescription>
                           <FormMessage />
                       </FormItem>
                   )}
               />
           </form>
        </div>

        {/* Action Buttons - Outside the animated divs */}
        <div className="flex justify-between pt-6">
            <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1 || isSubmitting}
                className={cn(currentStep === 1 && "invisible")} // Hide if on first step
            >
                <ArrowLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
             <div className="flex gap-2">
                  {/* Call onCancel prop when this button is clicked */}
                  <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                      Cancel
                  </Button>
                 <Button
                     type="button" // Use onClick handler
                     onClick={handleNext} // Calls validation and step change/submit
                     disabled={isSubmitting || (currentStep === 2 && !fileName)} // Disable submit if no file selected on last step
                     className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md disabled:shadow-none disabled:bg-muted disabled:text-muted-foreground"
                 >
                     {isSubmitting ? (
                         <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
                     ) : currentStep === STEPS.length ? (
                         'Submit Demo'
                     ) : (
                         <>Next <ArrowRight className="ml-2 h-4 w-4" /></>
                     )}
                 </Button>
             </div>
        </div>

    </Form>
  );
}


"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Music, UploadCloud, X, ArrowLeft, ArrowRight, User, Mail, Link as LinkIcon, Info } from "lucide-react"; // Import necessary icons

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

// Define steps for the demo submission flow
const DEMO_STEPS = [
  { id: 1, name: "Artist & Contact Info" },
  { id: 2, name: "Track Info & Upload" },
];

// Schema remains the same, validation happens per step
const demoSchema = z.object({
  artistName: z.string().min(2, "Artist name must be at least 2 characters.").max(100),
  email: z.string().email("Please enter a valid email address."),
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

  const getAnimationClasses = (stepId: number): string => {
      if (stepId === currentStep && currentStep > previousStep) return "animate-slide-in-from-right";
      if (stepId === currentStep && currentStep < previousStep) return "animate-slide-in-from-left";
      if (stepId === previousStep && currentStep > previousStep) return "animate-slide-out-to-left";
      if (stepId === previousStep && currentStep < previousStep) return "animate-slide-out-to-right";
      return stepId === currentStep ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none"; // Position absolute for non-visible steps
  };


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

  const validateStep = async (step: number): Promise<boolean> => {
    let fieldsToValidate: (keyof DemoFormValues)[] = [];
    if (step === 1) fieldsToValidate = ["artistName", "email", "socialLinks", "bio"];
    else if (step === 2) fieldsToValidate = ["trackName", "demoFile"];

    const result = await form.trigger(fieldsToValidate);
    if (!result) {
        const errors = form.formState.errors;
        const firstErrorField = fieldsToValidate.find(field => errors[field]);
        const errorMessage = firstErrorField ? errors[firstErrorField]?.message : "Please fill in all required fields.";
        toast({ title: "Missing Information", description: String(errorMessage), variant: "destructive", duration: 2000 });
    }
    return result;
  };

  const handleNext = async () => {
    if (await validateStep(currentStep)) {
      if (currentStep < DEMO_STEPS.length) {
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

  async function onSubmit(values: DemoFormValues) {
    setIsSubmitting(true);
    const file = values.demoFile;
    try {
       await submitDemoToApi(values, file);
       toast({
           title: "Demo Submitted!",
           description: "Thanks for sending us your track. We'll be in touch if it's a good fit!",
           variant: "default",
           duration: 5000,
       });
       onSuccess();
    } catch (error) {
      console.error("Error submitting demo:", error);
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Could not submit your demo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Define icons for steps
  const stepIcons = [
      <User className="h-8 w-8 text-primary" />,
      <Music className="h-8 w-8 text-primary" />
  ];

  return (
     // Ensure the container uses flex-col and has a defined height or uses flex-grow from parent
     <div className={cn("flex flex-col h-full", className)}>
        {/* Header Section - Icon and Title */}
         <div className="flex flex-col items-center p-6 border-b border-border/30">
              <div className="mb-3 transition-transform duration-300">
                 {stepIcons[currentStep - 1]}
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                  {DEMO_STEPS[currentStep - 1].name}
              </h3>
              {/* Progress Bar */}
              <Progress value={(currentStep / DEMO_STEPS.length) * 100} className="w-3/4 h-1.5 mt-3" />
         </div>

         {/* Form Area - Takes remaining space and scrolls */}
         <div className="flex-grow overflow-y-auto p-6">
            <Form {...form}>
                {/* Form content is wrapped for animation */}
                <div className="relative min-h-[300px]"> {/* Adjust min-height as needed */}
                   {/* Step 1 Form */}
                   <form
                       onSubmit={(e) => e.preventDefault()}
                       className={cn("space-y-4 absolute inset-0 transition-opacity duration-300", getAnimationClasses(1))}
                       aria-hidden={currentStep !== 1}
                   >
                       <FormField control={form.control} name="artistName" render={({ field }) => ( <FormItem><FormLabel>Artist Name</FormLabel><FormControl><Input placeholder="Your stage name" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem> )} />
                       <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Contact Email</FormLabel><FormControl><Input type="email" placeholder="your.email@example.com" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem> )} />
                       <FormField control={form.control} name="socialLinks" render={({ field }) => ( <FormItem><FormLabel>Social Links (Optional)</FormLabel><FormControl><Textarea placeholder="Spotify, SoundCloud, Instagram..." className="resize-none" {...field} value={field.value ?? ""} disabled={isSubmitting} rows={2}/></FormControl><FormMessage /></FormItem> )} />
                       <FormField control={form.control} name="bio" render={({ field }) => ( <FormItem><FormLabel>Short Bio (Optional)</FormLabel><FormControl><Textarea placeholder="Describe your music..." className="resize-none" {...field} value={field.value ?? ""} disabled={isSubmitting} rows={3}/></FormControl><FormMessage /></FormItem> )} />
                   </form>

                   {/* Step 2 Form */}
                   <form
                       onSubmit={(e) => e.preventDefault()}
                       className={cn("space-y-4 absolute inset-0 transition-opacity duration-300", getAnimationClasses(2))}
                       aria-hidden={currentStep !== 2}
                   >
                        <FormField control={form.control} name="trackName" render={({ field }) => ( <FormItem><FormLabel>Demo Track Name</FormLabel><FormControl><Input placeholder="Title of your demo" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="demoFile" render={({ fieldState }) => (
                            <FormItem>
                                <FormLabel>Demo Track (MP3, max 50MB)</FormLabel>
                                <FormControl>
                                    <div className={cn("flex justify-center rounded-md border-2 border-dashed px-4 py-4", fieldState.error ? "border-destructive" : "border-input hover:border-accent", fileName ? "border-solid items-center" : "")}>
                                        {fileName ? (
                                            <div className="flex items-center justify-between w-full">
                                                <div className="flex items-center gap-2 text-sm font-medium text-foreground truncate mr-2"><Music className="h-5 w-5 text-muted-foreground" /><span>{fileName}</span></div>
                                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive rounded-full" onClick={clearFile} disabled={isSubmitting}><X className="h-4 w-4" /></Button>
                                            </div>
                                        ) : (
                                            <div className="text-center">
                                                <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground" />
                                                <div className="mt-2 flex text-sm text-muted-foreground justify-center">
                                                    <label htmlFor="demoFile-input" className="relative cursor-pointer rounded-md bg-background px-1 font-medium text-primary hover:text-primary/90 focus-within:outline-none">
                                                        <span>Select MP3</span>
                                                        <input id="demoFile-input" name="demoFile" type="file" className="sr-only" accept="audio/mpeg" onChange={handleFileChange} ref={fileInputRef} disabled={isSubmitting} />
                                                    </label>
                                                    {/* <p className="pl-1">or drag & drop</p> */}
                                                </div>
                                                <p className="text-xs text-muted-foreground">MP3 audio up to 50MB</p>
                                            </div>
                                        )}
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                   </form>
                </div>
             </Form>
         </div>

         {/* Footer with Action Buttons */}
         <div className="flex justify-between p-4 border-t border-border/30 mt-auto">
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
                 <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                     Cancel
                 </Button>
                 <Button
                     type="button"
                     onClick={handleNext}
                     disabled={isSubmitting || (currentStep === 2 && !fileName)}
                     className="bg-primary hover:bg-primary/90 text-primary-foreground"
                 >
                     {isSubmitting ? (
                         <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
                     ) : currentStep === DEMO_STEPS.length ? (
                         'Submit Demo'
                     ) : (
                         <>Next <ArrowRight className="ml-2 h-4 w-4" /></>
                     )}
                 </Button>
             </div>
         </div>
     </div>
  );
}

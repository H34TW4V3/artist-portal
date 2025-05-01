
"use client";

import React, { useState, useEffect } from "react"; // Import React and useEffect
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, ArrowLeft, ArrowRight } from "lucide-react"; // Add Arrow icons
import { useRouter } from "next/navigation"; // Keep useRouter if needed for redirect parameter handling

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
// Removed Progress import
// import { Progress } from "@/components/ui/progress"; // Import Progress
import { useToast } from "@/hooks/use-toast";
import { ForgotPasswordModal } from "./forgot-password-modal"; // Import the modal
import { useAuth } from "@/context/auth-context"; // Import useAuth hook
import { cn } from "@/lib/utils"; // Import cn

// Define steps
const STEPS = [
  { id: 1, name: "Enter Email" },
  { id: 2, name: "Enter Password" },
];

// Define separate schemas for each step
const emailSchema = z.object({
  artistId: z.string().email({ message: "Please enter a valid email address." }),
});

const passwordSchema = z.object({
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

// Combined schema for final submission (though validation happens per step)
const loginSchema = emailSchema.merge(passwordSchema);

type LoginFormValues = z.infer<typeof loginSchema>;

// Add onLoginSuccess prop
interface LoginFormProps {
    onLoginSuccess: () => void;
}

// TODO: Place your login sound file at /public/sounds/login-jingle.mp3
const LOGIN_JINGLE_PATH = '/sounds/login-jingle.mp3';

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const { login, loading: authLoading } = useAuth(); // Get login function and loading state from context
  const { toast } = useToast();
  const router = useRouter(); // Keep for potential future use (e.g., reading redirect param)
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [previousStep, setPreviousStep] = useState(1); // For animation direction
  const [enteredEmail, setEnteredEmail] = useState(""); // Store email from step 1
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null); // State for audio element

  useEffect(() => {
    // Preload audio element on the client side
    if (typeof window !== 'undefined') {
      const audioInstance = new Audio(LOGIN_JINGLE_PATH);
      audioInstance.preload = 'auto';
      setAudio(audioInstance);
    }
  }, []);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema), // Use combined schema for full validation context if needed
    defaultValues: {
      artistId: "",
      password: "",
    },
    mode: "onChange", // Validate on change
  });

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
       return stepId === currentStep ? "" : "hidden"; // Only current step is visible (unless animating out)
   };

   // Validate current step before proceeding
   const validateStep = async (step: number): Promise<boolean> => {
     let fieldsToValidate: (keyof LoginFormValues)[] = [];
     if (step === 1) {
       fieldsToValidate = ["artistId"];
     } else if (step === 2) {
        fieldsToValidate = ["password"]; // Validate password before final submit
     }

     const isValid = await form.trigger(fieldsToValidate);
     if (!isValid) {
          toast({ title: "Validation Error", description: "Please fix the errors before proceeding.", variant: "destructive", duration: 2000 });
     }
     return isValid;
   };

  // Handle "Next" button click
  const handleNext = async () => {
    if (await validateStep(currentStep)) {
      if (currentStep < STEPS.length) {
        if (currentStep === 1) {
            setEnteredEmail(form.getValues("artistId")); // Store email before moving to step 2
        }
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

  // Play login sound function
  const playLoginSound = () => {
    if (audio) {
      audio.play().catch(error => console.error("Error playing login sound:", error));
    } else {
       console.warn("Login sound audio element not ready.");
    }
  };


  async function onSubmit(values: LoginFormValues) {
    // Login logic now uses the values directly from the form state
    try {
      await login(values.artistId, values.password); // Use the validated values
       playLoginSound(); // Play sound on success
       onLoginSuccess(); // Call the success handler passed from parent
    } catch (error) {
      console.error("Login failed:", error);
      // If login fails due to wrong password, stay on password step
      if (error instanceof Error && error.message.includes("password")) {
        goToStep(2); // Ensure user stays on password step
        form.setError("password", { type: "manual", message: "Incorrect password." });
      } else if (error instanceof Error && (error.message.includes("Artist ID") || error.message.includes("email"))) {
          // If error related to email/user not found, go back to step 1
          goToStep(1);
          form.setError("artistId", { type: "manual", message: "Artist ID not found or invalid." });
      } else {
         // Generic error display
          toast({
            title: "Login Failed",
            description: error instanceof Error ? error.message : "An unexpected error occurred.",
            variant: "destructive",
            duration: 2000
          });
      }
    }
  }

  // Reset step on unmount or external close? (Maybe not needed if modal closes)

  return (
    <>
      <Form {...form}>
         {/* Removed Progress Bar */}
         {/* <div className="px-6 pb-4"> // Removed padding
           <Progress value={(currentStep / STEPS.length) * 100} className="w-full h-1.5" />
         </div> */}

        {/* Use relative container for step animations */}
        <div className="relative overflow-hidden min-h-[200px]"> {/* Adjust min-height as needed */}
             <form
               onSubmit={(e) => {
                 e.preventDefault();
                 handleNext(); // Trigger next/submit logic
                }}
                className="space-y-4 px-6 pb-6" // Add padding
                aria-live="polite"
             >
              {/* Step 1: Email */}
              <div className={cn("space-y-4", getAnimationClasses(1))}>
                {currentStep === 1 && (
                  <FormField
                    control={form.control}
                    name="artistId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Artist ID (Email)</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="your.email@example.com"
                            {...field}
                            disabled={authLoading}
                            autoComplete="email"
                            className="bg-background/50 dark:bg-background/30 border-input focus:ring-accent"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Step 2: Password */}
              <div className={cn("space-y-4", getAnimationClasses(2))}>
                {currentStep === 2 && (
                  <>
                    {/* Optional: Display entered email */}
                     <p className="text-sm text-muted-foreground text-center">Logging in as: <strong>{enteredEmail}</strong></p>
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="••••••••"
                              {...field}
                              disabled={authLoading}
                              autoComplete="current-password"
                              className="bg-background/50 dark:bg-background/30 border-input focus:ring-accent"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     {/* Forgot Password Link - only on password step */}
                     <div className="text-right">
                          <Button
                            type="button"
                            variant="link"
                            className="text-sm font-medium text-primary hover:underline p-0 h-auto"
                            onClick={() => setIsForgotPasswordModalOpen(true)}
                            disabled={authLoading}
                          >
                            Forgot Password?
                          </Button>
                      </div>
                  </>
                )}
              </div>

              {/* Navigation Buttons - Placed outside step divs */}
              <div className="flex justify-between pt-4">
                  <Button
                      type="button"
                      variant="outline"
                      onClick={handlePrevious}
                      disabled={currentStep === 1 || authLoading}
                      className={cn(currentStep === 1 && "invisible")} // Hide if on first step
                  >
                     <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                  </Button>
                  <Button
                      type="button" // Important: Use type="button" to prevent default form submission
                      onClick={handleNext}
                      disabled={authLoading || (currentStep === 1 && !form.watch('artistId')) || (currentStep === 2 && !form.watch('password'))} // Basic validation check
                      className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md disabled:shadow-none disabled:bg-muted disabled:text-muted-foreground"
                  >
                      {authLoading ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                      ) : currentStep === STEPS.length ? (
                         'Login'
                      ) : (
                         <>Next <ArrowRight className="ml-2 h-4 w-4" /></>
                      )}
                  </Button>
              </div>
               {/* Hidden submit for Enter key */}
               <button type="submit" style={{ display: 'none' }} aria-hidden="true"></button>
            </form>
        </div>
      </Form>

       {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordModalOpen}
        onClose={() => setIsForgotPasswordModalOpen(false)}
      />
    </>
  );
}




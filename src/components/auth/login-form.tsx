
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // Import Avatar components
import { useToast } from "@/hooks/use-toast";
import { ForgotPasswordModal } from "./forgot-password-modal"; // Import the modal
import { useAuth } from "@/context/auth-context"; // Import useAuth hook
import { cn } from "@/lib/utils"; // Import cn
import { getUserProfileByEmail } from "@/services/user"; // Import service function
import type { ProfileFormValues } from "@/components/profile/profile-form"; // Import profile type
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton

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

// Helper to get initials
const getInitials = (name: string | undefined | null) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'; // Default to '?'
};


export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const { login, loading: authLoading } = useAuth(); // Get login function and loading state from context
  const { toast } = useToast();
  const router = useRouter(); // Keep for potential future use (e.g., reading redirect param)
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [previousStep, setPreviousStep] = useState(1); // For animation direction
  const [enteredEmail, setEnteredEmail] = useState(""); // Store email from step 1
  const [profileData, setProfileData] = useState<ProfileFormValues | null>(null); // Store fetched profile data
  const [isFetchingProfile, setIsFetchingProfile] = useState(false); // Loading state for profile fetch
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
      if (currentStep === 1) {
            const email = form.getValues("artistId");
            setEnteredEmail(email); // Store email

            // Fetch profile data
            setIsFetchingProfile(true);
            setProfileData(null); // Reset profile data
            try {
                const fetchedProfile = await getUserProfileByEmail(email);
                setProfileData(fetchedProfile);
                console.log("Fetched profile for password screen:", fetchedProfile);
            } catch (error) {
                console.warn("Could not fetch profile by email:", error);
                setProfileData(null); // Ensure profile data is null on error
                 // Optionally inform user profile couldn't load, but proceed anyway
                 // toast({ title: "Profile Info", description: "Could not load profile details.", variant: "default", duration: 2000});
            } finally {
                 setIsFetchingProfile(false);
                 goToStep(currentStep + 1); // Move to next step regardless of profile fetch result
            }
      } else if (currentStep < STEPS.length) {
          // For future steps if any
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
       setProfileData(null); // Clear profile data when going back
       setIsFetchingProfile(false);
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
      } else if (error instanceof Error && (error.message.includes("Artist ID") || error.message.includes("email") || error.message.includes("Invalid"))) { // Catch invalid credentials error
          // If error related to email/user not found, go back to step 1
          goToStep(1);
          form.setError("artistId", { type: "manual", message: "Artist ID not found or invalid." });
          setProfileData(null); // Clear profile data if user not found
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

  // Determine display name and image URL for step 2
  const displayNameStep2 = profileData?.name || enteredEmail?.split('@')[0] || "User";
  const displayImageUrlStep2 = profileData?.imageUrl || null;


  return (
    <>
      <Form {...form}>

        {/* Use relative container for step animations */}
        <div className="relative overflow-hidden min-h-[280px]"> {/* Increased min-height */}
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
              <div className={cn("space-y-4 flex flex-col items-center", getAnimationClasses(2))}> {/* Center content */}
                {currentStep === 2 && (
                  <>
                    {/* Show Avatar and Name */}
                     {isFetchingProfile ? (
                        <div className="flex flex-col items-center mb-4">
                            <Skeleton className="h-20 w-20 rounded-full mb-2 bg-muted/50" />
                            <Skeleton className="h-4 w-24 bg-muted/50" />
                        </div>
                     ) : (
                         <div className="flex flex-col items-center mb-4 text-center">
                             <Avatar className="h-20 w-20 mb-2 border-2 border-primary/40">
                                 <AvatarImage src={displayImageUrlStep2 || undefined} alt={displayNameStep2} />
                                 <AvatarFallback className="text-2xl bg-muted text-muted-foreground">
                                    {getInitials(displayNameStep2)}
                                 </AvatarFallback>
                             </Avatar>
                             <p className="text-lg font-medium text-foreground">
                                {displayNameStep2}
                             </p>
                             <p className="text-xs text-muted-foreground">Enter your password</p>
                         </div>
                     )}

                    {/* Password Field */}
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem className="w-full"> {/* Ensure field takes full width */}
                          <FormLabel className="sr-only">Password</FormLabel> {/* Hide label visually */}
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Password"
                              {...field}
                              disabled={authLoading || isFetchingProfile}
                              autoComplete="current-password"
                              className="bg-background/50 dark:bg-background/30 border-input focus:ring-accent w-full" // Ensure input takes full width
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     {/* Forgot Password Link */}
                     <div className="text-right w-full">
                          <Button
                            type="button"
                            variant="link"
                            className="text-sm font-medium text-primary hover:underline p-0 h-auto"
                            onClick={() => setIsForgotPasswordModalOpen(true)}
                            disabled={authLoading || isFetchingProfile}
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
                      disabled={currentStep === 1 || authLoading || isFetchingProfile}
                      className={cn(currentStep === 1 && "invisible")} // Hide if on first step
                  >
                     <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                  </Button>
                  <Button
                      type="button" // Important: Use type="button" to prevent default form submission
                      onClick={handleNext}
                      disabled={authLoading || isFetchingProfile || (currentStep === 1 && !form.watch('artistId')) || (currentStep === 2 && !form.watch('password'))} // Disable during profile fetch
                      className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md disabled:shadow-none disabled:bg-muted disabled:text-muted-foreground"
                  >
                      {(authLoading || isFetchingProfile) && currentStep === 1 ? ( // Show processing only when fetching profile on step 1
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                      ) : authLoading && currentStep === 2 ? ( // Show processing on step 2 only during auth check
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


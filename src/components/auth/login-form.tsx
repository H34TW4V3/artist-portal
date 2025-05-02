
"use client";

import React, { useState, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ForgotPasswordModal } from "./forgot-password-modal";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";
import { getUserProfileByEmail } from "@/services/user";
import type { ProfileFormValues } from "@/components/profile/profile-form";
import { Skeleton } from "@/components/ui/skeleton";
import { SplashScreen } from '@/components/common/splash-screen';

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

interface LoginFormProps {
    onLoginComplete: () => void;
}


// Helper to get initials
const getInitials = (name: string | undefined | null) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'; // Default to '?'
};

// Custom Login Icon based on the provided image - Moved here
const LoginIconStep1 = () => (
    // Add subtle pulse animation to the icon
    <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 100 100" className="h-32 w-32 mb-4 text-primary animate-subtle-pulse"> {/* Adjusted margin */}
      <defs>
        <linearGradient id="oxygenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor: 'hsl(180, 100%, 70%)', stopOpacity: 1}} /> {/* Cyan-ish */}
          <stop offset="50%" style={{stopColor: 'hsl(300, 100%, 80%)', stopOpacity: 1}} /> {/* Magenta-ish */}
          <stop offset="100%" style={{stopColor: 'hsl(35, 100%, 75%)', stopOpacity: 1}} /> {/* Orange-ish */}
        </linearGradient>
      </defs>
      {/* Outer circle with gradient stroke */}
      <circle cx="50" cy="50" r="45" fill="none" stroke="url(#oxygenGradient)" strokeWidth="3" />
      {/* Stylized 'X' with gradient stroke */}
      <path
        d="M30 30 L70 70 M70 30 L30 70"
        stroke="url(#oxygenGradient)"
        strokeWidth="10" // Adjust thickness as needed
        strokeLinecap="round"
        fill="none" // Use stroke instead of fill for the X lines if preferred
      />
    </svg>
);


export function LoginForm({ onLoginComplete }: LoginFormProps) {
  const { login, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [previousStep, setPreviousStep] = useState(1);
  const [enteredEmail, setEnteredEmail] = useState("");
  const [profileData, setProfileData] = useState<ProfileFormValues | null>(null);
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);


  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      artistId: "",
      password: "",
    },
    mode: "onChange",
  });

  // Function to handle step change and animation state
  const goToStep = (step: number) => {
    setPreviousStep(currentStep);
    setCurrentStep(step);
  };

  // Determine animation classes based on step change direction
   const getAnimationClasses = (stepId: number): string => {
       const isCurrent = stepId === currentStep;
       const isPrevious = stepId === previousStep;

       if (isCurrent && currentStep > previousStep) return "animate-slide-in-from-right";
       if (isCurrent && currentStep < previousStep) return "animate-slide-in-from-left";
       // Position animating-out steps absolutely to allow smooth transition
       if (isPrevious && currentStep > previousStep) return "animate-slide-out-to-left absolute inset-0 px-6 pb-6 pt-6";
       if (isPrevious && currentStep < previousStep) return "animate-slide-out-to-right absolute inset-0 px-6 pb-6 pt-6";
       // Hide non-active, non-animating steps, but keep them in the layout initially
       return isCurrent ? "opacity-100" : "opacity-0 pointer-events-none absolute inset-0 px-6 pb-6 pt-6";
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

            // Fetch profile data using the service function
            setIsFetchingProfile(true);
            setProfileData(null); // Reset profile data
            try {
                // Use getUserProfileByEmail which correctly finds UID then fetches profile
                const fetchedProfile = await getUserProfileByEmail(email);
                setProfileData(fetchedProfile);
                console.log("Fetched profile for password screen:", fetchedProfile);
            } catch (error) {
                console.warn("Could not fetch profile by email:", error);
                setProfileData(null); // Ensure profile data is null on error
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


  async function onSubmit(values: LoginFormValues) {
    setIsSubmitting(true); // Set submitting state
    setShowSplash(true); // Show splash screen immediately on final submit click
    try {
      await login(values.artistId, values.password); // Use the validated values
       // Login success is handled by AuthProvider and onAuthStateChanged listener
       console.log("LoginForm: Login initiated, waiting for auth state change...");
        // Set a timer to call onLoginComplete after splash duration
       setTimeout(() => {
           onLoginComplete(); // Call completion handler after splash duration
       }, 5000); // Match splash screen duration (5 seconds)

    } catch (error) {
      setShowSplash(false); // Hide splash on error
      console.error("Login failed:", error);
      // If login fails due to wrong password, stay on password step
      if (error instanceof Error && (error.message.includes("password") || error.message.includes("credential"))) { // Check for password or general credential error
        goToStep(2); // Ensure user stays on password step
        form.setError("password", { type: "manual", message: "Incorrect password." });
      } else if (error instanceof Error && (error.message.includes("Artist ID") || error.message.includes("email") || error.message.includes("Invalid") || error.message.includes("user-not-found"))) { // Catch invalid user errors
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
    } finally {
        // Don't set isSubmitting false here, splash screen handles the visual state
    }
  }

  // Determine display name and image URL for step 2 - Use Artist Name from profile
  // PRIORITIZE profileData.name
  const artistNameStep2 = profileData?.name || enteredEmail?.split('@')[0] || "User";
  const displayImageUrlStep2 = profileData?.imageUrl || null;

    // If showing splash screen, render it
    if (showSplash) {
       return (
           <SplashScreen
               // Pass profile data if available, otherwise fallback
               userImageUrl={displayImageUrlStep2}
               userName={artistNameStep2}
               loadingText={`Welcome ${artistNameStep2}`} // Use profile name in welcome message
               duration={5000} // Duration in ms
               className="p-6" // Add padding for card context
           />
       );
    }


  return (
    <>
      <Form {...form}>
          {/* Use relative container for step animations - Adjusted min-height */}
          {/* Added key to force re-render on step change for reliable animations */}
          {/* Ensure text color is white (foreground in dark mode) */}
          <div className="relative overflow-hidden min-h-[300px] text-foreground" key={currentStep}>

             {/* Step 1 Header (Only shown on step 1) */}
              <div className={cn(currentStep !== 1 && "hidden")}>
                 <CardHeader className="items-center text-center p-6 border-b border-border/30">
                     <LoginIconStep1 />
                     <CardTitle className="text-2xl font-semibold tracking-tight text-primary">Artist Hub Login</CardTitle>
                     <CardDescription className="text-foreground/80 text-sm"> {/* Use foreground */}
                         Enter your credentials to access your dashboard.
                     </CardDescription>
                 </CardHeader>
              </div>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    handleNext(); // Trigger next/submit logic
                }}
                className={cn(
                    "space-y-4 px-6 pb-6",
                    currentStep === 1 ? "pt-6" : "pt-0" // Adjust top padding based on step
                )}
                aria-live="polite"
            >
              {/* Step 1: Email (Moved below header) */}
              {currentStep === 1 && (
                <div className="space-y-4 min-h-[80px]">
                    <FormField
                    control={form.control}
                    name="artistId"
                    render={({ field }) => (
                        <FormItem>
                        {/* Ensure label text is white */}
                        <FormLabel className="text-foreground">Artist ID (Email)</FormLabel>
                        <FormControl>
                            <Input
                            type="email"
                            placeholder="your.email@example.com"
                            {...field}
                            disabled={authLoading || isFetchingProfile || isSubmitting}
                            autoComplete="email"
                            className="bg-background/50 dark:bg-background/30 border-input focus:ring-accent text-foreground placeholder:text-muted-foreground" // Ensure text/placeholder colors
                            />
                        </FormControl>
                        <FormMessage className="text-destructive-foreground dark:text-destructive" /> {/* Adjust message color if needed */}
                        </FormItem>
                    )}
                    />
                </div>
              )}

              {/* Step 2: Password (Inside animated container) */}
              <div className={cn("absolute inset-0 px-6 pb-6 pt-6", getAnimationClasses(2))}>
                  {currentStep === 2 && (
                    <div className="space-y-4 flex flex-col items-center min-h-[200px]">
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
                                     <AvatarImage src={displayImageUrlStep2 || undefined} alt={artistNameStep2} />
                                     <AvatarFallback className="text-2xl bg-muted text-muted-foreground">
                                        {getInitials(artistNameStep2)}
                                     </AvatarFallback>
                                 </Avatar>
                                 {/* Ensure name text is white */}
                                 <p className="text-lg font-medium text-foreground">
                                    {artistNameStep2} {/* Display artist name */}
                                 </p>
                             </div>
                         )}

                        {/* Password Field */}
                        <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem className="w-full">
                              {/* Ensure label text is white */}
                              <FormLabel className="sr-only text-foreground">Password</FormLabel>
                              <FormControl>
                                <Input
                                  type="password"
                                  placeholder="Password"
                                  {...field}
                                  disabled={authLoading || isFetchingProfile || isSubmitting}
                                  autoComplete="current-password"
                                  className="bg-background/50 dark:bg-background/30 border-input focus:ring-accent w-full text-foreground placeholder:text-muted-foreground" // Ensure text/placeholder colors
                                />
                              </FormControl>
                              <FormMessage className="text-destructive-foreground dark:text-destructive" /> {/* Adjust message color */}
                            </FormItem>
                          )}
                        />
                         {/* Forgot Password Link - Ensure link text is appropriate */}
                         <div className="text-right w-full">
                              <Button
                                type="button"
                                variant="link"
                                className="text-sm font-medium text-primary hover:underline p-0 h-auto" // Use primary color for link
                                onClick={() => setIsForgotPasswordModalOpen(true)}
                                disabled={authLoading || isFetchingProfile || isSubmitting}
                              >
                                Forgot Password?
                              </Button>
                          </div>
                      </>
                    </div>
                  )}
              </div>

                {/* Navigation Buttons - Placed outside step divs */}
                <div className="flex justify-between pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handlePrevious}
                        disabled={currentStep === 1 || authLoading || isFetchingProfile || isSubmitting}
                        className={cn(currentStep === 1 && "invisible", "text-foreground border-border hover:bg-muted/50")} // Style buttons for dark bg
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                    </Button>
                    <Button
                        type="button" // Changed to button, handle logic in onClick
                        onClick={handleNext} // Use handleNext for validation + step change/submit
                        disabled={authLoading || isFetchingProfile || isSubmitting || (currentStep === 1 && !form.watch('artistId')) || (currentStep === 2 && !form.watch('password'))}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md disabled:shadow-none disabled:bg-muted disabled:text-muted-foreground"
                    >
                        {(authLoading || isFetchingProfile) && currentStep === 1 ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                        ) : (authLoading || isSubmitting) && currentStep === 2 ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                        ) : currentStep === STEPS.length ? (
                            'Login'
                        ) : (
                            // Corrected JSX wrapping
                            <span className="flex items-center">Next <ArrowRight className="ml-2 h-4 w-4" /></span>
                        )}
                    </Button>
                </div>
                {/* Hidden submit for Enter key */}
                <button type="submit" disabled={isSubmitting} style={{ display: 'none' }} aria-hidden="true"></button>
            </form>
          </div>
      </Form>

      <ForgotPasswordModal
        isOpen={isForgotPasswordModalOpen}
        onClose={() => setIsForgotPasswordModalOpen(false)}
      />
    </>
  );
}

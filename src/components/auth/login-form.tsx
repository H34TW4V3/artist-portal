
"use client";

import React, { useState, useEffect, useRef } from "react"; // Import React and useEffect
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, ArrowLeft, ArrowRight, User } from "lucide-react"; // Add Arrow icons, User icon
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
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; // Import Card components for header
import { useToast } from "@/hooks/use-toast";
import { ForgotPasswordModal } from "./forgot-password-modal"; // Import the modal
import { useAuth } from "@/context/auth-context"; // Import useAuth hook
import { cn } from "@/lib/utils"; // Import cn
import { getUserProfileByEmail } from "@/services/user"; // Import service function
import type { ProfileFormValues } from "@/components/profile/profile-form"; // Import profile type
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
import { SplashScreen } from '@/components/common/splash-screen'; // Import SplashScreen

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
     onLoginSuccess: (name: string, imageUrl: string | null) => void; // Keep for splash screen info
}


// Helper to get initials
const getInitials = (name: string | undefined | null) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'; // Default to '?'
};

// Custom Login Icon based on the provided image - Moved here
const LoginIconStep1 = () => (
    // Add subtle pulse animation to the icon
    <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 100 100" className="h-20 w-20 sm:h-24 sm:w-24 mb-4 text-primary animate-subtle-pulse"> {/* Adjusted size */}
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
  const [showSplash, setShowSplash] = useState(false); // State for splash display *within* the card


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
       // Use absolute positioning to keep elements in the flow during transition
       return stepId === currentStep ? "opacity-100 relative" : "opacity-0 pointer-events-none absolute inset-0";
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
    // Determine name and image URL *before* calling login/onLoginSuccess
    const nameForSplash = profileData?.name || enteredEmail?.split('@')[0] || "User";
    // Use profileData.imageUrl for the splash screen image
    const imageUrlForSplash = profileData?.imageUrl || null;

     // Show splash inside the card
     setShowSplash(true);

    try {
      await login(values.artistId, values.password); // Use the validated values
      // onLoginSuccess is called by AuthProvider's listener now, but we pass info here for the parent component's splash logic
      onLoginSuccess(nameForSplash, imageUrlForSplash);
      // AuthProvider handles redirect after its state updates
    } catch (error) {
       setShowSplash(false); // Hide splash on login error
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

  // Determine display name and image URL for step 2 - Use Artist Name from profile
  // Prioritize profileData.name
  const artistNameStep2 = profileData?.name || enteredEmail?.split('@')[0] || "User";
  // Use profileData.imageUrl
  const displayImageUrlStep2 = profileData?.imageUrl || null;


  return (
    <>
      <Form {...form}>

        {/* Use relative container for step animations - Increased min-height */}
        {/* Flex container to center content vertically */}
        <div className="relative overflow-hidden flex flex-col justify-center min-h-[300px]"> {/* Adjusted min-height */}

            {/* Conditional Rendering based on showSplash state */}
            {showSplash ? (
                 <SplashScreen
                      // Use the splash component directly inside the form area
                      loadingText={`Welcome, ${artistNameStep2}!`} // Use the determined name
                      userImageUrl={displayImageUrlStep2} // Pass the determined image URL
                      userName={artistNameStep2}
                      // Ensure splash fills the card space if desired, or centers
                      className="absolute inset-0 flex items-center justify-center bg-card/20 dark:bg-card/10" // Fill parent
                      style={{ animationDelay: '0s' }}
                    />
            ) : (
              <>
                  {/* Step 1 Content */}
                 <div className={cn("space-y-4 px-6 pb-6 pt-6", getAnimationClasses(1))}>
                   {currentStep === 1 && (
                     <>
                       <CardHeader className="items-center text-center p-0 mb-4"> {/* Reduced padding, margin */}
                           <LoginIconStep1 />
                           <CardTitle className="text-xl sm:text-2xl font-semibold tracking-tight text-primary">Artist Hub Login</CardTitle>
                           <CardDescription className="text-muted-foreground text-sm">
                               Enter your credentials to access your dashboard.
                           </CardDescription>
                       </CardHeader>
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
                     </>
                   )}
                 </div>

                 {/* Step 2 Content */}
                  <div className={cn("space-y-4 flex flex-col items-center px-6 pb-6 pt-6", getAnimationClasses(2))}>
                   {currentStep === 2 && (
                     <>
                       {/* Show Avatar and Name */}
                        {isFetchingProfile ? (
                           <div className="flex flex-col items-center mb-4">
                               <Skeleton className="h-16 w-16 rounded-full mb-2 bg-muted/50" /> {/* Slightly smaller */}
                               <Skeleton className="h-4 w-24 bg-muted/50" />
                           </div>
                        ) : (
                            <div className="flex flex-col items-center mb-4 text-center">
                                <Avatar className="h-16 w-16 mb-2 border-2 border-primary/40"> {/* Slightly smaller */}
                                    <AvatarImage src={displayImageUrlStep2 || undefined} alt={artistNameStep2} />
                                    <AvatarFallback className="text-xl bg-muted text-muted-foreground"> {/* Adjusted size */}
                                       {getInitials(artistNameStep2)}
                                    </AvatarFallback>
                                </Avatar>
                                <p className="text-base font-medium text-foreground"> {/* Adjusted size */}
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
                             <FormLabel className="sr-only">Password</FormLabel>
                             <FormControl>
                               <Input
                                 type="password"
                                 placeholder="Password"
                                 {...field}
                                 disabled={authLoading || isFetchingProfile}
                                 autoComplete="current-password"
                                 className="bg-background/50 dark:bg-background/30 border-input focus:ring-accent w-full"
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
                               className="text-xs font-medium text-primary hover:underline p-0 h-auto" // Smaller text
                               onClick={() => setIsForgotPasswordModalOpen(true)}
                               disabled={authLoading || isFetchingProfile}
                             >
                               Forgot Password?
                             </Button>
                         </div>
                     </>
                   )}
                 </div>

                 {/* Navigation Buttons - Placed outside step divs but inside the non-splash container */}
                 <div className={cn(
                      "flex justify-between px-6 pb-6",
                       // Hide navigation if splash is shown
                      showSplash && "opacity-0 pointer-events-none"
                  )}>
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
                         type="button"
                         onClick={handleNext}
                         disabled={authLoading || isFetchingProfile || (currentStep === 1 && !form.watch('artistId')) || (currentStep === 2 && !form.watch('password'))}
                         className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md disabled:shadow-none disabled:bg-muted disabled:text-muted-foreground"
                     >
                         {(authLoading || isFetchingProfile) && currentStep === 1 ? (
                           <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                         ) : authLoading && currentStep === 2 ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                         ) : currentStep === STEPS.length ? (
                            'Login'
                         ) : (
                            <>Next <ArrowRight className="ml-2 h-4 w-4" /></>
                         )}
                     </Button>
                 </div>
                  {/* Hidden submit for Enter key */}
                  <button type="submit" disabled={isFetchingProfile || authLoading} style={{ display: 'none' }} aria-hidden="true"></button>
              </>
            )}
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

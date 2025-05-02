"use client";

import React, { useState, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Howl } from 'howler';

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
import { SplashScreen } from '@/components/common/splash-screen'; // Import the modified SplashScreen

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

// Combined schema
const loginSchema = emailSchema.merge(passwordSchema);

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
     // Removed onLoginSuccess prop, handled internally now
     // onLoginSuccess: (name: string, imageUrl: string | null) => void;
     onLoginComplete: () => void; // Callback for LoginPage to start redirect timer
}

// Path to the sound file
const LOGIN_JINGLE_PATH = '/sounds/login-jingle.mp3';
const SESSION_SOUND_PLAYED_KEY = 'loginSoundPlayed';


// Helper to get initials
const getInitials = (name: string | undefined | null) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
};

// Login Icon Component
const LoginIconStep1 = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 100 100" className="h-20 w-20 mb-2 text-primary animate-subtle-pulse"> {/* Reduced size */}
      <defs>
        <linearGradient id="oxygenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor: 'hsl(180, 100%, 70%)', stopOpacity: 1}} />
          <stop offset="50%" style={{stopColor: 'hsl(300, 100%, 80%)', stopOpacity: 1}} />
          <stop offset="100%" style={{stopColor: 'hsl(35, 100%, 75%)', stopOpacity: 1}} />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="45" fill="none" stroke="url(#oxygenGradient)" strokeWidth="3" />
      <path
        d="M30 30 L70 70 M70 30 L30 70"
        stroke="url(#oxygenGradient)"
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
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
  const audioRef = useRef<Howl | null>(null);
  const [showLoginSplash, setShowLoginSplash] = useState(false); // State to show splash within the card
  const [splashInfo, setSplashInfo] = useState<{ name: string; imageUrl: string | null }>({ name: '', imageUrl: null });
  const audioPlayedRef = useRef(false); // Ref to track if audio has played for this splash instance
  const [isSubmitting, setIsSubmitting] = useState(false); // Define isSubmitting state


   // Initialize Howler - Runs only once on mount
   useEffect(() => {
    if (typeof window !== 'undefined' && !audioRef.current) {
        console.log("LoginForm: Initializing Howler for login jingle...");
        audioRef.current = new Howl({
          src: [LOGIN_JINGLE_PATH],
          preload: true,
          html5: true,
          onplayerror: (id, error) => {
              console.error('Howler playback error:', error);
          },
          onloaderror: (id, error) => {
              console.error('Howler load error:', id, error);
          },
          onload: () => {
              console.log('Howler audio loaded:', LOGIN_JINGLE_PATH);
          }
        });
    }
    // Cleanup function
    return () => {
        console.log("LoginForm: Unloading Howler instance on unmount.");
        audioRef.current?.unload();
        audioRef.current = null;
    };
   }, []);


   // Function to play login sound - Triggered internally on success
   const playLoginSound = () => {
       if (audioRef.current && typeof window !== 'undefined') {
           console.log("LoginForm: Attempting to play login sound...");
            // Reset seek to start just in case
            audioRef.current.seek(0);
            audioRef.current.play();
            audioPlayedRef.current = true; // Mark as played using the ref for splash
       } else {
           console.warn("LoginForm: Login sound audio element not ready or not initialized.");
       }
   };


  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { artistId: "", password: "" },
    mode: "onChange",
  });

  const goToStep = (step: number) => {
      setPreviousStep(currentStep);
      setCurrentStep(step);
  };

  // Animation classes (same as before)
   const getAnimationClasses = (stepId: number): string => {
       if (showLoginSplash) return "hidden"; // Hide steps if splash is showing
       if (stepId === currentStep && currentStep > previousStep) return "animate-slide-in-from-right";
       if (stepId === currentStep && currentStep < previousStep) return "animate-slide-in-from-left";
       if (stepId === previousStep && currentStep > previousStep) return "animate-slide-out-to-left";
       if (stepId === previousStep && currentStep < previousStep) return "animate-slide-out-to-right";
       return stepId === currentStep ? "" : "hidden";
   };

   const validateStep = async (step: number): Promise<boolean> => {
     let fieldsToValidate: (keyof LoginFormValues)[] = [];
     if (step === 1) fieldsToValidate = ["artistId"];
     else if (step === 2) fieldsToValidate = ["password"];
     const isValid = await form.trigger(fieldsToValidate);
     if (!isValid) toast({ title: "Validation Error", description: "Please fix the errors.", variant: "destructive", duration: 2000 });
     return isValid;
   };

  const handleNext = async () => {
    if (await validateStep(currentStep)) {
      if (currentStep === 1) {
            const email = form.getValues("artistId");
            setEnteredEmail(email);
            setIsFetchingProfile(true);
            setProfileData(null);
            try {
                const fetchedProfile = await getUserProfileByEmail(email);
                setProfileData(fetchedProfile);
            } catch (error) {
                console.warn("Could not fetch profile by email:", error);
                setProfileData(null);
            } finally {
                 setIsFetchingProfile(false);
                 goToStep(currentStep + 1);
            }
      } else if (currentStep === 2) {
          // Trigger final submission on the last step
          await form.handleSubmit(onSubmit)();
      } else {
          // For future steps if any
          goToStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
       setProfileData(null);
       setIsFetchingProfile(false);
       goToStep(currentStep - 1);
    }
  };


  async function onSubmit(values: LoginFormValues) {
     // Don't play sound immediately, wait for success
    setIsSubmitting(true); // Use the defined submitting state
    try {
        const loggedInUser = await login(values.artistId, values.password);

        // Login successful: Prepare splash info and show it
        const nameForSplash = profileData?.name || loggedInUser?.displayName || values.artistId.split('@')[0] || "User";
        const imageUrlForSplash = profileData?.imageUrl || loggedInUser?.photoURL || null;
        setSplashInfo({ name: nameForSplash, imageUrl: imageUrlForSplash });

        audioPlayedRef.current = false; // Reset audio played flag for this splash instance
        setShowLoginSplash(true); // Show the embedded splash screen
        // Play sound when splash becomes visible (handled by SplashScreen now)


        // Inform parent page to start redirect timer AFTER splash duration
        setTimeout(() => {
            onLoginComplete(); // Call parent callback
        }, 5000); // Match splash duration (5 seconds)


    } catch (error) {
        console.error("Login failed:", error);
        // Handle errors as before
        if (error instanceof Error && error.message.includes("password")) {
            goToStep(2);
            form.setError("password", { type: "manual", message: "Incorrect password." });
        } else if (error instanceof Error && (error.message.includes("Artist ID") || error.message.includes("email") || error.message.includes("Invalid"))) {
            goToStep(1);
            form.setError("artistId", { type: "manual", message: "Artist ID not found or invalid." });
            setProfileData(null);
        } else {
            toast({
                title: "Login Failed",
                description: error instanceof Error ? error.message : "An unexpected error occurred.",
                variant: "destructive",
                duration: 2000
            });
        }
        setIsSubmitting(false); // Reset submitting state on error
    }
    // No need to set loading false here, useAuth handles global loading
    // setIsSubmitting(false); // Should be set on success within splash timeout or on error
  }

  // Determine display name and image URL for step 2
  const artistNameStep2 = profileData?.name || enteredEmail?.split('@')[0] || "User";
  const displayImageUrlStep2 = profileData?.imageUrl || null;
  // const isSubmittingCombined = authLoading || isFetchingProfile || isSubmitting; // Combine loading states


  return (
    <>
      <Form {...form}>
        {/* Relative container for steps and splash */}
        <div className="relative overflow-hidden min-h-[400px] flex flex-col"> {/* Ensure flex column */}

             {/* Conditional Rendering: Show Form Steps OR Splash */}
             {showLoginSplash ? (
                 <SplashScreen
                     // Use card-like styling, adjust as needed
                     className="flex-grow flex items-center justify-center"
                     style={{ animationDelay: '0s' }}
                     loadingText={`Welcome, ${splashInfo.name}!`}
                     userImageUrl={splashInfo.imageUrl}
                     userName={splashInfo.name}
                     duration={0} // Let parent control timing, set to 0 to disable internal timer
                     playAudioUrl={LOGIN_JINGLE_PATH}
                     audioPlayedRef={audioPlayedRef} // Pass the ref to track playback
                 />
             ) : (
                 <>
                     {/* Step 1 Header (Only shown on step 1) */}
                     {currentStep === 1 && (
                         <CardHeader className={cn(
                             "items-center text-center p-4 border-b border-border/30", // Reduced padding
                             getAnimationClasses(1)
                         )}>
                             <LoginIconStep1 />
                             <CardTitle className="text-xl font-semibold tracking-tight text-primary">Artist Hub Login</CardTitle> {/* Reduced size */}
                             <CardDescription className="text-muted-foreground text-xs"> {/* Reduced size */}
                                 Enter your credentials to access your dashboard.
                             </CardDescription>
                         </CardHeader>
                      )}

                     <form
                       onSubmit={(e) => { e.preventDefault(); handleNext(); }}
                       className="flex-grow space-y-3 px-4 pb-4 pt-4" // Reduced padding/spacing
                       aria-live="polite"
                     >
                         {/* Step 1: Email */}
                         <div className={cn("space-y-3", getAnimationClasses(1))}> {/* Reduced spacing */}
                             {currentStep === 1 && (
                                 <FormField
                                     control={form.control}
                                     name="artistId"
                                     render={({ field }) => (
                                         <FormItem>
                                             <FormLabel className="text-sm">Artist ID (Email)</FormLabel> {/* Reduced size */}
                                             <FormControl>
                                                 <Input
                                                     type="email"
                                                     placeholder="your.email@example.com"
                                                     {...field}
                                                     disabled={isSubmitting || currentStep !== 1}
                                                     autoComplete="email"
                                                     className="bg-background/50 dark:bg-background/30 border-input focus:ring-accent text-sm h-9" // Reduced size
                                                 />
                                             </FormControl>
                                             <FormMessage className="text-xs" /> {/* Reduced size */}
                                         </FormItem>
                                     )}
                                 />
                             )}
                         </div>

                         {/* Step 2: Password */}
                         <div className={cn("space-y-3 flex flex-col items-center", getAnimationClasses(2))}> {/* Reduced spacing */}
                             {currentStep === 2 && (
                                 <>
                                     {/* Avatar and Name */}
                                     {isFetchingProfile ? (
                                         <div className="flex flex-col items-center mb-3"> {/* Reduced margin */}
                                             <Skeleton className="h-16 w-16 rounded-full mb-1 bg-muted/50" /> {/* Reduced size */}
                                             <Skeleton className="h-3 w-20 bg-muted/50" /> {/* Reduced size */}
                                         </div>
                                     ) : (
                                         <div className="flex flex-col items-center mb-3 text-center"> {/* Reduced margin */}
                                             <Avatar className="h-16 w-16 mb-1 border-2 border-primary/40"> {/* Reduced size */}
                                                 <AvatarImage src={displayImageUrlStep2 || undefined} alt={artistNameStep2} />
                                                 <AvatarFallback className="text-xl bg-muted text-muted-foreground"> {/* Reduced size */}
                                                     {getInitials(artistNameStep2)}
                                                 </AvatarFallback>
                                             </Avatar>
                                             <p className="text-base font-medium text-foreground"> {/* Reduced size */}
                                                 {artistNameStep2}
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
                                                         disabled={isSubmitting || currentStep !== 2}
                                                         autoComplete="current-password"
                                                         className="bg-background/50 dark:bg-background/30 border-input focus:ring-accent w-full text-sm h-9" // Reduced size
                                                     />
                                                 </FormControl>
                                                 <FormMessage className="text-xs" /> {/* Reduced size */}
                                             </FormItem>
                                         )}
                                     />
                                     {/* Forgot Password Link */}
                                     <div className="text-right w-full">
                                         <Button
                                             type="button"
                                             variant="link"
                                             className="text-xs font-medium text-primary hover:underline p-0 h-auto" // Reduced size
                                             onClick={() => setIsForgotPasswordModalOpen(true)}
                                             disabled={isSubmitting || currentStep !== 2}
                                         >
                                             Forgot Password?
                                         </Button>
                                     </div>
                                 </>
                             )}
                         </div>

                         {/* Navigation Buttons - Placed outside step divs */}
                         <div className="flex justify-between pt-3"> {/* Reduced padding */}
                             <Button
                                 type="button"
                                 variant="outline"
                                 size="sm" // Use sm size
                                 onClick={handlePrevious}
                                 disabled={currentStep === 1 || isSubmitting}
                                 className={cn(currentStep === 1 && "invisible")}
                             >
                                 <ArrowLeft className="mr-1 h-4 w-4" /> Previous
                             </Button>
                             <Button
                                 type="button"
                                 size="sm" // Use sm size
                                 onClick={handleNext}
                                 disabled={isSubmitting || (currentStep === 1 && !form.watch('artistId')) || (currentStep === 2 && !form.watch('password'))}
                                 className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md disabled:shadow-none disabled:bg-muted disabled:text-muted-foreground"
                             >
                                 {isSubmitting ? (
                                     <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Processing...</>
                                 ) : currentStep === STEPS.length ? (
                                     'Login'
                                 ) : (
                                     <>Next <ArrowRight className="ml-1 h-4 w-4" /></>
                                 )}
                             </Button>
                         </div>
                         {/* Hidden submit for Enter key */}
                         <button type="submit" disabled={isSubmitting} style={{ display: 'none' }} aria-hidden="true"></button>
                     </form>
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

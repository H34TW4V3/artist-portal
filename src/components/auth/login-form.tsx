
"use client";

import React, { useState, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, ArrowLeft, ArrowRight, User } from "lucide-react"; // Added User icon
import { useRouter } from "next/navigation";
// Removed Howler import

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
import { Skeleton } from "@/components/ui/skeleton";
import { SplashScreen } from '@/components/common/splash-screen';
import { getUserProfileByEmail } from '@/services/user'; // Import function to get profile by email
import type { ProfileFormValues } from '@/components/profile/profile-form'; // Import profile type

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
     onLoginComplete: () => void; // Callback for LoginPage to start redirect timer
}

// Helper to get initials
const getInitials = (name: string | undefined | null) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
};

// Login Icon Component for Step 1
const LoginIconStep1 = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 100 100" className="h-16 w-16 mb-2 text-primary animate-subtle-pulse"> {/* Adjusted size */}
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

// Simple User Icon for Step 2 - Using Lucide User icon
// const UserIconStep2 = () => (
//     <User className="h-16 w-16 mb-2 text-primary" /> // Adjusted size
// );

// Removed LOGIN_JINGLE_PATH constant

export function LoginForm({ onLoginComplete }: LoginFormProps) {
  const { login, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [previousStep, setPreviousStep] = useState(1);
  const [enteredEmail, setEnteredEmail] = useState("");
  const [artistNameStep2, setArtistNameStep2] = useState<string | null>(null); // Fetch artist name
  const [artistImageStep2, setArtistImageStep2] = useState<string | null>(null); // Fetch artist image
  const [isFetchingProfile, setIsFetchingProfile] = useState(false); // Loading state for profile fetch
  const [showLoginSplash, setShowLoginSplash] = useState(false);
  const [splashInfo, setSplashInfo] = useState<{ name: string; imageUrl: string | null }>({ name: '', imageUrl: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Removed audioRef

  // Removed useEffect for audio initialization

  // Removed playLoginSound function

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { artistId: "", password: "" },
    mode: "onChange",
  });

  const goToStep = (step: number) => {
      setPreviousStep(currentStep);
      setCurrentStep(step);
  };

   const getAnimationClasses = (stepId: number): string => {
       if (showLoginSplash) return "hidden";
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

   // Fetch user profile data when email is entered
   const fetchProfileForStep2 = async (email: string) => {
       setIsFetchingProfile(true);
       setArtistNameStep2(null); // Reset while fetching
       setArtistImageStep2(null);
       try {
           const profile = await getUserProfileByEmail(email);
           if (profile) {
               setArtistNameStep2(profile.name || email.split('@')[0] || "name"); // Use profile name, fallback to email prefix
               setArtistImageStep2(profile.imageUrl || null);
               console.log("Fetched profile for step 2:", profile.name, profile.imageUrl);
           } else {
                setArtistNameStep2(email.split('@')[0] || "name"); // Fallback if no profile found
                console.log("No profile found for step 2, using email prefix.");
           }
       } catch (error) {
           console.error("Error fetching profile for login step 2:", error);
           setArtistNameStep2(email.split('@')[0] || "User"); // Fallback on error
           // Optionally show a toast error? Maybe not necessary here.
       } finally {
           setIsFetchingProfile(false);
       }
   };


  const handleNext = async () => {
    if (await validateStep(currentStep)) {
      if (currentStep === 1) {
            const email = form.getValues("artistId");
            setEnteredEmail(email);
            await fetchProfileForStep2(email); // Fetch profile before moving to step 2
            goToStep(currentStep + 1);
      } else if (currentStep === 2) {
          await form.handleSubmit(onSubmit)();
      } else {
          goToStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
       goToStep(currentStep - 1);
       setArtistNameStep2(null); // Clear fetched data when going back
       setArtistImageStep2(null);
    }
  };


  async function onSubmit(values: LoginFormValues) {
    setIsSubmitting(true);
    try {
        const loggedInUser = await login(values.artistId, values.password);

        // Use name/image fetched in step 2 or fallback
        const nameForSplash = artistNameStep2 || loggedInUser?.displayName || values.artistId.split('@')[0] || 'Artist';
        const imageUrlForSplash = artistImageStep2 || loggedInUser?.photoURL || null;

        setSplashInfo({ name: nameForSplash, imageUrl: imageUrlForSplash });
        setShowLoginSplash(true);
        // Removed audio playing logic

        setTimeout(() => {
            onLoginComplete();
        }, 5000); // Match splash duration

    } catch (error) {
        console.error("Login failed:", error);
        if (error instanceof Error && error.message.includes("password")) {
            goToStep(2);
            form.setError("password", { type: "manual", message: "Incorrect password." });
        } else if (error instanceof Error && (error.message.includes("Artist ID") || error.message.includes("email") || error.message.includes("Invalid") || error.message.includes("credential"))) {
            goToStep(1);
            form.setError("artistId", { type: "manual", message: "Artist ID not found or invalid." });
        } else {
            toast({
                title: "Login Failed",
                description: error instanceof Error ? error.message : "An unexpected error occurred.",
                variant: "destructive",
                duration: 2000
            });
        }
        setIsSubmitting(false);
    }
  }


  return (
    <>
      <Form {...form}>
        {/* Removed card wrapper, added min-height to ensure space */}
        <div className="relative overflow-hidden min-h-[400px] flex flex-col">

             {showLoginSplash ? (
                 <SplashScreen
                     className="flex-grow flex items-center justify-center"
                     style={{ animationDelay: '0s' }}
                     loadingText={`Welcome, ${splashInfo.name}!`} // Show welcome message
                     userImageUrl={splashInfo.imageUrl}
                     userName={splashInfo.name}
                     duration={5000}
                 />
             ) : (
                 <>
                     {/* Step 1 Header - Only visible on step 1 */}
                     <div className={cn("flex flex-col items-center pt-6 pb-4", getAnimationClasses(1))}>
                          {currentStep === 1 && <LoginIconStep1 />}
                          {currentStep === 1 && (
                             <>
                               <CardTitle className="text-xl font-semibold tracking-tight text-primary mt-2">Artist Hub Login</CardTitle>
                               <CardDescription className="text-muted-foreground text-xs">
                                 Enter your credentials to access your dashboard.
                               </CardDescription>
                             </>
                          )}
                     </div>

                       {/* Step 2 Header (minimal) - Only visible on step 2 */}
                       <div className={cn(
                           "flex flex-col items-center pt-4 pb-2", // Adjusted padding
                           getAnimationClasses(2)
                        )}>
                            {currentStep === 2 && (
                                isFetchingProfile ? (
                                    <Skeleton className="h-16 w-16 rounded-full mb-2" />
                                ) : (
                                     <Avatar className="h-16 w-16 mb-2 border-2 border-primary/30">
                                         <AvatarImage src={artistImageStep2 || undefined} alt={artistNameStep2 || 'User'} />
                                         <AvatarFallback className="text-2xl bg-muted text-muted-foreground">
                                            {getInitials(artistNameStep2)}
                                         </AvatarFallback>
                                     </Avatar>
                                )
                            )}
                           {currentStep === 2 && (
                             isFetchingProfile ? (
                                 <Skeleton className="h-5 w-24 mt-1" />
                             ) : (
                                 <p className="text-lg font-medium text-foreground">{artistNameStep2 || "User"}</p>
                              )
                            )}
                       </div>


                     <form
                       onSubmit={(e) => { e.preventDefault(); handleNext(); }}
                       className="flex-grow space-y-3 px-4 pb-4 pt-4"
                       aria-live="polite"
                     >
                         {/* Step 1: Email */}
                         <div className={cn("space-y-3", getAnimationClasses(1))}>
                             {currentStep === 1 && (
                                 <FormField
                                     control={form.control}
                                     name="artistId"
                                     render={({ field }) => (
                                         <FormItem>
                                             <FormLabel className="text-sm">Artist ID (Email)</FormLabel>
                                             <FormControl>
                                                 <Input
                                                     type="email"
                                                     placeholder="your.email@example.com"
                                                     {...field}
                                                     disabled={isSubmitting || currentStep !== 1}
                                                     autoComplete="email"
                                                     className="bg-background/50 dark:bg-background/30 border-input focus:ring-accent text-sm h-9"
                                                 />
                                             </FormControl>
                                             <FormMessage className="text-xs" />
                                         </FormItem>
                                     )}
                                 />
                             )}
                         </div>

                         {/* Step 2: Password */}
                         <div className={cn("space-y-3", getAnimationClasses(2))}>
                             {currentStep === 2 && (
                                 <>
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
                                                         disabled={isSubmitting || currentStep !== 2 || isFetchingProfile} // Disable while fetching profile
                                                         autoComplete="current-password"
                                                         className="bg-background/50 dark:bg-background/30 border-input focus:ring-accent w-full text-sm h-9"
                                                     />
                                                 </FormControl>
                                                 <FormMessage className="text-xs" />
                                             </FormItem>
                                         )}
                                     />
                                     {/* Forgot Password Link */}
                                     <div className="text-right w-full">
                                         <Button
                                             type="button"
                                             variant="link"
                                             className="text-xs font-medium text-primary hover:underline p-0 h-auto"
                                             onClick={() => setIsForgotPasswordModalOpen(true)}
                                             disabled={isSubmitting || currentStep !== 2 || isFetchingProfile} // Disable while fetching profile
                                         >
                                             Forgot Password?
                                         </Button>
                                     </div>
                                 </>
                             )}
                         </div>

                         {/* Navigation Buttons */}
                         <div className="flex justify-between pt-3">
                             <Button
                                 type="button"
                                 variant="outline"
                                 size="sm"
                                 onClick={handlePrevious}
                                 disabled={currentStep === 1 || isSubmitting || isFetchingProfile} // Disable while fetching profile
                                 className={cn(currentStep === 1 && "invisible")}
                             >
                                 <ArrowLeft className="mr-1 h-4 w-4" /> Previous
                             </Button>
                             <Button
                                 type="button"
                                 size="sm"
                                 onClick={handleNext}
                                 disabled={
                                     isSubmitting ||
                                     isFetchingProfile || // Disable while fetching profile
                                     (currentStep === 1 && !form.watch('artistId')) ||
                                     (currentStep === 2 && !form.watch('password'))
                                  }
                                 className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md disabled:shadow-none disabled:bg-muted disabled:text-muted-foreground"
                             >
                                 {isSubmitting || isFetchingProfile ? ( // Show loading state if submitting or fetching profile
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


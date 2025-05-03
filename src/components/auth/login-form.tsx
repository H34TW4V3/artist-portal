
"use client";

import React, { useState, useEffect, useRef } from "react"; // Add React import
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { getAuth, type RecaptchaVerifier, PhoneMultiFactorGenerator } from "firebase/auth"; // Import getAuth, PhoneMultiFactorGenerator
import { app } from '@/services/firebase-config'; // Import Firebase config
import { Loader2, ArrowLeft, ArrowRight, Mail, KeyRound, Phone, MessageSquare } from "lucide-react"; // Add Arrow icons
import { useRouter, useSearchParams } from "next/navigation"; // Use next/navigation

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
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // Import Avatar
import { getUserProfileByEmail } from "@/services/user"; // Import function to get profile by email
import type { ProfileFormValues } from "@/components/profile/profile-form"; // Import profile type
// Import login and MFA functions from auth service
import {
    login,
    initializeRecaptchaVerifier,
    sendMfaVerificationCode,
    completeMfaSignIn
} from '@/services/auth';
import { SplashScreen } from '@/components/common/splash-screen'; // Import SplashScreen


// Login Schema - updated to include verificationCode (optional for form structure)
const loginSchema = z.object({
  artistId: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
  verificationCode: z.string().optional(), // For MFA step
});

type LoginFormValues = z.infer<typeof loginSchema>;

// Define steps
const STEPS = [
  { id: 1, name: "Artist ID" },
  { id: 2, name: "Password" },
  { id: 3, name: "Verify Code" }, // MFA Step
];

// Define the component
export function LoginForm({ className }: { className?: string }) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false); // Define isSubmitting state
  const [currentStep, setCurrentStep] = useState(1);
  const [previousStep, setPreviousStep] = useState(1);
  const [showSplash, setShowSplash] = useState(false); // State for splash screen visibility
  const [splashLoadingText, setSplashLoadingText] = useState("Loading..."); // Text for splash
  const [splashUserImageUrl, setSplashUserImageUrl] = useState<string | null>(null); // Image for splash
  const [splashUserName, setSplashUserName] = useState<string | null>(null); // Name for splash
  const [fetchedProfile, setFetchedProfile] = useState<ProfileFormValues | null>(null); // State to store fetched profile

  // MFA related state
  const [mfaResolver, setMfaResolver] = useState<any>(null);
  const [mfaHints, setMfaHints] = useState<any[]>([]);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null); // Ref for reCAPTCHA

  const router = useRouter();
  const searchParams = useSearchParams(); // Use useSearchParams


  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      artistId: "",
      password: "",
      verificationCode: "",
    },
    mode: "onChange", // Validate on change
  });

   // Initialize reCAPTCHA when component mounts and MFA step might be needed
   useEffect(() => {
    // Ensure this runs client-side
    if (typeof window !== 'undefined' && recaptchaContainerRef.current && !recaptchaVerifier) {
      try {
         // Ensure container has an ID before initializing
         if (!recaptchaContainerRef.current.id) {
             recaptchaContainerRef.current.id = `recaptcha-container-${Date.now()}`; // Assign a unique ID if missing
         }
         const verifier = initializeRecaptchaVerifier(recaptchaContainerRef.current.id);
         setRecaptchaVerifier(verifier);
         console.log("reCAPTCHA Initialized on container:", recaptchaContainerRef.current.id);
      } catch (error) {
          console.error("Failed to initialize reCAPTCHA:", error);
          toast({ title: "Security Check Error", description: "Could not initialize security check. Please refresh.", variant: "destructive" });
      }
    }
    // No cleanup needed here as verifier might be used across steps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recaptchaContainerRef]); // Run when ref is available


  // Function to get initials
  const getInitials = (name: string | undefined | null): string => {
      return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };


  // Function to handle step change and animation state
  const goToStep = (step: number) => {
    setPreviousStep(currentStep);
    setCurrentStep(step);
  };

  // Determine animation classes based on step change direction
   const getAnimationClasses = (stepId: number): string => {
       // Base classes for positioning and padding within the step container
       const stepClasses = "absolute inset-0 px-6 pb-6 pt-4";
       if (stepId === currentStep && currentStep > previousStep) {
           return `animate-slide-in-from-right ${stepClasses}`;
       }
       if (stepId === currentStep && currentStep < previousStep) {
           return `animate-slide-in-from-left ${stepClasses}`;
       }
       if (stepId === previousStep && currentStep > previousStep) {
            // Important: add 'forwards' to keep the element hidden after animation
            return `animate-slide-out-to-left forwards ${stepClasses}`;
        }
        if (stepId === previousStep && currentStep < previousStep) {
            // Important: add 'forwards' to keep the element hidden after animation
            return `animate-slide-out-to-right forwards ${stepClasses}`;
        }
       // Hide non-active steps
       return stepId === currentStep ? `opacity-100 ${stepClasses}` : `opacity-0 pointer-events-none ${stepClasses}`;
   };


  // Validate current step before proceeding
  const validateStep = async (step: number): Promise<boolean> => {
    let fieldsToValidate: (keyof LoginFormValues)[] = [];
    if (step === 1) {
      fieldsToValidate = ["artistId"];
    } else if (step === 2) {
       fieldsToValidate = ["password"];
    } else if (step === 3) {
        fieldsToValidate = ["verificationCode"];
    }

    const isValid = await form.trigger(fieldsToValidate);
    if (!isValid) {
        const errors = form.formState.errors;
        const firstErrorField = fieldsToValidate.find(field => errors[field]);
        const errorMessage = firstErrorField ? errors[firstErrorField]?.message : "Please check the field before proceeding.";
        toast({ title: "Oops!", description: String(errorMessage), variant: "destructive", duration: 2000 });
    }
    return isValid;
  };

  // Handle "Next" button click
  const handleNext = async () => {
     if (await validateStep(currentStep)) {
         if (currentStep === 1) {
             // Fetch profile after validating email before going to password step
             const email = form.getValues("artistId");
             setIsSubmitting(true); // Show loading indicator while fetching profile
             try {
                 // Prioritize profile by email
                 const profile = await getUserProfileByEmail(email);
                 console.log("Profile fetched in handleNext:", profile);
                 setFetchedProfile(profile); // Store profile for password step display
                 goToStep(currentStep + 1); // Proceed to password step
             } catch (error) {
                 console.error("Error fetching profile by email:", error);
                 // Don't necessarily show a toast here, let the user proceed, handle login failure later
                 setFetchedProfile(null); // Clear profile on error
                 goToStep(currentStep + 1); // Proceed even if profile fetch fails
             } finally {
                 setIsSubmitting(false);
             }
         } else if (currentStep === 2 && !mfaResolver) {
             // If on password step AND not already in MFA flow, trigger the main submit (which might lead to MFA)
             await form.handleSubmit(onSubmit)();
         } else if (currentStep < STEPS.length) {
              // If on MFA step (3) or any intermediate step, just go to next numerical step
              goToStep(currentStep + 1);
         } else {
             // Should ideally not reach here if step 2 triggers onSubmit,
             // but as a fallback, if on the last *defined* step (MFA), trigger MFA verification
             if (currentStep === 3) {
                 await handleVerifyMfaCode();
             }
         }
     }
   };


  // Handle "Previous" button click
  const handlePrevious = () => {
    if (currentStep > 1) {
       // Clear MFA state if going back from MFA step
       if (currentStep === 3) {
          setMfaResolver(null);
          setMfaHints([]);
          setVerificationId(null);
          form.setValue("verificationCode", "");
       }
      goToStep(currentStep - 1);
    }
  };

   // Main form submission handler (primarily for email/password step)
   async function onSubmit(values: LoginFormValues) {
     setIsSubmitting(true);
     // Update splash screen state for login attempt
     setSplashLoadingText("Logging in...");
     // Use fetched profile name/image OR fallback to email
     setSplashUserImageUrl(fetchedProfile?.imageUrl || null);
     setSplashUserName(fetchedProfile?.name || values.artistId.split('@')[0]);
     setShowSplash(true); // Show splash immediately

     try {
       // Call the updated login service function
       const loginResult = await login(values.artistId, values.password);

       if (loginResult && typeof loginResult === 'object' && 'mfaResolver' in loginResult) {
         // MFA is required
         console.log("MFA Required, hints:", loginResult.hints);
         setMfaResolver(loginResult.mfaResolver);
         setMfaHints(loginResult.hints);
         setShowSplash(false); // Hide splash, move to MFA step

         // --- Attempt to automatically send SMS code ---
          const phoneHint = loginResult.hints?.find(hint => hint.factorId === PhoneMultiFactorGenerator.FACTOR_ID);
          if (phoneHint && recaptchaVerifier) {
               const phoneInfoOptions = {
                 multiFactorHint: phoneHint,
                 session: loginResult.mfaResolver.session,
               };
               try {
                 const verId = await sendMfaVerificationCode(loginResult.mfaResolver, phoneInfoOptions, recaptchaVerifier);
                 setVerificationId(verId);
                 console.log("Verification code sent successfully.");
                 goToStep(3); // Move to MFA code entry step
               } catch (sendError) {
                   console.error("Failed to send verification code automatically:", sendError);
                   toast({ title: "MFA Error", description: "Could not send verification code. Please try again.", variant: "destructive" });
                   // Stay on password step or reset state
                   setMfaResolver(null);
                   setMfaHints([]);
                   goToStep(2); // Go back to password step on failure
               }
          } else {
               console.warn("Could not automatically determine phone number or reCAPTCHA not ready for MFA.");
               toast({ title: "MFA Setup Incomplete", description: "Cannot proceed with MFA automatically. Please contact support or check your setup.", variant: "destructive" });
               setMfaResolver(null);
               setMfaHints([]);
               goToStep(2); // Go back to password step
          }
          setIsSubmitting(false); // Stop initial submitting state if MFA is required

       } else if (loginResult && 'uid' in loginResult) {
          // Standard login successful OR MFA already completed implicitly by service/listener
          console.log("LoginForm: Login successful via service.");
          // Splash is already showing, update text
          setSplashLoadingText(`Welcome, ${fetchedProfile?.name || loginResult.email?.split('@')[0]}!`);
          // AuthProvider listener handles redirect after splash duration

          // Let the splash screen show naturally, redirect handled by AuthProvider/middleware
           // No need for setTimeout here

       } else {
            // Handle unexpected login result
            throw new Error("Unexpected login result received.");
       }

     } catch (error) {
       console.error("Login failed:", error);
       setShowSplash(false); // Hide splash on error
       setIsSubmitting(false); // Stop submitting state
       // Reset to password step (step 2) on error for retry
       goToStep(2);
       toast({
         title: "Login Failed",
         description: error instanceof Error ? error.message : "An unknown error occurred.",
         variant: "destructive",
       });
       // Keep fetched profile data available for retry
       // setFetchedProfile(null);
     }
   }

   // --- Implement handleVerifyMfaCode function ---
   const handleVerifyMfaCode = async () => {
      const code = form.getValues("verificationCode");
      if (!mfaResolver || !verificationId || !code || code.length !== 6) {
          toast({ title: "Check Code", description: "Please enter the 6-digit code.", variant: "destructive" });
          return;
      }
      setIsSubmitting(true);
      setSplashLoadingText("Verifying code..."); // Update splash text
      setSplashUserImageUrl(fetchedProfile?.imageUrl || null);
      setSplashUserName(fetchedProfile?.name || form.getValues("artistId").split('@')[0]);
      setShowSplash(true); // Show splash during verification

      try {
          const user = await completeMfaSignIn(mfaResolver, verificationId, code);
          console.log("MFA sign-in successful.");
          // Splash is already showing, update text
          setSplashLoadingText(`Welcome, ${fetchedProfile?.name || user.email?.split('@')[0]}!`);
           // Redirect handled by listener/middleware after splash duration

      } catch (error) {
          toast({ title: "Verification Failed", description: (error as Error).message, variant: "destructive" });
          setIsSubmitting(false);
          setShowSplash(false); // Hide splash on verification error
          // Optionally clear the verification code field
          form.setValue("verificationCode", "");
      }
   };


  // Show Splash Screen if needed
  if (showSplash) {
      return (
         <div className={cn("flex flex-col h-full items-center justify-center", className)}>
             <SplashScreen
                 loadingText={splashLoadingText}
                 userImageUrl={splashUserImageUrl}
                 userName={splashUserName}
                 // Style the splash component itself (no card wrapper needed here)
                 className="bg-transparent border-none shadow-none"
             />
         </div>
      );
  }


  return (
    <div className={cn("flex flex-col h-full", className)}>
      <Form {...form}>
          {/* Container for steps with relative positioning */}
           {/* Increased min-height for content */}
          <div className="relative overflow-hidden flex-grow min-h-[350px]">
             <form
                onSubmit={(e) => e.preventDefault()} // Prevent default, handle via button clicks
                className="h-full" // Ensure form takes full height of container
                aria-live="polite"
             >
                {/* Step 1: Artist ID */}
                 <div className={cn("space-y-4 h-full flex flex-col", getAnimationClasses(1))} aria-hidden={currentStep !== 1}>
                     {/* Header for Step 1 */}
                    <div className="flex flex-col items-center text-center p-6 border-b border-border/30">
                         {/* Logo */}
                         <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 100 100" className="h-20 w-20 mb-3 text-primary"> {/* Slightly smaller */}
                            <defs>
                                <linearGradient id="oxygenGradientLogin" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style={{stopColor: 'hsl(180, 100%, 70%)', stopOpacity: 1}} />
                                <stop offset="50%" style={{stopColor: 'hsl(300, 100%, 80%)', stopOpacity: 1}} />
                                <stop offset="100%" style={{stopColor: 'hsl(35, 100%, 75%)', stopOpacity: 1}} />
                                </linearGradient>
                            </defs>
                            <circle cx="50" cy="50" r="45" fill="none" stroke="url(#oxygenGradientLogin)" strokeWidth="3" />
                            <path d="M30 30 L70 70 M70 30 L30 70" stroke="url(#oxygenGradientLogin)" strokeWidth="10" strokeLinecap="round" fill="none" />
                        </svg>
                        <h3 className="text-xl font-semibold tracking-tight text-primary">Artist Hub Login</h3>
                        <p className="text-muted-foreground text-sm mt-1">Enter your Artist ID (email) to begin.</p>
                    </div>
                     {/* Form Content - Use flex-grow to push footer down */}
                     <div className="flex-grow p-6 space-y-4">
                         {currentStep === 1 && (
                            <FormField
                            control={form.control}
                            name="artistId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="sr-only">Artist ID (Email)</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type="email"
                                                placeholder="your.email@example.com"
                                                autoComplete="email"
                                                {...field}
                                                disabled={isSubmitting}
                                                className="pl-8 text-base"
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                            />
                         )}
                     </div>
                </div>

                {/* Step 2: Password */}
                 <div className={cn("space-y-4 h-full flex flex-col", getAnimationClasses(2))} aria-hidden={currentStep !== 2}>
                      {/* Header for Step 2 */}
                      <div className="flex flex-col items-center text-center p-6 border-b border-border/30">
                            {/* Use fetchedProfile data */}
                            <Avatar className="h-20 w-20 mb-4 border-4 border-primary/50">
                                <AvatarImage src={fetchedProfile?.imageUrl || undefined} alt={fetchedProfile?.name || ''} />
                                <AvatarFallback className="text-3xl bg-muted text-muted-foreground">
                                    {getInitials(fetchedProfile?.name)}
                                </AvatarFallback>
                            </Avatar>
                            <h3 className="text-xl font-semibold tracking-tight text-foreground">
                                {fetchedProfile?.name || form.getValues("artistId").split('@')[0]} {/* Fallback to email part */}
                            </h3>
                      </div>
                      {/* Form Content */}
                      <div className="flex-grow p-6 space-y-4">
                         {currentStep === 2 && (
                            <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="sr-only">Password</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <KeyRound className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type="password"
                                                placeholder="Enter your password"
                                                autoComplete="current-password"
                                                {...field}
                                                disabled={isSubmitting}
                                                className="pl-8 text-base"
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                    <div className="text-right">
                                        <Button
                                            type="button"
                                            variant="link"
                                            className="text-xs text-muted-foreground h-auto p-0"
                                            // onClick={() => setIsForgotPasswordModalOpen(true)} // Add state and modal component later
                                        >
                                            Forgot Password?
                                        </Button>
                                    </div>
                                </FormItem>
                            )}
                            />
                         )}
                     </div>
                </div>

                 {/* Step 3: MFA Code Entry */}
                  <div className={cn("space-y-4 h-full flex flex-col", getAnimationClasses(3))} aria-hidden={currentStep !== 3}>
                      {/* Header for Step 3 */}
                      <div className="flex flex-col items-center text-center p-6 border-b border-border/30">
                          <Phone className="h-16 w-16 mb-4 text-primary" />
                          <h3 className="text-xl font-semibold tracking-tight text-foreground">Two-Factor Authentication</h3>
                          <p className="text-muted-foreground text-sm mt-1">
                               {/* Display last 4 digits or generic message */}
                               Enter the code sent to your registered phone number{mfaHints.length > 0 && mfaHints[0]?.displayName ? ` ending in ${mfaHints[0].displayName.slice(-4)}` : ''}.
                          </p>
                      </div>
                      {/* Form Content */}
                      <div className="flex-grow p-6 space-y-4">
                        {currentStep === 3 && (
                            <FormField
                                control={form.control}
                                name="verificationCode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Verification Code</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="text"
                                                placeholder="6-digit code"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                maxLength={6}
                                                {...field}
                                                disabled={isSubmitting}
                                                className="text-center tracking-[0.5em] text-base" // Style for code input
                                            />
                                        </FormControl>
                                        <FormMessage />
                                        {/* Optionally add a "Resend Code" button */}
                                    </FormItem>
                                )}
                            />
                        )}
                     </div>
                  </div>

                {/* reCAPTCHA Container (must be visible in the DOM when needed for MFA) */}
                 <div id={`recaptcha-container-${Date.now()}`} ref={recaptchaContainerRef} className="my-4 h-0 overflow-hidden"></div>


                {/* Hidden submit for Enter key */}
                <button type="submit" disabled={isSubmitting} style={{ display: 'none' }} aria-hidden="true"></button>
             </form>
          </div>
      </Form>

      {/* Footer with navigation */}
      <div className="flex justify-between items-center mt-auto p-4 h-16 border-t border-border/30">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handlePrevious}
          disabled={currentStep === 1 || isSubmitting}
          className={cn("h-10 w-10", currentStep === 1 && "invisible")} // Hide on first step
          aria-label="Previous Step"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
         <span className="text-xs text-muted-foreground">
             Step {currentStep} of {STEPS.length}
         </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
           // If on MFA step (3), use handleVerifyMfaCode, otherwise handleNext
          onClick={currentStep === 3 ? handleVerifyMfaCode : handleNext}
          disabled={isSubmitting || (currentStep === 3 && (!form.watch("verificationCode") || form.watch("verificationCode")?.length !== 6))} // Disable MFA verify if code invalid
          className={cn("h-10 w-10", isSubmitting && "animate-pulse")}
          aria-label={currentStep === 3 ? "Verify Code" : (currentStep === 2 ? "Login" : "Next Step")} // Adjusted labels
        >
          {isSubmitting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : ( // Show check/submit icon on last step (MFA or Password)
             currentStep === 3 ? <MessageSquare className="h-5 w-5 text-primary" /> : <ArrowRight className="h-5 w-5 text-primary" />
          )}
        </Button>
      </div>

       {/* Forgot Password Modal Placeholder - Needs implementation */}
       {/* <ForgotPasswordModal isOpen={isForgotPasswordModalOpen} onClose={() => setIsForgotPasswordModalOpen(false)} /> */}
    </div>
  );
}

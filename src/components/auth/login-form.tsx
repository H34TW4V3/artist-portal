
"use client";

import React, { useState, useEffect, useRef } from "react"; // Add React import
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { getAuth, type RecaptchaVerifier, PhoneMultiFactorGenerator } from "firebase/auth"; // Import getAuth, PhoneMultiFactorGenerator
import { app } from '@/services/firebase-config'; // Import Firebase config
// Added MailCheck, LogIn icons
import { Loader2, ArrowLeft, ArrowRight, Mail, KeyRound, Phone, MessageSquare, MailCheck, LogIn } from "lucide-react";
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
// Removed profile fetching service from login form
// import { getUserProfileByEmail } from "@/services/user";
// import type { ProfileFormValues } from "@/components/profile/profile-form";
// Import login and MFA functions from auth service, and new email link functions
import {
    login,
    initializeRecaptchaVerifier,
    sendMfaVerificationCode,
    completeMfaSignIn,
    sendSignInLinkToEmail, // Import new service function
    isSignInWithEmailLink,
    signInWithEmailLink,
} from '@/services/auth';
import { SplashScreen } from '@/components/common/splash-screen'; // Import SplashScreen


// Schema updated to make password optional if using email link
const loginSchema = z.object({
  artistId: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().optional(), // Password is now optional
  verificationCode: z.string().optional(), // For MFA step
});

type LoginFormValues = z.infer<typeof loginSchema>;

// Define steps - adjusted based on flow changes
const STEPS = [
  { id: 1, name: "Artist ID", icon: Mail },
  // Step 2 (Choose Method) is shown after email entry
  { id: 2, name: "Choose Method", icon: LogIn },
  { id: 3, name: "Password", icon: KeyRound }, // Only shown if password method chosen
  { id: 4, name: "Verify 2FA Code", icon: MessageSquare }, // MFA Step (Phone only)
  { id: 5, name: "Check Your Email", icon: MailCheck }, // Email Link Sent Step (For chosen email link)
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
  // Removed state related to fetching profile during login
  // const [fetchedProfile, setFetchedProfile] = useState<ProfileFormValues | null>(null);
  const [loginMethod, setLoginMethod] = useState<'password' | 'emailLink' | null>(null); // Track selected login method
  // Removed isPasswordlessEnabled state
  // const [isPasswordlessEnabled, setIsPasswordlessEnabled] = useState<boolean | null>(null);
  const [isProcessingEmailLink, setIsProcessingEmailLink] = useState(false); // State for when verifying email link

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

   // --- Effect to handle email link sign-in ---
   useEffect(() => {
    const processEmailLink = async () => {
        if (isSignInWithEmailLink(window.location.href)) {
            setIsProcessingEmailLink(true);
            setSplashLoadingText("Verifying sign-in link...");
            setShowSplash(true);
            try {
                await signInWithEmailLink(window.location.href);
                // Success! Listener will handle state update and redirect
                setSplashLoadingText("Sign-in successful!");
                // Clear the URL to prevent accidental reuse (optional but recommended)
                window.history.replaceState(null, '', window.location.pathname);
            } catch (error) {
                console.error("Email link sign-in error:", error);
                setShowSplash(false);
                setIsProcessingEmailLink(false);
                toast({
                    title: "Sign-in Link Error",
                    description: error instanceof Error ? error.message : "Could not complete sign-in.",
                    variant: "destructive",
                    duration: 5000,
                });
                // Redirect back to login page without the link params
                router.replace('/login');
            }
            // No finally needed, splash remains until listener redirects
        }
    };
    processEmailLink();
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Function to get initials - Now uses email as primary source if profile not available yet
  const getInitials = (email: string | undefined | null): string => {
      return email?.charAt(0).toUpperCase() || 'U';
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
    if (step === 1) fieldsToValidate = ["artistId"];
    else if (step === 3 && loginMethod === 'password') fieldsToValidate = ["password"]; // Only validate password if chosen
    else if (step === 4) fieldsToValidate = ["verificationCode"]; // MFA step
    // Step 2 (Choose Method) and 5 (Email Sent) don't need form validation

     // Skip validation if no fields required for this step
     if (fieldsToValidate.length === 0) return true;


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
             // After validating email, directly go to Choose Method step
             goToStep(2);
         } else if (currentStep === 2) {
             // Based on loginMethod chosen in Step 2, go to Password (3) or Email Sent (5)
             if (loginMethod === 'password') goToStep(3);
             else if (loginMethod === 'emailLink') await handleSendEmailLink(); // Trigger sending link
             else toast({ title: "Choose Method", description: "Please select a sign-in method.", variant: "destructive" });
         } else if (currentStep === 3 && loginMethod === 'password' && !mfaResolver) {
             // If on password step AND not already in MFA flow, trigger the main submit
             await form.handleSubmit(onSubmit)();
         } else if (currentStep === 4) { // MFA step
             await handleVerifyMfaCode();
         }
         // No action needed for step 5 (Email Sent) - user clicks link in email
     }
   };


  // Handle "Previous" button click
  const handlePrevious = () => {
    // Logic to go back, potentially resetting states like loginMethod or MFA details
    if (currentStep > 1) {
        // Clear MFA state if going back from MFA step (4)
        if (currentStep === 4) {
            setMfaResolver(null);
            setMfaHints([]);
            setVerificationId(null);
            form.setValue("verificationCode", "");
            goToStep(3); // Go back to password step
        } else if (currentStep === 3 || currentStep === 5) { // Updated logic
            // Go back from Password or Email Sent step
            setLoginMethod(null); // Reset method choice
            goToStep(2); // Go back to Choose Method step
        } else if (currentStep === 2) {
            // Go back from Choose Method step
            goToStep(1); // Go back to Artist ID step
        } else {
             goToStep(currentStep - 1); // Default previous step
        }
    }
  };

   // Main form submission handler (for email/password login)
   async function onSubmit(values: LoginFormValues) {
     // Ensure password exists for password login attempt
     if (loginMethod === 'password' && !values.password) {
          toast({ title: "Missing Password", description: "Please enter your password.", variant: "destructive" });
          return;
     }
     setIsSubmitting(true);
     setSplashLoadingText("Logging in...");
     // Set splash details using email before profile is fetched by AuthProvider
     const emailPrefix = values.artistId.split('@')[0];
     setSplashUserName(emailPrefix);
     // Use a default or placeholder image until profile is loaded
     setSplashUserImageUrl(null); // Or a placeholder URL
     setShowSplash(true);

     try {
       const loginResult = await login(values.artistId, values.password!); // Use non-null assertion for password

       if (loginResult && typeof loginResult === 'object' && 'mfaResolver' in loginResult) {
         // MFA is required
         console.log("MFA Required, hints:", loginResult.hints);
         setMfaResolver(loginResult.mfaResolver);
         setMfaHints(loginResult.hints);
         setShowSplash(false);

         // Attempt to automatically send SMS code
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
                 goToStep(4); // Move to MFA code entry step (Step 4)
               } catch (sendError) {
                   console.error("Failed to send verification code automatically:", sendError);
                   toast({ title: "MFA Error", description: "Could not send verification code. Please try again.", variant: "destructive" });
                   setMfaResolver(null); setMfaHints([]); goToStep(3); // Go back to password step on failure
               }
          } else {
               console.warn("Could not automatically determine phone number or reCAPTCHA not ready for MFA.");
               toast({ title: "MFA Setup Incomplete", description: "Cannot proceed with MFA automatically.", variant: "destructive" });
               setMfaResolver(null); setMfaHints([]); goToStep(3); // Go back to password step
          }
          setIsSubmitting(false);

       } else if (loginResult && 'uid' in loginResult) {
          // Standard login successful
          console.log("LoginForm: Login successful via service.");
          setSplashLoadingText(`Welcome, ${emailPrefix}!`); // Use email prefix for welcome message
          // AuthProvider listener handles redirect

       } else {
            throw new Error("Unexpected login result received.");
       }

     } catch (error) {
       console.error("Login failed:", error);
       setShowSplash(false);
       setIsSubmitting(false);
       // Stay on password step (3) on error, or go back to (1) if it was initial step?
       // Keeping it simple: Go back to password entry for password errors.
       goToStep(3);
       toast({
         title: "Login Failed",
         description: error instanceof Error ? error.message : "An unknown error occurred.",
         variant: "destructive",
       });
     }
   }

   // --- Handler for sending email link ---
   const handleSendEmailLink = async () => {
      const email = form.getValues("artistId");
      if (!email) {
          toast({ title: "Missing Email", description: "Please enter your email first.", variant: "destructive" });
          goToStep(1); // Go back if email missing somehow
          return;
      }
      setIsSubmitting(true);
      try {
          // Construct the redirect URL (current base URL)
          const redirectUrl = window.location.origin + window.location.pathname;
          await sendSignInLinkToEmail(email, redirectUrl);
          toast({
              title: "Check Your Email!",
              description: `A sign-in link has been sent to ${email}.`,
              duration: 5000,
          });
          goToStep(5); // Move to "Email Sent" confirmation step
      } catch (error) {
          console.error("Error sending email link:", error);
          toast({
              title: "Email Link Failed",
              description: error instanceof Error ? error.message : "Could not send sign-in link.",
              variant: "destructive",
          });
      } finally {
          setIsSubmitting(false);
      }
   };


   // --- Implement handleVerifyMfaCode function ---
   const handleVerifyMfaCode = async () => {
      const code = form.getValues("verificationCode");
      if (!mfaResolver || !verificationId || !code || code.length !== 6) {
          toast({ title: "Check Code", description: "Please enter the 6-digit code.", variant: "destructive" });
          return;
      }
      setIsSubmitting(true);
      setSplashLoadingText("Verifying code...");
       // Use email prefix for splash screen
       const emailPrefix = form.getValues("artistId").split('@')[0];
       setSplashUserName(emailPrefix);
       setSplashUserImageUrl(null); // Placeholder image
      setShowSplash(true);

      try {
          const user = await completeMfaSignIn(mfaResolver, verificationId, code);
          console.log("MFA sign-in successful.");
          setSplashLoadingText(`Welcome, ${emailPrefix}!`);
           // Redirect handled by listener

      } catch (error) {
          toast({ title: "Verification Failed", description: (error as Error).message, variant: "destructive" });
          setIsSubmitting(false);
          setShowSplash(false);
          form.setValue("verificationCode", "");
      }
   };


  // Show Splash Screen if needed (during login/MFA submission or link processing)
  if (showSplash || isProcessingEmailLink) {
      return (
         <div className={cn("flex flex-col h-full items-center justify-center", className)}>
             <SplashScreen
                 loadingText={splashLoadingText}
                 userImageUrl={splashUserImageUrl}
                 userName={splashUserName}
                 className="bg-transparent border-none shadow-none"
             />
         </div>
      );
  }


  return (
    <div className={cn("flex flex-col h-full", className)}>
      <Form {...form}>
           <div className="relative overflow-hidden flex-grow min-h-[350px]">
             <form
                onSubmit={(e) => {
                     e.preventDefault(); // Prevent default submit
                     handleNext(); // Call validation/step logic
                 }}
                className="h-full"
                aria-live="polite"
             >
                {/* Step 1: Artist ID */}
                 <div className={cn("space-y-4 h-full flex flex-col", getAnimationClasses(1))} aria-hidden={currentStep !== 1}>
                    <div className="flex flex-col items-center text-center p-6 border-b border-border/30">
                         <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 100 100" className="h-20 w-20 mb-3 text-primary">
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
                     <div className="flex-grow p-6 space-y-4">
                         {currentStep === 1 && (
                            <FormField control={form.control} name="artistId" render={({ field }) => ( <FormItem><FormLabel className="sr-only">Artist ID (Email)</FormLabel><FormControl><div className="relative"><Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="email" placeholder="your.email@example.com" autoComplete="email" {...field} disabled={isSubmitting} className="pl-8 text-base"/></div></FormControl><FormMessage /></FormItem> )} />
                         )}
                     </div>
                </div>

                {/* Step 2: Choose Method */}
                <div className={cn("space-y-4 h-full flex flex-col items-center", getAnimationClasses(2))} aria-hidden={currentStep !== 2}>
                   {currentStep === 2 && ( // Conditionally render
                       <>
                           <div className="flex flex-col items-center text-center p-6 border-b border-border/30 w-full">
                               <LogIn className="h-16 w-16 mb-4 text-primary" />
                               <h3 className="text-xl font-semibold tracking-tight text-foreground">How would you like to sign in?</h3>
                               <p className="text-muted-foreground text-sm mt-1">Choose your preferred method below.</p>
                           </div>
                           <div className="flex-grow p-6 space-y-4 w-full flex flex-col items-center justify-center">
                               <Button
                                   type="button"
                                   variant={loginMethod === 'password' ? 'default' : 'outline'}
                                   size="lg"
                                   className="w-full sm:w-3/4 justify-start"
                                   onClick={() => setLoginMethod('password')}
                                   disabled={isSubmitting}
                               >
                                   <KeyRound className="mr-3 h-5 w-5" /> Sign in with Password
                               </Button>
                               <Button
                                   type="button"
                                   variant={loginMethod === 'emailLink' ? 'default' : 'outline'}
                                   size="lg"
                                   className="w-full sm:w-3/4 justify-start"
                                   onClick={() => setLoginMethod('emailLink')}
                                   disabled={isSubmitting}
                               >
                                   <MailCheck className="mr-3 h-5 w-5" /> Email me a sign-in link
                               </Button>
                           </div>
                       </>
                   )}
                </div>


                {/* Step 3: Password */}
                 <div className={cn("space-y-4 h-full flex flex-col", getAnimationClasses(3))} aria-hidden={currentStep !== 3}>
                      {currentStep === 3 && loginMethod === 'password' && ( // Show only if password method chosen
                          <>
                              <div className="flex flex-col items-center text-center p-6 border-b border-border/30">
                                   {/* Use email for Avatar fallback before profile is loaded */}
                                   <Avatar className="h-20 w-20 mb-4 border-4 border-primary/50">
                                        {/* Keep AvatarImage attempt, it might load from cache */}
                                        {/* <AvatarImage src={fetchedProfile?.imageUrl || undefined} alt={form.getValues("artistId").split('@')[0]} /> */}
                                        <AvatarFallback className="text-3xl bg-muted text-muted-foreground">
                                            {getInitials(form.getValues("artistId"))}
                                        </AvatarFallback>
                                    </Avatar>
                                    <h3 className="text-xl font-semibold tracking-tight text-foreground">
                                         {/* Display email prefix before profile loads */}
                                         {form.getValues("artistId").split('@')[0]}
                                    </h3>
                              </div>
                              <div className="flex-grow p-6 space-y-4">
                                    <FormField control={form.control} name="password" render={({ field }) => ( <FormItem><FormLabel className="sr-only">Password</FormLabel><FormControl><div className="relative"><KeyRound className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="password" placeholder="Enter your password" autoComplete="current-password" {...field} disabled={isSubmitting} className="pl-8 text-base"/></div></FormControl><FormMessage /><div className="text-right"><Button type="button" variant="link" className="text-xs text-muted-foreground h-auto p-0" /* onClick={() => setIsForgotPasswordModalOpen(true)} */>Forgot Password?</Button></div></FormItem> )} />
                              </div>
                         </>
                      )}
                </div>

                 {/* Step 4: MFA Code Entry (2FA via Phone) */}
                  <div className={cn("space-y-4 h-full flex flex-col", getAnimationClasses(4))} aria-hidden={currentStep !== 4}>
                      {currentStep === 4 && ( // Ensure this is step 4
                          <>
                              <div className="flex flex-col items-center text-center p-6 border-b border-border/30">
                                  <Phone className="h-16 w-16 mb-4 text-primary" />
                                  <h3 className="text-xl font-semibold tracking-tight text-foreground">Two-Factor Authentication</h3>
                                  <p className="text-muted-foreground text-sm mt-1">
                                       Enter the code sent to your registered phone number{mfaHints.length > 0 && mfaHints[0]?.displayName ? ` ending in ${mfaHints[0].displayName.slice(-4)}` : ''}.
                                  </p>
                              </div>
                              <div className="flex-grow p-6 space-y-4">
                                    <FormField control={form.control} name="verificationCode" render={({ field }) => ( <FormItem><FormLabel>Verification Code</FormLabel><FormControl><Input type="text" placeholder="6-digit code" inputMode="numeric" pattern="[0-9]*" maxLength={6} {...field} disabled={isSubmitting} className="text-center tracking-[0.5em] text-base"/> </FormControl><FormMessage /></FormItem> )} />
                              </div>
                              {/* Removed option to resend via email here, as MFA is phone-based */}
                         </>
                     )}
                  </div>

                {/* Step 5: Email Link Sent Confirmation */}
                <div className={cn("space-y-4 h-full flex flex-col items-center justify-center text-center", getAnimationClasses(5))} aria-hidden={currentStep !== 5}>
                    {currentStep === 5 && ( // Conditionally render the content for step 5
                        <>
                            <MailCheck className="h-20 w-20 mb-6 text-green-500" />
                            <h3 className="text-xl font-semibold tracking-tight text-foreground">Check Your Inbox!</h3>
                            <p className="text-muted-foreground text-sm max-w-xs">
                                We've sent a secure sign-in link to <span className="font-medium text-foreground">{form.getValues("artistId")}</span>. Click the link in the email to complete your sign-in.
                            </p>
                            <p className="text-xs text-muted-foreground mt-4">(You can close this window)</p>
                        </>
                     )}
                </div>


                {/* reCAPTCHA Container */}
                 <div id={`recaptcha-container-${Date.now()}`} ref={recaptchaContainerRef} className="my-4 h-0 overflow-hidden"></div>


                {/* Hidden submit for Enter key */}
                <button type="submit" disabled={isSubmitting} style={{ display: 'none' }} aria-hidden="true"></button>
             </form>
          </div>
      </Form>

      {/* Footer with navigation */}
       {/* Hide footer on email sent confirmation step */}
       {currentStep !== 5 && (
        <div className="flex justify-between items-center mt-auto p-4 h-16 border-t border-border/30">
            <Button type="button" variant="ghost" size="icon" onClick={handlePrevious} disabled={currentStep === 1 || isSubmitting} className={cn("h-10 w-10", currentStep === 1 && "invisible")} aria-label="Previous Step">
                <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className="text-xs text-muted-foreground">
                 {/* Simple step count */}
                Step {currentStep} of {STEPS.length - (loginMethod === 'emailLink' ? 1 : 0)} {/* Adjust total based on flow */}
            </span>
            <Button type="button" variant="ghost" size="icon" onClick={handleNext} disabled={isSubmitting || (currentStep === 2 && !loginMethod) || (currentStep === 4 && (!form.watch("verificationCode") || form.watch("verificationCode")?.length !== 6))} className={cn("h-10 w-10", isSubmitting && "animate-pulse")} aria-label={currentStep === 4 ? "Verify Code" : (currentStep === 3 ? "Login" : "Next Step")}>
                {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                 (currentStep === 3 || currentStep === 4) ? <LogIn className="h-5 w-5 text-primary" /> : <ArrowRight className="h-5 w-5 text-primary" />
                )}
            </Button>
        </div>
       )}
    </div>
  );
}

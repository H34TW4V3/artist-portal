
"use client";

import React, { useState, useEffect, useRef } from "react"; // Add React import
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { getAuth, type RecaptchaVerifier, PhoneMultiFactorGenerator, reload } from "firebase/auth"; // Import reload
import { app } from '@/services/firebase-config'; // Import Firebase config
// Added MailCheck, LogIn, RefreshCcw icons
// Added ListChecks for Choose Method step
import { Loader2, ArrowLeft, ArrowRight, Mail, KeyRound, Phone, MessageSquare, MailCheck, LogIn, RefreshCcw, AlertCircle, ListChecks } from "lucide-react";
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
// Import getUserProfileByUid and getUserProfileByEmail directly from user service
import { getUserProfileByUid, getUserProfileByEmail } from "@/services/user"; // Corrected import
import type { ProfileFormValues } from "@/components/profile/profile-form"; // Import profile type
// Import login and MFA functions from auth service, and new email link functions
import {
    login,
    initializeRecaptchaVerifier,
    sendMfaVerificationCode,
    completeMfaSignIn,
    sendSignInLinkToEmail, // Import new service function
    isSignInWithEmailLink,
    signInWithEmailLink,
    sendVerificationEmail, // Import sendVerificationEmail
} from '@/services/auth';
import { SplashScreen } from '@/components/common/splash-screen'; // Import SplashScreen
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Import Alert


// Schema updated to make password optional if using email link
const loginSchema = z.object({
  artistId: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().optional(), // Password is now optional
  verificationCode: z.string().optional(), // For MFA step
});

type LoginFormValues = z.infer<typeof loginSchema>;

// Define steps - Adjusted based on flow changes (Added step 4, renumbered others)
const STEPS = [
  { id: 1, name: "Artist ID", icon: Mail },
  { id: 2, name: "Choose Method", icon: LogIn },
  { id: 3, name: "Password", icon: KeyRound }, // Only shown if password method chosen
  { id: 4, name: "Choose Verification", icon: ListChecks }, // New Step: Choose MFA method if required
  { id: 5, name: "Verify 2FA Code", icon: MessageSquare }, // MFA Step (Phone only) - Now Step 5
  { id: 6, name: "Check Your Email", icon: MailCheck }, // Email Link Sent Step - Now Step 6
  { id: 7, name: "Verify Your Email", icon: MailCheck }, // Email Verification Step - Now Step 7
];

// Define the component
export function LoginForm({ className }: { className?: string }) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false); // Define isSubmitting state
  const [currentStep, setCurrentStep] = useState(1);
  const [previousStep, setPreviousStep] = useState(1);
  const [showSplash, setShowSplash] = useState(false); // State for splash screen visibility
  const [splashLoadingText, setSplashLoadingText] = useState("Logging in..."); // Text for splash
  const [splashUserImageUrl, setSplashUserImageUrl] = useState<string | null>(null); // Image for splash
  const [splashUserName, setSplashUserName] = useState<string | null>(null); // Name for splash
  const [fetchedProfile, setFetchedProfile] = useState<ProfileFormValues | null>(null);
  const [fetchedUid, setFetchedUid] = useState<string | null>(null);
  const [loginMethod, setLoginMethod] = useState<'password' | 'emailLink' | null>(null); // Track selected login method
  const [isProcessingEmailLink, setIsProcessingEmailLink] = useState(false); // State for when verifying email link
  const [unverifiedUser, setUnverifiedUser] = useState<any | null>(null); // Store user object if verification needed

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
     // Ensure this runs client-side and container exists
     if (typeof window !== 'undefined' && recaptchaContainerRef.current && !recaptchaVerifier) {
         const containerId = `recaptcha-container-${Date.now()}`; // Generate unique ID
         recaptchaContainerRef.current.id = containerId; // Assign the unique ID
         console.log(`Preparing to initialize reCAPTCHA on container: ${containerId}`);
         try {
             const verifier = initializeRecaptchaVerifier(containerId);
             setRecaptchaVerifier(verifier);
             console.log(`reCAPTCHA Initialized successfully on container: ${containerId}`);
         } catch (error) {
             console.error(`Failed to initialize reCAPTCHA on container ${containerId}:`, error);
             toast({ title: "Security Check Error", description: "Could not initialize security check. Please refresh.", variant: "destructive" });
         }
     }
     // Cleanup function to clear the verifier instance when component unmounts
     return () => {
          if (recaptchaVerifier) {
            try {
               recaptchaVerifier.clear(); // Clear the instance associated with the old container
               console.log("Cleared reCAPTCHA verifier on unmount.");
            } catch (e) {
               console.warn("Could not clear reCAPTCHA on unmount:", e)
            }
            setRecaptchaVerifier(null); // Reset state
          }
     };
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []); // Run only once on mount


   // --- Effect to handle email link sign-in ---
   useEffect(() => {
    const processEmailLink = async () => {
        if (isSignInWithEmailLink(window.location.href)) {
            setIsProcessingEmailLink(true);
            setSplashLoadingText("Verifying sign-in link...");
            setShowSplash(true);
            try {
                const user = await signInWithEmailLink(window.location.href);
                // Fetch profile after successful link sign-in using UID
                if (user.uid) {
                     try {
                        // Use UID to fetch profile
                        const profile = await getUserProfileByUid(user.uid);
                        setFetchedProfile(profile); // Store fetched profile
                        setFetchedUid(user.uid);    // Store UID
                        setSplashUserName(profile?.name || user.email?.split('@')[0] || 'User');
                        setSplashUserImageUrl(profile?.imageUrl || user.photoURL || null);
                     } catch (profileError) {
                         console.error("Error fetching profile after email link sign-in:", profileError);
                         // Use auth details as fallback
                         setSplashUserName(user.email?.split('@')[0] || 'User');
                         setSplashUserImageUrl(user.photoURL || null);
                         setFetchedUid(user.uid); // Still store UID
                     }
                }
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


  // Function to get initials for avatar fallback
  const getInitials = (): string => {
      const name = fetchedProfile?.name;
      if (name) {
          return name.split(' ').map(n => n[0]).join('').toUpperCase();
      }
      const email = form.getValues("artistId");
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
    else if (step === 5) fieldsToValidate = ["verificationCode"]; // MFA code entry step
    // Steps 2 (Choose Method), 4 (Choose Verification), 6 (Email Sent), 7 (Verify Email) don't need form validation

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

   // Function to fetch user profile *before* proceeding to password step
   const fetchProfileForPasswordStep = async () => {
       const email = form.getValues("artistId");
       if (!email) {
           toast({ title: "Missing Email", description: "Please enter your email first.", variant: "destructive" });
           goToStep(1); // Go back if email missing
           return false;
       }
       setIsSubmitting(true); // Show loading indicator
       setSplashLoadingText("Checking profile...");
       // No splash screen here, just loading state on buttons maybe
       // setShowSplash(true);

       try {
           // We need UID. Try fetching UID from Firestore using email query.
           const userDoc = await getUserProfileByEmail(email); // Fetch from user service
           if (!userDoc || !userDoc.uid) {
                throw new Error("User not found."); // Or a more specific error based on rules
           }
           const uid = userDoc.uid;
           console.log("fetchProfileForPasswordStep: Found UID:", uid);

           // Now fetch the profile data using the UID
           const profileData = await getUserProfileByUid(uid);
           console.log("fetchProfileForPasswordStep: Fetched profile data:", profileData);


           if (profileData) {
               setFetchedProfile(profileData);
               setFetchedUid(uid); // Store UID
               // setShowSplash(false); // Hide splash on success
               setIsSubmitting(false);
               return true; // Profile fetched successfully
           } else {
               // If profile fetch fails (user not found, rules issue), treat as login failure for password path
               throw new Error("Profile not found or inaccessible.");
           }
       } catch (error) {
           console.error("Error fetching profile before password step:", error);
           // setShowSplash(false); // Hide splash on error
           setIsSubmitting(false);
           toast({
               title: "Profile Check Failed",
                // Use error message if available, otherwise generic
               description: error instanceof Error ? error.message : "Could not verify profile information.",
               variant: "destructive",
           });
           return false; // Indicate failure
       }
   };


  // Handle "Next" button click
  const handleNext = async () => {
     if (await validateStep(currentStep)) {
         if (currentStep === 1) {
             goToStep(2); // To Choose Method
         } else if (currentStep === 2) {
             if (loginMethod === 'password') {
                  const profileFetched = await fetchProfileForPasswordStep();
                  if (profileFetched) goToStep(3); // To Password
             }
             else if (loginMethod === 'emailLink') await handleSendEmailLink(); // Sends link, goes to step 6
             else toast({ title: "Choose Method", description: "Please select a sign-in method.", variant: "destructive" });
         } else if (currentStep === 3 && loginMethod === 'password') {
             await form.handleSubmit(onSubmit)(); // Submit login attempt
         } else if (currentStep === 4) {
             // Step 4 now requires action (Send SMS/Email Link), handled by button clicks
             toast({ title: "Choose Verification", description: "Please select how to verify.", variant: "default" });
         } else if (currentStep === 5) { // MFA code entry step
             await handleVerifyMfaCode();
         }
         // Step 6 (Email Sent confirmation) has no "Next"
         // Step 7 (Verify Email) handled separately
     }
   };

  // Handle "Previous" button click
  const handlePrevious = () => {
    // Logic to go back, potentially resetting states like loginMethod or MFA details
    if (currentStep > 1) {
        // Clear MFA state if going back from MFA code entry (5) or Choose Verification (4)
        if (currentStep === 5 || currentStep === 4) {
            setMfaResolver(null);
            setMfaHints([]);
            setVerificationId(null);
            form.setValue("verificationCode", "");
            goToStep(3); // Go back to password step
        } else if (currentStep === 7) { // Going back from Email Verification step
             setUnverifiedUser(null); // Clear the unverified user state
             goToStep(3); // Go back to password step
        } else if (currentStep === 3 || currentStep === 6) { // Updated logic (step 5 -> 6)
            // Go back from Password or Email Sent step
            setLoginMethod(null); // Reset method choice
            setFetchedProfile(null); // Clear profile data fetched for step 3
            setFetchedUid(null);     // Clear UID
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
      // Use fetched profile data for splash screen if available
      setSplashUserName(fetchedProfile?.name || values.artistId.split('@')[0]);
      setSplashUserImageUrl(fetchedProfile?.imageUrl || null);
      setShowSplash(true); // Show splash screen

     try {
       // Use non-null assertion for password since we checked it above
       const loginResult = await login(values.artistId, values.password!);

       if (loginResult && typeof loginResult === 'object' && 'mfaResolver' in loginResult) {
         // MFA is required
         console.log("MFA Required, hints:", loginResult.hints);
         setMfaResolver(loginResult.mfaResolver);
         setMfaHints(loginResult.hints);
         setShowSplash(false); // Hide splash for MFA selection step
         goToStep(4); // Go to Choose Verification step (Step 4)
         setIsSubmitting(false); // Allow interaction on verification selection step

       } else if (loginResult && 'uid' in loginResult) {
          // Standard login successful
          const user = loginResult;

           // --- Check Email Verification ---
           if (!user.emailVerified) {
               console.log("Login successful, but email not verified. Sending verification email...");
               setUnverifiedUser(user); // Store user object
               try {
                   await sendVerificationEmail();
                   toast({ title: "Verification Required", description: `A verification link has been sent to ${user.email}. Please check your inbox and click the link.`, duration: 7000 });
               } catch (verificationError) {
                    toast({ title: "Verification Error", description: "Could not send verification email. Please try resending.", variant: "destructive" });
               }
               setShowSplash(false); // Hide splash for verification step
               goToStep(7); // Go to email verification step (Step 7)
               setIsSubmitting(false); // Allow interaction on verification step
               return; // Stop further processing until verified
           }

          // --- Email Verified - Proceed with Splash ---
          console.log("LoginForm: Login successful via service. User UID:", user.uid);
           // Update splash text with fetched name if available
           setSplashLoadingText(`Welcome, ${fetchedProfile?.name || user.email?.split('@')[0]}!`);
           // Splash remains visible, AuthProvider listener handles redirect.
           // setIsSubmitting(false); // No need to set here, splash is showing

       } else {
            throw new Error("Unexpected login result received.");
       }

     } catch (error) {
       console.error("Login failed:", error);
       setShowSplash(false); // Hide splash on error
       setIsSubmitting(false);
       // Stay on password step (3) on error
       toast({
         title: "Login Failed",
         description: error instanceof Error ? error.message : "An unknown error occurred.",
         variant: "destructive",
       });
     }
   }

   // --- Handler for sending MFA SMS code ---
   const handleSendSmsCode = async () => {
      if (!mfaResolver || !recaptchaVerifier) {
          toast({ title: "Error", description: "MFA process not ready or security check failed.", variant: "destructive" });
          return;
      }
      const phoneHint = mfaHints.find(hint => hint.factorId === PhoneMultiFactorGenerator.FACTOR_ID);
       if (!phoneHint) {
           toast({ title: "Error", description: "No phone number registered for 2FA.", variant: "destructive" });
           return;
       }

       setIsSubmitting(true);
       setSplashLoadingText("Sending SMS code...");
       setShowSplash(true); // Show splash while sending

       try {
            const phoneInfoOptions = {
                 multiFactorHint: phoneHint,
                 session: mfaResolver.session,
            };
            const verId = await sendMfaVerificationCode(mfaResolver, phoneInfoOptions, recaptchaVerifier);
            setVerificationId(verId);
            console.log("Verification code sent successfully via SMS.");
            setShowSplash(false);
            goToStep(5); // Move to MFA code entry step (Step 5)
       } catch (sendError) {
            console.error("Failed to send verification code via SMS:", sendError);
            toast({ title: "MFA Error", description: "Could not send SMS verification code.", variant: "destructive" });
            setShowSplash(false);
            // Stay on step 4
       } finally {
            setIsSubmitting(false);
       }
   }

   // --- Handler for sending MFA Email Link ---
    const handleSendMfaEmailLink = async () => {
        if (!mfaResolver) {
            toast({ title: "Error", description: "MFA process not ready.", variant: "destructive" });
            return;
        }
        const email = form.getValues("artistId");
        if (!email) {
             toast({ title: "Error", description: "Email address not found.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        setSplashLoadingText("Sending email verification link...");
        setShowSplash(true);

        try {
            // Construct the redirect URL (current base URL) - important for email link verification
            const redirectUrl = window.location.origin + window.location.pathname;
            await sendSignInLinkToEmail(email, redirectUrl); // Re-use existing function

            setShowSplash(false);
            toast({
                title: "Check Your Email!",
                description: `A sign-in verification link has been sent to ${email}. Click it to complete login.`,
                duration: 7000,
            });
            goToStep(6); // Move to "Check Your Email" confirmation step (Step 6)
        } catch (error) {
            setShowSplash(false);
            console.error("Error sending MFA email link:", error);
            toast({ title: "Email Link Failed", description: "Could not send verification link.", variant: "destructive" });
            // Stay on step 4
        } finally {
            setIsSubmitting(false);
        }
    };


   // --- Handler for checking email verification status ---
   const handleCheckVerification = async () => {
       if (!unverifiedUser) return;
       setIsSubmitting(true); // Show loading
        setSplashLoadingText("Checking email verification...");
        setShowSplash(true); // Show splash while checking

       try {
           await reload(unverifiedUser); // Reload user data from Firebase
           // Must re-get the user object after reload to see the updated emailVerified status
           const refreshedUser = getAuth(app).currentUser;
           if (refreshedUser?.emailVerified) {
               // Verification successful! Proceed with splash/redirect
               setUnverifiedUser(null); // Clear state
               toast({ title: "Email Verified!", variant: "default" });
                // Use fetched profile data for splash if available
                setSplashUserName(fetchedProfile?.name || refreshedUser.email?.split('@')[0] || 'User');
                setSplashUserImageUrl(fetchedProfile?.imageUrl || refreshedUser.photoURL || null);
               setSplashLoadingText(`Welcome, ${splashUserName}!`);
               // Splash stays visible, listener will redirect
           } else {
               setShowSplash(false); // Hide splash if still not verified
               toast({ title: "Still Waiting", description: "Email not verified yet. Please check your inbox and click the link.", variant: "default" });
           }
       } catch (error) {
            setShowSplash(false); // Hide splash on error
            toast({ title: "Verification Check Failed", description: "Could not check verification status. Please try again.", variant: "destructive" });
       } finally {
           setIsSubmitting(false);
       }
   };

   // --- Handler for resending verification email ---
   const handleResendVerification = async () => {
       if (!unverifiedUser) return;
        setIsSubmitting(true);
        try {
            await sendVerificationEmail();
            toast({ title: "Verification Email Resent", description: `Check ${unverifiedUser.email} for the link.`, duration: 5000 });
        } catch (error: any) {
            toast({ title: "Resend Failed", description: error.message || "Could not resend verification email.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };


   // --- Handler for sending email link (initial login choice) ---
   const handleSendEmailLink = async () => {
      const email = form.getValues("artistId");
      if (!email) {
          toast({ title: "Missing Email", description: "Please enter your email first.", variant: "destructive" });
          goToStep(1); // Go back if email missing somehow
          return;
      }
      setIsSubmitting(true);
      setSplashLoadingText("Sending sign-in link...");
       // Use email for splash initially
       setSplashUserName(email.split('@')[0]);
       setSplashUserImageUrl(null);
       setShowSplash(true); // Show splash while sending link


      try {
          // Construct the redirect URL (current base URL)
          const redirectUrl = window.location.origin + window.location.pathname;
          await sendSignInLinkToEmail(email, redirectUrl);
          setShowSplash(false); // Hide splash after sending
          toast({
              title: "Check Your Email!",
              description: `A sign-in link has been sent to ${email}.`,
              duration: 5000,
          });
          goToStep(6); // Move to "Email Sent" confirmation step (Step 6)
      } catch (error) {
          setShowSplash(false); // Hide splash on error
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
       // Use fetched profile data for splash if available
       setSplashUserName(fetchedProfile?.name || 'User');
       setSplashUserImageUrl(fetchedProfile?.imageUrl || null);
      setShowSplash(true);

      try {
          const user = await completeMfaSignIn(mfaResolver, verificationId, code);
          console.log("MFA sign-in successful. User UID:", user.uid);
           setSplashLoadingText(`Welcome, ${splashUserName}!`);
           // Splash stays, Redirect handled by listener

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
         // Show splash centered within the card area
         <div className={cn("flex flex-col h-full items-center justify-center", className)}>
             <SplashScreen
                 loadingText={splashLoadingText}
                 userImageUrl={splashUserImageUrl}
                 userName={splashUserName}
                 className="bg-transparent border-none shadow-none p-0" // Remove card styling from splash itself
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
                      {currentStep === 3 && loginMethod === 'password' && fetchedProfile && ( // Show only if password method chosen AND profile fetched
                          <>
                              <div className="flex flex-col items-center text-center p-6 border-b border-border/30">
                                   {/* Display avatar and name using fetchedProfile */}
                                   <Avatar className="h-20 w-20 mb-4 border-4 border-primary/50">
                                       <AvatarImage src={fetchedProfile.imageUrl || undefined} alt={fetchedProfile.name || ''} />
                                       <AvatarFallback className="text-3xl bg-muted text-muted-foreground">
                                           {getInitials()}
                                       </AvatarFallback>
                                   </Avatar>
                                   <h3 className="text-xl font-semibold tracking-tight text-foreground">
                                       {fetchedProfile.name} {/* Show profile name */}
                                   </h3>
                              </div>
                              <div className="flex-grow p-6 space-y-4">
                                    <FormField control={form.control} name="password" render={({ field }) => ( <FormItem><FormLabel className="sr-only">Password</FormLabel><FormControl><div className="relative"><KeyRound className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="password" placeholder="Enter your password" autoComplete="current-password" {...field} disabled={isSubmitting} className="pl-8 text-base"/></div></FormControl><FormMessage /><div className="text-right"><Button type="button" variant="link" className="text-xs text-muted-foreground h-auto p-0" /* onClick={() => setIsForgotPasswordModalOpen(true)} */>Forgot Password?</Button></div></FormItem> )} />
                              </div>
                         </>
                      )}
                       {/* Optional: Show a loader or message if profile is being fetched */}
                        {currentStep === 3 && loginMethod === 'password' && !fetchedProfile && isSubmitting && (
                            <div className="flex justify-center items-center h-full">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        )}
                </div>

                {/* Step 4: Choose MFA Verification Method */}
                <div className={cn("space-y-4 h-full flex flex-col items-center", getAnimationClasses(4))} aria-hidden={currentStep !== 4}>
                     {currentStep === 4 && mfaResolver && (
                         <>
                              <div className="flex flex-col items-center text-center p-6 border-b border-border/30 w-full">
                                   <ListChecks className="h-16 w-16 mb-4 text-primary" />
                                   <h3 className="text-xl font-semibold tracking-tight text-foreground">Two-Factor Verification Required</h3>
                                   <p className="text-muted-foreground text-sm mt-1">Choose how you'd like to verify your identity.</p>
                              </div>
                              <div className="flex-grow p-6 space-y-4 w-full flex flex-col items-center justify-center">
                                   {/* Show SMS option only if a phone hint exists */}
                                   {mfaHints.some(hint => hint.factorId === PhoneMultiFactorGenerator.FACTOR_ID) && (
                                       <Button
                                            type="button"
                                            variant="outline"
                                            size="lg"
                                            className="w-full sm:w-3/4 justify-start"
                                            onClick={handleSendSmsCode}
                                            disabled={isSubmitting || !recaptchaVerifier} // Need recaptcha for SMS
                                       >
                                            <Phone className="mr-3 h-5 w-5" /> Send code via SMS
                                       </Button>
                                   )}
                                   {/* Always show Email Link option (as fallback or primary) */}
                                   <Button
                                        type="button"
                                        variant="outline"
                                        size="lg"
                                        className="w-full sm:w-3/4 justify-start"
                                        onClick={handleSendMfaEmailLink}
                                        disabled={isSubmitting}
                                   >
                                        <MailCheck className="mr-3 h-5 w-5" /> Send code via Email Link
                                   </Button>
                                     {/* reCAPTCHA Container (needed for SMS) */}
                                     <div ref={recaptchaContainerRef} className="my-2 flex justify-center"></div>
                              </div>
                         </>
                     )}
                 </div>


                 {/* Step 5: MFA Code Entry (2FA via Phone) - Renumbered */}
                  <div className={cn("space-y-4 h-full flex flex-col", getAnimationClasses(5))} aria-hidden={currentStep !== 5}>
                      {currentStep === 5 && ( // Ensure this is step 5
                          <>
                              <div className="flex flex-col items-center text-center p-6 border-b border-border/30">
                                  <Phone className="h-16 w-16 mb-4 text-primary" />
                                  <h3 className="text-xl font-semibold tracking-tight text-foreground">Check Your Phone</h3>
                                  <p className="text-muted-foreground text-sm mt-1">
                                       Enter the 6-digit code sent to your registered phone number{mfaHints.length > 0 && mfaHints.find(h => h.factorId === PhoneMultiFactorGenerator.FACTOR_ID)?.displayName ? ` ending in ${mfaHints.find(h => h.factorId === PhoneMultiFactorGenerator.FACTOR_ID)!.displayName!.slice(-4)}` : ''}.
                                  </p>
                              </div>
                              <div className="flex-grow p-6 space-y-4">
                                    <FormField control={form.control} name="verificationCode" render={({ field }) => ( <FormItem><FormLabel>Verification Code</FormLabel><FormControl><Input type="text" placeholder="6-digit code" inputMode="numeric" pattern="[0-9]*" maxLength={6} {...field} disabled={isSubmitting} className="text-center tracking-[0.5em] text-base"/> </FormControl><FormMessage /></FormItem> )} />
                              </div>
                         </>
                     )}
                  </div>

                {/* Step 6: Email Link Sent Confirmation - Renumbered */}
                <div className={cn("space-y-4 h-full flex flex-col items-center justify-center text-center", getAnimationClasses(6))} aria-hidden={currentStep !== 6}>
                    {currentStep === 6 && ( // Conditionally render the content for step 6
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

                 {/* Step 7: Verify Email Address - Renumbered */}
                 <div className={cn("space-y-4 h-full flex flex-col items-center justify-center text-center", getAnimationClasses(7))} aria-hidden={currentStep !== 7}>
                     {currentStep === 7 && unverifiedUser && (
                         <>
                             <MailCheck className="h-20 w-20 mb-6 text-primary" />
                             <h3 className="text-xl font-semibold tracking-tight text-foreground">Verify Your Email</h3>
                             <Alert variant="info" className="text-left max-w-xs mx-auto">
                                 <AlertCircle className="h-4 w-4" />
                                 <AlertTitle>Action Required</AlertTitle>
                                 <AlertDescription className="text-xs">
                                     A verification link was sent to <span className="font-medium">{unverifiedUser.email}</span>.
                                     Please click the link in the email, then click "Check Verification" below.
                                 </AlertDescription>
                             </Alert>
                              <Button
                                 type="button"
                                 onClick={handleCheckVerification}
                                 disabled={isSubmitting}
                                 className="mt-4"
                             >
                                 {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                 Check Verification
                             </Button>
                             <Button
                                 type="button"
                                 variant="link"
                                 onClick={handleResendVerification}
                                 disabled={isSubmitting}
                                 className="text-xs text-muted-foreground h-auto p-0 mt-2"
                             >
                                 {isSubmitting && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                                 Resend Verification Email
                             </Button>
                         </>
                     )}
                 </div>

                {/* Hidden submit for Enter key */}
                <button type="submit" disabled={isSubmitting} style={{ display: 'none' }} aria-hidden="true"></button>
             </form>
          </div>
      </Form>

      {/* Footer with navigation */}
       {/* Hide footer on email sent confirmation step and verification step */}
       {currentStep !== 6 && currentStep !== 7 && (
        <div className="flex justify-between items-center mt-auto p-4 h-16 border-t border-border/30">
            <Button type="button" variant="ghost" size="icon" onClick={handlePrevious} disabled={currentStep === 1 || isSubmitting} className={cn("h-10 w-10", currentStep === 1 && "invisible")} aria-label="Previous Step">
                <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleNext}
              // Adjusted disabled logic:
              // - Always disabled if submitting
              // - On step 2 (Choose Method), disabled if no method selected
              // - On step 4 (Choose Verification), disable "Next" as actions are specific buttons
              // - On step 5 (Code Entry), disabled if code is not 6 digits
              disabled={isSubmitting ||
                         (currentStep === 2 && !loginMethod) ||
                         currentStep === 4 || // Disable generic Next on step 4
                         (currentStep === 5 && (!form.watch("verificationCode") || form.watch("verificationCode")?.length !== 6))
                        }
              className={cn("h-10 w-10",
                            isSubmitting && "animate-pulse",
                            currentStep === 4 && "invisible" // Hide generic Next on step 4
                            )}
               // Adjust label based on the context of the "Next" action
              aria-label={currentStep === 5 ? "Verify Code" : (currentStep === 3 ? "Login" : "Next Step")}
            >
                 {isSubmitting ? (
                 <Loader2 className="h-5 w-5 animate-spin" />
                 ) : (
                  // Show LogIn icon on Password step (3) or MFA Code step (5)
                  (currentStep === 3 || currentStep === 5) ? <LogIn className="h-5 w-5 text-primary" /> : <ArrowRight className="h-5 w-5" />
                 )}
             </Button>
        </div>
       )}
    </div>
  );
}


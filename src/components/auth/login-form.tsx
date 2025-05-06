
"use client";

import React, { useState, useEffect, useRef } from "react"; // Add React import
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { getAuth, type RecaptchaVerifier, reload } from "firebase/auth"; // Import reload, removed MFA specific imports
import { app } from '@/services/firebase-config'; // Import Firebase config
import { Loader2, ArrowLeft, ArrowRight, Mail, KeyRound, MailCheck, LogIn, RefreshCcw, AlertCircle, Briefcase } from "lucide-react"; // Removed Phone, MessageSquare, ListChecks, Added Briefcase
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
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserProfileByUid } from "@/services/user";
import type { ProfileFormValues } from "@/components/profile/profile-form";
import {
    login,
    initializeRecaptchaVerifier, // Keep for potential future use or other security features
    clearGlobalRecaptchaVerifier,
    // Removed MFA specific service imports: sendSmsVerificationCode, completeMfaSignIn
    sendSignInLinkToEmail,
    isSignInWithEmailLink,
    signInWithEmailLink,
    sendVerificationEmail,
} from '@/services/auth';
import { SplashScreen } from '@/components/common/splash-screen';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";


// Schema updated - password optional, verificationCode removed as it was for MFA
const loginSchema = z.object({
  artistId: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().optional(),
  // verificationCode: z.string().optional(), // Removed
});

type LoginFormValues = z.infer<typeof loginSchema>;

// Define steps - Simplified, removed MFA steps
const STEPS = [
  { id: 1, name: "Artist ID", icon: Mail },
  { id: 2, name: "Choose Method", icon: LogIn },
  { id: 3, name: "Password", icon: KeyRound }, // Only shown if password method chosen
  { id: 4, name: "Check Your Email", icon: MailCheck }, // Email Link Sent Step
  { id: 5, name: "Verify Your Email", icon: MailCheck }, // Email Verification Step
];


export function LoginForm({ className }: { className?: string }) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [previousStep, setPreviousStep] = useState(1);
  const [showSplash, setShowSplash] = useState(false);
  const [splashLoadingText, setSplashLoadingText] = useState("Logging in...");
  const [splashUserImageUrl, setSplashUserImageUrl] = useState<string | null>(null);
  const [splashUserName, setSplashUserName] = useState<string | null>(null);
  const [loginMethod, setLoginMethod] = useState<'password' | 'emailLink' | null>(null);
  const [isProcessingEmailLink, setIsProcessingEmailLink] = useState(false);
  const [unverifiedUser, setUnverifiedUser] = useState<any | null>(null);
  const [profileData, setProfileData] = useState<ProfileFormValues | null>(null);


  // MFA related state - REMOVED
  // const [mfaResolver, setMfaResolver] = useState<any>(null);
  // const [mfaHints, setMfaHints] = useState<any[]>([]);
  // const [verificationId, setVerificationId] = useState<string | null>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null); // Keep if other features use it
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  const router = useRouter();


  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      artistId: "",
      password: "",
      // verificationCode: "", // Removed
    },
    mode: "onChange",
  });

   // Initialize reCAPTCHA (kept for now, might be used for other non-MFA security checks or if re-enabled)
   useEffect(() => {
     if (typeof window !== 'undefined' && recaptchaContainerRef.current && !recaptchaVerifier && currentStep <= 2) { // Adjusted step condition
         const containerId = `recaptcha-container-${Date.now()}`;
         recaptchaContainerRef.current.id = containerId;
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
     return () => {
          if (recaptchaVerifier && currentStep > 2) {
            try {
               clearGlobalRecaptchaVerifier();
               console.log("Cleared reCAPTCHA verifier as it's no longer needed.");
            } catch (e) {
               console.warn("Could not clear reCAPTCHA:", e)
            }
            setRecaptchaVerifier(null);
          }
     };
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [currentStep]);


   // --- Effect to handle email link sign-in ---
   useEffect(() => {
    const processEmailLink = async () => {
        const currentUrl = window.location.href;
        if (isSignInWithEmailLink(currentUrl)) {
            setIsProcessingEmailLink(true);
            setSplashLoadingText("Verifying sign-in link...");
            setShowSplash(true);
            try {
                const emailFromStorage = localStorage.getItem('emailForSignIn'); // Retrieve email
                const user = await signInWithEmailLink(currentUrl, emailFromStorage);

                if (!user.emailVerified) {
                     console.log("Email link sign-in successful, but email not yet verified. Sending verification email...");
                     setUnverifiedUser(user);
                     try {
                         await sendVerificationEmail();
                         toast({ title: "Verification Required", description: `A verification link has been sent to ${user.email}. Please check your inbox and click the link.`, duration: 7000 });
                     } catch (verificationError) {
                          toast({ title: "Verification Error", description: "Could not send verification email. Please try resending.", variant: "destructive" });
                     }
                     setShowSplash(false);
                     setIsProcessingEmailLink(false);
                     goToStep(STEPS.find(step => step.name === "Verify Your Email")!.id); // Go to email verification step
                     return;
                }

                 console.log("LoginForm: Email Link Sign-in successful and verified. User UID:", user.uid);
                if (user.uid) {
                     try {
                        const profile = await getUserProfileByUid(user.uid);
                        setSplashUserName(profile?.name || user.email?.split('@')[0] || 'User');
                        setSplashUserImageUrl(profile?.imageUrl || user.photoURL || null);
                     } catch (profileError) {
                         console.error("Error fetching profile after email link sign-in:", profileError);
                         setSplashUserName(user.email?.split('@')[0] || 'User');
                         setSplashUserImageUrl(user.photoURL || null);
                     }
                }
                setSplashLoadingText("Sign-in successful!");
                window.history.replaceState(null, '', window.location.pathname);
                localStorage.removeItem('emailForSignIn'); // Clear stored email
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
                router.replace('/login');
            }
        }
    };
    if (typeof window !== 'undefined') {
        processEmailLink();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const fetchProfileForPasswordStep = async (email: string) => {
     console.log("Fetching profile for password step, email:", email);
     try {
        // Attempt to fetch profile using UID if available from a broader context or previous step.
        // For now, we'll stick to a simplified approach based on email.
        const fetchedProfile = await getUserProfileByUid(auth.currentUser?.uid || ''); // This will likely fail if uid is not available here.
        if (fetchedProfile) {
            setProfileData(fetchedProfile);
        } else {
             // Fallback if no profile document or UID not readily available at this stage.
            console.warn("getUserProfileByUid returned null or profile not found for password step. Using email as fallback for display.");
            setProfileData({ name: email.split('@')[0] || "User", email: email, imageUrl: null, bio: null, phoneNumber: null, hasCompletedTutorial: false, emailLinkSignInEnabled: false });
        }
     } catch (error) {
         console.error("Error fetching profile data for password step:", error);
         // Fallback on error: use email for display.
         setProfileData({ name: email.split('@')[0] || "User", email: email, imageUrl: null, bio: null, phoneNumber: null, hasCompletedTutorial: false, emailLinkSignInEnabled: false });
     }
   };


  const getInitials = (): string => {
       return profileData?.name?.charAt(0).toUpperCase() || form.getValues("artistId")?.charAt(0).toUpperCase() || 'U';
  };


  const goToStep = (step: number) => {
    setPreviousStep(currentStep);
    setCurrentStep(step);
  };

   const getAnimationClasses = (stepId: number): string => {
       const stepClasses = "absolute inset-0 px-6 pb-6 pt-4";
       if (stepId === currentStep && currentStep > previousStep) {
           return `animate-slide-in-from-right ${stepClasses}`;
       }
       if (stepId === currentStep && currentStep < previousStep) {
           return `animate-slide-in-from-left ${stepClasses}`;
       }
       if (stepId === previousStep && currentStep > previousStep) {
            return `animate-slide-out-to-left forwards ${stepClasses}`;
        }
        if (stepId === previousStep && currentStep < previousStep) {
            return `animate-slide-out-to-right forwards ${stepClasses}`;
        }
       return stepId === currentStep ? `opacity-100 ${stepClasses}` : `opacity-0 pointer-events-none ${stepClasses}`;
   };


  const validateStep = async (step: number): Promise<boolean> => {
    let fieldsToValidate: (keyof LoginFormValues)[] = [];
    if (step === 1) fieldsToValidate = ["artistId"];
    else if (step === 3 && loginMethod === 'password') fieldsToValidate = ["password"];

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


  const handleNext = async () => {
     if (await validateStep(currentStep)) {
         if (currentStep === 1) {
             goToStep(2);
         } else if (currentStep === 2) {
             if (loginMethod === 'password') {
                  const email = form.getValues("artistId");
                  if (email) {
                       await fetchProfileForPasswordStep(email);
                       goToStep(3);
                  } else {
                        toast({ title: "Error", description: "Email not found.", variant: "destructive" });
                        goToStep(1);
                  }
             }
             else if (loginMethod === 'emailLink') await handleSendEmailLink();
             else toast({ title: "Choose Method", description: "Please select a sign-in method.", variant: "destructive" });
         } else if (currentStep === 3 && loginMethod === 'password') {
             await form.handleSubmit(onSubmit)();
         }
     }
   };

  const handlePrevious = () => {
    if (currentStep > 1) {
        if (currentStep === STEPS.find(step => step.name === "Verify Your Email")!.id) {
             setUnverifiedUser(null);
             goToStep(3);
        } else if (currentStep === 3 || currentStep === STEPS.find(step => step.name === "Check Your Email")!.id) {
            setLoginMethod(null);
            setProfileData(null);
            goToStep(2);
        } else if (currentStep === 2) {
            goToStep(1);
        } else {
             goToStep(currentStep - 1);
        }
    }
  };

   async function onSubmit(values: LoginFormValues) {
     if (loginMethod === 'password' && !values.password) {
          toast({ title: "Missing Password", description: "Please enter your password.", variant: "destructive" });
          return;
     }
     setIsSubmitting(true);
     setSplashLoadingText("Logging in...");
      setSplashUserName(profileData?.name || values.artistId.split('@')[0]);
      setSplashUserImageUrl(profileData?.imageUrl || null);
      setShowSplash(true);

     try {
       // MFA path removed, directly expect User object or error
       const user = await login(values.artistId, values.password!);

       if (!user.emailVerified) {
           console.log("Login successful, but email not verified. Sending verification email...");
           setUnverifiedUser(user);
           try {
               await sendVerificationEmail();
               toast({ title: "Verification Required", description: `A verification link has been sent to ${user.email}. Please check your inbox and click the link.`, duration: 7000 });
           } catch (verificationError) {
                toast({ title: "Verification Error", description: "Could not send verification email. Please try resending.", variant: "destructive" });
           }
           setShowSplash(false);
           goToStep(STEPS.find(step => step.name === "Verify Your Email")!.id);
           setIsSubmitting(false);
           return;
       }

        console.log("LoginForm: Login successful via service. User UID:", user.uid);
        setSplashLoadingText(`Welcome, ${profileData?.name || user.displayName || user.email?.split('@')[0]}!`);

     } catch (error) {
       console.error("Login failed:", error);
       setShowSplash(false);
       setIsSubmitting(false);
       toast({
         title: "Login Failed",
         description: error instanceof Error ? error.message : "An unknown error occurred.",
         variant: "destructive",
       });
     }
   }

   // --- MFA Handlers REMOVED ---
   // handleSendSmsCode, handleSendMfaEmailLink, handleVerifyMfaCode

   const handleCheckVerification = async () => {
       if (!unverifiedUser) return;
       setIsSubmitting(true);
        setSplashLoadingText("Checking email verification...");
        setShowSplash(true);

       try {
           await reload(unverifiedUser);
           const refreshedUser = getAuth(app).currentUser;
           if (refreshedUser?.emailVerified) {
               setUnverifiedUser(null);
               toast({ title: "Email Verified!", variant: "default" });
                const profile = await getUserProfileByUid(refreshedUser.uid);
                setSplashUserName(profile?.name || refreshedUser.email?.split('@')[0] || 'User');
                setSplashUserImageUrl(profile?.imageUrl || refreshedUser.photoURL || null);
               setSplashLoadingText(`Welcome, ${splashUserName}!`);
           } else {
               setShowSplash(false);
               toast({ title: "Still Waiting", description: "Email not verified yet. Please check your inbox and click the link.", variant: "default" });
           }
       } catch (error) {
            setShowSplash(false);
            toast({ title: "Verification Check Failed", description: "Could not check verification status. Please try again.", variant: "destructive" });
       } finally {
           setIsSubmitting(false);
       }
   };

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


   const handleSendEmailLink = async () => {
      const email = form.getValues("artistId");
      if (!email) {
          toast({ title: "Missing Email", description: "Please enter your email first.", variant: "destructive" });
          goToStep(1);
          return;
      }
      setIsSubmitting(true);
      setSplashLoadingText("Sending sign-in link...");
       setSplashUserName(email.split('@')[0]);
       setSplashUserImageUrl(null);
       setShowSplash(true);


      try {
          const redirectUrl = window.location.origin + window.location.pathname;
          await sendSignInLinkToEmail(email, redirectUrl);
          setShowSplash(false);
          toast({
              title: "Check Your Email!",
              description: `A sign-in link has been sent to ${email}.`,
              duration: 5000,
          });
          goToStep(STEPS.find(step => step.name === "Check Your Email")!.id);
      } catch (error) {
          setShowSplash(false);
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


  if (showSplash || isProcessingEmailLink) {
      return (
         <div className={cn("flex flex-col h-full items-center justify-center", className)}>
             <SplashScreen
                 loadingText={splashLoadingText}
                 userImageUrl={splashUserImageUrl}
                 userName={splashUserName}
                 className="bg-transparent border-none shadow-none p-0"
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
                     e.preventDefault();
                     handleNext();
                 }}
                className="h-full"
                aria-live="polite"
             >
                {/* Step 1: Artist ID */}
                 <div className={cn("space-y-4 h-full flex flex-col", getAnimationClasses(1))} aria-hidden={currentStep !== 1}>
                 </div>

                 {/* Step 2: Choose Method */}
                <div className={cn("space-y-4 h-full flex flex-col items-center", getAnimationClasses(2))} aria-hidden={currentStep !== 2}>
                   {currentStep === 2 && (
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
                      {currentStep === 3 && loginMethod === 'password' && (
                          <>
                              <div className="flex flex-col items-center text-center pt-6 px-6">
                                   <Avatar className="h-20 w-20 mb-3 border-2 border-primary/40">
                                        <AvatarImage src={profileData?.imageUrl || undefined} alt={profileData?.name || 'User'} />
                                        <AvatarFallback className="text-3xl bg-muted text-muted-foreground">{getInitials()}</AvatarFallback>
                                   </Avatar>
                                    <h3 className="text-lg font-medium text-foreground">{profileData?.name || 'Enter Password'}</h3>
                                    <p className="text-sm text-muted-foreground">{form.watch("artistId")}</p>
                              </div>
                               <div className="flex-grow p-6 space-y-4">
                                    <FormField control={form.control} name="password" render={({ field }) => ( <FormItem><FormLabel className="sr-only">Password</FormLabel><FormControl><div className="relative"><KeyRound className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="password" placeholder="Enter your password" autoComplete="current-password" {...field} disabled={isSubmitting} className="pl-8 text-base"/></div></FormControl><FormMessage /><div className="text-right"><Button type="button" variant="link" className="text-xs text-muted-foreground h-auto p-0" /* onClick={() => setIsForgotPasswordModalOpen(true)} */>Forgot Password?</Button></div></FormItem> )} />
                              </div>
                         </>
                      )}
                </div>

                {/* Step 4: Email Link Sent Confirmation (was step 6) */}
                <div className={cn("space-y-4 h-full flex flex-col items-center justify-center text-center", getAnimationClasses(4))} aria-hidden={currentStep !== 4}>
                    {currentStep === 4 && (
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

                 {/* Step 5: Verify Email Address (was step 7) */}
                 <div className={cn("space-y-4 h-full flex flex-col items-center justify-center text-center", getAnimationClasses(5))} aria-hidden={currentStep !== 5}>
                     {currentStep === 5 && unverifiedUser && (
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
                           <div className="px-6 pb-2">
                             <Separator className="my-3 bg-border/40" />
                             <Button
                               type="button"
                               variant="outline"
                               className="w-full justify-center"
                               onClick={() => { /* TODO: Implement partner portal logic */ toast({ title: "Coming Soon!", description: "Partner Portal login will be available soon."}) }}
                               disabled={isSubmitting}
                             >
                               <Briefcase className="mr-2 h-4 w-4" />
                               Partner Portal Login
                             </Button>
                           </div>
                  </div>


                <button type="submit" disabled={isSubmitting} style={{ display: 'none' }} aria-hidden="true"></button>
             </form>
          </div>
      </Form>

       {currentStep !== STEPS.find(step => step.name === "Check Your Email")!.id && currentStep !== STEPS.find(step => step.name === "Verify Your Email")!.id && (
        <div className="flex justify-between items-center mt-auto p-4 h-16 border-t border-border/30">
            <Button type="button" variant="ghost" size="icon" onClick={handlePrevious} disabled={currentStep === 1 || isSubmitting} className={cn("h-10 w-10", currentStep === 1 && "invisible")} aria-label="Previous Step">
                <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleNext}
              disabled={isSubmitting || (currentStep === 2 && !loginMethod)}
              className={cn("h-10 w-10", isSubmitting && "animate-pulse")}
              aria-label={currentStep === 3 ? "Login" : "Next Step"}
            >
                 {isSubmitting ? (
                 <Loader2 className="h-5 w-5 animate-spin" />
                 ) : (
                  currentStep === 3 ? <LogIn className="h-5 w-5 text-primary" /> : <ArrowRight className="h-5 w-5" />
                 )}
             </Button>
        </div>
       )}
    </div>
  );
}

    

"use client";

import React, { useState, useEffect, useRef } from "react"; // Add React import
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { getAuth, type RecaptchaVerifier, reload } from "firebase/auth";
import { app } from '@/services/firebase-config';
import { Loader2, ArrowLeft, Mail, KeyRound, MailCheck, LogIn, RefreshCcw, AlertCircle, Briefcase } from "lucide-react"; // Removed ArrowRight
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
    initializeRecaptchaVerifier,
    clearGlobalRecaptchaVerifier,
    sendVerificationEmail,
} from '@/services/auth';
import { SplashScreen } from '@/components/common/splash-screen';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ForgotPasswordModal } from "./forgot-password-modal";


const loginSchema = z.object({
  artistId: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required."}),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const STEPS = [
  { id: 1, name: "Artist ID", icon: Mail },
  { id: 2, name: "Password", icon: KeyRound },
  { id: 3, name: "Verify Your Email", icon: MailCheck },
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
  const [unverifiedUser, setUnverifiedUser] = useState<any | null>(null);
  const [profileData, setProfileData] = useState<ProfileFormValues | null>(null);
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);


  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  const router = useRouter();


  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      artistId: "",
      password: "",
    },
    mode: "onChange",
  });

   useEffect(() => {
     if (typeof window !== 'undefined' && recaptchaContainerRef.current && !recaptchaVerifier && currentStep === 1) {
         const containerId = `recaptcha-container-${Date.now()}`;
         recaptchaContainerRef.current.id = containerId;
         try {
             const verifier = initializeRecaptchaVerifier(containerId);
             setRecaptchaVerifier(verifier);
         } catch (error) {
             console.error(`Failed to initialize reCAPTCHA on container ${containerId}:`, error);
             toast({ title: "Security Check Error", description: "Could not initialize security check. Please refresh.", variant: "destructive" });
         }
     }
     return () => {
          if (recaptchaVerifier && currentStep > 1) {
            try {
               clearGlobalRecaptchaVerifier();
            } catch (e) {
               console.warn("Could not clear reCAPTCHA:", e)
            }
            setRecaptchaVerifier(null);
          }
     };
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [currentStep]);


  const fetchProfileForPasswordStep = async (email: string) => {
     try {
        const authUser = getAuth(app).currentUser;
        let fetchedProfile: ProfileFormValues | null = null;
        if (authUser?.email === email) {
            fetchedProfile = await getUserProfileByUid(authUser.uid);
        } else {
            // If login with email link is successful, authUser will be set.
            // We need to find profile by *input* email for display consistency.
            // This is now problematic as getUserProfileByEmail was removed for security.
            // Solution: Rely on Firestore data fetched by UID if already logged in, otherwise just email part.
            const tempAuthUser = auth.currentUser; // Check if user is now authenticated (e.g. after email link)
            if (tempAuthUser && tempAuthUser.email === email) {
                fetchedProfile = await getUserProfileByUid(tempAuthUser.uid);
            } else {
                 console.warn("Cannot reliably fetch profile by UID for password step if current auth user doesn't match input email, or not yet authenticated.");
            }
        }

        if (fetchedProfile) {
            setProfileData(fetchedProfile);
        } else {
            setProfileData({ name: email.split('@')[0] || "User", email: email, imageUrl: null, bio: null, phoneNumber: null, hasCompletedTutorial: false, emailLinkSignInEnabled: false });
        }
     } catch (error) {
         console.error("Error fetching profile data for password step:", error);
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
    else if (step === 2) fieldsToValidate = ["password"];

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
             const email = form.getValues("artistId");
             if (email) {
                  await fetchProfileForPasswordStep(email);
                  goToStep(2);
             } else {
                   toast({ title: "Error", description: "Email not found.", variant: "destructive" });
             }
         } else if (currentStep === 2) {
             await form.handleSubmit(onSubmit)();
         }
     }
   };

  const handlePrevious = () => {
    if (currentStep > 1) {
        if (currentStep === STEPS.find(step => step.name === "Verify Your Email")!.id) {
             setUnverifiedUser(null);
             goToStep(2);
        } else if (currentStep === 2) {
            setProfileData(null);
            goToStep(1);
        }
    }
  };

   async function onSubmit(values: LoginFormValues) {
     if (!values.password) {
          toast({ title: "Missing Password", description: "Please enter your password.", variant: "destructive" });
          return;
     }
     setIsSubmitting(true);
     setSplashLoadingText("Logging in...");
      setSplashUserName(profileData?.name || values.artistId.split('@')[0]);
      setSplashUserImageUrl(profileData?.imageUrl || null);
      setShowSplash(true);

     try {
       const user = await login(values.artistId, values.password!);

       if (!user.emailVerified) {
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

        setSplashLoadingText(`Welcome, ${profileData?.name || user.displayName || user.email?.split('@')[0]}!`);

     } catch (error) {
       setShowSplash(false);
       setIsSubmitting(false);
       toast({
         title: "Login Failed",
         description: error instanceof Error ? error.message : "An unknown error occurred.",
         variant: "destructive",
       });
     }
   }


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


  if (showSplash) {
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
    <>
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
                               onClick={() => { toast({ title: "Coming Soon!", description: "Partner Portal login will be available soon."}) }}
                               disabled={isSubmitting}
                             >
                               <Briefcase className="mr-2 h-4 w-4" />
                               Partner Portal Login
                             </Button>
                           </div>
                  </div>

                {/* Step 2: Password */}
                 <div className={cn("space-y-4 h-full flex flex-col", getAnimationClasses(2))} aria-hidden={currentStep !== 2}>
                      {currentStep === 2 && (
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
                                    <FormField control={form.control} name="password" render={({ field }) => ( <FormItem><FormLabel className="sr-only">Password</FormLabel><FormControl><div className="relative"><KeyRound className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="password" placeholder="Enter your password" autoComplete="current-password" {...field} disabled={isSubmitting} className="pl-8 text-base"/></div></FormControl><FormMessage /><div className="text-right"><Button type="button" variant="link" className="text-xs text-muted-foreground h-auto p-0" onClick={() => setIsForgotPasswordModalOpen(true)}>Forgot Password?</Button></div></FormItem> )} />
                              </div>
                         </>
                      )}
                </div>


                 {/* Step 3: Verify Email Address */}
                 <div className={cn("space-y-4 h-full flex flex-col items-center justify-center text-center", getAnimationClasses(3))} aria-hidden={currentStep !== 3}>
                     {currentStep === 3 && unverifiedUser && (
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

                <button type="submit" disabled={isSubmitting} style={{ display: 'none' }} aria-hidden="true"></button>
             </form>
          </div>
      </Form>

       {currentStep !== STEPS.find(step => step.name === "Verify Your Email")!.id && (
        <div className="flex justify-between items-center mt-auto p-4 h-16 border-t border-border/30">
            <Button type="button" variant="ghost" size="icon" onClick={handlePrevious} disabled={currentStep === 1 || isSubmitting} className={cn("h-10 w-10", currentStep === 1 && "invisible")} aria-label="Previous Step">
                <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleNext}
              disabled={isSubmitting || (currentStep === 1 && !form.formState.isValid) || (currentStep === 2 && !form.formState.isValid)}
              className={cn("h-10 w-10", isSubmitting && "animate-pulse")}
              aria-label={currentStep === 1 ? "Proceed to Password" : "Login"}
            >
                 {isSubmitting ? (
                 <Loader2 className="h-5 w-5 animate-spin" />
                 ) : (
                  <LogIn className="h-5 w-5 text-primary" />
                 )}
             </Button>
        </div>
       )}
    </div>
    <ForgotPasswordModal
        isOpen={isForgotPasswordModalOpen}
        onClose={() => setIsForgotPasswordModalOpen(false)}
    />
    </>
  );
}

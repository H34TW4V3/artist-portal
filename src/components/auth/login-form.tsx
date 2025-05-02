
"use client";

import React, { useState, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, ArrowLeft, ArrowRight, User } from "lucide-react"; // Added User icon
import { useRouter } from "next/navigation";
// import { Howl } from 'howler'; // Removed Howler import

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

// Simple User Icon for Step 2
const UserIconStep2 = () => (
    <User className="h-16 w-16 mb-2 text-primary" /> // Adjusted size
);


export function LoginForm({ onLoginComplete }: LoginFormProps) {
  const { login, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [previousStep, setPreviousStep] = useState(1);
  const [enteredEmail, setEnteredEmail] = useState("");
  const [showLoginSplash, setShowLoginSplash] = useState(false); // State to show splash within the card
  const [splashInfo, setSplashInfo] = useState<{ name: string; imageUrl: string | null }>({ name: '', imageUrl: null });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { artistId: "", password: "" },
    mode: "onChange",
  });

  const goToStep = (step: number) => {
      setPreviousStep(currentStep);
      setCurrentStep(step);
  };

  // Animation classes
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
            goToStep(currentStep + 1); // Go directly to next step
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
       goToStep(currentStep - 1);
    }
  };


  async function onSubmit(values: LoginFormValues) {
    setIsSubmitting(true);
    try {
        const loggedInUser = await login(values.artistId, values.password);

        // Login successful: Prepare splash info and show it
        const nameForSplash = loggedInUser?.displayName || values.artistId.split('@')[0] || "User";
        const imageUrlForSplash = loggedInUser?.photoURL || null;
        setSplashInfo({ name: nameForSplash, imageUrl: imageUrlForSplash });

        setShowLoginSplash(true); // Show the embedded splash screen

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
  }

  // Derive artist name from email for Step 2 display
  const artistNameStep2 = enteredEmail?.split('@')[0] || "User";

  return (
    <>
      <Form {...form}>
        {/* Relative container for steps and splash */}
        <div className="relative overflow-hidden min-h-[400px] flex flex-col"> {/* Ensure flex column */}

             {/* Conditional Rendering: Show Form Steps OR Splash */}
             {showLoginSplash ? (
                 <SplashScreen
                     className="flex-grow flex items-center justify-center"
                     style={{ animationDelay: '0s' }}
                     loadingText={`Welcome, ${splashInfo.name}!`}
                     userImageUrl={splashInfo.imageUrl}
                     userName={splashInfo.name}
                     duration={5000}
                 />
             ) : (
                 <>
                     {/* Step 1 Header (Only shown on step 1) */}
                     {currentStep === 1 && (
                         <CardHeader className={cn(
                             "items-center text-center p-4 border-b border-border/30",
                             getAnimationClasses(1)
                         )}>
                             <LoginIconStep1 />
                             <CardTitle className="text-xl font-semibold tracking-tight text-primary">Artist Hub Login</CardTitle>
                             <CardDescription className="text-muted-foreground text-xs">
                                 Enter your credentials to access your dashboard.
                             </CardDescription>
                         </CardHeader>
                      )}

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
                         <div className={cn("space-y-3 flex flex-col items-center", getAnimationClasses(2))}>
                             {currentStep === 2 && (
                                 <>
                                      {/* Display Logo and Artist Name on Step 2 */}
                                      <div className="flex flex-col items-center pt-4 pb-2">
                                          <UserIconStep2 />
                                          <p className="text-lg font-medium text-foreground">{artistNameStep2}</p>
                                      </div>

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
                                             disabled={isSubmitting || currentStep !== 2}
                                         >
                                             Forgot Password?
                                         </Button>
                                     </div>
                                 </>
                             )}
                         </div>

                         {/* Navigation Buttons - Placed outside step divs */}
                         <div className="flex justify-between pt-3">
                             <Button
                                 type="button"
                                 variant="outline"
                                 size="sm"
                                 onClick={handlePrevious}
                                 disabled={currentStep === 1 || isSubmitting}
                                 className={cn(currentStep === 1 && "invisible")}
                             >
                                 <ArrowLeft className="mr-1 h-4 w-4" /> Previous
                             </Button>
                             <Button
                                 type="button"
                                 size="sm"
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

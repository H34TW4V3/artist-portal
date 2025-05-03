
"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/auth-context";
import {
    initializeRecaptchaVerifier,
    sendSmsVerificationCode,
    enrollSmsMfa,
    unenrollSmsMfa,
    getUserMfaInfo, // Function to get current MFA status
} from "@/services/auth"; // Update with new auth service functions
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle, ShieldCheck, ShieldOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { MultiFactorInfo, RecaptchaVerifier, User } from "firebase/auth"; // Import types

interface MfaManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: string | null | undefined; // Get phone number from parent
  onEnrollmentChange: (isEnrolled: boolean) => void; // Callback when enrollment changes
}

type MfaStep = 'initial' | 'verifyCode' | 'enrolled' | 'unenrollConfirm';

export function MfaManagementModal({
    isOpen,
    onClose,
    phoneNumber,
    onEnrollmentChange
}: MfaManagementModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<MfaStep>('initial');
  const [isLoading, setIsLoading] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false); // Track current enrollment status
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

    // Function to check current MFA enrollment status
    const checkEnrollmentStatus = async (currentUser: User) => {
        if (!currentUser) return;
        setIsLoading(true);
        setError(null);
        try {
            const mfaInfo = await getUserMfaInfo(currentUser);
            const smsEnrolled = mfaInfo.some(info => info.factorId === 'phone');
            setIsEnrolled(smsEnrolled);
            setCurrentStep(smsEnrolled ? 'enrolled' : 'initial');
            console.log("MFA Status Check: SMS Enrolled =", smsEnrolled);
        } catch (err) {
            console.error("Error checking MFA status:", err);
            setError("Could not retrieve current 2FA status.");
            setCurrentStep('initial'); // Default to initial on error
        } finally {
            setIsLoading(false);
        }
    };


  // Initialize reCAPTCHA and check status when modal opens
  useEffect(() => {
    if (isOpen && user && typeof window !== 'undefined') {
        setError(null);
        setVerificationCode('');
        setVerificationId(null);
        checkEnrollmentStatus(user); // Check status first

        // Initialize reCAPTCHA only if needed (not enrolled) and not already initialized
        if (!isEnrolled && recaptchaContainerRef.current && !recaptchaVerifier) {
            try {
                 if (!recaptchaContainerRef.current.id) {
                     recaptchaContainerRef.current.id = `mfa-recaptcha-${Date.now()}`;
                 }
                 const verifier = initializeRecaptchaVerifier(recaptchaContainerRef.current.id);
                 setRecaptchaVerifier(verifier);
                 console.log("reCAPTCHA Initialized for MFA modal on container:", recaptchaContainerRef.current.id);
            } catch (err) {
                 console.error("Failed to initialize reCAPTCHA for MFA:", err);
                 setError("Could not initialize security check.");
                 toast({ title: "Security Error", description: "Failed to initialize reCAPTCHA.", variant: "destructive" });
            }
        }
    } else if (!isOpen) {
        // Optional: Reset state when modal closes
        setCurrentStep('initial');
        setIsLoading(false);
        setError(null);
        // Consider resetting recaptchaVerifier if it causes issues, but often reusable
        // if (recaptchaVerifier) {
        //     recaptchaVerifier.clear();
        //     setRecaptchaVerifier(null);
        // }
    }
  }, [isOpen, user, isEnrolled]); // Re-run if enrollment status changes or modal opens

  const handleSendCode = async () => {
    if (!user || !recaptchaVerifier || !phoneNumber) {
      setError("User, phone number, or security verifier is missing.");
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const verId = await sendSmsVerificationCode(user, phoneNumber, recaptchaVerifier);
      setVerificationId(verId);
      setCurrentStep('verifyCode');
      toast({ title: "Verification Code Sent", description: `A code has been sent to ${phoneNumber}.`, duration: 3000 });
    } catch (err) {
      console.error("Error sending SMS verification code:", err);
      setError(err instanceof Error ? err.message : "Failed to send verification code.");
      toast({ title: "Error Sending Code", description: error, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCodeAndEnroll = async () => {
    if (!user || !verificationId || verificationCode.length !== 6) {
      setError("Invalid verification code.");
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      await enrollSmsMfa(user, verificationId, verificationCode);
      setIsEnrolled(true);
      setCurrentStep('enrolled');
      onEnrollmentChange(true); // Notify parent
      toast({ title: "SMS 2FA Enabled", description: "Two-factor authentication is now active.", variant: "default" });
    } catch (err) {
      console.error("Error verifying code and enrolling MFA:", err);
      setError(err instanceof Error ? err.message : "Failed to verify code or enroll.");
      toast({ title: "Enrollment Failed", description: error, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnenroll = async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    try {
        await unenrollSmsMfa(user);
        setIsEnrolled(false);
        setCurrentStep('initial');
        onEnrollmentChange(false); // Notify parent
        toast({ title: "SMS 2FA Disabled", description: "Two-factor authentication has been turned off.", variant: "default" });
    } catch (err) {
        console.error("Error unenrolling MFA:", err);
        setError(err instanceof Error ? err.message : "Failed to disable 2FA.");
        toast({ title: "Unenrollment Failed", description: error, variant: "destructive" });
    } finally {
        setIsLoading(false);
        setCurrentStep('enrolled'); // Go back to enrolled view even on error
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 'initial':
        return (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Enable SMS-based two-factor authentication for enhanced account security. A code will be sent to your registered phone number during sign-in.
            </p>
            {!phoneNumber && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Phone Number Required</AlertTitle>
                    <AlertDescription>
                        Please add and save a phone number in your profile before enabling SMS 2FA.
                    </AlertDescription>
                </Alert>
            )}
            {error && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
             {/* Invisible reCAPTCHA container */}
             <div ref={recaptchaContainerRef} id={`mfa-recaptcha-${Date.now()}`} className="my-2 h-0 overflow-hidden"></div>

            <Button onClick={handleSendCode} disabled={isLoading || !phoneNumber || !recaptchaVerifier} className="w-full">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              {isLoading ? 'Sending Code...' : 'Enable SMS 2FA'}
            </Button>
          </div>
        );
      case 'verifyCode':
        return (
          <div className="space-y-4 py-4">
            <Label htmlFor="verificationCode">Verification Code</Label>
            <Input
              id="verificationCode"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter 6-digit code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              disabled={isLoading}
              className="text-center tracking-widest"
            />
            {error && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            <Button onClick={handleVerifyCodeAndEnroll} disabled={isLoading || verificationCode.length !== 6} className="w-full">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Verify and Enroll
            </Button>
             <Button variant="link" onClick={() => setCurrentStep('initial')} disabled={isLoading} className="text-xs h-auto p-0">
                 Cancel
             </Button>
          </div>
        );
      case 'enrolled':
         return (
            <div className="space-y-4 py-4 text-center">
                 <ShieldCheck className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="text-base font-semibold text-foreground">
                    SMS Two-Factor Authentication is Enabled
                </p>
                <p className="text-sm text-muted-foreground">
                    Your account is protected with SMS 2FA using the number ending in {phoneNumber?.slice(-4) || 'your number'}.
                </p>
                {error && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                <Button variant="destructive" onClick={() => setCurrentStep('unenrollConfirm')} disabled={isLoading} className="w-full">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldOff className="mr-2 h-4 w-4" />}
                    Disable SMS 2FA
                </Button>
            </div>
         );
        case 'unenrollConfirm':
            return (
                 <div className="space-y-4 py-4 text-center">
                    <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-3" />
                    <p className="text-base font-semibold text-foreground">
                         Disable SMS Two-Factor Authentication?
                    </p>
                     <p className="text-sm text-muted-foreground">
                         Disabling 2FA will reduce your account security. Are you sure you want to proceed?
                     </p>
                     <div className="flex justify-center gap-3 pt-3">
                          <Button variant="outline" onClick={() => setCurrentStep('enrolled')} disabled={isLoading}>
                              Cancel
                          </Button>
                          <Button variant="destructive" onClick={handleUnenroll} disabled={isLoading}>
                               {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              Yes, Disable 2FA
                          </Button>
                     </div>
                 </div>
            );
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card/85 dark:bg-card/70 border-border/50">
        <DialogHeader>
          <DialogTitle className="text-primary">Manage SMS 2FA</DialogTitle>
          <DialogDescription>
            {currentStep === 'enrolled'
                ? 'Review or disable SMS two-factor authentication.'
                : 'Setup or verify SMS two-factor authentication.'}
          </DialogDescription>
        </DialogHeader>

        {renderStepContent()}

        {(currentStep === 'initial' || currentStep === 'enrolled') && (
             <DialogFooter className="mt-4">
                 <DialogClose asChild>
                     <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                         Close
                     </Button>
                 </DialogClose>
             </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

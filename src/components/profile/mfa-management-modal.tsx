
"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/auth-context";
// Removed MFA specific auth service imports
import {
    // initializeRecaptchaVerifier, // Keep if other security features might use it
    // clearGlobalRecaptchaVerifier, 
    // sendSmsVerificationCodeEnrollment, // Removed
    // enrollSmsMfa, // Removed
    // unenrollSmsMfa, // Removed
    getUserMfaInfo, // Keep to check if (somehow) enrolled, or return empty
} from "@/services/auth"; 
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
// import { Input } from "@/components/ui/input"; // No longer needed for verification code
// import { Label } from "@/components/ui/label"; // No longer needed
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle, ShieldIcon } from "lucide-react"; // Changed icons - ShieldExclamation to ShieldIcon
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { MultiFactorInfo, RecaptchaVerifier, User } from "firebase/auth"; 

interface MfaManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: string | null | undefined; 
  onEnrollmentChange: (isEnrolled: boolean) => void; 
}

// MFA is removed, so this modal will now indicate that.
// type MfaStep = 'initial' | 'verifyCode' | 'enrolled' | 'unenrollConfirm'; // No longer needed

export function MfaManagementModal({
    isOpen,
    onClose,
    phoneNumber, // Still passed but not used for enrollment
    onEnrollmentChange // Still passed but will always call with false
}: MfaManagementModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  // const [currentStep, setCurrentStep] = useState<MfaStep>('initial'); // No longer needed
  const [isLoading, setIsLoading] = useState(false); // Keep for loading state if checking status
  // const [isEnrolled, setIsEnrolled] = useState(false); // No longer needed to track state here
  // const [verificationId, setVerificationId] = useState<string | null>(null); // No longer needed
  // const [verificationCode, setVerificationCode] = useState<string>(''); // No longer needed
  // const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null); // No longer needed
  // const recaptchaContainerRef = useRef<HTMLDivElement>(null); // No longer needed
  const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setError(null);
            // Simulate checking enrollment, but since MFA is off, always call with false
            onEnrollmentChange(false);
        }
    }, [isOpen, onEnrollmentChange]);


  // All handlers related to sending code, verifying, enrolling, unenrolling are REMOVED.
  // handleSendCode, handleVerifyCodeAndEnroll, handleUnenroll

  const renderContent = () => {
    return (
        <div className="space-y-4 py-4 text-center">
             <ShieldIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" /> {/* Replaced ShieldExclamation with ShieldIcon */}
            <p className="text-base font-semibold text-foreground">
                Multi-Factor Authentication (MFA)
            </p>
            <p className="text-sm text-muted-foreground">
                SMS-based two-factor authentication is currently not enabled for this portal.
                Please contact support if you require enhanced account security options.
            </p>
            {error && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
        </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card/85 dark:bg-card/70 border-border/50">
        <DialogHeader>
          <DialogTitle className="text-primary">Account Security</DialogTitle>
          <DialogDescription>
            Information about two-factor authentication.
          </DialogDescription>
        </DialogHeader>

        {renderContent()}

        <DialogFooter className="mt-4">
             <DialogClose asChild>
                 <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                     Close
                 </Button>
             </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

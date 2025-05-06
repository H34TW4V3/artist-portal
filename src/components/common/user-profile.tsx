

"use client";

import { useState, useEffect } from "react";
import { getAuth, sendEmailVerification, reload } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { app } from "@/services/firebase-config";
import { useAuth } from "@/context/auth-context";
import { getUserProfileByUid, setPublicProfile } from "@/services/user";
import { verifyBeforeUpdateEmail, sendVerificationEmail } from "@/services/auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { PasswordUpdateForm } from "@/components/profile/password-update-form";
import { ProfileForm, type ProfileFormValues } from "@/components/profile/profile-form";
// import { MfaManagementModal } from "@/components/profile/mfa-management-modal"; // MFA Modal no longer needed
import { useToast } from "@/hooks/use-toast";
import { LogOut, UserCog, KeyRound, Loader2, MailCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(50, "Name must be 50 characters or less."),
  email: z.string().email("Invalid email address."),
  bio: z.string().max(300, "Bio must be 300 characters or less.").optional().nullable(),
  phoneNumber: z.string().optional().nullable()
      .refine(val => !val || /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/.test(val), {
          message: "Invalid phone number format.",
       }),
  imageUrl: z.string().url("Invalid URL.").optional().nullable(),
  hasCompletedTutorial: z.boolean().optional().default(false),
  isLabel: z.boolean().optional().default(false), // Added isLabel field
});

export default function UserProfile() {
  const { user, logout, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const storage = getStorage(app);
  const router = useRouter();

  const [profileData, setProfileData] = useState<ProfileFormValues | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  // const [isMfaModalOpen, setIsMfaModalOpen] = useState(false); // MFA state removed
  // const [isSmsMfaEnrolled, setIsSmsMfaEnrolled] = useState(false); // MFA state removed
  const [isUpdating, setIsUpdating] = useState(false);
  const [showEmailVerificationNotice, setShowEmailVerificationNotice] = useState(false);

  // State for multi-step profile modal
  const [profileModalStep, setProfileModalStep] = useState(1);
  const PROFILE_MODAL_TOTAL_STEPS = 2;


  useEffect(() => {
    const fetchProfile = async () => {
      if (authLoading || !user?.uid) {
        setIsProfileLoading(false);
        setProfileData(null);
        // setIsSmsMfaEnrolled(false); // MFA state removed
        return;
      }

      setShowEmailVerificationNotice(!user.emailVerified);
      setIsProfileLoading(true);
      try {
        const fetchedProfile = await getUserProfileByUid(user.uid);

        if (fetchedProfile) {
            setProfileData(fetchedProfile);
            if (user.email !== fetchedProfile.email) {
                 console.warn(`UserProfile: Auth email (${user.email}) and Firestore profile email (${fetchedProfile.email}) mismatch. This could indicate a pending email update. Displaying Firestore email.`);
            }
        } else {
          console.log("No public profile found for user, creating default for display/edit...");
          const defaultData: ProfileFormValues = {
            name: user.displayName || user.email?.split('@')[0] || "User",
            email: user.email || "",
            imageUrl: user.photoURL || null,
            bio: null,
            phoneNumber: null,
            hasCompletedTutorial: false,
            isLabel: false,
          };
          setProfileData(defaultData);
        }

        // setIsSmsMfaEnrolled(false); // MFA state removed

      } catch (error) {
        console.error("Error fetching user profile in UserProfile component:", error);
        toast({
          title: "Error Loading Profile",
          description: "Could not load your profile data. Please try refreshing.",
          variant: "destructive",
        });
        setProfileData({
            name: user.displayName || "Error",
            email: user.email || "unknown",
            imageUrl: user.photoURL || null,
            bio: null,
            phoneNumber: null,
            hasCompletedTutorial: false,
            isLabel: false,
        });
        // setIsSmsMfaEnrolled(false); // MFA state removed
      } finally {
        setIsProfileLoading(false);
      }
    };

    fetchProfile();
  }, [user, authLoading, toast]);

  const handleLogout = async () => {
    try {
      await logout();
      toast({ title: "Logged Out", description: "You have been successfully logged out.", variant: "default", duration: 2000 });
    } catch (error) {
      console.error("Logout failed:", error);
      toast({ title: "Logout Failed", description: "Could not log out. Please try again.", variant: "destructive" });
    }
  };

  const handleUpdateProfile = async (
      data: ProfileFormValues,
      newImageFile?: File
  ): Promise<{ updatedData: ProfileFormValues }> => {
      if (!user?.uid) throw new Error("User not authenticated for profile update.");
      setIsUpdating(true);
      console.log("handleUpdateProfile: Received data:", data, "New image file:", newImageFile);


      let newImageUrl = profileData?.imageUrl || null;
      const currentAuthEmail = user.email;
      const formEmail = data.email.toLowerCase();
      let emailUpdateInitiated = false;

      try {
          if (formEmail && currentAuthEmail !== formEmail) {
              console.log("handleUpdateProfile: Attempting to update email from", currentAuthEmail, "to", formEmail);
              try {
                  await verifyBeforeUpdateEmail(formEmail);
                  emailUpdateInitiated = true;
                  toast({
                      title: "Verify New Email",
                      description: `A verification link has been sent to ${formEmail}. Please click the link to update your sign-in email. Your current email (${currentAuthEmail}) remains active until verification.`,
                      variant: "default",
                      duration: 10000,
                  });
              } catch (emailError: any) {
                   toast({
                       title: "Email Update Failed",
                       description: emailError.message || "Could not initiate email update.",
                       variant: "destructive",
                   });
              }
          }

          if (newImageFile) {
              console.log("handleUpdateProfile: Uploading new profile image...");
              const imageRef = ref(storage, `profileImages/${user.uid}/${newImageFile.name}`);
              const snapshot = await uploadBytes(imageRef, newImageFile);
              newImageUrl = await getDownloadURL(snapshot.ref);
              console.log("handleUpdateProfile: Image uploaded, URL:", newImageUrl);
          }

          const dataToSave: ProfileFormValues = {
              ...data,
              email: formEmail,
              imageUrl: newImageUrl,
              hasCompletedTutorial: data.hasCompletedTutorial ?? profileData?.hasCompletedTutorial ?? false,
              isLabel: data.isLabel ?? profileData?.isLabel ?? false,
          };

          await setPublicProfile(user.uid, dataToSave, true);

          setProfileData(dataToSave);
          console.log("handleUpdateProfile: Public profile updated successfully in Firestore and local state.");

          // Only close modal if on the last step and update was successful without email change needing verification
          // If email change is initiated, modal might stay open or have specific handling.
          // For now, we assume if not an email change or if email change is non-blocking, we can proceed to next step or close.

           if (!emailUpdateInitiated) { // Only toast success if no email verification is pending
               toast({
                   title: "Profile Updated",
                   description: "Your profile information has been saved.",
                   variant: "default",
                   duration: 2000,
               });
           }
          return { updatedData: dataToSave };
      } catch (error) {
          console.error("Error updating profile in handleUpdateProfile:", error);
          if (!(error instanceof Error && error.message.includes("email"))) {
             toast({
                title: "Update Failed",
                description: error instanceof Error ? error.message : "An unexpected error occurred while saving your profile.",
                variant: "destructive",
             });
          }
          throw error;
      } finally {
          setIsUpdating(false);
      }
  };


  const handleSendVerificationEmail = async () => {
        if (!user) return;
        setIsUpdating(true);
        try {
            await sendVerificationEmail();
            toast({
                title: "Verification Email Sent",
                description: `A verification link has been sent to ${user.email}. Please check your inbox.`,
                variant: "default",
                duration: 5000,
            });
        } catch (error: any) {
            toast({
                title: "Failed to Send Verification",
                description: error.message || "Could not send verification email.",
                variant: "destructive",
            });
        } finally {
            setIsUpdating(false);
        }
    };

   useEffect(() => {
     const checkVerification = async () => {
       if (user && !user.emailVerified) {
         await reload(user);
         const refreshedUser = getAuth(app).currentUser;
         if (refreshedUser?.emailVerified) {
           setShowEmailVerificationNotice(false);
           toast({ title: "Email Verified!", variant: "default" });
         } else {
            setShowEmailVerificationNotice(true);
         }
       } else {
         setShowEmailVerificationNotice(false);
       }
     };

     if (isProfileModalOpen) {
       checkVerification();
     }
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [isProfileModalOpen, user]);

    // const handleMfaEnrollmentChange = (enrolled: boolean) => { // MFA state removed
    //     setIsSmsMfaEnrolled(enrolled);
    // };

  const getInitials = (name: string | undefined | null): string => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };

  const isLoading = authLoading || isProfileLoading;
  const displayName = profileData?.name || user?.displayName || (profileData?.email ? profileData.email.split('@')[0] : 'Artist');
  const displayEmail = profileData?.email || user?.email || 'Loading...';
  const displayImageUrl = profileData?.imageUrl || user?.photoURL || undefined;


  if (authLoading && !user) {
      return <Skeleton className="h-12 w-12 rounded-full" />;
  }
  if (!authLoading && !user) {
      return null;
  }

  const handleNextProfileStep = () => {
    if (profileModalStep < PROFILE_MODAL_TOTAL_STEPS) {
        setProfileModalStep(profileModalStep + 1);
    } else {
        // This case should ideally be handled by the form's submit button
        // Or trigger form submission here if needed.
        // For now, if it's the last step, the "Save Changes" button in ProfileForm will handle closing.
    }
  };

  const handlePreviousProfileStep = () => {
      if (profileModalStep > 1) {
          setProfileModalStep(profileModalStep - 1);
      }
  };

  const openProfileModal = () => {
    setProfileModalStep(1); // Reset to first step when opening
    setIsProfileModalOpen(true);
  }


  return (
    <div className="flex items-center gap-2">
        {showEmailVerificationNotice && !isProfileModalOpen && (
             <Button
                variant="ghost"
                size="sm"
                onClick={handleSendVerificationEmail}
                disabled={isUpdating}
                className="text-destructive hover:bg-destructive/10 h-auto px-2 py-1 mr-2 animate-pulse"
                title="Verify your email address"
            >
                 <MailCheck className="h-4 w-4 mr-1.5" />
                 <span className="text-xs hidden sm:inline">Verify Email</span>
                 <span className="text-xs sm:hidden">Verify</span>
                {isUpdating && <Loader2 className="ml-1.5 h-3 w-3 animate-spin" />}
             </Button>
         )}

      {isLoading ? (
        <Skeleton className="h-12 w-12 rounded-full" />
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-12 w-12 rounded-full p-0 border-2 border-primary/30 hover:border-primary/60 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <Avatar className="h-full w-full">
                <AvatarImage src={displayImageUrl} alt={displayName} />
                <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
                   {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <span className="sr-only">Toggle user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 bg-popover border-border shadow-lg">
            <DropdownMenuLabel className="font-normal px-3 py-2">
              <div className="flex flex-col space-y-1">
                <p className="text-base font-medium leading-none text-foreground">{displayName}</p>
                <p className="text-sm leading-none text-muted-foreground">{displayEmail}</p>
                 {user && !user.emailVerified && (
                     <span className="text-xs text-destructive mt-1">(Email not verified)</span>
                 )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuItem onClick={openProfileModal} className="cursor-pointer focus:bg-accent focus:text-accent-foreground text-base py-2 px-3">
              <UserCog className="mr-2 h-5 w-5" />
              <span>Manage Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsPasswordModalOpen(true)} className="cursor-pointer focus:bg-accent focus:text-accent-foreground text-base py-2 px-3">
               <KeyRound className="mr-2 h-5 w-5" />
              <span>Change Password</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer text-base py-2 px-3">
              <LogOut className="mr-2 h-5 w-5" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

       <Dialog open={isProfileModalOpen} onOpenChange={(open) => { if (!open) setProfileModalStep(1); setIsProfileModalOpen(open); }}>
           <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl bg-card/85 dark:bg-card/70 border-border/50">
               <DialogHeader>
                  <DialogTitle className="text-primary">Manage Your Profile</DialogTitle>
                   <DialogDescription className="text-muted-foreground">
                        {profileModalStep === 1 && "Update your personal details and profile picture."}
                        {profileModalStep === 2 && "Review and manage account settings."}
                   </DialogDescription>
               </DialogHeader>
                {showEmailVerificationNotice && (
                     <Alert variant="destructive" className="mt-4">
                          <MailCheck className="h-4 w-4" />
                         <AlertTitle>Email Not Verified</AlertTitle>
                          <AlertDescription className="flex justify-between items-center">
                             <span>Please verify your email address ({displayEmail}).</span>
                             <Button
                                 variant="link"
                                 size="sm"
                                 onClick={handleSendVerificationEmail}
                                 disabled={isUpdating}
                                 className="text-destructive h-auto p-0"
                             >
                                 {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resend Email"}
                             </Button>
                          </AlertDescription>
                     </Alert>
                 )}
                {profileData && !isProfileLoading ? (
                    // Conditionally render form content based on step
                    profileModalStep === 1 ? (
                        <ProfileForm
                            key={user?.uid || 'profile-form'}
                            initialData={profileData}
                            updateFunction={handleUpdateProfile}
                            onCancel={() => setIsProfileModalOpen(false)}
                            onSuccess={(updatedData) => {
                                 setProfileData(updatedData);
                                 // Optionally move to next step or close modal based on logic
                                 // For now, ProfileForm's save will handle its own success (e.g., may not close modal directly)
                            }}
                            // onManageMfa={() => setIsMfaModalOpen(true)} // MFA removed
                            // isSmsMfaEnrolled={isSmsMfaEnrolled} // MFA removed
                            className="bg-transparent shadow-none border-0 p-0 mt-2"
                        />
                    ) : profileModalStep === 2 ? (
                        <div className="p-6 space-y-6">
                             <h3 className="text-lg font-semibold text-foreground">Account Settings</h3>
                             <p className="text-sm text-muted-foreground">
                                 Additional account settings and preferences will be available here in the future.
                                 For now, you can manage your password via the main profile dropdown.
                             </p>
                             {/* Example: Placeholder for future settings */}
                              <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm bg-background/50 dark:bg-background/30">
                                 <div className="space-y-0.5">
                                     <FormLabel className="flex items-center gap-2"><Users className="h-4 w-4" /> Account Type</FormLabel>
                                     <FormDescription className="text-xs">
                                         This account is currently a: <span className="font-semibold">{profileData.isLabel ? "Label Account" : "Artist Account"}</span>.
                                         Contact support to change your account type.
                                     </FormDescription>
                                 </div>
                              </div>
                        </div>
                    ) : null
                ) : (
                     <div className="flex justify-center items-center p-10">
                         <div className="flex flex-col items-center gap-4">
                              <Skeleton className="h-24 w-24 rounded-full" />
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-4 w-48" />
                         </div>
                     </div>
                 )}
                 {/* Footer for step navigation */}
                 <DialogFooter className="pt-4 border-t border-border/30">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handlePreviousProfileStep}
                        disabled={profileModalStep === 1 || isUpdating}
                        className={cn(profileModalStep === 1 && "invisible")}
                    >
                        Previous
                    </Button>
                    {profileModalStep < PROFILE_MODAL_TOTAL_STEPS ? (
                        <Button
                            type="button"
                            onClick={handleNextProfileStep}
                            disabled={isUpdating}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                            Next
                        </Button>
                    ) : (
                         // Save button is now part of ProfileForm for step 1
                         // For step 2 or other final steps, a different "Done" or "Close" might be appropriate
                         // Or if step 1 (ProfileForm) handles its own save & close:
                        <DialogClose asChild>
                            <Button type="button" variant="default" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                                Done
                            </Button>
                        </DialogClose>
                    )}
                </DialogFooter>
           </DialogContent>
       </Dialog>


      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent className="sm:max-w-md bg-card/85 dark:bg-card/70 border-border/50">
          <DialogHeader>
            <DialogTitle className="text-primary">Change Password</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Enter and confirm your new password.
            </DialogDescription>
          </DialogHeader>
           <PasswordUpdateForm
                onSuccess={() => setIsPasswordModalOpen(false)}
                onCancel={() => setIsPasswordModalOpen(false)}
                className="pt-4"
            />
        </DialogContent>
      </Dialog>

        {/* MFA Modal Removed */}
        {/*
        <MfaManagementModal
             isOpen={isMfaModalOpen}
             onClose={() => setIsMfaModalOpen(false)}
             phoneNumber={profileData?.phoneNumber}
             onEnrollmentChange={handleMfaEnrollmentChange}
        />
        */}
    </div>
  );
}

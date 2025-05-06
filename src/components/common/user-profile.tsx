
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
import { MfaManagementModal } from "@/components/profile/mfa-management-modal"; 
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
  emailLinkSignInEnabled: z.boolean().optional().default(false),
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
  const [isMfaModalOpen, setIsMfaModalOpen] = useState(false); 
  const [isSmsMfaEnrolled, setIsSmsMfaEnrolled] = useState(false); 
  const [isUpdating, setIsUpdating] = useState(false);
  const [showEmailVerificationNotice, setShowEmailVerificationNotice] = useState(false); 

  useEffect(() => {
    const fetchProfile = async () => { 
      if (authLoading || !user?.uid) {
        setIsProfileLoading(false);
        setProfileData(null);
        setIsSmsMfaEnrolled(false); 
        return;
      }

      setShowEmailVerificationNotice(!user.emailVerified);
      setIsProfileLoading(true);
      try {
        const fetchedProfile = await getUserProfileByUid(user.uid);
        
        if (fetchedProfile) {
            setProfileData(fetchedProfile);
            // The email displayed should be from Firestore, as it reflects the intended/verified email.
            // Auth email (user.email) might be outdated if an update is pending.
            // If fetchedProfile.email and user.email (auth) differ, it usually means an email update is pending.
             if (user.email !== fetchedProfile.email) {
                 console.warn(`UserProfile: Auth email (${user.email}) and Firestore profile email (${fetchedProfile.email}) mismatch. This could indicate a pending email update. Displaying Firestore email.`);
            }
        } else {
          console.log("No public profile found for user, creating default...");
          const defaultData: ProfileFormValues = {
            name: user.displayName || user.email?.split('@')[0] || "User",
            email: user.email || "", // Initialize with auth email
            imageUrl: user.photoURL || null,
            bio: null,
            phoneNumber: null,
            hasCompletedTutorial: false,
            emailLinkSignInEnabled: false,
          };
          // Use merge:false (create only) for the initial setup.
          await setPublicProfile(user.uid, defaultData, false); 
          setProfileData(defaultData);
        }

        setIsSmsMfaEnrolled(false); 

      } catch (error) {
        console.error("Error fetching user profile in UserProfile component:", error); 
        toast({
          title: "Error Loading Profile", 
          description: "Could not load your profile data. Please try refreshing.",
          variant: "destructive",
        });
        // Fallback profileData structure
        setProfileData({
            name: user.displayName || "Error",
            email: user.email || "unknown",
            imageUrl: user.photoURL || null,
            bio: null,
            phoneNumber: null,
            hasCompletedTutorial: false,
            emailLinkSignInEnabled: false,
        });
        setIsSmsMfaEnrolled(false); 
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

  // This function will be passed to ProfileForm's updateFunction prop
  const handleUpdateProfile = async (
      data: ProfileFormValues, // Data from the form
      newImageFile?: File      // Optional new image file
  ): Promise<{ updatedData: ProfileFormValues }> => {
      if (!user?.uid) throw new Error("User not authenticated for profile update.");
      setIsUpdating(true);
      console.log("handleUpdateProfile: Received data:", data, "New image file:", newImageFile);


      let newImageUrl = profileData?.imageUrl || null; // Start with current or null
      const currentAuthEmail = user.email; // Get current email from Firebase Auth user object
      const formEmail = data.email.toLowerCase(); // Ensure form email is lowercase
      let emailUpdateInitiated = false;

      try {
          // Handle email change - initiate verification if email differs
          if (formEmail && currentAuthEmail !== formEmail) {
              console.log("handleUpdateProfile: Attempting to update email from", currentAuthEmail, "to", formEmail);
              try {
                  await verifyBeforeUpdateEmail(formEmail); // Service function to handle Firebase email update
                  emailUpdateInitiated = true;
                  toast({
                      title: "Verify New Email",
                      description: `A verification link has been sent to ${formEmail}. Please click the link to update your sign-in email. Your current email (${currentAuthEmail}) remains active until verification.`,
                      variant: "default",
                      duration: 10000, // Longer duration for user to act
                  });
                  // Note: Firestore email will be updated by setPublicProfile below.
                  // Auth email updates after user clicks verification link.
              } catch (emailError: any) {
                   toast({
                       title: "Email Update Failed",
                       description: emailError.message || "Could not initiate email update.",
                       variant: "destructive",
                   });
                   // Don't throw here, allow other profile updates to proceed if desired,
                   // or re-throw if email update is critical for the whole operation.
                   // For now, we'll let other updates proceed, but the email in `data` will be the new one.
                   // The `setPublicProfile` will save this new email to Firestore.
              }
          }

          // Handle image upload if a new file is provided
          if (newImageFile) {
              console.log("handleUpdateProfile: Uploading new profile image...");
              const imageRef = ref(storage, `profileImages/${user.uid}/${newImageFile.name}`);
              const snapshot = await uploadBytes(imageRef, newImageFile);
              newImageUrl = await getDownloadURL(snapshot.ref);
              console.log("handleUpdateProfile: Image uploaded, URL:", newImageUrl);
          }

          // Prepare the final data object to save to Firestore.
          // This includes the potentially new email and image URL.
          const dataToSave: ProfileFormValues = {
              ...data, // Form data (name, bio, phoneNumber, hasCompletedTutorial etc.)
              email: formEmail, // Always save the email from the form (lowercase)
              imageUrl: newImageUrl, // New or existing image URL
              // Ensure all fields from ProfileFormValues are covered
              hasCompletedTutorial: data.hasCompletedTutorial ?? profileData?.hasCompletedTutorial ?? false,
              // emailLinkSignInEnabled is optional, include if present
              ...(data.emailLinkSignInEnabled !== undefined && { emailLinkSignInEnabled: data.emailLinkSignInEnabled }),
          };

          // Save updated profile to Firestore using the service function
          // The `setPublicProfile` function will handle creating or merging the profile document.
          await setPublicProfile(user.uid, dataToSave, true); // true for merge

          // Update local state to reflect changes immediately
          setProfileData(dataToSave);
          console.log("handleUpdateProfile: Public profile updated successfully in Firestore and local state.");

          // Close modal if it was open (typically handled by the form itself, but good to ensure)
          setIsProfileModalOpen(false); 

          // Show success toast ONLY if email update wasn't the primary action that needs user intervention
           if (!emailUpdateInitiated) {
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
          // Avoid showing a generic toast if a specific one (like email update failed) was already shown
          if (!(error instanceof Error && error.message.includes("email"))) {
             toast({
                title: "Update Failed",
                description: error instanceof Error ? error.message : "An unexpected error occurred while saving your profile.",
                variant: "destructive",
             });
          }
          throw error; // Re-throw to be caught by the form if needed
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

    const handleMfaEnrollmentChange = (enrolled: boolean) => {
        setIsSmsMfaEnrolled(enrolled); 
    };

  const getInitials = (name: string | undefined | null): string => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };

  const isLoading = authLoading || isProfileLoading;
  // Prioritize Firestore profileData for display, then auth user data, then fallbacks
  const displayName = profileData?.name || user?.displayName || (profileData?.email ? profileData.email.split('@')[0] : 'Artist');
  const displayEmail = profileData?.email || user?.email || 'Loading...';
  const displayImageUrl = profileData?.imageUrl || user?.photoURL || undefined;


  if (authLoading && !user) {
      return <Skeleton className="h-12 w-12 rounded-full" />;
  }
  if (!authLoading && !user) {
      return null;
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
            <DropdownMenuItem onClick={() => setIsProfileModalOpen(true)} className="cursor-pointer focus:bg-accent focus:text-accent-foreground text-base py-2 px-3">
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

       <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
           <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl bg-card/85 dark:bg-card/70 border-border/50">
               <DialogHeader>
                  <DialogTitle className="text-primary">Manage Your Profile</DialogTitle>
                   <DialogDescription className="text-muted-foreground">
                       Update your personal details, profile picture, and sign-in preferences.
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
                    <ProfileForm
                        key={user?.uid || 'profile-form'} // Add key to ensure re-render if user changes
                        initialData={profileData}
                        updateFunction={handleUpdateProfile} // Pass the new update function
                        onCancel={() => setIsProfileModalOpen(false)}
                         onSuccess={(updatedData) => {
                             setProfileData(updatedData); // Update local state on successful save from form
                             // setIsProfileModalOpen(false); // Form might handle its own closing or success callback
                         }}
                         onManageMfa={() => setIsMfaModalOpen(true)} 
                         isSmsMfaEnrolled={isSmsMfaEnrolled} 
                         className="bg-transparent shadow-none border-0 p-0 mt-2"
                    />
                ) : (
                     <div className="flex justify-center items-center p-10">
                         <div className="flex flex-col items-center gap-4">
                              <Skeleton className="h-24 w-24 rounded-full" />
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-4 w-48" />
                         </div>
                     </div>
                 )}
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

        <MfaManagementModal
             isOpen={isMfaModalOpen}
             onClose={() => setIsMfaModalOpen(false)}
             phoneNumber={profileData?.phoneNumber} 
             onEnrollmentChange={handleMfaEnrollmentChange} 
        />
    </div>
  );
}

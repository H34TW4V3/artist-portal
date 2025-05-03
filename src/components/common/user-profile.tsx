
"use client";

import { useState, useEffect } from "react";
import { getAuth, sendEmailVerification, reload } from "firebase/auth"; // Import sendEmailVerification and reload
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { app } from "@/services/firebase-config";
import { useAuth } from "@/context/auth-context";
import { getUserProfileByUid, setPublicProfile } from "@/services/user";
// Import the new email verification service function
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
import { useToast } from "@/hooks/use-toast";
import { LogOut, UserCog, KeyRound, Loader2, MailCheck } from "lucide-react"; // Added MailCheck
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

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
  const [isUpdating, setIsUpdating] = useState(false);
  const [showEmailVerificationNotice, setShowEmailVerificationNotice] = useState(false); // State for verification notice

  // Fetch profile data from Firestore using the service function
  useEffect(() => {
    const fetchProfileData = async () => {
      if (authLoading || !user?.uid) {
        setIsProfileLoading(false);
        setProfileData(null);
        return;
      }

      // Check email verification status after auth state is confirmed
      setShowEmailVerificationNotice(!user.emailVerified);

      setIsProfileLoading(true);
      try {
        const fetchedProfile = await getUserProfileByUid(user.uid);

        if (fetchedProfile) {
             const completeProfile: ProfileFormValues = {
                name: fetchedProfile.name || user.displayName || "User",
                email: fetchedProfile.email || user.email || "", // Use Firestore email first
                bio: fetchedProfile.bio || null,
                phoneNumber: fetchedProfile.phoneNumber || null,
                imageUrl: fetchedProfile.imageUrl || user.photoURL || null,
                hasCompletedTutorial: fetchedProfile.hasCompletedTutorial || false,
                emailLinkSignInEnabled: fetchedProfile.emailLinkSignInEnabled || false,
            };
            setProfileData(completeProfile);
            // Update form if email differs between auth and Firestore (rare case)
            if (user.email !== completeProfile.email) {
                 console.warn("Auth email and Firestore profile email mismatch. Firestore profile used.");
            }
        } else {
          console.log("No public profile found for user, creating default...");
          const defaultData: ProfileFormValues = {
            name: user.displayName || user.email?.split('@')[0] || "User",
            email: user.email || "",
            imageUrl: user.photoURL || null,
            bio: null,
            phoneNumber: null,
            hasCompletedTutorial: false,
            emailLinkSignInEnabled: false,
          };
          await setPublicProfile(user.uid, defaultData, false);
          setProfileData(defaultData);
        }
      } catch (error) {
        console.error("Error fetching/creating user profile in UserProfile component:", error);
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
            emailLinkSignInEnabled: false,
        });
      } finally {
        setIsProfileLoading(false);
      }
    };

    fetchProfileData();
  }, [user, authLoading, toast]); // Include authLoading and toast

  const handleLogout = async () => {
    try {
      await logout();
      toast({ title: "Logged Out", description: "You have been successfully logged out.", variant: "default", duration: 2000 });
    } catch (error) {
      console.error("Logout failed:", error);
      toast({ title: "Logout Failed", description: "Could not log out. Please try again.", variant: "destructive" });
    }
  };

  // Function to handle profile updates (passed to ProfileForm)
  const handleUpdateProfile = async (
      data: ProfileFormValues,
      newImageFile?: File
  ): Promise<{ updatedData: ProfileFormValues }> => {
      if (!user?.uid) throw new Error("User not authenticated.");
      setIsUpdating(true);

      let newImageUrl = profileData?.imageUrl || null;
      const currentAuthEmail = user.email;
      const formEmail = data.email;
      let emailUpdateInitiated = false;

      try {
          // 1. Handle Email Update (if changed)
          if (formEmail && currentAuthEmail !== formEmail) {
              console.log("Attempting to update email from", currentAuthEmail, "to", formEmail);
              try {
                  await verifyBeforeUpdateEmail(formEmail);
                  emailUpdateInitiated = true;
                  // Update Firestore email immediately for display, but auth change is pending verification
                  data.email = formEmail; // Ensure data sent to setPublicProfile has the new email
                  toast({
                      title: "Verify New Email",
                      description: `A verification link has been sent to ${formEmail}. Please click the link to update your sign-in email. Your current email remains active until verification.`,
                      variant: "default",
                      duration: 10000, // Longer duration for important notice
                  });
              } catch (emailError: any) {
                  // Handle specific email update errors (e.g., requires-recent-login)
                   toast({
                       title: "Email Update Failed",
                       description: emailError.message || "Could not initiate email update.",
                       variant: "destructive",
                   });
                   // Don't proceed with other updates if email change failed
                   setIsUpdating(false);
                   throw emailError; // Re-throw to stop ProfileForm
              }
          } else {
               // Ensure the email being saved is the current verified one if not changed
               data.email = currentAuthEmail || data.email;
          }


          // 2. Handle Image Upload (if newImageFile exists)
          if (newImageFile) {
              console.log("Uploading new profile image...");
              const imageRef = ref(storage, `profileImages/${user.uid}/${newImageFile.name}`);
              const snapshot = await uploadBytes(imageRef, newImageFile);
              newImageUrl = await getDownloadURL(snapshot.ref);
              console.log("Image uploaded, URL:", newImageUrl);
          }

          // 3. Prepare data for Firestore update
          // Use the potentially updated email from step 1
          const dataToSave: ProfileFormValues = {
              ...data,
              email: data.email, // Use the email from data (could be new or old)
              imageUrl: newImageUrl,
              hasCompletedTutorial: profileData?.hasCompletedTutorial || false,
          };

          // 4. Update Firestore Document
          await setPublicProfile(user.uid, dataToSave, true);

          // 5. Update local state
          setProfileData(dataToSave);

          console.log("Public profile updated successfully in Firestore.");
          setIsProfileModalOpen(false);

          // Show general success toast ONLY if email wasn't changed (email change has its own toast)
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
          console.error("Error updating profile:", error);
          // Re-throw error for ProfileForm unless it was the email update error handled above
          if (!emailUpdateInitiated || !(error instanceof Error && error.message.includes("email"))) {
                toast({
                    title: "Update Failed",
                    description: error instanceof Error ? error.message : "An unexpected error occurred.",
                    variant: "destructive",
                });
                throw error; // Ensure ProfileForm knows it failed if not email related
          }
          // If it was an email error that was already handled, return gracefully
           return { updatedData: profileData || data }; // Return current/previous state on handled email error
      } finally {
          setIsUpdating(false);
      }
  };


  const handleSendVerificationEmail = async () => {
        if (!user) return;
        setIsUpdating(true); // Reuse updating state for loading indication
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

   // Check email verification status periodically or after user action
   // Example: Check when profile modal is opened
   useEffect(() => {
     const checkVerification = async () => {
       if (user && !user.emailVerified) {
         await reload(user); // Reload user data from Firebase
         if (user.emailVerified) {
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
   }, [isProfileModalOpen, user]); // Check when modal opens or user object potentially changes


  const getInitials = (name: string | undefined | null): string => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };

  const isLoading = authLoading || isProfileLoading;
  const displayName = profileData?.name || user?.displayName || (user?.email ? user.email.split('@')[0] : 'Artist');
  const displayImageUrl = profileData?.imageUrl || user?.photoURL || undefined;


  if (authLoading && !user) {
      return <Skeleton className="h-12 w-12 rounded-full" />;
  }
  if (!authLoading && !user) {
      return null;
  }


  return (
    <div className="flex items-center gap-2">
        {/* Email Verification Notice */}
        {showEmailVerificationNotice && !isProfileModalOpen && (
             <Button
                variant="ghost" // Or "destructive" if you prefer
                size="sm"
                onClick={handleSendVerificationEmail}
                disabled={isUpdating}
                className="text-destructive hover:bg-destructive/10 h-auto px-2 py-1 mr-2 animate-pulse" // Subtle pulse animation
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
                <p className="text-sm leading-none text-muted-foreground">{user?.email}</p>
                 {/* Show verification status */}
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

      {/* Profile Edit Modal */}
       <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
           <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl bg-card/85 dark:bg-card/70 border-border/50">
               <DialogHeader>
                  <DialogTitle className="text-primary">Manage Your Profile</DialogTitle>
                   <DialogDescription className="text-muted-foreground">
                       Update your personal details, profile picture, and sign-in preferences.
                   </DialogDescription>
               </DialogHeader>
                {/* Email Verification Notice inside Modal */}
                {showEmailVerificationNotice && (
                     <Alert variant="destructive" className="mt-4">
                          <MailCheck className="h-4 w-4" />
                         <AlertTitle>Email Not Verified</AlertTitle>
                          <AlertDescription className="flex justify-between items-center">
                             <span>Please verify your email address ({user?.email}).</span>
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
                        key={user?.uid || 'profile-form'}
                        initialData={profileData}
                        updateFunction={handleUpdateProfile}
                        onCancel={() => setIsProfileModalOpen(false)}
                         onSuccess={() => {
                            // Modal closing is handled by handleUpdateProfile
                         }}
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


      {/* Change Password Modal */}
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
    </div>
  );
}

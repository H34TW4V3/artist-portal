
"use client";

import { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "firebase/firestore"; // Import updateDoc
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Import storage functions
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { app } from "@/services/firebase-config"; // Import your Firebase config
import { useAuth } from "@/context/auth-context"; // Import useAuth to get the current user and logout
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog"; // Import Dialog components
import { PasswordUpdateForm } from "@/components/profile/password-update-form"; // Import Password Update Form
import { ProfileForm, type ProfileFormValues } from "@/components/profile/profile-form"; // Import Profile Form and its type
import { useToast } from "@/hooks/use-toast";
import { LogOut, UserCog, KeyRound, Loader2 } from "lucide-react"; // Removed FileText icon
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation"; // Import useRouter from next/navigation

// --- Zod Schema for User Profile Data (Matches ProfileForm) ---
const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(50, "Name must be 50 characters or less."),
  email: z.string().email("Invalid email address."),
  bio: z.string().max(300, "Bio must be 300 characters or less.").optional().nullable(),
  phoneNumber: z.string().optional().nullable()
      .refine(val => !val || /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/.test(val), {
          message: "Invalid phone number format.",
       }),
  imageUrl: z.string().url("Invalid URL.").optional().nullable(),
});

// Define the component as a default export
export default function UserProfile() {
  const { user, logout, loading: authLoading } = useAuth(); // Get user, logout function, and auth loading state from context
  const { toast } = useToast();
  const db = getFirestore(app); // Get Firestore instance
  const storage = getStorage(app); // Get Storage instance
  const router = useRouter(); // Use next/navigation router

  const [profileData, setProfileData] = useState<ProfileFormValues | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true); // Separate loading state for profile data
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false); // For profile update loading state


  // Fetch profile data from Firestore
  useEffect(() => {
    const fetchProfileData = async () => {
      // Only fetch if the user exists and auth is not loading
      if (authLoading || !user) {
        setIsProfileLoading(false); // Stop loading if auth is loading or no user
        if (!user) setProfileData(null); // Clear profile data if no user
        return;
      }

      setIsProfileLoading(true); // Start loading profile data
      try {
        const userDocRef = doc(db, "users", user.uid); // Use user's UID
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
           // Validate fetched data against schema (optional but good practice)
           const result = profileSchema.safeParse(docSnap.data());
           if (result.success) {
               setProfileData(result.data);
           } else {
               console.warn("Firestore data validation failed:", result.error);
               // Handle potentially incomplete/invalid data, maybe set defaults
               setProfileData({
                   name: user.displayName || user.email?.split('@')[0] || "User",
                   email: user.email || "",
                   imageUrl: user.photoURL || null,
                   bio: null,
                   phoneNumber: null,
               });
           }
        } else {
          // No profile document exists yet, create one with defaults
          console.log("No profile found for user, creating default...");
          const defaultData: ProfileFormValues = {
            name: user.displayName || user.email?.split('@')[0] || "User", // Use display name or email part
            email: user.email || "", // Get email from auth user
            imageUrl: user.photoURL || null, // Get photo URL from auth user if available
            bio: null,
            phoneNumber: null,
          };
          await setDoc(userDocRef, defaultData); // Create the document
          setProfileData(defaultData);
        }
      } catch (error) {
        console.error("Error fetching/creating user profile:", error);
        toast({
          title: "Error Loading Profile",
          description: "Could not load your profile data.",
          variant: "destructive",
        });
        // Set some default state even on error?
        setProfileData({
            name: "Error",
            email: user.email || "unknown",
            imageUrl: null,
            bio: null,
            phoneNumber: null,
        });
      } finally {
        setIsProfileLoading(false); // Finish loading profile data
      }
    };

    fetchProfileData();
  }, [user, db, toast, authLoading]); // Include authLoading in dependency array

  // Handle user logout using the function from context
  const handleLogout = async () => {
    try {
      await logout(); // Call logout from context (handles cookie removal)
      toast({ title: "Logged Out", description: "You have been successfully logged out.", variant: "default", duration: 2000 });
      // No explicit redirect needed here, middleware/AuthProvider handles it
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
      if (!user) throw new Error("User not authenticated.");
      setIsUpdating(true);

      let newImageUrl = profileData?.imageUrl || null; // Start with current URL

      try {
          // 1. Handle Image Upload (if newImageFile exists)
          if (newImageFile) {
              console.log("Uploading new profile image...");
              const imageRef = ref(storage, `profileImages/${user.uid}/${newImageFile.name}`);
              const snapshot = await uploadBytes(imageRef, newImageFile);
              newImageUrl = await getDownloadURL(snapshot.ref);
              console.log("Image uploaded, URL:", newImageUrl);
          }

          // 2. Prepare data for Firestore update
          const dataToSave: ProfileFormValues = {
              ...data, // Include updated name, bio, phone
              email: user.email || data.email, // Ensure email is correct
              imageUrl: newImageUrl, // Use the potentially new image URL
          };

          // 3. Update Firestore Document
          const userDocRef = doc(db, "users", user.uid);
          await updateDoc(userDocRef, dataToSave); // Use updateDoc to only change provided fields

          // 4. Update local state immediately for better UX
          setProfileData(dataToSave);

          console.log("Profile updated successfully in Firestore.");
          setIsProfileModalOpen(false); // Close modal on success
          return { updatedData: dataToSave };

      } catch (error) {
          console.error("Error updating profile:", error);
          // Throw the error so ProfileForm can catch it and show a toast
          throw new Error(error instanceof Error ? error.message : "Failed to update profile.");
      } finally {
          setIsUpdating(false);
      }
  };


  // Function to get initials from name
  const getInitials = (name: string | undefined) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'; // Default to 'U'
  };

  // Combine auth loading and profile loading for the skeleton display
  const isLoading = authLoading || isProfileLoading;

  // Determine display name and image URL based on loaded data or user defaults
  const artistName = profileData?.name || user?.displayName || (user?.email ? user.email.split('@')[0] : 'Artist'); // Use profileData.name first
  const displayImageUrl = profileData?.imageUrl || user?.photoURL || undefined;


  // Don't render anything if authentication is still loading and no user is known yet
  // This prevents brief rendering of the component before potential redirection
  if (authLoading && !user) {
      return <Skeleton className="h-12 w-12 rounded-full" />; // Show skeleton during initial auth check
  }

  // If not loading and no user exists (e.g., after failed login or logout), render nothing or a placeholder
  if (!authLoading && !user) {
      return null; // Or a placeholder if preferred
  }


  return (
    <div className="flex items-center gap-2">
      {isLoading ? (
        <Skeleton className="h-12 w-12 rounded-full" /> // Increased size
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-12 w-12 rounded-full p-0 border-2 border-primary/30 hover:border-primary/60 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"> {/* Increased size */}
              <Avatar className="h-full w-full">
                <AvatarImage src={displayImageUrl} alt={artistName} />
                <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
                  {getInitials(artistName)}
                </AvatarFallback>
              </Avatar>
              <span className="sr-only">Toggle user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 bg-popover border-border shadow-lg"> {/* Increased width */}
            <DropdownMenuLabel className="font-normal px-3 py-2"> {/* Adjusted padding */}
              <div className="flex flex-col space-y-1">
                <p className="text-base font-medium leading-none text-foreground">{artistName}</p> {/* Display artistName */}
                <p className="text-sm leading-none text-muted-foreground">{user?.email}</p> {/* Increased size to text-sm */}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuItem onClick={() => setIsProfileModalOpen(true)} className="cursor-pointer focus:bg-accent focus:text-accent-foreground text-base py-2 px-3"> {/* Increased size, padding */}
              <UserCog className="mr-2 h-5 w-5" /> {/* Increased icon size */}
              <span>Manage Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsPasswordModalOpen(true)} className="cursor-pointer focus:bg-accent focus:text-accent-foreground text-base py-2 px-3"> {/* Increased size, padding */}
               <KeyRound className="mr-2 h-5 w-5" /> {/* Increased icon size */}
              <span>Change Password</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer text-base py-2 px-3"> {/* Increased size, padding */}
              <LogOut className="mr-2 h-5 w-5" /> {/* Increased icon size */}
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Profile Edit Modal */}
       <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
           <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl bg-card/85 dark:bg-card/70 border-border/50"> {/* Adjusted opacity */}
               <DialogHeader>
                  <DialogTitle className="text-primary">Manage Your Profile</DialogTitle>
                   <DialogDescription className="text-muted-foreground">
                       Update your personal details and profile picture.
                   </DialogDescription>
               </DialogHeader>
                {/* Pass profile data and update function to the form */}
                {profileData && !isProfileLoading && ( // Render form only when profile data is loaded
                    <ProfileForm
                        key={user?.uid || 'profile-form'} // Ensure remount on user change if needed
                        initialData={profileData}
                        updateFunction={handleUpdateProfile}
                        onCancel={() => setIsProfileModalOpen(false)} // Close modal on cancel
                         onSuccess={() => {
                            setIsProfileModalOpen(false); // Close modal on success handled by handleUpdateProfile
                         }}
                         className="bg-transparent shadow-none border-0 p-0 mt-2" // Adjust styles for modal
                    />
                )}
                 {/* Show loading indicator inside modal while profile data loads initially */}
                 {isProfileLoading && ( // Use profile-specific loading state here
                     <div className="flex justify-center items-center p-10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                     </div>
                 )}
           </DialogContent>
       </Dialog>


      {/* Change Password Modal */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent className="sm:max-w-md bg-card/85 dark:bg-card/70 border-border/50"> {/* Adjusted opacity */}
          <DialogHeader>
            <DialogTitle className="text-primary">Change Password</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Enter and confirm your new password.
            </DialogDescription>
          </DialogHeader>
           <PasswordUpdateForm
                onSuccess={() => setIsPasswordModalOpen(false)} // Close modal on success
                onCancel={() => setIsPasswordModalOpen(false)} // Close modal on cancel
                className="pt-4"
            />
        </DialogContent>
      </Dialog>
    </div>
  );
}


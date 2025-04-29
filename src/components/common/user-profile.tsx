
"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Import useRouter
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { User, LogOut, Settings, FileText, LockKeyhole } from 'lucide-react'; // Added LockKeyhole
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { ProfileForm, type ProfileFormValues } from "@/components/profile/profile-form";
import { PasswordUpdateForm } from "@/components/profile/password-update-form"; // Import PasswordUpdateForm
import { cn } from "@/lib/utils";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context'; // Import useAuth
import type { User as FirebaseUser } from 'firebase/auth'; // Type for Firebase user
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton


// Mock function to fetch profile data (replace with actual API call using authenticated user ID)
// Function signature now includes the user object
const fetchProfileData = async (user: FirebaseUser | null): Promise<ProfileFormValues> => {
  if (!user) throw new Error("User not authenticated to fetch profile data.");
  console.log(`Mock API: Fetching profile data for user ${user.uid}...`);
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  // Return mock data - in real app, fetch based on user.uid from Firestore
  // Use displayName from Auth as default if Firestore doesn't have 'name' yet
  // Use photoURL from Auth as default if Firestore doesn't have 'imageUrl' yet
  return {
    name: user.displayName || "Artist Name", // Simulate fetching name, fallback to Auth displayName
    email: user.email || "artist@example.com", // Email comes from Auth
    bio: "Passionate musician creating unique soundscapes. Exploring the boundaries of electronic music.", // Simulate fetching bio
    phoneNumber: "+1 123-456-7890", // Simulate fetching phone
    imageUrl: user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`, // Simulate fetching imageUrl, fallback to Auth photoURL
  };
};

// Mock function to update profile data (replace with actual API call using authenticated user ID)
// Function signature now includes the user object
const updateProfileData = async (user: FirebaseUser | null, data: ProfileFormValues, newImageFile?: File): Promise<{ updatedData: ProfileFormValues }> => {
    if (!user) throw new Error("User not authenticated to update profile data.");
    console.log(`Mock API: Updating profile data for user ${user.uid}...`, data);

    let finalImageUrl = data.imageUrl; // Start with potentially existing URL

    // Simulate Image Upload if new file provided
    if (newImageFile) {
        console.log("Mock API: Simulating upload for image:", newImageFile.name);
        await new Promise(resolve => setTimeout(resolve, 1500));
        // Simulate getting a new URL after upload
        finalImageUrl = `https://picsum.photos/seed/${user.uid}-${Date.now()}/100/100`; // New simulated URL
        console.log("Mock API: Simulated upload complete. New URL:", finalImageUrl);
        // In a real Firebase app, you'd update the user's auth profile photoURL:
        // try { await updateProfile(user, { photoURL: finalImageUrl }); } catch (e) { console.error("Failed to update auth photoURL", e); }
    }

    // Simulate updating Firestore data (name, bio, phone) and maybe imageUrl if changed
    await new Promise(resolve => setTimeout(resolve, 600));
    // In a real Firebase app, you might update auth displayName:
    // if (data.name !== user.displayName) {
    //     try { await updateProfile(user, { displayName: data.name }); } catch (e) { console.error("Failed to update auth displayName", e); }
    // }
    // You would update the Firestore document for the user with { name: data.name, bio: data.bio, phoneNumber: data.phoneNumber, imageUrl: finalImageUrl }

    if (Math.random() < 0.1) {
      throw new Error("Failed to update profile. Please try again.");
    }
    console.log("Mock API: Profile updated successfully.");
    // Return the data that *would* be in the database, including the potentially new image URL
    return { updatedData: { ...data, imageUrl: finalImageUrl } };
};


interface UserProfileProps {
  // Props like name and imageUrl might become redundant if we always fetch from context,
  // but keep them for potential initial display before context is fully loaded.
  name?: string;
  imageUrl?: string;
  className?: string;
}

export function UserProfile({ name: initialNameProp, imageUrl: initialImageUrlProp, className }: UserProfileProps) {
  const { user, logout, loading } = useAuth(); // Get user and logout from context
  const { toast } = useToast();
  const router = useRouter();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false); // State for password modal
  const [profileData, setProfileData] = useState<ProfileFormValues | undefined>(undefined);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false); // Loading state specific to profile modal fetch

  // State derived from context or props for display
  // These will be updated by fetched profileData later if available
  const [displayName, setDisplayName] = useState("Loading...");
  const [displayImageUrl, setDisplayImageUrl] = useState<string | undefined>(undefined);
  const [displayEmail, setDisplayEmail] = useState("");

   // Initialize display state from auth context or props
   useEffect(() => {
       if (!loading && user) {
            // Set initial display based on Auth, will be overwritten by fetchProfileData if successful
            setDisplayName(user.displayName || user.email || "Artist");
            setDisplayImageUrl(user.photoURL || initialImageUrlProp || `https://picsum.photos/seed/${user.uid}/40/40`);
            setDisplayEmail(user.email || "");
       } else if (!loading && !user) {
           // Handle logged out state
           setDisplayName("Not Logged In");
           setDisplayImageUrl(undefined);
           setDisplayEmail("");
       } else {
           // Still loading auth state
           setDisplayName("Loading...");
            // Use prop image if available during initial load
           setDisplayImageUrl(initialImageUrlProp || undefined);
           setDisplayEmail("");
       }
   }, [user, loading, initialImageUrlProp]); // Rerun when auth state changes


  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?'; // Fallback for empty name

  const handleLogout = async () => {
    try {
        await logout();
        toast({ title: "Logged Out", description: "You have been successfully logged out." });
        router.push('/login'); // Redirect to login page after logout
    } catch (error) {
        console.error("Logout failed:", error);
        toast({ title: "Logout Failed", description: "Could not log out. Please try again.", variant: "destructive" });
    }
  };

  const handleOpenProfileModal = async () => {
    if (!user) {
      toast({ title: "Not Authenticated", description: "Please log in to manage your profile.", variant: "destructive" });
      return;
    }
    setIsLoadingProfile(true); // Start loading profile data
    setIsProfileModalOpen(true);
    try {
        const data = await fetchProfileData(user); // Fetch profile data using authenticated user
        setProfileData(data); // Store fetched data for the form
        // Update display state with fetched data
        setDisplayName(data.name);
        setDisplayImageUrl(data.imageUrl ?? undefined); // Use fetched image URL
        setDisplayEmail(data.email); // Usually email doesn't change, but sync anyway
    } catch (error) {
        console.error("Error fetching profile data for modal:", error);
        toast({
            title: "Error",
            description: "Could not load profile details. Please try again.",
            variant: "destructive",
        });
        setIsProfileModalOpen(false); // Close modal on fetch error
    } finally {
        setIsLoadingProfile(false); // Stop loading profile data
    }
  };

  // Called by ProfileForm on successful submission
  const handleProfileUpdateSuccess = (updatedData: ProfileFormValues) => {
    setIsProfileModalOpen(false);
    setProfileData(updatedData); // Store the latest data
    // Update display state immediately based on the data returned from updateProfileData
    setDisplayName(updatedData.name);
    setDisplayImageUrl(updatedData.imageUrl ?? undefined);
    setDisplayEmail(updatedData.email);
     toast({
        title: "Profile Updated",
        description: "Your profile information has been saved.",
        variant: "default",
         duration: 2000,
    });
    // Note: The `user` object from `useAuth` might take a moment to reflect
    // displayName/photoURL changes from Firebase Auth if they were updated in updateProfileData.
  };

  const handleOpenPasswordModal = () => {
     if (!user) {
        toast({ title: "Not Authenticated", description: "Please log in to change your password.", variant: "destructive" });
        return;
     }
     setIsPasswordModalOpen(true);
  };


  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
           {/* Button content now uses `displayName` and `displayImageUrl` state */}
          <Button variant="ghost" className={cn("flex items-center space-x-3 p-1.5 rounded-full h-auto focus-visible:ring-1 focus-visible:ring-ring", className)} disabled={loading}>
              <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-primary/40">
                {displayImageUrl ? (
                  <AvatarImage src={displayImageUrl} alt={`${displayName}'s profile picture`} />
                ) : null}
                <AvatarFallback className={cn("bg-muted text-muted-foreground font-semibold text-base sm:text-lg", loading && "animate-pulse")}>
                   {loading ? '' : initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <p className="text-sm sm:text-base font-medium leading-none text-foreground">{loading ? <Skeleton className="h-4 w-24" /> : displayName}</p>
                <p className="text-xs sm:text-sm leading-none text-muted-foreground">{loading ? <Skeleton className="h-3 w-16" /> : 'Artist'}</p>
              </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-popover border-border shadow-lg">
          <DropdownMenuLabel className="font-normal">
            {/* Dropdown label also uses display state */}
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {displayEmail}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-border/50" />
          <DropdownMenuItem asChild className="cursor-pointer focus:bg-accent focus:text-accent-foreground">
              <Link href="/documents">
                  <FileText className="mr-2 h-4 w-4" />
                  <span>Key Documents</span>
              </Link>
          </DropdownMenuItem>
           {/* Opens profile modal, triggers data fetch */}
           <DropdownMenuItem onSelect={handleOpenProfileModal} className="cursor-pointer focus:bg-accent focus:text-accent-foreground">
                <Settings className="mr-2 h-4 w-4" />
                <span>Manage Profile</span>
            </DropdownMenuItem>
             {/* Update Password Item */}
             <DropdownMenuItem onSelect={handleOpenPasswordModal} className="cursor-pointer focus:bg-accent focus:text-accent-foreground">
                <LockKeyhole className="mr-2 h-4 w-4" />
                <span>Update Password</span>
            </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-border/50" />
          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Profile Edit Modal */}
       <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
           <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl bg-card/95 dark:bg-card/80 backdrop-blur-sm border-border/50">
               <DialogHeader>
                  <DialogTitle className="text-primary">Manage Your Profile</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                     Update your personal information and profile picture.
                  </DialogDescription>
               </DialogHeader>
               {/* Conditional rendering based on modal open state */}
                {isProfileModalOpen && (
                    isLoadingProfile ? (
                        // Show loading skeleton inside modal while fetching profile
                        <div className="space-y-6 p-6">
                            <div className="flex items-center space-x-4">
                                <Skeleton className="h-24 w-24 rounded-full" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-[150px]" />
                                    <Skeleton className="h-4 w-[100px]" />
                                </div>
                            </div>
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-10 w-24 ml-auto" />
                        </div>
                    ) : (
                         // Pass fetched/current data to the form
                        <ProfileForm
                            key={user?.uid} // Re-render form if user changes
                            initialData={profileData} // Use fetched data
                            // Pass update function that uses the authenticated user
                            updateFunction={async (data, file) => updateProfileData(user, data, file)}
                            onSuccess={handleProfileUpdateSuccess} // Callback to update display state
                            onCancel={() => setIsProfileModalOpen(false)}
                            className="mt-4"
                        />
                    )
                )}
           </DialogContent>
       </Dialog>

       {/* Password Update Modal */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
          <DialogContent className="sm:max-w-md bg-card/95 dark:bg-card/80 backdrop-blur-sm border-border/50">
              <DialogHeader>
                 <DialogTitle className="text-primary">Update Password</DialogTitle>
                 <DialogDescription className="text-muted-foreground">
                    Enter your current password and choose a new one.
                 </DialogDescription>
              </DialogHeader>
              {isPasswordModalOpen && ( // Render form only when modal is open
                <PasswordUpdateForm
                    onSuccess={() => {
                        setIsPasswordModalOpen(false); // Close modal on success
                        toast({ title: "Password Updated", description: "Your password has been changed successfully.", duration: 2000 });
                    }}
                    onCancel={() => setIsPasswordModalOpen(false)}
                    className="mt-4"
                />
              )}
          </DialogContent>
      </Dialog>
    </>
  );
}

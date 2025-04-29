
"use client"; // Add use client because we're using hooks/interactive components

import { useState, useEffect } from 'react'; // Import useState and useEffect
import Image from 'next/image';
import Link from 'next/link'; // Keep Link for Key Documents
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button"; // Use Button for trigger consistency
import { User, LogOut, Settings, FileText } from 'lucide-react'; // Import icons including FileText
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"; // Import Dialog components
import { ProfileForm, type ProfileFormValues } from "@/components/profile/profile-form"; // Import ProfileForm
import { cn } from "@/lib/utils";
import { useToast } from '@/hooks/use-toast'; // Import useToast

interface UserProfileProps {
  name: string;
  imageUrl?: string;
  className?: string;
}

// Mock function to fetch profile data (replace with actual API call)
// Keep this separate or move to a service if needed elsewhere
const fetchProfileData = async (): Promise<ProfileFormValues> => {
  console.log("Mock API: Fetching profile data for modal...");
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  return {
    name: "Artist Name", // Replace with actual fetched name
    email: "artist@example.com", // Replace with actual fetched email
    bio: "Passionate musician creating unique soundscapes. Exploring the boundaries of electronic music.", // Example bio
    phoneNumber: "+1 123-456-7890", // Example phone
    imageUrl: "https://picsum.photos/seed/artistlogo/100/100", // Use a larger placeholder
  };
};

export function UserProfile({ name: initialName, imageUrl: initialImageUrl, className }: UserProfileProps) {
  const { toast } = useToast(); // Initialize toast
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileData, setProfileData] = useState<ProfileFormValues | undefined>(undefined);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // State to manage the potentially updated name and image URL locally
  const [currentName, setCurrentName] = useState(initialName);
  const [currentImageUrl, setCurrentImageUrl] = useState(initialImageUrl);

   // Update local state if props change (e.g., after profile update)
   useEffect(() => {
       setCurrentName(initialName);
   }, [initialName]);

   useEffect(() => {
       setCurrentImageUrl(initialImageUrl);
   }, [initialImageUrl]);


  const initials = currentName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  // Placeholder actions - replace with actual logic
  const handleLogout = () => {
    // TODO: Add logout logic here
    toast({ title: "Action", description: "User logged out." });
  };

  // Function to open the modal and fetch profile data
  const handleOpenProfileModal = async () => {
    setIsLoadingProfile(true);
    setIsProfileModalOpen(true);
    try {
        const data = await fetchProfileData(); // Fetch fresh data when modal opens
        setProfileData(data);
    } catch (error) {
        console.error("Error fetching profile data for modal:", error);
        toast({
            title: "Error",
            description: "Could not load profile details. Please try again.",
            variant: "destructive",
        });
        setIsProfileModalOpen(false); // Close modal on error
    } finally {
        setIsLoadingProfile(false);
    }
  };

  const handleProfileUpdateSuccess = (updatedData: ProfileFormValues) => {
    setIsProfileModalOpen(false); // Close modal on success
    setProfileData(updatedData); // Update profile data state
    // Update the displayed name and image in the header immediately
    setCurrentName(updatedData.name);
    setCurrentImageUrl(updatedData.imageUrl);
    // Optionally, trigger a global state update if necessary
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {/* Wrap the profile display in a button for accessibility and styling */}
          {/* Increased Avatar size and adjusted button padding/height */}
          <Button variant="ghost" className={cn("flex items-center space-x-3 p-1.5 rounded-full h-auto focus-visible:ring-1 focus-visible:ring-ring", className)}>
              {/* Increased avatar size */}
              <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-primary/40">
                {/* Use currentImageUrl state here */}
                {currentImageUrl ? (
                  <AvatarImage src={currentImageUrl} alt={`${currentName}'s profile picture`} />
                ) : null}
                <AvatarFallback className="bg-muted text-muted-foreground font-semibold text-base sm:text-lg"> {/* Slightly larger initials */}
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left"> {/* Hide name on small screens */}
                {/* Increased font size for name */}
                 {/* Use currentName state here */}
                <p className="text-sm sm:text-base font-medium leading-none text-foreground">{currentName}</p>
                {/* Optional: Role */}
                <p className="text-xs sm:text-sm leading-none text-muted-foreground">Artist</p>
              </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-popover border-border shadow-lg">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
               {/* Use currentName state here */}
              <p className="text-sm font-medium leading-none">{currentName}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {/* Use email from fetched profileData or placeholder */}
                {profileData?.email || "artist@example.com"}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-border/50" />
          {/* Key Documents Link */}
          <DropdownMenuItem asChild className="cursor-pointer focus:bg-accent focus:text-accent-foreground">
              <Link href="/documents">
                  <FileText className="mr-2 h-4 w-4" />
                  <span>Key Documents</span>
              </Link>
          </DropdownMenuItem>
          {/* Manage Profile Modal Trigger */}
           <DropdownMenuItem onSelect={handleOpenProfileModal} className="cursor-pointer focus:bg-accent focus:text-accent-foreground">
                <Settings className="mr-2 h-4 w-4" />
                <span>Manage Profile</span>
            </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-border/50" />
          {/* Logout */}
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
               {/* Render ProfileForm inside the modal */}
               {/* Pass initialData, onSuccess, and onCancel */}
               <ProfileForm
                    key={profileData?.email} // Re-render form if user changes (optional)
                    initialData={profileData}
                    onSuccess={handleProfileUpdateSuccess}
                    onCancel={() => setIsProfileModalOpen(false)}
                    className="mt-4" // Add some top margin
               />
           </DialogContent>
       </Dialog>
    </>
  );
}


"use client";

import Link from "next/link";
import Image from "next/image"; // Import next/image
import UserProfile from "@/components/common/user-profile"; // Changed to default import
import { TimeWeather } from "@/components/common/time-weather"; // Import TimeWeather - Re-enabled
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// Import relevant icons
import { LayoutDashboard, FileText, Home, ListMusic, CalendarClock, Loader2 } from "lucide-react"; // Removed Radio icon, added Loader2
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context"; // Import useAuth
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
import { useRouter } from 'next/navigation'; // Import useRouter
import { useEffect, useState, useRef } from 'react'; // Import useEffect, useState, and useRef
// Removed SplashScreen import as it's handled by AuthProvider
import { Button } from "@/components/ui/button"; // Keep button for potential future use or structure
// Import user service function
import { getUserProfileByUid } from "@/services/user"; // Correct import
import type { ProfileFormValues } from "@/components/profile/profile-form"; // Import profile type
import { useToast } from "@/hooks/use-toast"; // Import useToast


// Pineapple Icon Component (retained from previous state)
const PineappleIcon = () => (
  <img
      src="https://media.lordicon.com/icons/wired/gradient/1843-pineapple.svg"
      alt="Pineapple Icon"
      className="h-12 w-12" // Increased size
      data-ai-hint="pineapple logo icon"
  />
);

// Removed SpotifyIcon component, image will be used directly

// Define the navigation items for the home screen launchpad
const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-12 w-12" />, description: "View your latest stats", external: false }, // Increased icon size
  { title: "My Releases", href: "/releases", icon: <ListMusic className="h-12 w-12" />, description: "Manage your music", external: false }, // Increased icon size
  { title: "Events", href: "/events", icon: <CalendarClock className="h-12 w-12" />, description: "Manage your events", external: false }, // Increased icon size
  { title: "Documents", href: "/documents", icon: <FileText className="h-12 w-12" />, description: "Access agreements & handbooks", external: false }, // Increased icon size
  { title: "Pineapple", href: "/pineapple", icon: <PineappleIcon />, description: "Connect & Collaborate", external: false }, // Uses updated PineappleIcon size
   // Updated Spotify for Artists item to use Image component directly
   {
     title: "Spotify for Artists", // Keep title for accessibility/structure if needed
     href: "https://accounts.spotify.com/en-GB/login?continue=https%3A%2F%2Faccounts.spotify.com%2Foauth2%2Fv2%2Fauth%3Fresponse_type%3Dnone%26client_id%3D6cf79a93be894c2086b8cbf737e0796b%26scope%3Duser-read-email%2Buser-read-private%2Bugc-image-upload%26redirect_uri%3Dhttps%253A%252F%252Fartists.spotify.com%252Fc%26acr_values%3Durn%253Aspotify%253Asso%253Aacr%253Aartist%253A2fa&flow_ctx=0bb76910-45f7-4890-9c65-90cebef63fd0%3A1746148618",
     // Use Image component directly, removing icon component and description
     imageSrc: "https://s29.q4cdn.com/175625835/files/images/S4A.jpeg",
     description: "Access your Spotify profile", // Keep description for accessibility/tooltip if needed
     external: true
   },
];

// List of informal greeting templates
const greetings = [
    "Hey, {{name}}!",
    "What's up, {{name}}?",
    "Welcome back, {{name}}!",
    "Good to see you, {{name}}!",
    "Hi there, {{name}}!",
    "How's it going, {{name}}?",
    "Yo, {{name}}!",
];


export default function HomePage() {
    const { user, loading: authLoading } = useAuth(); // Use the auth context
    const router = useRouter();
    const { toast } = useToast(); // Initialize toast
    // Initialize profileData state with undefined to distinguish initial state from loaded null
    const [profileData, setProfileData] = useState<ProfileFormValues | null | undefined>(undefined);
    const [profileLoading, setProfileLoading] = useState(true);
    const [clientGreeting, setClientGreeting] = useState("");
    // Removed splash state and hasShownInitialSplash

    // Fetch profile data from Firestore using service function
    useEffect(() => {
        const fetchProfileData = async () => {
            if (authLoading || !user?.uid) { // Check for user.uid
                setProfileLoading(false);
                setProfileData(authLoading ? undefined : null); // Undefined if auth still loading, null if done and no user
                return;
            }

            setProfileLoading(true);
            try {
                // Fetch profile using UID from the service
                const fetchedProfile = await getUserProfileByUid(user.uid); // Correct function
                if (fetchedProfile) {
                    setProfileData(fetchedProfile);
                } else {
                    console.warn("User profile not found in publicProfile for greeting. Will create default if needed elsewhere.");
                    // Don't create default here, let UserProfile handle creation
                    setProfileData(null); // Explicitly set to null if not found after checking
                }
            } catch (error) {
                console.error("Error fetching user profile for greeting:", error);
                toast({
                     title: "Profile Error",
                     description: "Could not load profile for greeting.",
                     variant: "destructive",
                     duration: 2000,
                 });
                setProfileData(null); // Set to null on error
            } finally {
                setProfileLoading(false);
            }
        };

        fetchProfileData();
    }, [user, authLoading, toast]); // Include toast in dependency array

    // Function to get a random greeting - client side only
    const getRandomGreeting = (name: string) => {
        if (typeof window === 'undefined') return `Welcome, ${name}!`; // Server fallback
        const randomIndex = Math.floor(Math.random() * greetings.length);
        return greetings[randomIndex].replace("{{name}}", name);
    };


    useEffect(() => {
        // Redirect unauthenticated users
        if (!authLoading && !user) {
            router.replace('/login');
            return;
        }

        const isLoading = authLoading || profileLoading;

        // Set greeting and check tutorial status only when loading is finished AND profileData is not undefined
        if (!isLoading && user && profileData !== undefined) {
            // Tutorial Check
            // Ensure profileData is not null before checking tutorial status
            if (profileData && profileData.hasCompletedTutorial === false) {
                console.log("Redirecting to tutorial...");
                router.replace('/tutorial');
                return;
            }

            // Proceed with setting greeting if tutorial is completed or not applicable
            // **PRIORITIZE profileData.name**, then displayName, then email, then 'Artist'
            const finalName = profileData?.name || user.displayName || user.email?.split('@')[0] || 'Artist';

            // Generate greeting on client side using the helper function
            setClientGreeting(getRandomGreeting(finalName));

        } else if (!isLoading && !user) {
             setClientGreeting("Welcome!");
        } else {
            // Still loading or other state, set default greeting
            setClientGreeting("Welcome!");
        }

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, authLoading, profileLoading, profileData, router]);


    // Combined loading state
    const isLoading = authLoading || profileLoading;

    // Determine display name and image URL (consistent with greeting logic)
    // **PRIORITIZE profileData.name**
    // Use optional chaining and provide fallback 'Artist' if everything is null/undefined
    const displayName = profileData?.name || user?.displayName || (user?.email ? user.email.split('@')[0] : 'Artist');
    const displayImageUrl = profileData?.imageUrl || user?.photoURL || null;

    // Show Loading Skeleton ONLY during initial auth/profile load
     if (isLoading || profileData === undefined) { // Also show skeleton while profileData is undefined (initial fetch)
        return (
             <div className="flex min-h-screen w-full flex-col bg-transparent">
                 <main className="relative z-10 flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                     {/* Header Skeleton */}
                     <Card className="mb-4 sm:mb-8 bg-card/60 dark:bg-card/50 shadow-lg rounded-lg border-border/30">
                         <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
                             <div className="flex items-center gap-4">
                                 <Skeleton className="h-8 w-8 hidden sm:block rounded-md" />
                                 <div className="space-y-1">
                                     <Skeleton className="h-6 w-48" />
                                 </div>
                             </div>
                             <div className="flex-shrink-0 ml-auto hidden md:flex">
                                <Skeleton className="h-5 w-32" />
                            </div>
                             <div className="flex-shrink-0">
                                 <Skeleton className="h-12 w-12 rounded-full" />
                             </div>
                              <div className="w-full md:hidden mt-2">
                                <Skeleton className="h-5 w-full" />
                              </div>
                         </CardHeader>
                     </Card>
                     {/* Navigation Grid Skeleton */}
                     <div className="max-w-5xl mx-auto w-full">
                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                             {Array.from({ length: navItems.length }).map((_, index) => (
                                 <Skeleton key={index} className="aspect-[4/3] rounded-lg" />
                             ))}
                         </div>
                     </div>
                 </main>
             </div>
        );
    }


    // If not loading and no user, let useEffect handle redirect
     if (!user && !authLoading) {
         return null; // AuthProvider/Middleware handles display/redirect
     }


    // Render the Home/Landing page for authenticated users
    return (
        <div className="flex min-h-screen w-full flex-col bg-transparent">
            <main className="relative z-10 flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                {/* Header Card */}
                <Card className="mb-4 sm:mb-8 bg-card/60 dark:bg-card/50 shadow-lg rounded-lg border-border/30"> {/* Adjusted opacity */}
                <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap"> {/* Added flex-wrap */}
                    {/* App Title/Greeting */}
                    <div className="flex items-center gap-4">
                    {/* Placeholder Icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 hidden sm:block"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                        <div className="text-center sm:text-left">
                            <CardTitle className="text-xl sm:text-3xl font-bold tracking-tight text-primary">
                                {clientGreeting || `Welcome, ${displayName}!`}
                            </CardTitle>
                        </div>
                    </div>

                     {/* Time and Weather */}
                    <div className="flex-shrink-0 ml-auto hidden md:flex">
                        <TimeWeather />
                    </div>


                    {/* UserProfile */}
                    <div className="flex-shrink-0">
                        <UserProfile />
                    </div>
                    {/* Mobile Time and Weather */}
                     <div className="w-full md:hidden mt-2">
                         <TimeWeather />
                     </div>

                </CardHeader>
                </Card>

                {/* Navigation Grid */}
                <div className="max-w-5xl mx-auto w-full">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"> {/* Reduced gap */}
                    {navItems.map((item, index) => {
                        const animationClass = "opacity-0 animate-fade-in-up";
                        const animationDelay = `${index * 100}ms`;
                        const activeStateClasses = "active:scale-95 active:opacity-80 transition-transform duration-100";

                        if (item.imageSrc) {
                            const cardContent = (
                                <Card className={cn(
                                    "bg-card/50 dark:bg-card/40 border border-border/30 shadow-md rounded-lg transition-all duration-200 ease-in-out cursor-pointer text-center h-full flex flex-col justify-center items-center overflow-hidden",
                                    "hover:shadow-lg hover:border-primary/50 hover:-translate-y-1 hover-glow"
                                )}>
                                    <Image
                                        src={item.imageSrc}
                                        alt={item.title}
                                        layout="fill"
                                        objectFit="cover"
                                        className="transition-transform duration-300 group-hover:scale-105 rounded-lg" // Added rounded-lg
                                        data-ai-hint="spotify for artists banner"
                                        unoptimized
                                    />
                                </Card>
                            );
                            return (
                                <a
                                    href={item.href}
                                    key={item.href}
                                    className={cn("block group relative aspect-[4/3]", animationClass, activeStateClasses)}
                                    style={{ animationDelay }}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {cardContent}
                                </a>
                            );
                        } else {
                            const cardContent = (
                                <Card className={cn(
                                    "bg-card/50 dark:bg-card/40 border border-border/30 shadow-md rounded-lg transition-all duration-200 ease-in-out cursor-pointer text-center h-full flex flex-col justify-center items-center p-6",
                                    "hover:shadow-lg hover:border-primary/50 hover:-translate-y-1 hover-glow"
                                )}>
                                    <CardContent className="flex flex-col items-center justify-center space-y-4 p-0">
                                        <div className="p-4 rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary/20 mb-2">
                                            {item.icon}
                                        </div>
                                        <CardTitle className="text-lg font-semibold text-foreground">{item.title}</CardTitle>
                                        <CardDescription className="text-sm text-muted-foreground">{item.description}</CardDescription>
                                    </CardContent>
                                </Card>
                            );
                            return item.external ? (
                                <a
                                    href={item.href}
                                    key={item.href}
                                    className={cn("block group aspect-[4/3]", animationClass, activeStateClasses)}
                                    style={{ animationDelay }}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {cardContent}
                                </a>
                            ) : (
                                <Link href={item.href} key={item.href} className={cn("block group aspect-[4/3]", animationClass, activeStateClasses)} style={{ animationDelay }}>
                                    {cardContent}
                                </Link>
                            );
                        }
                    })}
                    </div>
                </div>
            </main>
        </div>
    );
}

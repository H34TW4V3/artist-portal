
"use client";

import Link from "next/link";
import Image from "next/image"; // Import next/image
import UserProfile from "@/components/common/user-profile"; // Keep UserProfile
import { TimeWeather } from "@/components/common/time-weather"; // Import TimeWeather - Re-enabled
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// Import relevant icons
import { LayoutDashboard, FileText, Home, ListMusic, CalendarClock } from "lucide-react"; // Removed Radio icon
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context"; // Import useAuth
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
import { useRouter } from 'next/navigation'; // Import useRouter
import { useEffect, useState } from 'react'; // Import useEffect and useState
import { SplashScreen } from '@/components/common/splash-screen'; // Import SplashScreen
import { Button } from "@/components/ui/button"; // Keep button for potential future use or structure
import { getFirestore, doc, getDoc } from "firebase/firestore"; // Import Firestore functions
import { app } from "@/services/firebase-config"; // Import Firebase app config
import type { ProfileFormValues } from "@/components/profile/profile-form"; // Import profile type


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
    const db = getFirestore(app);
    // Removed greeting state, use clientGreeting
    const [profileData, setProfileData] = useState<ProfileFormValues | null>(null);
    const [profileLoading, setProfileLoading] = useState(true); // State for profile data loading
    const [clientGreeting, setClientGreeting] = useState(""); // State for client-side greeting generation
    const [showSplash, setShowSplash] = useState(false); // State for splash screen visibility
    const [hasShownInitialSplash, setHasShownInitialSplash] = useState(false); // Track if initial splash was shown

    // Fetch profile data from Firestore
    useEffect(() => {
        const fetchProfileData = async () => {
            if (authLoading || !user) {
                setProfileLoading(false); // Stop loading if auth is loading or no user
                if (!user) setProfileData(null);
                return;
            }

            setProfileLoading(true);
            try {
                const userDocRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(userDocRef);
                if (docSnap.exists()) {
                    setProfileData(docSnap.data() as ProfileFormValues);
                } else {
                    // Handle case where profile might not exist yet, use defaults
                    console.log("User profile not found in Firestore for greeting.");
                    setProfileData(null); // Or set default placeholder data if needed
                }
            } catch (error) {
                console.error("Error fetching user profile for greeting:", error);
                setProfileData(null); // Clear on error
            } finally {
                setProfileLoading(false);
            }
        };

        fetchProfileData();
    }, [user, db, authLoading]);

    // Function to get a random greeting - client side only
    const getRandomGreeting = (name: string) => {
        if (typeof window === 'undefined') return `Welcome, ${name}!`; // Avoid Math.random on server
        const randomIndex = Math.floor(Math.random() * greetings.length);
        return greetings[randomIndex].replace("{{name}}", name);
    };


    useEffect(() => {
        // Redirect unauthenticated users
        if (!authLoading && !user) {
            router.replace('/login');
        }

        const isLoading = authLoading || profileLoading;

        // Set greeting after both auth and profile data are loaded
        if (!isLoading && user) {
            // Prioritize profileData.name (Artist Name), then displayName, then email, then 'Artist'
            const artistNameFromProfile = profileData?.name;
            const nameFromAuth = user.displayName;
            const nameFromEmail = user.email?.split('@')[0];
            const finalName = artistNameFromProfile || nameFromAuth || nameFromEmail || 'Artist';

            // Generate greeting on client side using the helper function
            setClientGreeting(getRandomGreeting(finalName));

            // Only start the splash timer if it hasn't been shown before in this session/mount
            if (!hasShownInitialSplash) {
                 setShowSplash(true); // Ensure splash is shown if needed
                 const timer = setTimeout(() => {
                     setShowSplash(false);
                     setHasShownInitialSplash(true); // Mark as shown
                 }, 0); // Set delay to 0 if no splash animation needed or handle elsewhere

                 // Cleanup timer only if it was started
                 return () => clearTimeout(timer);
            } else {
                // If splash already shown, ensure showSplash is false immediately
                setShowSplash(false);
            }

        } else if (!isLoading && !user) {
            // Handle case where user logs out while on this page (redundant due to redirect?)
             setClientGreeting("Welcome!");
             setShowSplash(false); // No splash if no user
        }
         else {
            // Provide a default or loading greeting if still loading
            setClientGreeting("Welcome!");
            // Keep showSplash true while loading, unless already shown
            if (!hasShownInitialSplash) {
                setShowSplash(false); // Keep splash hidden until conditions met
            }
        }

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, authLoading, profileLoading, profileData, router, hasShownInitialSplash]); // Depend on hasShownInitialSplash


    // Combined loading state
    const isLoading = authLoading || profileLoading;

    // Determine display name and image URL based on loaded data or user defaults
    const displayName = profileData?.name || user?.displayName || (user?.email ? user.email.split('@')[0] : 'Artist');
    const displayImageUrl = profileData?.imageUrl || user?.photoURL || null;

    // Show Splash Screen only if loading OR if it's the initial timed splash display
     if (isLoading) { // Simplified: Show loader only during actual loading phases
        // Pass the generated greeting and user info
        // No splash screen needed here as per requirement removal
        return (
             <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                 <p className="mt-4 text-lg text-foreground font-semibold">Loading Hub...</p>
             </div>
        );
    }


    // If not loading and no user, let useEffect handle redirect (AuthProvider shows splash/loader)
     if (!user && !authLoading) {
         // AuthProvider handles loading state display
         return null; // Return null while redirecting or if stuck
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
                    {/* Placeholder Icon - could be a music note or app logo */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 hidden sm:block"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                        <div className="text-center sm:text-left"> {/* Center align text */}
                            <CardTitle className="text-xl sm:text-3xl font-bold tracking-tight text-primary">
                                {clientGreeting || "Welcome!"} {/* Display the client-side greeting */}
                            </CardTitle>
                            {/* Removed CardDescription */}
                        </div>
                    </div>

                     {/* Time and Weather - Re-enabled */}
                    <div className="flex-shrink-0 ml-auto hidden md:flex">
                        <TimeWeather />
                    </div>


                    {/* Render UserProfile component - added flex-shrink-0 */}
                    <div className="flex-shrink-0"> {/* Removed ml-auto as weather is back */}
                        <UserProfile />
                    </div>
                    {/* Mobile Time and Weather - Re-enabled */}
                     <div className="w-full md:hidden mt-2">
                         <TimeWeather />
                     </div>

                </CardHeader>
                </Card>

                {/* Navigation Grid - App Screen Style */}
                {/* Wrap grid in a container with max-width */}
                <div className="max-w-5xl mx-auto w-full">
                     {/* Updated grid to accommodate 6 items - adjust columns if needed */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"> {/* Reduced gap */}
                    {navItems.map((item, index) => {
                        // Common animation classes
                        const animationClass = "opacity-0 animate-fade-in-up";
                        const animationDelay = `${index * 100}ms`; // Staggered delay
                        // Common active state classes for click feedback
                        const activeStateClasses = "active:scale-95 active:opacity-80 transition-transform duration-100";

                        // Check if the item has an imageSrc property
                        if (item.imageSrc) {
                            const cardContent = (
                                <Card className={cn(
                                    "bg-card/50 dark:bg-card/40 border border-border/30 shadow-md rounded-lg transition-all duration-200 ease-in-out cursor-pointer text-center h-full flex flex-col justify-center items-center overflow-hidden", // Added overflow-hidden
                                    "hover:shadow-lg hover:border-primary/50 hover:-translate-y-1 hover-glow" // Hover effects
                                )}>
                                    {/* Render Image directly, filling the card */}
                                    <Image
                                        src={item.imageSrc}
                                        alt={item.title} // Use title for alt text
                                        layout="fill" // Fill the container
                                        objectFit="cover" // Cover the container area
                                        className="transition-transform duration-300 group-hover:scale-105" // Added scale effect on hover
                                        data-ai-hint="spotify for artists banner" // Add hint if needed
                                        unoptimized // Consider keeping if image causes issues
                                    />
                                    {/* Optional: Overlay title/description if desired */}
                                    {/* <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-4">
                                        <CardTitle className="text-lg font-semibold text-white">{item.title}</CardTitle>
                                        <CardDescription className="text-sm text-white/80">{item.description}</CardDescription>
                                    </div> */}
                                </Card>
                            );
                            return (
                                <a
                                    href={item.href}
                                    key={item.href}
                                     // Apply animation class, style, and active state classes
                                    className={cn("block group relative aspect-[4/3]", animationClass, activeStateClasses)}
                                    style={{ animationDelay }}
                                    target="_blank" // Open external links in new tab
                                    rel="noopener noreferrer"
                                >
                                    {cardContent}
                                </a>
                            );
                        } else {
                            // Original card content for items with icons
                            const cardContent = (
                                <Card className={cn(
                                    "bg-card/50 dark:bg-card/40 border border-border/30 shadow-md rounded-lg transition-all duration-200 ease-in-out cursor-pointer text-center h-full flex flex-col justify-center items-center p-6", // Adjusted opacity
                                    "hover:shadow-lg hover:border-primary/50 hover:-translate-y-1 hover-glow" // Hover effects
                                )}>
                                    <CardContent className="flex flex-col items-center justify-center space-y-4 p-0"> {/* Increased space-y */}
                                        <div className="p-4 rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary/20 mb-2"> {/* Increased padding */}
                                            {/* Render icon if it exists */}
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
                                     // Apply animation class, style, and active state classes
                                    className={cn("block group aspect-[4/3]", animationClass, activeStateClasses)}
                                    style={{ animationDelay }}
                                    target="_blank" // Open external links in new tab
                                    rel="noopener noreferrer"
                                >
                                    {cardContent}
                                </a>
                            ) : (
                                <Link href={item.href} key={item.href} passHref legacyBehavior>
                                     {/* Apply animation class, style, and active state classes */}
                                    <a className={cn("block group aspect-[4/3]", animationClass, activeStateClasses)} style={{ animationDelay }}> {/* Use anchor tag for legacyBehavior, added aspect ratio */}
                                        {cardContent}
                                    </a>
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


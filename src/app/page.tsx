
"use client";

import Link from "next/link";
import Image from "next/image"; // Import next/image
import UserProfile from "@/components/common/user-profile"; // Keep UserProfile
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// Import relevant icons
import { LayoutDashboard, FileText, Home, ListMusic, CalendarClock } from "lucide-react"; // Removed Radio icon
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context"; // Import useAuth
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
import { useRouter } from 'next/navigation'; // Import useRouter
import { useEffect, useState } from 'react'; // Import useEffect and useState
import { Loader2 } from 'lucide-react'; // Import Loader2 for loading animation
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

// Function to get a random greeting
const getRandomGreeting = (name: string) => {
    // Use client-side logic for Math.random
    const [randomIndex, setRandomIndex] = useState(0);
    useEffect(() => {
        setRandomIndex(Math.floor(Math.random() * greetings.length));
    }, []); // Run only once on mount

    return greetings[randomIndex].replace("{{name}}", name);
};


export default function HomePage() {
    const { user, loading: authLoading } = useAuth(); // Use the auth context
    const router = useRouter();
    const db = getFirestore(app);
    // Removed greeting state, use clientGreeting
    const [profileData, setProfileData] = useState<ProfileFormValues | null>(null);
    const [profileLoading, setProfileLoading] = useState(true); // State for profile data loading
    const [clientGreeting, setClientGreeting] = useState(""); // State for client-side greeting generation

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

    useEffect(() => {
        // Redirect unauthenticated users
        if (!authLoading && !user) {
            router.replace('/login');
        }

        // Set greeting after both auth and profile data are loaded
        if (!authLoading && !profileLoading && user) {
            // Prioritize profileData.name, then displayName, then email, then 'Artist'
            const nameFromProfile = profileData?.name;
            const nameFromAuth = user.displayName;
            const nameFromEmail = user.email?.split('@')[0];
            const finalName = nameFromProfile || nameFromAuth || nameFromEmail || 'Artist';

            // Generate greeting on client side
            const randomIndex = Math.floor(Math.random() * greetings.length);
            setClientGreeting(greetings[randomIndex].replace("{{name}}", finalName));
        } else {
            // Provide a default or loading greeting
            setClientGreeting("Welcome!");
        }
    }, [user, authLoading, profileLoading, profileData, router]); // Depend on profileData and profileLoading


    // Combined loading state
    const isLoading = authLoading || profileLoading;

    // Show loading indicator while checking auth state or fetching profile
    if (isLoading) {
         return (
              <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
             </div>
         );
    }

    // If not loading and no user, let useEffect handle redirect
     if (!user) {
         return (
              <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
                 <Loader2 className="h-16 w-16 animate-spin text-primary" />
             </div>
         );
     }

    // Render the Home/Landing page for authenticated users
    return (
        <div className="flex min-h-screen w-full flex-col bg-transparent">
            <main className="relative z-10 flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                {/* Header Card */}
                <Card className="mb-4 sm:mb-8 bg-card/60 dark:bg-card/50 shadow-lg rounded-lg border-border/30"> {/* Adjusted opacity */}
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                    {/* App Title/Greeting */}
                    <div className="flex items-center gap-4">
                    {/* Placeholder Icon - could be a music note or app logo */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 hidden sm:block"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                        <div className="text-center sm:text-left"> {/* Center align text */}
                            <CardTitle className="text-xl sm:text-3xl font-bold tracking-tight text-primary">
                                {clientGreeting || "Loading greeting..."} {/* Display the client-side greeting */}
                            </CardTitle>
                            <CardDescription className="text-muted-foreground text-xs sm:text-sm">
                                Your central hub for management and insights.
                            </CardDescription>
                        </div>
                    </div>
                    {/* Render UserProfile component */}
                    <UserProfile />
                </CardHeader>
                </Card>

                {/* Navigation Grid - App Screen Style */}
                 {/* Updated grid to accommodate 6 items - adjust columns if needed */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"> {/* Keep lg:grid-cols-3 */}
                {navItems.map((item) => {
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
                                className="block group relative aspect-[4/3]" // Added relative and aspect ratio
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
                                 className="block group aspect-[4/3]" // Added aspect ratio
                                 target="_blank" // Open external links in new tab
                                 rel="noopener noreferrer"
                             >
                                 {cardContent}
                             </a>
                         ) : (
                             <Link href={item.href} key={item.href} passHref legacyBehavior>
                                 <a className="block group aspect-[4/3]"> {/* Use anchor tag for legacyBehavior, added aspect ratio */}
                                     {cardContent}
                                 </a>
                             </Link>
                         );
                     }
                })}
                </div>
            </main>
        </div>
    );
}



"use client";

import Link from "next/link";
import Image from "next/image";
import UserProfile from "@/components/common/user-profile";
import { TimeWeather } from "@/components/common/time-weather";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, FileText, Home, ListMusic, CalendarClock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { getUserProfileByUid } from "@/services/user";
import type { ProfileFormValues } from "@/components/profile/profile-form";
import { useToast } from "@/hooks/use-toast";


const PineappleIcon = () => (
  <img
      src="https://media.lordicon.com/icons/wired/gradient/1843-pineapple.svg"
      alt="Pineapple Icon"
      className="h-12 w-12 md:h-16 md:w-16" // Increased size for Material You feel
      data-ai-hint="pineapple logo icon"
  />
);

const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-12 w-12 md:h-16 md:w-16" />, description: "View your latest stats", external: false },
  { title: "My Releases", href: "/releases", icon: <ListMusic className="h-12 w-12 md:h-16 md:w-16" />, description: "Manage your music", external: false },
  { title: "Events", href: "/events", icon: <CalendarClock className="h-12 w-12 md:h-16 md:w-16" />, description: "Manage your events", external: false },
  { title: "Documents & Guidebooks", href: "/documents", icon: <FileText className="h-12 w-12 md:h-16 md:w-16" />, description: "Access agreements & guidebooks", external: false },
  { title: "Pineapple", href: "/pineapple", icon: <PineappleIcon />, description: "Connect & Collaborate", external: false },
   {
     title: "Spotify for Artists",
     href: "https://accounts.spotify.com/en-GB/login?continue=https%3A%2F%2Faccounts.spotify.com%2Foauth2%2Fv2%2Fauth%3Fresponse_type%3Dnone%26client_id%3D6cf79a93be894c2086b8cbf737e0796b%26scope%3Duser-read-email%2Buser-read-private%2Bugc-image-upload%26redirect_uri%3Dhttps%253A%252F%252Fartists.spotify.com%252Fc%26acr_values%3Durn%253Aspotify%253Asso%253Aacr%253Aartist%253A2fa&flow_ctx=0bb76910-45f7-4890-9c65-90cebef63fd0%3A1746148618",
     imageSrc: "https://s29.q4cdn.com/175625835/files/images/S4A.jpeg",
     description: "Access your Spotify profile",
     external: true
   },
];

const greetings = [
    "Hey, {{name}}!",
    "What's up, {{name}}?",
    "Welcome back, {{name}}!",
    "Good to see you, {{name}}!",
    "Hi there, {{name}}!",
    "How's it going, {{name}}?",
    "Yo, {{name}}!",
];

// Geometric border styles
const borderStyles = [
    "rounded-2xl", // Standard Material You
    "rounded-tl-3xl rounded-br-3xl rounded-tr-lg rounded-bl-lg", // Asymmetric
    "rounded-tl-none rounded-br-none rounded-tr-3xl rounded-bl-3xl", // Opposite Asymmetric
    "rounded-t-3xl rounded-b-lg", // Pill top
    "rounded-b-3xl rounded-t-lg", // Pill bottom
    "rounded-l-3xl rounded-r-lg", // Pill left
    "rounded-r-3xl rounded-l-lg", // Pill right
    "rounded-full aspect-square", // Circle (adjust aspect ratio if content needs it)
];


export default function HomePage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [profileData, setProfileData] = useState<ProfileFormValues | null | undefined>(undefined);
    const [profileLoading, setProfileLoading] = useState(true);
    const [clientGreeting, setClientGreeting] = useState("");
    const [randomBorderStyles, setRandomBorderStyles] = useState<string[]>([]);


    useEffect(() => {
        // Generate random border styles for each item on client mount
        if (typeof window !== 'undefined') {
             const styles = navItems.map(() => borderStyles[Math.floor(Math.random() * borderStyles.length)]);
             setRandomBorderStyles(styles);
        }

        const fetchProfileData = async () => {
            if (authLoading || !user?.uid) {
                setProfileLoading(false);
                setProfileData(authLoading ? undefined : null);
                return;
            }

            setProfileLoading(true);
            try {
                const fetchedProfile = await getUserProfileByUid(user.uid);

                if (fetchedProfile) {
                    setProfileData(fetchedProfile);
                } else {
                  console.log("No public profile found for user, creating default...");
                  const defaultData: ProfileFormValues = {
                    name: user.displayName || user.email?.split('@')[0] || "User",
                    email: user.email || "",
                    imageUrl: user.photoURL || null,
                    bio: null,
                    phoneNumber: null,
                    hasCompletedTutorial: false,
                  };
                  // This function was missing from the provided context, assuming it exists.
                  // await setPublicProfile(user.uid, defaultData, false); 
                  setProfileData(defaultData);
                }
            } catch (error) {
                console.error("Error fetching user profile for greeting:", error);
                toast({
                     title: "Profile Error",
                     description: "Could not load profile for greeting.",
                     variant: "destructive",
                     duration: 2000,
                 });
                setProfileData(null);
            } finally {
                setProfileLoading(false);
            }
        };

        fetchProfileData();
    }, [user, authLoading, toast]);

    const getRandomGreeting = (name: string) => {
        if (typeof window === 'undefined') return `Welcome, ${name}!`; // SSR fallback
        const randomIndex = Math.floor(Math.random() * greetings.length);
        return greetings[randomIndex].replace("{{name}}", name);
    };


    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/login');
            return;
        }

        const isLoading = authLoading || profileLoading;

        if (!isLoading && user && profileData !== undefined) {
            if (profileData && profileData.hasCompletedTutorial === false) {
                console.log("Redirecting to tutorial...");
                router.replace('/tutorial');
                return;
            }
            const finalName = profileData?.name || user.displayName || user.email?.split('@')[0] || 'Artist';
            setClientGreeting(getRandomGreeting(finalName));

        } else if (!isLoading && !user) {
             setClientGreeting("Welcome!");
        } else {
            setClientGreeting("Welcome!");
        }

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, authLoading, profileLoading, profileData, router]);


    const isLoading = authLoading || profileLoading;
    const displayName = profileData?.name || user?.displayName || (user?.email ? user.email.split('@')[0] : 'Artist');

     if (isLoading || profileData === undefined || randomBorderStyles.length === 0) { // Check for randomBorderStyles too
        return (
             <div className="flex min-h-screen w-full flex-col bg-transparent">
                 <main className="relative z-10 flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                     <Card className="mb-4 sm:mb-8 bg-card/70 dark:bg-card/60 shadow-xl rounded-2xl border-border/40">
                         <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
                             <div className="flex items-center gap-4">
                                 <Skeleton className="h-10 w-10 hidden sm:block rounded-lg bg-muted/60" />
                                 <div className="space-y-1.5">
                                     <Skeleton className="h-7 w-52 bg-muted/60" />
                                 </div>
                             </div>
                             <div className="flex-shrink-0 ml-auto hidden md:flex">
                                <Skeleton className="h-6 w-36 bg-muted/60" />
                            </div>
                             <div className="flex-shrink-0">
                                 <Skeleton className="h-12 w-12 rounded-full bg-muted/60" />
                             </div>
                              <div className="w-full md:hidden mt-2">
                                <Skeleton className="h-6 w-full bg-muted/60" />
                              </div>
                         </CardHeader>
                     </Card>
                     <div className="max-w-6xl mx-auto w-full">
                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                             {Array.from({ length: navItems.length }).map((_, index) => (
                                 <Skeleton key={index} className="aspect-[4/3.5] rounded-2xl bg-muted/60" />
                             ))}
                         </div>
                     </div>
                 </main>
             </div>
        );
    }

     if (!user && !authLoading) {
         return null;
     }

    return (
        <div className="flex min-h-screen w-full flex-col bg-transparent">
            <main className="relative z-10 flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6 lg:p-8">
                <Card className="mb-6 sm:mb-10 bg-card/70 dark:bg-card/60 shadow-xl rounded-2xl border-border/40">
                    <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap p-5 md:p-6">
                        <div className="flex items-center gap-3 md:gap-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-9 w-9 md:h-10 md:w-10 hidden sm:block flex-shrink-0"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                            <div className="text-center sm:text-left">
                                <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-primary">
                                    {clientGreeting || `Welcome, ${displayName}!`}
                                </CardTitle>
                            </div>
                        </div>
                        <div className="flex-shrink-0 ml-auto hidden md:flex">
                            <TimeWeather />
                        </div>
                        <div className="flex-shrink-0">
                            <UserProfile />
                        </div>
                         <div className="w-full md:hidden mt-3">
                             <TimeWeather />
                         </div>
                    </CardHeader>
                </Card>

                <div className="max-w-6xl mx-auto w-full">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {navItems.map((item, index) => {
                        const animationClass = "opacity-0 animate-fade-in-up";
                        const animationDelay = `${index * 120}ms`;
                        const activeStateClasses = "active:scale-[0.97] active:opacity-90 transition-transform duration-100";
                        const currentBorderStyle = randomBorderStyles[index] || "rounded-2xl"; // Fallback

                        if (item.imageSrc) {
                            const cardContent = (
                                <Card className={cn(
                                    "bg-card/60 dark:bg-card/50 border border-border/30 shadow-lg transition-all duration-300 ease-out cursor-pointer text-center h-full flex flex-col justify-center items-center overflow-hidden",
                                    "hover:shadow-xl hover:border-primary/60 hover:-translate-y-1.5 hover-glow",
                                    currentBorderStyle // Apply random border style
                                )}>
                                    <Image
                                        src={item.imageSrc}
                                        alt={item.title}
                                        layout="fill"
                                        objectFit="cover"
                                        className="transition-transform duration-300 group-hover:scale-105" // Removed explicit rounding
                                        data-ai-hint="spotify for artists banner"
                                        unoptimized
                                    />
                                </Card>
                            );
                            return (
                                <a
                                    href={item.href}
                                    key={item.href}
                                    className={cn("block group relative aspect-[4/3.5]", animationClass, activeStateClasses)}
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
                                    "bg-card/60 dark:bg-card/50 border border-border/30 shadow-lg transition-all duration-300 ease-out cursor-pointer text-center h-full flex flex-col justify-center items-center p-6 overflow-hidden", // Added overflow-hidden
                                    "hover:shadow-xl hover:border-primary/60 hover:-translate-y-1.5 hover-glow",
                                    currentBorderStyle // Apply random border style
                                )}>
                                    <CardContent className="flex flex-col items-center justify-center space-y-3 md:space-y-4 p-0">
                                        <div className="p-3 md:p-4 rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20 mb-2">
                                            {item.icon}
                                        </div>
                                        <CardTitle className="text-lg md:text-xl font-semibold text-foreground">{item.title}</CardTitle>
                                        <CardDescription className="text-sm md:text-base text-muted-foreground">{item.description}</CardDescription>
                                    </CardContent>
                                </Card>
                            );
                            return item.external ? (
                                <a
                                    href={item.href}
                                    key={item.href}
                                    className={cn("block group aspect-[4/3.5]", animationClass, activeStateClasses)}
                                    style={{ animationDelay }}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {cardContent}
                                </a>
                            ) : (
                                <Link href={item.href} key={item.href} className={cn("block group aspect-[4/3.5]", animationClass, activeStateClasses)} style={{ animationDelay }}>
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


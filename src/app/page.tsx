
"use client";

import Link from "next/link";
import { UserProfile } from "@/components/common/user-profile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, ListMusic, CalendarClock, FileText, UserCog, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context"; // Import useAuth
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton

// Updated Pineapple SVG Icon based on the requested style (wired/gradient)
const PineappleIcon = () => (
  <img
      src="https://media.lordicon.com/icons/wired/gradient/1843-pineapple.svg"
      alt="Pineapple Icon"
      className="h-10 w-10"
  />
);

// Define the navigation items
const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-10 w-10" />, description: "View stats & releases" },
  { title: "Documents", href: "/documents", icon: <FileText className="h-10 w-10" />, description: "Access agreements & handbooks" },
  { title: "Pineapple", href: "/pineapple", icon: <PineappleIcon />, description: "A tropical surprise!" },
];

export default function HomePage() {
    const { user, loading } = useAuth(); // Use the auth context

    // Handle loading state
    if (loading) {
         return (
             <div className="flex min-h-screen w-full flex-col bg-transparent p-4 md:p-8 items-center justify-center">
                 <Skeleton className="h-24 w-full max-w-4xl mb-8" />
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 w-full max-w-4xl">
                     {Array.from({ length: 3 }).map((_, index) => (
                         <Skeleton key={index} className="h-48 w-full rounded-lg" />
                     ))}
                 </div>
             </div>
         );
    }

    // If not loading and no user, AuthProvider/middleware should handle redirect
    // This component assumes user is authenticated if it renders past the loading state
    const artistName = user?.displayName || user?.email || "Artist Name"; // Use user info
     // Use a default or derive image if user has none; adjust as needed
    const artistLogoUrl = user?.photoURL || `https://picsum.photos/seed/${user?.uid || 'default'}/40/40`;


  return (
    <div className="flex min-h-screen w-full flex-col bg-transparent">
      <main className="relative z-10 flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        {/* Header Card */}
        <Card className="mb-4 sm:mb-8 bg-card/80 dark:bg-card/70 backdrop-blur-md shadow-lg rounded-lg border-border/30">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
             {/* App Title */}
            <div className="flex items-center gap-4">
               {/* Placeholder Icon - could be a music note or app logo */}
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 hidden sm:block"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                <div className="text-center sm:text-left">
                    <CardTitle className="text-xl sm:text-3xl font-bold tracking-tight text-primary">
                     Artist Hub
                    </CardTitle>
                    <CardDescription className="text-muted-foreground text-xs sm:text-sm">
                    Your central place for management and insights.
                    </CardDescription>
                </div>
            </div>
             {/* Pass potentially updated user info to UserProfile */}
            <UserProfile name={artistName} imageUrl={artistLogoUrl} />
          </CardHeader>
        </Card>

        {/* Navigation Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {navItems.map((item) => (
            <Link href={item.href} key={item.href} passHref legacyBehavior>
              <a className="block group">
                <Card className={cn(
                    "bg-card/70 dark:bg-card/60 backdrop-blur-sm border border-border/30 shadow-md rounded-lg transition-all duration-200 ease-in-out cursor-pointer text-center h-full flex flex-col justify-center items-center p-6",
                    "hover:shadow-lg hover:border-primary/50 hover:-translate-y-1 hover-glow"
                )}>
                  <CardContent className="flex flex-col items-center justify-center space-y-3 p-0">
                     <div className="p-3 rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                        {item.icon}
                     </div>
                    <CardTitle className="text-lg font-semibold text-foreground">{item.title}</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">{item.description}</CardDescription>
                  </CardContent>
                </Card>
              </a>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

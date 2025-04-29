
"use client";

import Link from "next/link";
import { UserProfile } from "@/components/common/user-profile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, ListMusic, CalendarClock, FileText, UserCog, Settings } from "lucide-react"; // Import relevant icons
import { cn } from "@/lib/utils";

// Updated Pineapple SVG Icon based on the requested style (wired/gradient)
const PineappleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10">
        <defs>
            {/* Gradient using primary and accent colors */}
            <linearGradient id="pineapple-gradient-wired" x1="0%" y1="0%" x2="100%" y2="100%">
                 <stop offset="0%" style={{stopColor: 'hsl(var(--primary))', stopOpacity: 0.8}} />
                 <stop offset="100%" style={{stopColor: 'hsl(var(--accent))', stopOpacity: 1}} />
            </linearGradient>
        </defs>
        {/* Leaves (Stroke only for wired look) */}
        <path d="M16 2c-1.5 1.5-2 4-1 6s3 3 4.5 1.5" stroke="hsl(var(--primary) / 0.9)" />
        <path d="M15 7c.5-1.5 2-3 3.5-2" stroke="hsl(var(--primary) / 0.9)" />
        <path d="M12 5c1.5-1.5 3.5-1.5 5 0" stroke="hsl(var(--primary) / 0.9)" />
        <path d="M10 6c1-1.5 2.5-2 4-1" stroke="hsl(var(--primary) / 0.9)" />
        <path d="M8 8c.5-1 1.5-2 2.5-2" stroke="hsl(var(--primary) / 0.9)" />
        {/* Body (Use gradient fill, thin border) */}
        <path d="M17.8 10.2c-.8-.8-1.8-1.2-2.8-1.2-3.3 0-6 2.7-6 6 0 1 .2 2 .7 2.8.8.8 1.8 1.2 2.8 1.2 3.3 0 6-2.7 6-6 0-1-.2-2-.7-2.8z" fill="url(#pineapple-gradient-wired)" stroke="hsl(var(--border) / 0.4)" />
        {/* Body Pattern Lines (thin strokes) */}
        <path d="m10.5 13.5 4 4" stroke="hsl(var(--foreground) / 0.15)" />
        <path d="m14.5 13.5-4 4" stroke="hsl(var(--foreground) / 0.15)" />
        <path d="m12.5 11.5 2 6" stroke="hsl(var(--foreground) / 0.15)" />
        <path d="m11.5 17.5 2-6" stroke="hsl(var(--foreground) / 0.15)" />
    </svg>
);


// Define the navigation items
const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-10 w-10" />, description: "View stats & releases" },
  { title: "Documents", href: "/documents", icon: <FileText className="h-10 w-10" />, description: "Access agreements & handbooks" },
  { title: "Manage Profile", href: "/profile", icon: <UserCog className="h-10 w-10" />, description: "Update your details" },
  { title: "Pineapple", href: "/pineapple", icon: <PineappleIcon />, description: "A tropical surprise!" }, // Uses the updated icon
  // Add more sections here if needed
  // { title: "Settings", href: "/settings", icon: <Settings className="h-10 w-10" />, description: "App settings" },
];

export default function HomePage() {
  // Placeholder user data (replace with actual data fetching later)
  const artistName = "Artist Name";
  const artistLogoUrl = "https://picsum.photos/seed/artistlogo/40/40"; // Placeholder logo

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
                <div className="text-center sm:text-left"> {/* Kept text-center sm:text-left for consistency */}
                    <CardTitle className="text-xl sm:text-3xl font-bold tracking-tight text-primary">
                     Artist Hub
                    </CardTitle>
                    <CardDescription className="text-muted-foreground text-xs sm:text-sm">
                    Your central place for management and insights.
                    </CardDescription>
                </div>
            </div>
            <UserProfile name={artistName} imageUrl={artistLogoUrl} />
          </CardHeader>
        </Card>

        {/* Navigation Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {navItems.map((item) => (
            <Link href={item.href} key={item.href} passHref legacyBehavior>
              <a className="block group"> {/* Added group class */}
                <Card className={cn(
                    "bg-card/70 dark:bg-card/60 backdrop-blur-sm border border-border/30 shadow-md rounded-lg transition-all duration-200 ease-in-out cursor-pointer text-center h-full flex flex-col justify-center items-center p-6",
                    "hover:shadow-lg hover:border-primary/50 hover:-translate-y-1 hover-glow" // Use hover-glow utility
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


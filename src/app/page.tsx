
"use client";

import Link from "next/link";
import { UserProfile } from "@/components/common/user-profile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, ListMusic, CalendarClock, FileText, UserCog, Settings } from "lucide-react"; // Import relevant icons
import { cn } from "@/lib/utils";

// Pineapple SVG Icon - Reverted to previous themeable version
const PineappleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10">
        <defs>
            <linearGradient id="pineapple-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{stopColor: 'hsl(var(--primary))', stopOpacity: 0.7}} />
                <stop offset="100%" style={{stopColor: 'hsl(var(--accent))', stopOpacity: 0.9}} />
            </linearGradient>
        </defs>
        {/* Leaves */}
        <path d="M15.186 13.452c1.348-.76 2.203-2.05 2.141-3.448-.064-1.43-1.083-2.7-2.573-3.433" stroke="hsl(var(--primary) / 0.8)" />
        <path d="M15.72 7.364c.37-.6.58-1.26.58-1.96 0-1.56-1.04-2.8-2.33-3.25" stroke="hsl(var(--primary) / 0.8)" />
        <path d="M12.843 2.344c-.092.02-.182.046-.27.076" stroke="hsl(var(--primary) / 0.8)" />
        <path d="M12.843 2.344c-.534.16-1.02.41-1.43.73-.675.51-1.16 1.23-1.37 2.03" stroke="hsl(var(--primary) / 0.8)" />
        <path d="M10.313 5.124c-.75 1.09-1.02 2.44-.7 3.71.31 1.27 1.17 2.36 2.33 3.02" stroke="hsl(var(--primary) / 0.8)" />
        <path d="M10.313 5.124c-.17-.25-.32-.5-.46-.75" stroke="hsl(var(--primary) / 0.8)" />
        <path d="M9.853 4.374c-1.27.13-2.4.8-3.05 1.79-.65 1-1.05 2.2-.93 3.45.12 1.25.8 2.37 1.8 3.1" stroke="hsl(var(--primary) / 0.8)" />
        <path d="M7.673 12.714c.18.14.37.27.56.39" stroke="hsl(var(--primary) / 0.8)" />
        {/* Body */}
        <path d="M18.744 13.98c.64-.994.81-2.19.45-3.33-.35-1.14-1.17-2.04-2.26-2.54-.773-1.09-1.93-1.87-3.25-2.16l-.4-.09" fill="url(#pineapple-gradient)" stroke="hsl(var(--border) / 0.5)"/>
        <path d="M13.284 5.86c-1.32.29-2.48 1.07-3.25 2.16-1.09.5-1.91 1.4-2.26 2.54-.36 1.14-.19 2.336.45 3.33 1.056 1.634 2.8 2.69 4.78 2.69s3.724-1.056 4.78-2.69Z" fill="url(#pineapple-gradient)" stroke="hsl(var(--border) / 0.5)" />
        {/* Body Pattern Lines */}
        <path d="m8.12 12.25 5.19 3.34" stroke="hsl(var(--foreground) / 0.2)" />
        <path d="M15.88 12.25 10.7 15.6" stroke="hsl(var(--foreground) / 0.2)" />
        <path d="m12 16.19 3.88-2.5" stroke="hsl(var(--foreground) / 0.2)" />
        <path d="M12 16.19 8.12 13.7" stroke="hsl(var(--foreground) / 0.2)" />
        <path d="m8.69 9.81 1.95 5.6" stroke="hsl(var(--foreground) / 0.2)" />
        <path d="M15.31 9.81 13.36 15.4" stroke="hsl(var(--foreground) / 0.2)" />
    </svg>
);


// Define the navigation items
const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-10 w-10" />, description: "View stats & releases" },
  { title: "Documents", href: "/documents", icon: <FileText className="h-10 w-10" />, description: "Access agreements & handbooks" },
  { title: "Manage Profile", href: "/profile", icon: <UserCog className="h-10 w-10" />, description: "Update your details" },
  { title: "Pineapple", href: "/pineapple", icon: <PineappleIcon />, description: "A tropical surprise!" }, // New Pineapple item
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

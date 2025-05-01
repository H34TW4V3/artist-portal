
"use client"; // Add use client because we use state and hooks

import { useState, useEffect } from "react"; // Import useEffect
import Link from "next/link"; // Import Link
import { StatisticsView } from "@/components/dashboard/statistics-view";
// import { ReleaseList } from "@/components/dashboard/release-list"; // Commented out ReleaseList import
// import { EventsView } from "@/components/dashboard/events-view"; // Commented out EventsView import
import UserProfile from "@/components/common/user-profile"; // Changed to default import
// import { TimeWeather } from "@/components/common/time-weather"; // Import TimeWeather - Temporarily disabled
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Commented out ListMusic and CalendarClock icons
import { BarChart3, Home } from "lucide-react"; // Keep BarChart3 and Home icon
import { Button } from "@/components/ui/button"; // Import Button
import { useAuth } from "@/context/auth-context"; // Import useAuth
import { useRouter } from 'next/navigation'; // Import useRouter
import { SplashScreen } from '@/components/common/splash-screen'; // Import SplashScreen

// Define content for each tab's header - Only Statistics needed now
const tabHeaders = {
  statistics: {
    title: "Streaming Statistics",
    description: "Your latest performance overview.",
    icon: <BarChart3 className="h-8 w-8 text-primary hidden sm:block" />,
  },
  // Removed Releases and Events tab header info
};

// Define the keys for the tabs - Only Statistics needed now
type DashboardTab = "statistics"; // Removed "releases" and "events"

export default function DashboardPage() {
  const { user, loading } = useAuth(); // Get user info and loading state
  const router = useRouter();
  // State to manage the active tab, default to statistics
  const [activeTab, setActiveTab] = useState<DashboardTab>("statistics");

   // Redirect unauthenticated users
   useEffect(() => {
    if (!loading && !user) {
        router.replace('/login');
    }
  }, [user, loading, router]);

  // Get current header based on active tab (simplified as only one tab now)
  const currentHeader = tabHeaders[activeTab];

  // Show loading indicator while checking auth state or if user is not yet available
  // Use SplashScreen instead of Loader2
  if (loading || !user) {
    return <SplashScreen loadingText="Loading Dashboard..." />; // Pass custom text
  }


  return (
    <div className="flex min-h-screen w-full flex-col bg-transparent">
      <main className="relative z-10 flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        {/* Header Card - Dynamically updates based on active tab */}
        <Card className="mb-4 sm:mb-8 bg-card/60 dark:bg-card/50 shadow-lg rounded-lg border-border/30"> {/* Adjusted opacity */}
          <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap"> {/* Added flex-wrap */}
            <div className="flex items-center gap-4">
              {/* Add Home Button */}
              <Link href="/" passHref legacyBehavior>
                 <Button variant="ghost" size="lg" className="h-12 w-12 text-primary hover:bg-primary/10 active:bg-primary/20 p-0" aria-label="Go to Home">
                   <Home className="h-7 w-7" />
                 </Button>
              </Link>
              {/* Display icon for the active tab */}
              {currentHeader.icon}
              <div className="text-center sm:text-left"> {/* Ensure alignment */}
                <CardTitle className="text-xl sm:text-3xl font-bold tracking-tight text-primary text-center sm:text-left">
                   {currentHeader.title}
                </CardTitle>
                <CardDescription className="text-muted-foreground text-xs sm:text-sm text-center sm:text-left"> {/* Ensure alignment */}
                  {currentHeader.description}
                </CardDescription>
              </div>
            </div>
            {/* Time and Weather - Temporarily disabled
             <div className="flex-shrink-0 ml-auto hidden md:flex">
                 <TimeWeather />
             </div>
            */}
            {/* Render UserProfile component - added flex-shrink-0 */}
            <div className="flex-shrink-0 ml-auto"> {/* Adjusted to use ml-auto when weather is hidden */}
                <UserProfile />
            </div>
            {/* Mobile Time and Weather - Temporarily disabled
             <div className="w-full md:hidden mt-2">
                 <TimeWeather />
             </div>
            */}
          </CardHeader>
        </Card>

        {/* Tabbed Content */}
        {/* Control the Tabs component with state */}
        <Tabs
            value={activeTab}
            // onValueChange no longer needed if only one tab
            // onValueChange={(value) => setActiveTab(value as DashboardTab)}
            className="w-full"
        >
           {/* Updated grid-cols to reflect only one tab */}
           {/* Optional: Hide TabsList if only one tab */}
          {/* <TabsList className="grid w-full grid-cols-1 gap-2 mb-6 h-auto bg-card/70 dark:bg-card/60 border border-border/20 shadow-sm rounded-lg p-1 max-w-xs mx-auto"> // Removed backdrop-blur-sm
            <TabsTrigger value="statistics" className="py-2 data-[state=active]:shadow-md transition-subtle rounded-md flex items-center justify-center gap-2 data-[state=active]:hover-glow data-[state=active]:focus-glow">
              <BarChart3 className="h-4 w-4" /> Statistics
            </TabsTrigger>
             {/* Removed Releases Tab Trigger */}
             {/* Removed Events Tab Trigger */}
          {/* </TabsList> */}

          {/* Display StatisticsView directly without TabsContent if preferred when only one tab */}
          <StatisticsView className="bg-card/60 dark:bg-card/50 border-border/30" /> {/* Adjusted opacity */}

          {/* Removed Releases Tab Content */}
          {/* Removed Events Tab Content */}
        </Tabs>
      </main>
    </div>
  );
}

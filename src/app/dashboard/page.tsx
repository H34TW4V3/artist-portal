
"use client"; // Add use client because we use state and hooks

import { useState, useEffect } from "react"; // Import useEffect
import { StatisticsView } from "@/components/dashboard/statistics-view";
import { ReleaseList } from "@/components/dashboard/release-list";
import { EventsView } from "@/components/dashboard/events-view";
import UserProfile from "@/components/common/user-profile"; // Changed to default import
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListMusic, CalendarClock, BarChart3, Home } from "lucide-react"; // Import Home icon
import Link from "next/link"; // Import Link
import { Button } from "@/components/ui/button"; // Import Button
import { useAuth } from "@/context/auth-context"; // Import useAuth
import { useRouter } from 'next/navigation'; // Import useRouter
import { Loader2 } from 'lucide-react'; // Import Loader2 for loading animation

// Define content for each tab's header
const tabHeaders = {
  statistics: {
    title: "Streaming Statistics",
    description: "Your latest performance overview.",
    icon: <BarChart3 className="h-8 w-8 text-primary hidden sm:block" />,
  },
  releases: {
    title: "Manage Releases",
    description: "View, edit, or remove your existing releases.",
    icon: <ListMusic className="h-8 w-8 text-primary hidden sm:block" />,
  },
  events: {
    title: "Event Management",
    description: "Manage your upcoming events and view past ones.",
    icon: <CalendarClock className="h-8 w-8 text-primary hidden sm:block" />,
  },
};

export default function DashboardPage() {
  const { user, loading } = useAuth(); // Get user info and loading state
  const router = useRouter();
  // State to manage the active tab
  const [activeTab, setActiveTab] = useState<keyof typeof tabHeaders>("statistics");
  // Removed artistName state as it's no longer used in the header

   // Redirect unauthenticated users
   useEffect(() => {
    if (!loading && !user) {
        router.replace('/login');
    }
  }, [user, loading, router]);

  // Get the current header content based on activeTab
  const currentHeader = tabHeaders[activeTab] || tabHeaders.statistics; // Default to statistics

   // Show loading indicator while checking auth state or if user is not yet available
   if (loading || !user) {
    return (
         <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
             <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    );
  }


  return (
    <div className="flex min-h-screen w-full flex-col bg-transparent">
      <main className="relative z-10 flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        {/* Header Card - Dynamically updates based on active tab */}
        <Card className="mb-4 sm:mb-8 bg-card/80 dark:bg-card/70 backdrop-blur-md shadow-lg rounded-lg border-border/30">
           {/* Center align text */}
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                {/* Removed Home Button from Dashboard */}
              {/* Display icon for the active tab */}
              {currentHeader.icon}
              {/* Added text-center sm:text-left */}
              <div className="text-center sm:text-left"> {/* Ensure alignment */}
                {/* Display title and description for the active tab */}
                 {/* Center align text */}
                <CardTitle className="text-xl sm:text-3xl font-bold tracking-tight text-primary text-center sm:text-left">
                   {/* Display only the current tab title, removed artist name */}
                   {currentHeader.title}
                </CardTitle>
                <CardDescription className="text-muted-foreground text-xs sm:text-sm text-center sm:text-left"> {/* Ensure alignment */}
                  {currentHeader.description}
                </CardDescription>
              </div>
            </div>
            <UserProfile />
          </CardHeader>
        </Card>

        {/* Tabbed Content */}
        {/* Control the Tabs component with state */}
        <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as keyof typeof tabHeaders)} // Update state on change
            className="w-full"
        >
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 gap-2 mb-6 h-auto bg-card/70 dark:bg-card/60 backdrop-blur-sm border border-border/20 shadow-sm rounded-lg p-1">
            <TabsTrigger value="statistics" className="py-2 data-[state=active]:shadow-md transition-subtle rounded-md flex items-center justify-center gap-2 data-[state=active]:hover-glow data-[state=active]:focus-glow">
              <BarChart3 className="h-4 w-4" /> Statistics
            </TabsTrigger>
            <TabsTrigger value="releases" className="py-2 data-[state=active]:shadow-md transition-subtle rounded-md flex items-center justify-center gap-2 data-[state=active]:hover-glow data-[state=active]:focus-glow">
              <ListMusic className="h-4 w-4" /> Releases
            </TabsTrigger>
            <TabsTrigger value="events" className="py-2 data-[state=active]:shadow-md transition-subtle rounded-md flex items-center justify-center gap-2 data-[state=active]:hover-glow data-[state=active]:focus-glow">
              <CalendarClock className="h-4 w-4" /> Events
            </TabsTrigger>
          </TabsList>

          <TabsContent value="statistics">
            <StatisticsView className="bg-card/80 dark:bg-card/70 backdrop-blur-md border-border/30" />
          </TabsContent>
          <TabsContent value="releases" className="space-y-6">
            <ReleaseList className="bg-card/80 dark:bg-card/70 backdrop-blur-md border-border/30" />
          </TabsContent>
          <TabsContent value="events">
            <EventsView className="bg-card/80 dark:bg-card/70 backdrop-blur-md border-border/30" />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

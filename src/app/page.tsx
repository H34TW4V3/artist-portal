
"use client"; // Add use client because we use state

import { useState } from "react"; // Import useState
import { StatisticsView } from "@/components/dashboard/statistics-view";
import { ReleaseList } from "@/components/dashboard/release-list";
import { EventsView } from "@/components/dashboard/events-view";
import { UserProfile } from "@/components/common/user-profile";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Music, ListMusic, CalendarClock, BarChart3 } from "lucide-react";

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
  // Placeholder user data (replace with actual data fetching later)
  const artistName = "Artist Name";
  const artistLogoUrl = "https://picsum.photos/seed/artistlogo/40/40"; // Placeholder logo

  // State to manage the active tab
  const [activeTab, setActiveTab] = useState<keyof typeof tabHeaders>("statistics");

  // Get the current header content based on activeTab
  const currentHeader = tabHeaders[activeTab] || tabHeaders.statistics; // Default to statistics

  return (
    <div className="flex min-h-screen w-full flex-col bg-transparent">
      <main className="relative z-10 flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        {/* Header Card - Dynamically updates based on active tab */}
        <Card className="mb-4 sm:mb-8 bg-card/80 dark:bg-card/70 backdrop-blur-md shadow-lg rounded-lg border-border/30">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Display icon for the active tab */}
              {currentHeader.icon}
              <div className="text-center sm:text-left">
                {/* Display title and description for the active tab */}
                <CardTitle className="text-xl sm:text-3xl font-bold tracking-tight text-primary">
                  {currentHeader.title}
                </CardTitle>
                <CardDescription className="text-muted-foreground text-xs sm:text-sm">
                  {currentHeader.description}
                </CardDescription>
              </div>
            </div>
            <UserProfile name={artistName} imageUrl={artistLogoUrl} />
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
            <TabsTrigger value="statistics" className="py-2 data-[state=active]:shadow-md transition-subtle rounded-md flex items-center justify-center gap-2">
              <BarChart3 className="h-4 w-4" /> Statistics
            </TabsTrigger>
            <TabsTrigger value="releases" className="py-2 data-[state=active]:shadow-md transition-subtle rounded-md flex items-center justify-center gap-2">
              <ListMusic className="h-4 w-4" /> Releases
            </TabsTrigger>
            <TabsTrigger value="events" className="py-2 data-[state=active]:shadow-md transition-subtle rounded-md flex items-center justify-center gap-2">
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

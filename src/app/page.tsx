

import { StatisticsView } from "@/components/dashboard/statistics-view";
import { ReleaseList } from "@/components/dashboard/release-list";
import { EventsView } from "@/components/dashboard/events-view";
import { UserProfile } from "@/components/common/user-profile"; // Import UserProfile
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Music, ListMusic, CalendarClock, BarChart3 } from "lucide-react";

export default function DashboardPage() {
  // Placeholder user data (replace with actual data fetching later)
  const artistName = "Artist Name";
  const artistLogoUrl = "https://picsum.photos/seed/artistlogo/40/40"; // Placeholder logo

  return (
    // Removed the relative positioning here, layout handles background
    <div className="flex min-h-screen w-full flex-col bg-transparent">
        {/* Background Image Removed - Handled in layout.tsx */}

      {/* Content Area - Ensure z-10 is kept if needed, but layout handles layering */}
      <main className="relative z-10 flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
         {/* Header Card - Updated to include UserProfile */}
         <Card className="mb-4 sm:mb-8 bg-card/80 dark:bg-card/70 backdrop-blur-md shadow-lg rounded-lg border-border/30">
             <CardHeader className="flex flex-row items-center justify-between gap-4">
                 <div className="flex items-center gap-4">
                     <Music className="h-8 w-8 text-primary hidden sm:block" /> {/* Hide icon on small screens if profile is shown */}
                     <div>
                        <CardTitle className="text-xl sm:text-3xl font-bold tracking-tight text-primary">Artist Hub</CardTitle>
                        <CardDescription className="text-muted-foreground text-xs sm:text-sm">Manage your music and events.</CardDescription>
                     </div>
                 </div>
                 {/* Add UserProfile component to the right */}
                 <UserProfile name={artistName} imageUrl={artistLogoUrl} />
            </CardHeader>
         </Card>

         {/* Tabbed Content */}
        <Tabs defaultValue="statistics" className="w-full">
           {/* Use bg-card/70 for slightly more transparency */}
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 gap-2 mb-6 h-auto bg-card/70 dark:bg-card/60 backdrop-blur-sm border border-border/20 shadow-sm rounded-lg p-1">
             {/* Added BarChart3 icon for Statistics */}
            <TabsTrigger value="statistics" className="py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-subtle rounded-md flex items-center justify-center gap-2">
                <BarChart3 className="h-4 w-4" /> Statistics
            </TabsTrigger>
             {/* Combined Upload/Manage into Releases, used ListMusic */}
            <TabsTrigger value="releases" className="py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-subtle rounded-md flex items-center justify-center gap-2">
                 <ListMusic className="h-4 w-4" /> Releases
            </TabsTrigger>
             {/* New Events tab */}
            <TabsTrigger value="events" className="py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-subtle rounded-md flex items-center justify-center gap-2">
                 <CalendarClock className="h-4 w-4" /> Events
            </TabsTrigger>
          </TabsList>

          <TabsContent value="statistics">
            <StatisticsView className="bg-card/80 dark:bg-card/70 backdrop-blur-md border-border/30" />
          </TabsContent>

           {/* Content for the combined Releases tab */}
          <TabsContent value="releases" className="space-y-6">
             {/* ReleaseList now contains the trigger for the upload modal */}
            <ReleaseList className="bg-card/80 dark:bg-card/70 backdrop-blur-md border-border/30" />
          </TabsContent>

           {/* Content for the new Events tab */}
          <TabsContent value="events">
             <EventsView className="bg-card/80 dark:bg-card/70 backdrop-blur-md border-border/30" />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}


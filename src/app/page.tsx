
import { StatisticsView } from "@/components/dashboard/statistics-view";
import { ReleaseForm } from "@/components/dashboard/release-form";
import { ReleaseList } from "@/components/dashboard/release-list";
import { EventsView } from "@/components/dashboard/events-view"; // Import new EventsView
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Music, ListMusic, CalendarClock, BarChart3 } from "lucide-react"; // Updated icons

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen w-full flex-col relative bg-background"> {/* Changed bg-secondary to bg-background for dark mode */}
        {/* Background Image - adjusted opacity for dark mode */}
        <div
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-[0.03] dark:opacity-[0.05]" // Further reduced opacity
            style={{ backgroundImage: "url('https://picsum.photos/1920/1080?grayscale&blur=3')" }} // Increased blur slightly
        />

      {/* Content Area */}
      <main className="relative z-10 flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
         {/* Header Card */}
         <Card className="mb-4 sm:mb-8 bg-card/80 dark:bg-card/60 backdrop-blur-md shadow-lg rounded-lg border-border/30">
             <CardHeader className="flex flex-row items-center gap-4">
                 <Music className="h-8 w-8 text-primary" />
                 <div>
                    <CardTitle className="text-3xl font-bold tracking-tight text-primary">Artist Hub</CardTitle>
                    <CardDescription className="text-muted-foreground">Welcome Back! Manage your music and events.</CardDescription>
                 </div>
            </CardHeader>
         </Card>

         {/* Tabbed Content */}
        <Tabs defaultValue="statistics" className="w-full">
           {/* Use bg-card/70 for slightly more transparency */}
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 gap-2 mb-6 h-auto bg-card/70 dark:bg-card/50 backdrop-blur-sm border border-border/20 shadow-sm rounded-lg p-1">
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
            <StatisticsView className="bg-card/80 dark:bg-card/60 backdrop-blur-md border-border/30" />
          </TabsContent>

           {/* Content for the combined Releases tab */}
          <TabsContent value="releases" className="space-y-6">
             {/* Use Cards to structure the form and list */}
            <ReleaseForm key="upload-form" className="bg-card/80 dark:bg-card/60 backdrop-blur-md border-border/30" />
            <ReleaseList className="bg-card/80 dark:bg-card/60 backdrop-blur-md border-border/30" />
          </TabsContent>

           {/* Content for the new Events tab */}
          <TabsContent value="events">
             <EventsView className="bg-card/80 dark:bg-card/60 backdrop-blur-md border-border/30" />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

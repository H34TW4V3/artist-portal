
import { StatisticsView } from "@/components/dashboard/statistics-view";
import { ReleaseForm } from "@/components/dashboard/release-form";
import { ReleaseList } from "@/components/dashboard/release-list";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Music, Upload, ListMusic } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen w-full flex-col relative bg-secondary">
        {/* Background Image */}
        <div
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-10 dark:opacity-[0.07]"
            style={{ backgroundImage: "url('https://picsum.photos/1920/1080?grayscale&blur=2')" }}
        />

        {/* Overlay */}
        {/* <div className="absolute inset-0 z-[-1] bg-gradient-to-b from-background/70 via-background/90 to-background" /> */}

      {/* Content Area */}
      <main className="relative z-10 flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
         {/* Header Card */}
         <Card className="mb-4 sm:mb-8 bg-card/95 backdrop-blur-sm shadow-lg rounded-lg border-border/50">
             <CardHeader className="flex flex-row items-center gap-4">
                 <Music className="h-8 w-8 text-primary" />
                 <div>
                    <CardTitle className="text-3xl font-bold tracking-tight text-primary">Artist Hub</CardTitle>
                    <CardDescription className="text-muted-foreground">Welcome Back! Here's what's happening with your music.</CardDescription>
                 </div>
            </CardHeader>
         </Card>

         {/* Tabbed Content */}
        <Tabs defaultValue="statistics" className="w-full">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 gap-2 mb-6 h-auto bg-card/80 backdrop-blur-sm border border-border/30 shadow-sm rounded-lg p-1">
            <TabsTrigger value="statistics" className="py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-subtle rounded-md flex items-center justify-center gap-2">
                <ListMusic className="h-4 w-4" /> Statistics
            </TabsTrigger>
            <TabsTrigger value="upload" className="py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-subtle rounded-md flex items-center justify-center gap-2">
                 <Upload className="h-4 w-4" /> Upload Release
            </TabsTrigger>
            <TabsTrigger value="manage" className="py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-subtle rounded-md flex items-center justify-center gap-2">
                 <ListMusic className="h-4 w-4" /> Manage Releases
            </TabsTrigger>
          </TabsList>

          <TabsContent value="statistics">
            <StatisticsView />
          </TabsContent>

          <TabsContent value="upload">
             {/* Release Upload Form - we pass a key to force re-render/reset when tab is switched back */}
             <ReleaseForm key="upload-form" className="bg-card/95 backdrop-blur-sm border-border/50" />
          </TabsContent>

          <TabsContent value="manage">
             <ReleaseList className="bg-card/95 backdrop-blur-sm border-border/50" />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

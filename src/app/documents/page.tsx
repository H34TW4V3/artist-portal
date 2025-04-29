
import { AgreementCard } from "@/components/documents/agreement-card";
import { UserProfile } from "@/components/common/user-profile";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, FolderKanban } from "lucide-react";

export default function DocumentsPage() {
  // Placeholder user data (replace with actual data fetching later)
  const artistName = "Artist Name";
  const artistLogoUrl = "https://picsum.photos/seed/artistlogo/40/40"; // Placeholder logo

   const agreements = [
    { title: "Artist Agreement", icon: <FileText className="h-5 w-5 text-primary" /> },
    { title: "Artist Handbook", icon: <FileText className="h-5 w-5 text-primary" /> },
    { title: "Social Media Management Agreement", icon: <FileText className="h-5 w-5 text-primary" /> },
    { title: "Events Management Agreement", icon: <FileText className="h-5 w-5 text-primary" /> },
    { title: "Merchandising Agreement", icon: <FileText className="h-5 w-5 text-primary" /> },
  ];


  return (
    <div className="flex min-h-screen w-full flex-col relative bg-background">
       {/* Optional: Background Image (similar to dashboard) */}
        <div
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-[0.04] dark:opacity-[0.06]"
            style={{ backgroundImage: "url('https://picsum.photos/1920/1080?grayscale&blur=1')" }}
        />

      {/* Content Area */}
      <main className="relative z-10 flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
         {/* Header Card - Consistent with Dashboard */}
         <Card className="mb-4 sm:mb-8 bg-card/80 dark:bg-card/70 backdrop-blur-md shadow-lg rounded-lg border-border/30">
             <CardHeader className="flex flex-row items-center justify-between gap-4">
                 <div className="flex items-center gap-4">
                     <FolderKanban className="h-8 w-8 text-primary hidden sm:block" />
                     <div>
                        <CardTitle className="text-xl sm:text-3xl font-bold tracking-tight text-primary">Key Documents</CardTitle>
                        <CardDescription className="text-muted-foreground text-xs sm:text-sm">Access your important agreements and documents.</CardDescription>
                     </div>
                 </div>
                 <UserProfile name={artistName} imageUrl={artistLogoUrl} />
            </CardHeader>
         </Card>

        {/* Tabbed Content */}
        <Tabs defaultValue="agreements" className="w-full">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 gap-2 mb-6 h-auto bg-card/70 dark:bg-card/60 backdrop-blur-sm border border-border/20 shadow-sm rounded-lg p-1 max-w-md">
            {/* Only one tab for now */}
            <TabsTrigger value="agreements" className="py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-subtle rounded-md flex items-center justify-center gap-2">
                <FileText className="h-4 w-4" /> My Agreements
            </TabsTrigger>
             {/* Placeholder for potential future tabs
            <TabsTrigger value="other" disabled className="py-2">Other Docs</TabsTrigger>
             */}
          </TabsList>

          <TabsContent value="agreements">
             <Card className="bg-card/80 dark:bg-card/70 backdrop-blur-md border-border/30 shadow-md rounded-lg">
                 <CardHeader>
                    <CardTitle className="text-lg font-semibold text-foreground">Your Agreements</CardTitle>
                    <CardDescription className="text-muted-foreground">Review and download your signed agreements and handbooks.</CardDescription>
                 </CardHeader>
                 <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {agreements.map((agreement, index) => (
                      <AgreementCard
                        key={index}
                        title={agreement.title}
                        icon={agreement.icon}
                      />
                    ))}
                 </CardContent>
             </Card>
          </TabsContent>
           {/* Placeholder for potential future tab content
          <TabsContent value="other">
             <Card className="bg-card/80 dark:bg-card/70 backdrop-blur-md border-border/30">
                 <CardHeader><CardTitle>Other Documents</CardTitle></CardHeader>
                 <CardContent><p className="text-muted-foreground">Coming soon.</p></CardContent>
             </Card>
          </TabsContent>
           */}
        </Tabs>
      </main>
    </div>
  );
}


import { AgreementCard } from "@/components/documents/agreement-card";
import { UserProfile } from "@/components/common/user-profile";
// Import CardContent
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, FolderKanban, BookOpenText, Home } from "lucide-react"; // Added BookOpenText and Home
import Link from "next/link"; // Import Link
import { Button } from "@/components/ui/button"; // Import Button

export default function DocumentsPage() {
  // Placeholder user data (replace with actual data fetching later)
  const artistName = "Artist Name";
  const artistLogoUrl = "https://picsum.photos/seed/artistlogo/40/40"; // Placeholder logo

   // Separate agreements and handbooks
   const agreements = [
    { title: "Artist Agreement", icon: <FileText className="h-5 w-5 text-primary" /> },
    { title: "Social Media Management Agreement", icon: <FileText className="h-5 w-5 text-primary" /> },
    { title: "Events Management Agreement", icon: <FileText className="h-5 w-5 text-primary" /> },
    { title: "Merchandising Agreement", icon: <FileText className="h-5 w-5 text-primary" /> },
  ];

   const handbooks = [
      { title: "Artist Handbook", icon: <BookOpenText className="h-5 w-5 text-primary" /> },
   ];


  return (
    // Removed the relative positioning here, layout handles background
    <div className="flex min-h-screen w-full flex-col bg-transparent">
       {/* Background Image Removed - Handled in layout.tsx */}

      {/* Content Area - Ensure z-10 is kept */}
      <main className="relative z-10 flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
         {/* Header Card - Consistent with Dashboard */}
         <Card className="mb-4 sm:mb-8 bg-card/80 dark:bg-card/70 backdrop-blur-md shadow-lg rounded-lg border-border/30">
             <CardHeader className="flex flex-row items-center justify-between gap-4">
                 <div className="flex items-center gap-4">
                      {/* Home Icon Link - Made larger */}
                     <Link href="/" passHref legacyBehavior>
                          {/* Explicitly set h-10 w-10 for larger size (same as size="icon") */}
                          <Button variant="ghost" size="icon" className="h-10 w-10 text-primary hover:bg-primary/10 active:bg-primary/20" aria-label="Go to Dashboard">
                             {/* Use slightly larger icon inside the button */}
                             <Home className="h-6 w-6" />
                          </Button>
                     </Link>
                     <FolderKanban className="h-8 w-8 text-primary hidden sm:block" />
                     {/* Added text-center to center the title and description */}
                     <div className="text-center sm:text-left">
                        <CardTitle className="text-xl sm:text-3xl font-bold tracking-tight text-primary">Key Documents</CardTitle>
                        <CardDescription className="text-muted-foreground text-xs sm:text-sm">Access your important agreements and documents.</CardDescription>
                     </div>
                 </div>
                 <UserProfile name={artistName} imageUrl={artistLogoUrl} />
            </CardHeader>
         </Card>

        {/* Tabbed Content */}
        <Tabs defaultValue="agreements" className="w-full">
           {/* Adjusted grid cols for two tabs */}
          <TabsList className="grid w-full grid-cols-2 gap-2 mb-6 h-auto bg-card/70 dark:bg-card/60 backdrop-blur-sm border border-border/20 shadow-sm rounded-lg p-1 max-w-md">
             {/* Agreements Tab */}
            <TabsTrigger value="agreements" className="py-2 data-[state=active]:shadow-md transition-subtle rounded-md flex items-center justify-center gap-2">
                <FileText className="h-4 w-4" /> My Agreements
            </TabsTrigger>
             {/* Handbooks Tab */}
            <TabsTrigger value="handbooks" className="py-2 data-[state=active]:shadow-md transition-subtle rounded-md flex items-center justify-center gap-2">
                <BookOpenText className="h-4 w-4" /> Handbooks
            </TabsTrigger>
          </TabsList>

          {/* Content for Agreements Tab */}
          <TabsContent value="agreements">
             <Card className="bg-card/80 dark:bg-card/70 backdrop-blur-md border-border/30 shadow-md rounded-lg">
                 <CardHeader>
                    <CardTitle className="text-lg font-semibold text-foreground">Your Agreements</CardTitle>
                    <CardDescription className="text-muted-foreground">Review and download your signed agreements.</CardDescription>
                 </CardHeader>
                 <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {agreements.map((agreement, index) => (
                      <AgreementCard
                        key={`agreement-${index}`}
                        title={agreement.title}
                        icon={agreement.icon}
                      />
                    ))}
                 </CardContent>
             </Card>
          </TabsContent>

          {/* Content for Handbooks Tab */}
           <TabsContent value="handbooks">
             <Card className="bg-card/80 dark:bg-card/70 backdrop-blur-md border-border/30 shadow-md rounded-lg">
                 <CardHeader>
                     <CardTitle className="text-lg font-semibold text-foreground">Handbooks</CardTitle>
                     <CardDescription className="text-muted-foreground">Access helpful guides and handbooks.</CardDescription>
                 </CardHeader>
                 <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {handbooks.map((handbook, index) => (
                      <AgreementCard
                        key={`handbook-${index}`}
                        title={handbook.title}
                        icon={handbook.icon}
                      />
                    ))}
                 </CardContent>
             </Card>
          </TabsContent>

        </Tabs>
      </main>
    </div>
  );
}

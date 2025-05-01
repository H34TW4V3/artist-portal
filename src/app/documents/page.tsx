
"use client"; // Add use client because we use state and hooks

import { useState, useEffect } from "react"; // Import useEffect
import { AgreementCard } from "@/components/documents/agreement-card";
import UserProfile from "@/components/common/user-profile"; // Changed to default import
// import { TimeWeather } from "@/components/common/time-weather"; // Import TimeWeather - Temporarily disabled
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, FolderKanban, BookOpenText, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context"; // Import useAuth
import { useRouter } from 'next/navigation'; // Import useRouter
import { Loader2 } from 'lucide-react'; // Import Loader2 for loading animation

// Define content for each tab's header
const tabHeaders = {
  agreements: {
    title: "My Agreements",
    description: "Access and manage your signed agreements.",
    icon: <FileText className="h-8 w-8 text-primary hidden sm:block" />,
  },
  handbooks: {
    title: "Handbooks",
    description: "Find helpful guides and official handbooks.",
    icon: <BookOpenText className="h-8 w-8 text-primary hidden sm:block" />,
  },
};

export default function DocumentsPage() {
  const { user, loading } = useAuth(); // Get user info and loading state
  const router = useRouter();
  // State to manage the active tab
  const [activeTab, setActiveTab] = useState<keyof typeof tabHeaders>("agreements");
  // Removed artistName state

   // Redirect unauthenticated users
   useEffect(() => {
    if (!loading && !user) {
        router.replace('/login');
    }
  }, [user, loading, router]);

  // Get the current header content based on activeTab
  const currentHeader = tabHeaders[activeTab] || tabHeaders.agreements; // Default to agreements

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
        <Card className="mb-4 sm:mb-8 bg-card/60 dark:bg-card/50 shadow-lg rounded-lg border-border/30"> {/* Adjusted opacity */}
           {/* Center align text */}
          <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap"> {/* Added flex-wrap */}
            <div className="flex items-center gap-4">
              <Link href="/" passHref legacyBehavior>
                {/* Use lg size and adjust padding */}
                <Button variant="ghost" size="lg" className="h-12 w-12 text-primary hover:bg-primary/10 active:bg-primary/20 p-0" aria-label="Go to Home">
                  <Home className="h-7 w-7" /> {/* Ensure icon size fits */}
                </Button>
              </Link>
              {/* Display icon for the active tab */}
              {currentHeader.icon}
              {/* Added text-center sm:text-left */}
               {/* Center align text */}
              <div className="text-center sm:text-left">
                {/* Display title and description for the active tab */}
                 {/* Center align text */}
                <CardTitle className="text-xl sm:text-3xl font-bold tracking-tight text-primary text-center sm:text-left">
                   {/* Display only the current tab title, removed artist name */}
                   {currentHeader.title}
                </CardTitle>
                 {/* Center align text */}
                <CardDescription className="text-muted-foreground text-xs sm:text-sm text-center sm:text-left">
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
            onValueChange={(value) => setActiveTab(value as keyof typeof tabHeaders)} // Update state on change
            className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 gap-2 mb-6 h-auto bg-card/60 dark:bg-card/50 border border-border/20 shadow-sm rounded-lg p-1 max-w-md"> {/* Adjusted opacity */}
            <TabsTrigger value="agreements" className="py-2 data-[state=active]:shadow-md transition-subtle rounded-md flex items-center justify-center gap-2 data-[state=active]:hover-glow data-[state=active]:focus-glow">
              <FileText className="h-4 w-4" /> My Agreements
            </TabsTrigger>
            <TabsTrigger value="handbooks" className="py-2 data-[state=active]:shadow-md transition-subtle rounded-md flex items-center justify-center gap-2 data-[state=active]:hover-glow data-[state=active]:focus-glow">
              <BookOpenText className="h-4 w-4" /> Handbooks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agreements">
            <Card className="bg-card/60 dark:bg-card/50 border-border/30 shadow-md rounded-lg"> {/* Adjusted opacity */}
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

          <TabsContent value="handbooks">
            <Card className="bg-card/60 dark:bg-card/50 border-border/30 shadow-md rounded-lg"> {/* Adjusted opacity */}
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

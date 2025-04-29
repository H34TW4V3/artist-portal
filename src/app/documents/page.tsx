
"use client"; // Add use client because we use state

import { useState } from "react"; // Import useState
import { AgreementCard } from "@/components/documents/agreement-card";
import { UserProfile } from "@/components/common/user-profile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, FolderKanban, BookOpenText, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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
  // Placeholder user data (replace with actual data fetching later)
  const artistName = "Artist Name";
  const artistLogoUrl = "https://picsum.photos/seed/artistlogo/40/40"; // Placeholder logo

  // State to manage the active tab
  const [activeTab, setActiveTab] = useState<keyof typeof tabHeaders>("agreements");

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

  return (
    <div className="flex min-h-screen w-full flex-col bg-transparent">
      <main className="relative z-10 flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        {/* Header Card - Dynamically updates based on active tab */}
        <Card className="mb-4 sm:mb-8 bg-card/80 dark:bg-card/70 backdrop-blur-md shadow-lg rounded-lg border-border/30">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/" passHref legacyBehavior>
                {/* Increased size */}
                <Button variant="ghost" size="lg" className="h-12 w-12 text-primary hover:bg-primary/10 active:bg-primary/20 p-0" aria-label="Go to Home">
                  <Home className="h-7 w-7" />
                </Button>
              </Link>
              {/* Display icon for the active tab */}
              {currentHeader.icon}
              {/* Added text-center sm:text-left */}
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
          <TabsList className="grid w-full grid-cols-2 gap-2 mb-6 h-auto bg-card/70 dark:bg-card/60 backdrop-blur-sm border border-border/20 shadow-sm rounded-lg p-1 max-w-md">
            <TabsTrigger value="agreements" className="py-2 data-[state=active]:shadow-md transition-subtle rounded-md flex items-center justify-center gap-2">
              <FileText className="h-4 w-4" /> My Agreements
            </TabsTrigger>
            <TabsTrigger value="handbooks" className="py-2 data-[state=active]:shadow-md transition-subtle rounded-md flex items-center justify-center gap-2">
              <BookOpenText className="h-4 w-4" /> Handbooks
            </TabsTrigger>
          </TabsList>

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

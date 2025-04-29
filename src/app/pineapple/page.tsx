
"use client";

import { useState, useEffect } from "react"; // Import useEffect
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import UserProfile from "@/components/common/user-profile"; // Changed to default import
import { ForumFeed } from "@/components/pineapple/forum-feed";
import { CreatePostForm } from "@/components/pineapple/create-post-form";
import { Home, MessageSquarePlus, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/auth-context"; // Import useAuth
import { useRouter } from 'next/navigation'; // Import useRouter
import { Loader2 } from 'lucide-react'; // Import Loader2 for loading animation

// Updated Pineapple SVG Icon based on the requested style (wired/gradient)
const PineappleIcon = () => (
    <img
        src="https://media.lordicon.com/icons/wired/gradient/1843-pineapple.svg"
        alt="Pineapple Icon"
        className="h-8 w-8" // Adjusted size to match other header icons
    />
);


export default function PineapplePage() {
    const { user, loading } = useAuth(); // Get user info and loading state
    const router = useRouter();
    // State for active tab
    const [activeTab, setActiveTab] = useState("forum"); // Default to forum tab
    // State for artist name
    const [artistName, setArtistName] = useState("Artist"); // Default name

    // Redirect unauthenticated users
    useEffect(() => {
        if (!loading && !user) {
            router.replace('/login');
        }
    }, [user, loading, router]);


    // Update artist name from user context when available
   useEffect(() => {
       if (user?.displayName) {
           setArtistName(user.displayName);
       } else if (user?.email) {
           setArtistName(user.email.split('@')[0]);
       }
       // TODO: Fetch from Firestore profile if needed
   }, [user]);

    // Handler for successful post creation
    const handlePostSuccess = () => {
        // In a real app, you would likely refetch the forum feed here
        console.log("New post created (placeholder). Refreshing feed...");
        // For now, maybe switch back to the forum tab if they were on 'create'
        if (activeTab === 'create') {
            setActiveTab('forum');
        }
    };

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
                {/* Header Card */}
                <Card className="mb-4 sm:mb-8 bg-card/80 dark:bg-card/70 backdrop-blur-md shadow-lg rounded-lg border-border/30">
                    {/* Center align text */}
                    <CardHeader className="flex flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Link href="/" passHref legacyBehavior>
                                <Button variant="ghost" size="lg" className="h-12 w-12 text-primary hover:bg-primary/10 active:bg-primary/20 p-0" aria-label="Go to Home">
                                    <Home className="h-7 w-7" />
                                </Button>
                            </Link>
                             <PineappleIcon /> {/* Use the Pineapple Icon component */}
                             {/* Center align text */}
                            <div className="text-center sm:text-left">
                                 {/* Center align text */}
                                <CardTitle className="text-xl sm:text-3xl font-bold tracking-tight text-primary text-center sm:text-left">
                                     {/* Display the artist's name */}
                                    {artistName}'s Pineapple Corner
                                </CardTitle>
                                 {/* Center align text */}
                                <CardDescription className="text-muted-foreground text-xs sm:text-sm text-center sm:text-left">
                                    Connect, collaborate, and share ideas with fellow artists.
                                </CardDescription>
                            </div>
                        </div>
                        <UserProfile />
                    </CardHeader>
                </Card>

                 {/* Tabbed Content for Forum and Create Post */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                     <TabsList className="grid w-full grid-cols-2 gap-2 mb-6 h-auto bg-card/70 dark:bg-card/60 backdrop-blur-sm border border-border/20 shadow-sm rounded-lg p-1 max-w-md">
                        <TabsTrigger value="forum" className="py-2 data-[state=active]:shadow-md transition-subtle rounded-md flex items-center justify-center gap-2 data-[state=active]:hover-glow data-[state=active]:focus-glow">
                            <Users className="h-4 w-4" /> Forum Feed
                        </TabsTrigger>
                        <TabsTrigger value="create" className="py-2 data-[state=active]:shadow-md transition-subtle rounded-md flex items-center justify-center gap-2 data-[state=active]:hover-glow data-[state=active]:focus-glow">
                            <MessageSquarePlus className="h-4 w-4" /> Create Post
                        </TabsTrigger>
                     </TabsList>

                    <TabsContent value="forum">
                        <ForumFeed className="bg-card/80 dark:bg-card/70 backdrop-blur-md border-border/30" />
                    </TabsContent>
                    <TabsContent value="create">
                        <CreatePostForm
                            onSuccess={handlePostSuccess}
                            className="bg-card/80 dark:bg-card/70 backdrop-blur-md border-border/30"
                        />
                    </TabsContent>
                </Tabs>

            </main>
        </div>
    );
}

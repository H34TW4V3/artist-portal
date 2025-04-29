
"use client";

import { useState, useEffect } from "react"; // Import useEffect
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card"; // Import CardContent
import { Button } from "@/components/ui/button";
import UserProfile from "@/components/common/user-profile"; // Changed to default import
import { ForumFeed } from "@/components/pineapple/forum-feed";
// Removed CreatePostForm import, now handled by modal
import { DirectMessagesView } from "@/components/pineapple/direct-messages-view"; // Import DM View
import { Home, Users, Send, PlusCircle } from "lucide-react"; // Removed MessageSquarePlus, Added PlusCircle
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/auth-context"; // Import useAuth
import { useRouter } from 'next/navigation'; // Import useRouter
import { Loader2 } from 'lucide-react'; // Import Loader2 for loading animation
import { CreatePostModal } from "@/components/pineapple/create-post-modal"; // Import the new modal component

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
    // State for active tab - default to forum
    const [activeTab, setActiveTab] = useState("forum");
    // State for Create Post Modal
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    // Removed artistName state

    // Redirect unauthenticated users
    useEffect(() => {
        if (!loading && !user) {
            router.replace('/login');
        }
    }, [user, loading, router]);

    // Handler for successful post creation (from modal)
    const handlePostSuccess = () => {
        // In a real app, you would likely refetch the forum feed here
        console.log("New post created (placeholder). Refreshing feed...");
        // Close the modal after successful post
        setIsCreateModalOpen(false);
        // Optionally switch back to forum tab if needed, though it should stay there now
        setActiveTab('forum');
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
                                {/* Use lg size and adjust padding */}
                                <Button variant="ghost" size="lg" className="h-12 w-12 text-primary hover:bg-primary/10 active:bg-primary/20 p-0" aria-label="Go to Home">
                                    <Home className="h-7 w-7" /> {/* Ensure icon size fits */}
                                </Button>
                            </Link>
                             <PineappleIcon /> {/* Use the Pineapple Icon component */}
                             {/* Center align text */}
                            <div className="text-center sm:text-left">
                                 {/* Center align text */}
                                <CardTitle className="text-xl sm:text-3xl font-bold tracking-tight text-primary text-center sm:text-left">
                                     {/* Display only the static title, removed artist name */}
                                    Pineapple Corner
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

                 {/* Tabbed Content for Forum and Messages */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                     {/* Updated grid columns to 2 */}
                     <TabsList className="grid w-full grid-cols-2 gap-2 mb-6 h-auto bg-card/70 dark:bg-card/60 backdrop-blur-sm border border-border/20 shadow-sm rounded-lg p-1 max-w-md mx-auto">
                        <TabsTrigger value="forum" className="py-2 data-[state=active]:shadow-md transition-subtle rounded-md flex items-center justify-center gap-2 data-[state=active]:hover-glow data-[state=active]:focus-glow">
                            <Users className="h-4 w-4" /> Forum Feed
                        </TabsTrigger>
                         <TabsTrigger value="messages" className="py-2 data-[state=active]:shadow-md transition-subtle rounded-md flex items-center justify-center gap-2 data-[state=active]:hover-glow data-[state=active]:focus-glow">
                            <Send className="h-4 w-4" /> Messages
                        </TabsTrigger>
                     </TabsList>

                    <TabsContent value="forum">
                         {/* Add Create Post button within the forum feed area */}
                         <Card className="bg-card/80 dark:bg-card/70 backdrop-blur-md border-border/30 shadow-md rounded-lg mb-6">
                             <CardHeader className="flex flex-row justify-between items-center">
                                <CardTitle className="text-lg font-semibold text-foreground">
                                    Community Feed
                                </CardTitle>
                                <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Create Post
                                </Button>
                             </CardHeader>
                             <CardContent>
                                 {/* Render ForumFeed component here */}
                                 <ForumFeed />
                             </CardContent>
                         </Card>
                    </TabsContent>
                     {/* Removed TabsContent for create */}
                     <TabsContent value="messages">
                        <DirectMessagesView className="bg-card/80 dark:bg-card/70 backdrop-blur-md border-border/30" />
                    </TabsContent>
                </Tabs>

                 {/* Create Post Modal */}
                <CreatePostModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={handlePostSuccess}
                 />

            </main>
        </div>
    );
}

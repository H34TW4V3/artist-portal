
"use client";

import { useState, useEffect } from "react"; // Import useEffect
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card"; // Import CardContent
import { Button } from "@/components/ui/button";
import UserProfile from "@/components/common/user-profile"; // Changed to default import
// import { TimeWeather } from "@/components/common/time-weather"; // Import TimeWeather - Temporarily disabled
import { ForumFeed } from "@/components/pineapple/forum-feed";
// Removed CreatePostForm import, now handled by modal
import { DirectMessagesView } from "@/components/pineapple/direct-messages-view"; // Import DM View
import { Home, Users, Send, PlusCircle } from "lucide-react"; // Removed MessageSquarePlus, Added PlusCircle
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/auth-context"; // Import useAuth
import { useRouter } from 'next/navigation'; // Import useRouter
import { SplashScreen } from '@/components/common/splash-screen'; // Import SplashScreen
import { CreatePostModal } from "@/components/pineapple/create-post-modal"; // Import the new modal component
import { cn } from "@/lib/utils"; // Import cn for conditional classes

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
    // Use SplashScreen instead of Loader2
    if (loading || !user) {
         // Pass user details if available, otherwise null
         return <SplashScreen
                   loadingText="Loading Pineapple..."
                   userImageUrl={user?.photoURL}
                   userName={user?.displayName || user?.email?.split('@')[0]}
                />; // Pass custom text and user info
    }


    return (
        <div className="flex min-h-screen w-full flex-col bg-transparent">
            <main className="relative z-10 flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                {/* Header Card */}
                <Card className="mb-4 sm:mb-8 bg-card/60 dark:bg-card/50 shadow-lg rounded-lg border-border/30"> {/* Adjusted opacity */}
                    <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap"> {/* Added flex-wrap */}
                        <div className="flex items-center gap-4">
                            <Link href="/" passHref legacyBehavior>
                                <Button variant="ghost" size="lg" className="h-12 w-12 text-primary hover:bg-primary/10 active:bg-primary/20 p-0" aria-label="Go to Home">
                                    <Home className="h-7 w-7" />
                                </Button>
                            </Link>
                             <PineappleIcon />
                            <div className="text-center sm:text-left">
                                <CardTitle className="text-xl sm:text-3xl font-bold tracking-tight text-primary text-center sm:text-left">
                                    Pineapple Corner
                                </CardTitle>
                                <CardDescription className="text-muted-foreground text-xs sm:text-sm text-center sm:text-left">
                                    Connect, collaborate, and share ideas with fellow artists.
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

                 {/* Tabbed Content for Forum and Messages */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                     <TabsList className="grid w-full grid-cols-2 gap-2 mb-6 h-auto bg-card/60 dark:bg-card/50 border border-border/20 shadow-sm rounded-lg p-1 max-w-md mx-auto"> {/* Adjusted opacity */}
                        <TabsTrigger value="forum" className="py-2 data-[state=active]:shadow-md transition-subtle rounded-md flex items-center justify-center gap-2 data-[state=active]:hover-glow data-[state=active]:focus-glow">
                            <Users className="h-4 w-4" /> Forum Feed
                        </TabsTrigger>
                         <TabsTrigger value="messages" className="py-2 data-[state=active]:shadow-md transition-subtle rounded-md flex items-center justify-center gap-2 data-[state=active]:hover-glow data-[state=active]:focus-glow">
                            <Send className="h-4 w-4" /> Messages
                        </TabsTrigger>
                     </TabsList>

                     {/* Apply max-width and center the forum feed */}
                    <TabsContent value="forum" className="max-w-3xl mx-auto w-full">
                         {/* ForumFeed component */}
                         {/* Removed the Card wrapper and Header for the feed itself */}
                         <ForumFeed />
                    </TabsContent>

                     {/* Apply max-width and center the messages view */}
                     <TabsContent value="messages" className="max-w-3xl mx-auto w-full">
                        {/* DirectMessagesView component */}
                        <DirectMessagesView className="bg-card/60 dark:bg-card/50 border-border/30 shadow-md rounded-lg" /> {/* Adjusted opacity */}
                     </TabsContent>
                </Tabs>

                 {/* Floating Create Post Button - Increased size */}
                 <Button
                    size="lg" // Use size="lg" for overall button size
                    className={cn(
                        "fixed bottom-20 right-4 z-40 h-16 w-16 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground p-0", // Increased h/w
                        "hover-glow focus-glow" // Glow effects
                    )}
                    onClick={() => setIsCreateModalOpen(true)}
                    aria-label="Create New Post"
                 >
                     {/* Increased icon size */}
                     <PlusCircle className="h-8 w-8" />
                 </Button>

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

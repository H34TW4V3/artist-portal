

"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageSquare, ThumbsUp, Share2, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from 'date-fns'; // For relative time formatting
import { useToast } from '@/hooks/use-toast'; // Import useToast

// Mock Data Structure
interface ForumPost {
    id: string;
    authorName: string;
    authorAvatarUrl?: string;
    timestamp: Date;
    title: string;
    content: string;
    likes: number;
    comments: number;
}

// Mock API Function (replace with actual API call)
const fetchForumPosts = async (): Promise<ForumPost[]> => {
    console.log("Mock API: Fetching forum posts...");
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

    // Generate more diverse mock data
    return [
        { id: 'post1', authorName: 'Melody Maker', authorAvatarUrl: 'https://picsum.photos/seed/user1/40/40', timestamp: new Date(Date.now() - 1000 * 60 * 5), title: 'Need feedback on new track!', content: 'Hey everyone, just finished mastering a new synthwave track. Looking for honest opinions on the mix and overall vibe. Link in bio!', likes: 15, comments: 4 },
        { id: 'post2', authorName: 'Beat Weaver', authorAvatarUrl: 'https://picsum.photos/seed/user2/40/40', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), title: 'Collaboration Opportunity - Lo-fi Hip Hop', content: 'Looking for a vocalist or instrumentalist (guitar/keys preferred) for a chill lo-fi hip hop EP. DM me if interested with samples!', likes: 28, comments: 9 },
        { id: 'post3', authorName: 'Rhythm Architect', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), title: 'Best practices for sidechain compression?', content: 'What are your go-to techniques for sidechain compression, especially getting that pumping effect in electronic music without making it sound muddy? Share your tips!', likes: 42, comments: 15 },
        { id: 'post4', authorName: 'Sound Sculptor', authorAvatarUrl: 'https://picsum.photos/seed/user4/40/40', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), title: 'Anyone using the new [Synth Plugin Name]?', content: 'Just picked up the latest synth plugin from [Company]. Curious about others experiences and any cool presets you\'ve found or created.', likes: 8, comments: 2 },
         { id: 'post5', authorName: 'Groove Guru', authorAvatarUrl: 'https://picsum.photos/seed/user5/40/40', timestamp: new Date(Date.now() - 1000 * 60 * 15), title: 'Mixing Drums Q&A', content: 'Struggling to get my drum mix to punch through. Any advice on EQ, compression, or bussing techniques for electronic drums?', likes: 22, comments: 7 },
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Sort by newest first
};


interface ForumFeedProps {
    className?: string;
}

export function ForumFeed({ className }: ForumFeedProps) {
    const [posts, setPosts] = useState<ForumPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast(); // Initialize useToast

    useEffect(() => {
        const loadPosts = async () => {
            setIsLoading(true);
            try {
                const fetchedPosts = await fetchForumPosts();
                setPosts(fetchedPosts);
            } catch (error) {
                console.error("Error fetching forum posts:", error);
                toast({ // Show error toast
                    title: "Error Loading Posts",
                    description: "Could not fetch forum posts. Please try again later.",
                    variant: "destructive",
                });
            } finally {
                setIsLoading(false);
            }
        };
        loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty dependency array to run once

    const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'A'; // Added fallback

    // Placeholder handlers using toast
    const handleLike = (postId: string) => {
        console.log(`Liking post ${postId} (placeholder)`);
        toast({ title: "Action", description: `Liked post! (Placeholder)`, duration: 2000 });
        // TODO: Implement actual like logic (API call, update state)
    };

    const handleComment = (postId: string) => {
         console.log(`Commenting on post ${postId} (placeholder)`);
         toast({ title: "Action", description: `Opening comment section... (Placeholder)`, duration: 2000 });
        // TODO: Implement comment logic (e.g., open comment section/modal)
    };

     const handleShare = (postId: string) => {
         console.log(`Sharing post ${postId} (placeholder)`);
         toast({ title: "Action", description: `Sharing post... (Placeholder)`, duration: 2000 });
        // TODO: Implement share logic
    };


    return (
        // Removed max-w and mx-auto if parent handles layout
        <div className={cn("space-y-6", className)}>
            {isLoading ? (
                // Skeleton Loading State - More refined skeleton
                Array.from({ length: 3 }).map((_, index) => (
                    <Card key={`skeleton-${index}`} className="bg-card/70 dark:bg-card/60 backdrop-blur-sm border border-border/30 shadow-md rounded-lg overflow-hidden">
                        <CardHeader className="flex flex-row items-center gap-3 p-4">
                            <Skeleton className="h-10 w-10 rounded-full bg-muted/50" />
                            <div className="space-y-1">
                                <Skeleton className="h-4 w-32 bg-muted/50" />
                                <Skeleton className="h-3 w-20 bg-muted/50" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-2">
                            <Skeleton className="h-5 w-3/4 bg-muted/50" />
                            <Skeleton className="h-4 w-full bg-muted/50" />
                            <Skeleton className="h-4 w-5/6 bg-muted/50" />
                        </CardContent>
                        <CardFooter className="flex justify-between p-4 pt-2 border-t border-border/30 bg-muted/30 dark:bg-muted/10">
                            <Skeleton className="h-8 w-20 bg-muted/50" />
                            <Skeleton className="h-8 w-20 bg-muted/50" />
                            <Skeleton className="h-8 w-20 bg-muted/50" />
                        </CardFooter>
                    </Card>
                ))
            ) : posts.length === 0 ? (
                 // Display 'No Posts' message directly in the feed area
                 <div className="p-6 text-center text-muted-foreground bg-card/70 dark:bg-card/60 backdrop-blur-sm border border-border/30 shadow-md rounded-lg min-h-[300px] flex flex-col justify-center items-center">
                    <p className="text-lg font-medium">No Posts Yet</p>
                    <p className="mt-2">
                        The forum is quiet... Be the first to start a discussion!
                    </p>
                 </div>
             ) : (
                // Display Posts - Enhanced Styling
                posts.map((post) => (
                    <Card key={post.id} className="bg-card/80 dark:bg-card/70 backdrop-blur-md border border-border/30 shadow-md rounded-lg overflow-hidden transition-shadow duration-300 hover:shadow-xl">
                        <CardHeader className="flex flex-row items-center gap-4 p-4 border-b border-border/30">
                            <Avatar className="h-11 w-11 border-2 border-primary/40">
                                <AvatarImage src={post.authorAvatarUrl} alt={post.authorName} />
                                <AvatarFallback className="bg-muted text-muted-foreground font-semibold text-base">
                                    {getInitials(post.authorName)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-grow">
                                <CardTitle className="text-base font-semibold text-foreground hover:text-primary transition-colors cursor-pointer">{post.authorName}</CardTitle>
                                <CardDescription className="text-xs text-muted-foreground">
                                    Posted {formatDistanceToNow(post.timestamp, { addSuffix: true })}
                                </CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                             <h3 className="text-lg font-bold text-primary mb-3">{post.title}</h3>
                             {/* Use whitespace-pre-wrap to preserve line breaks and leading-relaxed for better readability */}
                             <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed line-clamp-4">{post.content}</p>
                             {/* Add a subtle 'read more' if content is long? (future enhancement) */}
                        </CardContent>
                        <CardFooter className="flex justify-between items-center p-3 border-t border-border/30 bg-muted/10 dark:bg-muted/5">
                            {/* Action Buttons - Slightly improved styling */}
                            <div className="flex gap-1">
                                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-8 px-2 group" onClick={() => handleLike(post.id)}>
                                    <ThumbsUp className="mr-1.5 h-4 w-4 group-hover:scale-110 transition-transform" /> {post.likes > 0 ? post.likes : ''} <span className="sr-only sm:not-sr-only sm:ml-1">Like</span>
                                </Button>
                                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-8 px-2 group" onClick={() => handleComment(post.id)}>
                                    <MessageSquare className="mr-1.5 h-4 w-4 group-hover:scale-110 transition-transform" /> {post.comments > 0 ? post.comments : ''} <span className="sr-only sm:not-sr-only sm:ml-1">Comment</span>
                                </Button>
                                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-8 px-2 group" onClick={() => handleShare(post.id)}>
                                    <Share2 className="mr-1.5 h-4 w-4 group-hover:scale-110 transition-transform" /> <span className="sr-only sm:not-sr-only sm:ml-1">Share</span>
                                </Button>
                            </div>
                             {/* Placeholder for future 'View Full Post' button */}
                             {/* <Button variant="link" size="sm" className="text-primary h-8 px-2">View Post</Button> */}
                        </CardFooter>
                    </Card>
                ))
            )}
        </div>
    );
}

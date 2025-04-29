
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageSquare, ThumbsUp, Share2, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from 'date-fns'; // For relative time formatting

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

    useEffect(() => {
        const loadPosts = async () => {
            setIsLoading(true);
            try {
                const fetchedPosts = await fetchForumPosts();
                setPosts(fetchedPosts);
            } catch (error) {
                console.error("Error fetching forum posts:", error);
                // Optionally show an error toast
            } finally {
                setIsLoading(false);
            }
        };
        loadPosts();
    }, []);

    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();

    const handleLike = (postId: string) => {
        console.log(`Liking post ${postId} (placeholder)`);
        // TODO: Implement actual like logic (API call, update state)
    };

    const handleComment = (postId: string) => {
         console.log(`Commenting on post ${postId} (placeholder)`);
        // TODO: Implement comment logic (e.g., open comment section/modal)
    };

     const handleShare = (postId: string) => {
         console.log(`Sharing post ${postId} (placeholder)`);
        // TODO: Implement share logic
    };


    return (
        <div className={cn("space-y-6", className)}>
            {isLoading ? (
                // Skeleton Loading State
                Array.from({ length: 3 }).map((_, index) => (
                    <Card key={`skeleton-${index}`} className="bg-card/70 dark:bg-card/60 backdrop-blur-sm border border-border/30 shadow-md rounded-lg overflow-hidden">
                        <CardHeader className="flex flex-row items-center gap-3 p-4">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="space-y-1">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-2">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-5/6" />
                        </CardContent>
                        <CardFooter className="flex justify-between p-4 pt-2 border-t border-border/30 bg-muted/30 dark:bg-muted/10">
                            <Skeleton className="h-8 w-20" />
                            <Skeleton className="h-8 w-20" />
                            <Skeleton className="h-8 w-20" />
                        </CardFooter>
                    </Card>
                ))
            ) : posts.length === 0 ? (
                 <Card className="bg-card/70 dark:bg-card/60 backdrop-blur-sm border border-border/30 shadow-md rounded-lg p-6 text-center">
                    <CardTitle className="text-lg font-medium text-muted-foreground">No Posts Yet</CardTitle>
                    <CardDescription className="mt-2 text-muted-foreground">
                        The forum is quiet... Be the first to start a discussion!
                    </CardDescription>
                 </Card>
             ) : (
                // Display Posts
                posts.map((post) => (
                    <Card key={post.id} className="bg-card/70 dark:bg-card/60 backdrop-blur-sm border border-border/30 shadow-md rounded-lg overflow-hidden transition-shadow hover:shadow-lg">
                        <CardHeader className="flex flex-row items-center gap-3 p-4">
                            <Avatar className="h-10 w-10 border-2 border-primary/30">
                                <AvatarImage src={post.authorAvatarUrl} alt={post.authorName} />
                                <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
                                    {getInitials(post.authorName)}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="text-base font-semibold text-foreground">{post.authorName}</CardTitle>
                                <CardDescription className="text-xs text-muted-foreground">
                                    Posted {formatDistanceToNow(post.timestamp, { addSuffix: true })}
                                </CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                             <h3 className="text-lg font-semibold text-primary mb-2">{post.title}</h3>
                             {/* Use whitespace-pre-wrap to preserve line breaks */}
                             <p className="text-sm text-foreground whitespace-pre-wrap">{post.content}</p>
                        </CardContent>
                        <CardFooter className="flex justify-between items-center p-4 pt-2 border-t border-border/30 bg-muted/30 dark:bg-muted/10">
                            {/* Action Buttons */}
                            <div className="flex gap-1">
                                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-8 px-2" onClick={() => handleLike(post.id)}>
                                    <ThumbsUp className="mr-1.5 h-4 w-4" /> {post.likes > 0 ? post.likes : ''} <span className="sr-only sm:not-sr-only sm:ml-1">Like</span>
                                </Button>
                                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-8 px-2" onClick={() => handleComment(post.id)}>
                                    <MessageSquare className="mr-1.5 h-4 w-4" /> {post.comments > 0 ? post.comments : ''} <span className="sr-only sm:not-sr-only sm:ml-1">Comment</span>
                                </Button>
                                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-8 px-2" onClick={() => handleShare(post.id)}>
                                    <Share2 className="mr-1.5 h-4 w-4" /> <span className="sr-only sm:not-sr-only">Share</span>
                                </Button>
                            </div>
                             {/* Maybe add a 'View Post' button later */}
                        </CardFooter>
                    </Card>
                ))
            )}
        </div>
    );
}

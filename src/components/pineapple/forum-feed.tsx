
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
// Replace MessageSquare, ThumbsUp, Share2 with Instagram style icons
import { Heart, MessageCircle, Send, Bookmark } from "lucide-react"; // Added Bookmark
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
    likedByCurrentUser?: boolean; // Add state for like button
    bookmarkedByCurrentUser?: boolean; // Add state for bookmark button
}

// Mock API Function (replace with actual API call)
const fetchForumPosts = async (): Promise<ForumPost[]> => {
    console.log("Mock API: Fetching forum posts...");
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

    // Generate more diverse mock data
    return [
        { id: 'post1', authorName: 'Melody Maker', authorAvatarUrl: 'https://picsum.photos/seed/user1/40/40', timestamp: new Date(Date.now() - 1000 * 60 * 5), title: 'Need feedback on new track!', content: 'Hey everyone, just finished mastering a new synthwave track.\nLooking for honest opinions on the mix and overall vibe. Link in bio!', likes: 15, comments: 4, likedByCurrentUser: false, bookmarkedByCurrentUser: false },
        { id: 'post2', authorName: 'Beat Weaver', authorAvatarUrl: 'https://picsum.photos/seed/user2/40/40', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), title: 'Collaboration Opportunity - Lo-fi Hip Hop', content: 'Looking for a vocalist or instrumentalist (guitar/keys preferred) for a chill lo-fi hip hop EP.\n\nDM me if interested with samples!', likes: 28, comments: 9, likedByCurrentUser: true, bookmarkedByCurrentUser: false },
        { id: 'post3', authorName: 'Rhythm Architect', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), title: 'Best practices for sidechain compression?', content: 'What are your go-to techniques for sidechain compression, especially getting that pumping effect in electronic music without making it sound muddy?\n\nShare your tips!', likes: 42, comments: 15, likedByCurrentUser: false, bookmarkedByCurrentUser: true },
        { id: 'post4', authorName: 'Sound Sculptor', authorAvatarUrl: 'https://picsum.photos/seed/user4/40/40', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), title: 'Anyone using the new [Synth Plugin Name]?', content: 'Just picked up the latest synth plugin from [Company]. Curious about others experiences and any cool presets you\'ve found or created.', likes: 8, comments: 2, likedByCurrentUser: false, bookmarkedByCurrentUser: false },
         { id: 'post5', authorName: 'Groove Guru', authorAvatarUrl: 'https://picsum.photos/seed/user5/40/40', timestamp: new Date(Date.now() - 1000 * 60 * 15), title: 'Mixing Drums Q&A', content: 'Struggling to get my drum mix to punch through.\nAny advice on EQ, compression, or bussing techniques for electronic drums?', likes: 22, comments: 7, likedByCurrentUser: false, bookmarkedByCurrentUser: false },
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

    // Placeholder handlers using toast and updating local state
    const handleLikeToggle = (postId: string) => {
        setPosts(prevPosts =>
            prevPosts.map(post => {
                if (post.id === postId) {
                    const wasLiked = post.likedByCurrentUser;
                    const newLikes = wasLiked ? post.likes - 1 : post.likes + 1;
                    console.log(`${wasLiked ? 'Unliking' : 'Liking'} post ${postId} (placeholder)`);
                    toast({ title: "Action", description: `${wasLiked ? 'Unliked' : 'Liked'} post! (Placeholder)`, duration: 1500 });
                    return { ...post, likedByCurrentUser: !wasLiked, likes: newLikes };
                }
                return post;
            })
        );
        // TODO: Implement actual like/unlike API call
    };

    const handleBookmarkToggle = (postId: string) => {
         setPosts(prevPosts =>
             prevPosts.map(post => {
                 if (post.id === postId) {
                     const wasBookmarked = post.bookmarkedByCurrentUser;
                     console.log(`${wasBookmarked ? 'Removing bookmark' : 'Bookmarking'} post ${postId} (placeholder)`);
                     toast({ title: "Action", description: `Post ${wasBookmarked ? 'removed from' : 'added to'} bookmarks! (Placeholder)`, duration: 1500 });
                     return { ...post, bookmarkedByCurrentUser: !wasBookmarked };
                 }
                 return post;
             })
         );
        // TODO: Implement actual bookmark/unbookmark API call
    };


    const handleComment = (postId: string) => {
         console.log(`Commenting on post ${postId} (placeholder)`);
         toast({ title: "Action", description: `Opening comment section... (Placeholder)`, duration: 2000 });
        // TODO: Implement comment logic (e.g., open comment section/modal)
    };

     const handleShare = (postId: string) => {
         console.log(`Sharing post ${postId} (placeholder)`);
         toast({ title: "Action", description: `Sharing post... (Placeholder)`, duration: 2000 });
        // TODO: Implement share logic (e.g., copy link, open share sheet)
    };


    return (
        // Removed max-w and mx-auto as parent handles layout
        <div className={cn("space-y-6", className)}>
            {isLoading ? (
                // Skeleton Loading State - More refined skeleton
                Array.from({ length: 3 }).map((_, index) => (
                    <Card key={`skeleton-${index}`} className="bg-card/50 dark:bg-card/40 border border-border/30 shadow-md rounded-lg overflow-hidden"> {/* Adjusted opacity */}
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
                        <CardFooter className="flex justify-between p-4 pt-2 border-t border-border/30 bg-muted/20 dark:bg-muted/5"> {/* Adjusted opacity */}
                            <div className="flex gap-2">
                                <Skeleton className="h-8 w-8 rounded-md bg-muted/50" />
                                <Skeleton className="h-8 w-8 rounded-md bg-muted/50" />
                                <Skeleton className="h-8 w-8 rounded-md bg-muted/50" />
                            </div>
                             <Skeleton className="h-8 w-8 rounded-md bg-muted/50" />
                        </CardFooter>
                    </Card>
                ))
            ) : posts.length === 0 ? (
                 // Display 'No Posts' message directly in the feed area
                 <div className="p-6 text-center text-muted-foreground bg-card/50 dark:bg-card/40 border border-border/30 shadow-md rounded-lg min-h-[300px] flex flex-col justify-center items-center"> {/* Adjusted opacity */}
                    <p className="text-lg font-medium">No Posts Yet</p>
                    <p className="mt-2">
                        The forum is quiet... Be the first to start a discussion!
                    </p>
                 </div>
             ) : (
                // Display Posts - Enhanced Styling
                posts.map((post) => (
                    <Card key={post.id} className="bg-card/60 dark:bg-card/50 border border-border/30 shadow-lg rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/40"> {/* Adjusted opacity, Rounded-xl, updated border/shadow */}
                        <CardHeader className="flex flex-row items-center gap-4 p-4 border-b border-border/20"> {/* Less prominent border */}
                            <Avatar className="h-10 w-10 border-2 border-primary/30"> {/* Slightly smaller Avatar */}
                                <AvatarImage src={post.authorAvatarUrl} alt={post.authorName} />
                                <AvatarFallback className="bg-muted text-muted-foreground font-semibold text-sm"> {/* Smaller fallback text */}
                                    {getInitials(post.authorName)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-grow">
                                <CardTitle className="text-sm font-semibold text-foreground hover:text-primary transition-colors cursor-pointer">{post.authorName}</CardTitle> {/* Smaller title */}
                                <CardDescription className="text-xs text-muted-foreground">
                                    Posted {formatDistanceToNow(post.timestamp, { addSuffix: true })}
                                </CardDescription>
                            </div>
                            {/* Optional: More actions dropdown (...) */}
                        </CardHeader>
                        {/* Removed title from content */}
                        <CardContent className="p-4 space-y-2"> {/* Standard padding */}
                             {/* Use whitespace-pre-wrap to preserve line breaks and leading-relaxed for better readability */}
                             {/* Clamped to 6 lines initially */}
                             <h3 className="text-base font-semibold text-foreground mb-1">{post.title}</h3> {/* Title above content */}
                             <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed line-clamp-6">{post.content}</p>
                             {/* Add a subtle 'read more' if content is long? (future enhancement) */}
                             {post.likes > 0 && (
                                 <p className="text-xs font-medium text-foreground pt-2">{post.likes} {post.likes === 1 ? 'like' : 'likes'}</p>
                             )}
                        </CardContent>
                        <CardFooter className="flex justify-between items-center p-3 border-t border-border/20 bg-muted/5 dark:bg-black/10"> {/* Adjusted padding and background */}
                            {/* Action Buttons - Instagram Style */}
                            <div className="flex gap-1">
                                <Button
                                     variant="ghost"
                                     size="icon"
                                     className={cn(
                                         "text-foreground/70 hover:text-foreground h-9 w-9 group rounded-md",
                                         post.likedByCurrentUser && "text-red-600 hover:text-red-500"
                                     )}
                                     onClick={() => handleLikeToggle(post.id)}
                                     aria-pressed={post.likedByCurrentUser}
                                >
                                    <Heart className={cn("h-5 w-5 group-hover:scale-110 transition-transform", post.likedByCurrentUser && "fill-current")} />
                                    <span className="sr-only">Like</span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-foreground/70 hover:text-foreground h-9 w-9 group rounded-md"
                                    onClick={() => handleComment(post.id)}
                                >
                                    <MessageCircle className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                    <span className="sr-only">Comment</span>
                                </Button>
                                <Button
                                     variant="ghost"
                                     size="icon"
                                     className="text-foreground/70 hover:text-foreground h-9 w-9 group rounded-md"
                                     onClick={() => handleShare(post.id)}
                                >
                                    <Send className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                    <span className="sr-only">Share</span>
                                </Button>
                            </div>
                            {/* Bookmark Button on the right */}
                            <Button
                                 variant="ghost"
                                 size="icon"
                                 className={cn(
                                     "text-foreground/70 hover:text-foreground h-9 w-9 group rounded-md",
                                      post.bookmarkedByCurrentUser && "text-primary hover:text-primary/90"
                                 )}
                                 onClick={() => handleBookmarkToggle(post.id)}
                                 aria-pressed={post.bookmarkedByCurrentUser}
                             >
                                <Bookmark className={cn("h-5 w-5 group-hover:scale-110 transition-transform", post.bookmarkedByCurrentUser && "fill-current")} />
                                <span className="sr-only">Bookmark</span>
                            </Button>
                        </CardFooter>
                    </Card>
                ))
            )}
        </div>
    );
}

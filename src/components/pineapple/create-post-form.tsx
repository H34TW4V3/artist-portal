
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
// Removed Card imports
import { Button } from "@/components/ui/button";
// Import FormDescription here
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Schema for the create post form
const postSchema = z.object({
    title: z.string().min(5, "Title must be at least 5 characters.").max(150, "Title must be 150 characters or less."),
    content: z.string().min(10, "Post content must be at least 10 characters.").max(5000, "Post content must be 5000 characters or less."),
});

type PostFormValues = z.infer<typeof postSchema>;

// Mock function to simulate creating a post (replace with actual API call)
const createForumPost = async (data: PostFormValues): Promise<{ success: boolean }> => {
    console.log("Mock API: Creating forum post...", data);
    await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate network delay

    // Simulate success/failure
    if (Math.random() < 0.1) { // Simulate occasional failure
        throw new Error("Failed to create post. Please try again.");
    }
    console.log("Mock API: Post created successfully.");
    return { success: true };
};


interface CreatePostFormProps {
    onSuccess: () => void; // Callback when post is successfully created
    onCancel: () => void; // Callback when cancel button is clicked
    className?: string;
}

export function CreatePostForm({ onSuccess, onCancel, className }: CreatePostFormProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<PostFormValues>({
        resolver: zodResolver(postSchema),
        defaultValues: {
            title: "",
            content: "",
        },
        mode: "onChange",
    });

    async function onSubmit(values: PostFormValues) {
        setIsSubmitting(true);
        try {
            await createForumPost(values);
            toast({
                title: "Post Created!",
                description: "Your thoughts have been shared with the community.",
                variant: "default",
            });
            form.reset(); // Clear the form
            onSuccess(); // Call the success callback
        } catch (error) {
            console.error("Error creating post:", error);
            toast({
                title: "Post Creation Failed",
                description: error instanceof Error ? error.message : "An unexpected error occurred.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        // Removed Card wrapper
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className={cn("space-y-6", className)}>
                {/* Post Title */}
                <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Post Title</FormLabel>
                            <FormControl>
                                <Input placeholder="What's the main topic?" {...field} disabled={isSubmitting} className="focus:ring-accent" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Post Content */}
                <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Content</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Elaborate on your topic here..."
                                    className="resize-y min-h-[150px] focus:ring-accent"
                                    {...field}
                                    disabled={isSubmitting}
                                />
                            </FormControl>
                                {/* Now FormDescription is defined */}
                                <FormDescription className="text-xs">
                                    You can use simple markdown for formatting (e.g., **bold**, *italic*).
                                </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-4">
                     <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                         Cancel
                     </Button>
                    <Button
                        type="submit"
                        disabled={isSubmitting || !form.formState.isValid}
                        className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-md disabled:shadow-none disabled:bg-muted disabled:text-muted-foreground"
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isSubmitting ? 'Posting...' : 'Create Post'}
                    </Button>
                </div>
            </form>
        </Form>
    );
}

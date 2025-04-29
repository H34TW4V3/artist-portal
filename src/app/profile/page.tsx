
"use client"

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, Home, UserCog } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserProfile } from "@/components/common/user-profile";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

// Define the schema for profile data
const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(50, "Name must be 50 characters or less."),
  email: z.string().email("Invalid email address."),
  bio: z.string().max(300, "Bio must be 300 characters or less.").optional(),
  // Add other relevant fields as needed, e.g., social media links
  // twitterHandle: z.string().max(15).optional(),
  // instagramHandle: z.string().max(30).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// Mock function to fetch profile data (replace with actual API call)
const fetchProfileData = async (): Promise<ProfileFormValues> => {
  console.log("Mock API: Fetching profile data...");
  await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network delay
  // Return mock data
  return {
    name: "Artist Name", // Replace with actual fetched name
    email: "artist@example.com", // Replace with actual fetched email
    bio: "Passionate musician creating unique soundscapes. Exploring the boundaries of electronic music.", // Example bio
  };
};

// Mock function to update profile data (replace with actual API call)
const updateProfileData = async (data: ProfileFormValues): Promise<void> => {
  console.log("Mock API: Updating profile data...", data);
  await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate network delay
  // Simulate success/failure
  if (Math.random() < 0.1) { // Simulate occasional failure
    throw new Error("Failed to update profile. Please try again.");
  }
  console.log("Mock API: Profile updated successfully.");
};


export default function ProfilePage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Placeholder user data (replace with actual data fetching later)
  const [artistName, setArtistName] = useState("Artist Name"); // State for dynamic name update
  const artistLogoUrl = "https://picsum.photos/seed/artistlogo/40/40"; // Placeholder logo

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
      bio: "",
    },
    mode: "onChange",
  });

  // Fetch existing profile data on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const data = await fetchProfileData();
        form.reset(data); // Populate form with fetched data
        setArtistName(data.name); // Update header name
      } catch (error) {
        console.error("Error fetching profile data:", error);
        toast({
          title: "Error Loading Profile",
          description: "Could not load your profile data. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this runs only once on mount


  async function onSubmit(values: ProfileFormValues) {
    setIsSubmitting(true);
    try {
      await updateProfileData(values);
      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved successfully.",
        variant: "default",
      });
      setArtistName(values.name); // Update header name immediately
      form.reset(values, { keepValues: true, keepDirty: false }); // Reset dirty state after successful save
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-transparent">
      <main className="relative z-10 flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        {/* Header Card */}
         <Card className="mb-4 sm:mb-8 bg-card/80 dark:bg-card/70 backdrop-blur-md shadow-lg rounded-lg border-border/30">
             <CardHeader className="flex flex-row items-center justify-between gap-4">
                 <div className="flex items-center gap-4">
                     {/* Home Icon Link - Large */}
                     <Link href="/" passHref legacyBehavior>
                          <Button variant="ghost" size="icon" className="h-10 w-10 text-primary hover:bg-primary/10 active:bg-primary/20" aria-label="Go to Dashboard">
                             <Home className="h-6 w-6" />
                          </Button>
                     </Link>
                     <UserCog className="h-8 w-8 text-primary hidden sm:block" />
                     <div>
                        <CardTitle className="text-xl sm:text-3xl font-bold tracking-tight text-primary">Manage Profile</CardTitle>
                        <CardDescription className="text-muted-foreground text-xs sm:text-sm">Update your personal information.</CardDescription>
                     </div>
                 </div>
                 {/* Pass the potentially updated artistName */}
                 <UserProfile name={artistName} imageUrl={artistLogoUrl} />
            </CardHeader>
         </Card>

        {/* Profile Form Card */}
        <Card className="bg-card/80 dark:bg-card/70 backdrop-blur-md border-border/30 shadow-md rounded-lg">
            <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">Your Information</CardTitle>
                <CardDescription className="text-muted-foreground">Edit your profile details below.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-10 w-24" />
                    </div>
                ) : (
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Artist Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Your artist or band name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Contact Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="your.email@example.com" {...field} />
                              </FormControl>
                              <FormDescription>
                                This email is used for account management and communication.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                         <FormField
                          control={form.control}
                          name="bio"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bio</FormLabel>
                              <FormControl>
                                <Textarea
                                    placeholder="Tell us a little bit about yourself or your music..."
                                    className="resize-y min-h-[100px]"
                                    {...field}
                                 />
                              </FormControl>
                               <FormDescription>
                                A short bio displayed on your public profile (optional, max 300 characters).
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Add fields for social media links here if needed */}

                        <Button
                            type="submit"
                            disabled={isSubmitting || !form.formState.isDirty || !form.formState.isValid}
                            className="w-full sm:w-auto"
                        >
                          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </form>
                    </Form>
                 )}
            </CardContent>
        </Card>
      </main>
    </div>
  );
}

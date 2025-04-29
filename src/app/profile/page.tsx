
"use client"

import { useState, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, Home, UserCog, Upload, AlertCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

// Define the schema for profile data, including new fields
const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(50, "Name must be 50 characters or less."),
  email: z.string().email("Invalid email address."),
  bio: z.string().max(300, "Bio must be 300 characters or less.").optional().nullable(), // Allow null for reset
  phoneNumber: z.string().optional().nullable() // Basic validation, make optional
      .refine(val => !val || /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/.test(val), {
          message: "Invalid phone number format.",
       }),
  imageUrl: z.string().url("Invalid URL.").optional().nullable(), // Store URL, upload handled separately
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// Mock function to fetch profile data (replace with actual API call)
const fetchProfileData = async (): Promise<ProfileFormValues> => {
  console.log("Mock API: Fetching profile data...");
  await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network delay
  // Return mock data including new fields
  return {
    name: "Artist Name", // Replace with actual fetched name
    email: "artist@example.com", // Replace with actual fetched email
    bio: "Passionate musician creating unique soundscapes. Exploring the boundaries of electronic music.", // Example bio
    phoneNumber: "+1 123-456-7890", // Example phone
    imageUrl: "https://picsum.photos/seed/artistlogo/100/100", // Use a larger placeholder for profile page
  };
};

// Mock function to update profile data (replace with actual API call)
// Updated to handle image upload simulation
const updateProfileData = async (data: ProfileFormValues, newImageFile?: File): Promise<{ updatedData: ProfileFormValues }> => {
  console.log("Mock API: Updating profile data...", data);
  if (newImageFile) {
      console.log("Mock API: Simulating upload for image:", newImageFile.name);
      // In a real app, upload the file and get the new URL
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate upload delay
      // Simulate getting a new URL - use a new seed for picsum or a data URL
      // For simplicity, just use a new placeholder URL based on timestamp
      data.imageUrl = `https://picsum.photos/seed/${Date.now()}/100/100`;
      console.log("Mock API: Simulated upload complete. New URL:", data.imageUrl);
  } else {
     await new Promise(resolve => setTimeout(resolve, 600)); // Simulate shorter delay if no image upload
  }

  // Simulate success/failure
  if (Math.random() < 0.1) { // Simulate occasional failure
    throw new Error("Failed to update profile. Please try again.");
  }
  console.log("Mock API: Profile updated successfully.");
  return { updatedData: data }; // Return the potentially updated data (with new imageUrl)
};


export default function ProfilePage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | undefined>(undefined); // State for current image display
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null); // State for image preview
  const [selectedImageFile, setSelectedImageFile] = useState<File | undefined>(undefined); // State for the selected file
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for dynamic name update in header
  const [artistName, setArtistName] = useState("Artist Name");

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
      bio: "",
      phoneNumber: "",
      imageUrl: "",
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
        setCurrentImageUrl(data.imageUrl ?? undefined); // Set current image for display
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


   // Handle file selection
   const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        // Basic validation (optional: add more specific checks)
        if (file.size > 5 * 1024 * 1024) { // Limit size (e.g., 5MB)
             toast({ title: "Image Too Large", description: "Please select an image smaller than 5MB.", variant: "destructive" });
             return;
        }
        if (!file.type.startsWith('image/')) {
            toast({ title: "Invalid File Type", description: "Please select an image file (e.g., JPG, PNG, GIF).", variant: "destructive" });
            return;
        }

        setSelectedImageFile(file);
        // Create a preview URL
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
        form.setValue('imageUrl', '', { shouldDirty: true }); // Mark form as dirty, clear any existing URL value
    }
  };

  // Trigger file input click
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  // Handle form submission
  async function onSubmit(values: ProfileFormValues) {
    setIsSubmitting(true);
    const isImageChanged = !!selectedImageFile; // Check if a new image was selected

    // Use a temporary variable to avoid modifying the original 'values' directly if not needed
    let dataToSubmit = { ...values };
    // Remove imageUrl from submission data if we are uploading a new file,
    // as the backend will generate the new URL. Keep it if no new file is selected.
    if (isImageChanged) {
        // The updateProfileData function will handle adding the new URL
        // Ensure the potentially stale imageUrl from the form isn't sent if a file is being uploaded
        dataToSubmit = { ...values, imageUrl: currentImageUrl }; // Pass current URL to backend for context if needed, or it can be ignored
    }


    try {
      const { updatedData } = await updateProfileData(dataToSubmit, selectedImageFile);

      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved successfully.",
        variant: "default",
      });
      setArtistName(updatedData.name); // Update header name
      setCurrentImageUrl(updatedData.imageUrl ?? undefined); // Update displayed image URL
      setSelectedImageFile(undefined); // Clear selected file state
      setImagePreviewUrl(null); // Clear preview
       // Reset form with updated data, keeping server state
      form.reset(updatedData, { keepValues: false, keepDirty: false, keepDefaultValues: false });

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

  const formIsDirty = form.formState.isDirty || !!selectedImageFile;
  const formIsValid = form.formState.isValid; // Schema validation status

  return (
    <div className="flex min-h-screen w-full flex-col bg-transparent">
      <main className="relative z-10 flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        {/* Header Card */}
         <Card className="mb-4 sm:mb-8 bg-card/80 dark:bg-card/70 backdrop-blur-md shadow-lg rounded-lg border-border/30">
             <CardHeader className="flex flex-row items-center justify-between gap-4">
                 <div className="flex items-center gap-4">
                     <Link href="/" passHref legacyBehavior>
                          <Button variant="ghost" size="icon" className="h-10 w-10 text-primary hover:bg-primary/10 active:bg-primary/20" aria-label="Go to Dashboard">
                             <Home className="h-6 w-6" />
                          </Button>
                     </Link>
                     <UserCog className="h-8 w-8 text-primary hidden sm:block" />
                     <div>
                        <CardTitle className="text-xl sm:text-3xl font-bold tracking-tight text-primary">Manage Profile</CardTitle>
                        <CardDescription className="text-muted-foreground text-xs sm:text-sm">Update your personal information and profile picture.</CardDescription>
                     </div>
                 </div>
                 <UserProfile name={artistName} imageUrl={currentImageUrl} />
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
                    <div className="space-y-6">
                        <div className="flex items-center space-x-4">
                             <Skeleton className="h-24 w-24 rounded-full" />
                             <div className="space-y-2">
                                <Skeleton className="h-4 w-[150px]" />
                                <Skeleton className="h-4 w-[100px]" />
                             </div>
                        </div>
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-10 w-24" />
                    </div>
                ) : (
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                        {/* Profile Picture Section */}
                        <FormItem>
                            <FormLabel>Profile Picture</FormLabel>
                            <div className="flex items-center gap-4">
                                <Avatar className="h-24 w-24 cursor-pointer border-2 border-primary/30 hover:border-primary/60 transition-colors" onClick={handleAvatarClick}>
                                    <AvatarImage src={imagePreviewUrl || currentImageUrl} alt={artistName} />
                                    <AvatarFallback className="text-3xl bg-muted text-muted-foreground">
                                        {artistName?.split(' ').map(n => n[0]).join('').toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col gap-2">
                                    <Button type="button" variant="outline" size="sm" onClick={handleAvatarClick} disabled={isSubmitting}>
                                        <Upload className="mr-2 h-4 w-4" /> Change Picture
                                    </Button>
                                    <FormControl>
                                        {/* Hidden file input */}
                                        <Input
                                            type="file"
                                            ref={fileInputRef}
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="hidden"
                                            disabled={isSubmitting}
                                         />
                                    </FormControl>
                                    <FormDescription className="text-xs">Click avatar or button to upload (JPG, PNG, GIF, max 5MB).</FormDescription>
                                     {/* Image URL is not directly editable, managed via upload */}
                                    <FormField
                                        control={form.control}
                                        name="imageUrl" // Keep for schema validation if URL is part of it
                                        render={() => <FormMessage />} // Display any URL format errors if needed
                                     />
                                </div>
                            </div>
                            <Alert variant="default" className="mt-4 bg-accent/10 border-accent/30 text-accent-foreground [&>svg]:text-accent">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle className="font-medium text-accent">Platform Sync Notice</AlertTitle>
                                <AlertDescription className="text-xs text-accent/90">
                                    Updating your profile image here will also update it across your connected streaming platforms and public profiles associated with this hub.
                                </AlertDescription>
                            </Alert>
                        </FormItem>


                        {/* Name */}
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Artist Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Your artist or band name" {...field} disabled={isSubmitting}/>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {/* Email */}
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Contact Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="your.email@example.com" {...field} disabled={isSubmitting}/>
                              </FormControl>
                              <FormDescription>
                                Used for account management and communication.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {/* Phone Number */}
                         <FormField
                          control={form.control}
                          name="phoneNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number (Optional)</FormLabel>
                              <FormControl>
                                <Input type="tel" placeholder="e.g., +1 555-123-4567" {...field} value={field.value ?? ""} disabled={isSubmitting}/>
                              </FormControl>
                              <FormDescription>
                                Used for urgent communication or verification if needed.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {/* Bio */}
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
                                    value={field.value ?? ""}
                                    disabled={isSubmitting}
                                 />
                              </FormControl>
                               <FormDescription>
                                A short bio (optional, max 300 characters).
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            disabled={isSubmitting || !formIsDirty || !formIsValid} // Disable if no changes or invalid
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

    

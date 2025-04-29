
"use client"

import { useState, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, Upload, AlertCircle } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

// Define the schema for profile data, including new fields
const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(50, "Name must be 50 characters or less."),
  email: z.string().email("Invalid email address."), // Email usually comes from auth, but keep for display/form structure
  bio: z.string().max(300, "Bio must be 300 characters or less.").optional().nullable(), // Allow null for reset
  phoneNumber: z.string().optional().nullable() // Basic validation, make optional
      .refine(val => !val || /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/.test(val), {
          message: "Invalid phone number format.",
       }),
  imageUrl: z.string().url("Invalid URL.").optional().nullable(), // Store URL, upload handled separately
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

// Removed mock functions fetchProfileData and updateProfileData
// They will be passed in or handled by the parent component (UserProfile)


interface ProfileFormProps {
    initialData?: ProfileFormValues; // Make initial data optional, parent handles fetching
    updateFunction: (data: ProfileFormValues, newImageFile?: File) => Promise<{ updatedData: ProfileFormValues }>; // Function to call on submit
    onSuccess?: (updatedData: ProfileFormValues) => void; // Callback on successful update
    onCancel?: () => void; // Callback for cancel action (optional)
    className?: string;
}

export function ProfileForm({ initialData, updateFunction, onSuccess, onCancel, className }: ProfileFormProps) {
    const { toast } = useToast();
    // Removed isLoading state, parent manages loading indicator
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentImageUrl, setCurrentImageUrl] = useState<string | undefined>(initialData?.imageUrl ?? undefined); // State for current image display
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null); // State for image preview
    const [selectedImageFile, setSelectedImageFile] = useState<File | undefined>(undefined); // State for the selected file
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [formInitialName, setFormInitialName] = useState(initialData?.name || "Artist Name"); // Use for avatar fallback

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: initialData || { // Use initialData if provided
            name: "",
            email: "",
            bio: "",
            phoneNumber: "",
            imageUrl: "",
        },
        mode: "onChange",
    });

    // Reset form state if initialData changes (e.g., fetched by parent)
    useEffect(() => {
        if (initialData) {
            form.reset(initialData);
            setCurrentImageUrl(initialData.imageUrl ?? undefined);
            setFormInitialName(initialData.name);
            // Reset upload state when new initial data comes in
            setSelectedImageFile(undefined);
            setImagePreviewUrl(null);
        }
    }, [initialData, form]);


    // Handle file selection
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // Limit size (e.g., 5MB)
                toast({ title: "Image Too Large", description: "Please select an image smaller than 5MB.", variant: "destructive" });
                return;
            }
            if (!file.type.startsWith('image/')) {
                toast({ title: "Invalid File Type", description: "Please select an image file (e.g., JPG, PNG, GIF).", variant: "destructive" });
                return;
            }

            setSelectedImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
            form.setValue('imageUrl', '', { shouldDirty: true }); // Mark form as dirty
        }
    };

    // Trigger file input click
    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    // Handle form submission - Calls the passed updateFunction
    async function onSubmit(values: ProfileFormValues) {
        setIsSubmitting(true);
        const isImageChanged = !!selectedImageFile;

        // Prepare data, potentially excluding imageUrl if a new file is uploaded
        // (The updateFunction should handle assigning the *new* URL)
        let dataToSubmit = { ...values };
         if (isImageChanged) {
            // Let the updateFunction handle the imageUrl based on the upload result
             dataToSubmit.imageUrl = null; // Or keep currentImageUrl if backend needs it for deletion context
         }


        try {
            // Call the injected update function
            const { updatedData } = await updateFunction(dataToSubmit, selectedImageFile);

            toast({
                title: "Profile Updated",
                description: "Your profile information has been saved successfully.",
                variant: "default",
                 duration: 2000,
            });
            setFormInitialName(updatedData.name);
            setCurrentImageUrl(updatedData.imageUrl ?? undefined);
            setSelectedImageFile(undefined);
            setImagePreviewUrl(null);
            form.reset(updatedData, { keepValues: false, keepDirty: false, keepDefaultValues: false }); // Reset with new data
            onSuccess?.(updatedData); // Call the parent's success callback

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
    const formIsValid = form.formState.isValid;

    // Removed the loading skeleton render, parent component handles this


    return (
        <Form {...form}>
             {/* Adjusted padding/spacing for modal context */}
            <form onSubmit={form.handleSubmit(onSubmit)} className={cn("space-y-4 px-2 py-4 sm:px-6", className)}>

                {/* Profile Picture Section */}
                <FormItem>
                    <FormLabel>Profile Picture</FormLabel>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <Avatar className="h-20 w-20 sm:h-24 sm:w-24 cursor-pointer border-2 border-primary/30 hover:border-primary/60 transition-colors" onClick={handleAvatarClick}>
                           {/* Show preview if available, otherwise current image */}
                           <AvatarImage src={imagePreviewUrl || currentImageUrl} alt={formInitialName} />
                            <AvatarFallback className="text-2xl sm:text-3xl bg-muted text-muted-foreground">
                                {formInitialName?.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col gap-2 flex-grow">
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
                             {/* We don't need a form field for the URL itself as it's managed by upload */}
                             {/* But you might want a message area if the schema validates URL */}
                             {/* <FormMessage /> */}
                        </div>
                    </div>
                     {/* Reduced margin top */}
                    <Alert variant="default" className="mt-3 bg-accent/10 border-accent/30 text-accent-foreground [&>svg]:text-accent">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle className="font-medium text-accent text-sm">Platform Sync Notice</AlertTitle>
                        <AlertDescription className="text-xs text-accent/90">
                            Updating your profile image here may also update it across connected streaming platforms and public profiles associated with this hub.
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
                                <Input placeholder="Your artist or band name" {...field} disabled={isSubmitting} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                {/* Email (Read-only as it comes from Auth) */}
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Account Email</FormLabel>
                            <FormControl>
                                {/* Make email input read-only */}
                                <Input type="email" placeholder="your.email@example.com" {...field} disabled={true} readOnly className="bg-muted/50 cursor-not-allowed"/>
                            </FormControl>
                            <FormDescription className="text-xs">
                                Email associated with your login account (cannot be changed here).
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
                                {/* Ensure value is handled correctly for optional/nullable field */}
                                <Input type="tel" placeholder="e.g., +1 555-123-4567" {...field} value={field.value ?? ""} disabled={isSubmitting} />
                            </FormControl>
                            <FormDescription className="text-xs">
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
                                    className="resize-y min-h-[80px] sm:min-h-[100px]"
                                    {...field}
                                    // Ensure value is handled correctly for optional/nullable field
                                    value={field.value ?? ""}
                                    disabled={isSubmitting}
                                />
                            </FormControl>
                            <FormDescription className="text-xs">
                                A short bio (optional, max 300 characters).
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                 {/* Form Actions (Save/Cancel) */}
                <div className="flex justify-end gap-2 pt-4">
                     {onCancel && ( // Conditionally render Cancel button
                         <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                             Cancel
                         </Button>
                     )}
                    <Button
                        type="submit"
                        disabled={isSubmitting || !formIsDirty || !formIsValid} // Disable if no changes or invalid
                        className="min-w-[80px]" // Ensure minimum width
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </Form>
    );
}

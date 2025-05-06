
"use client"

import { useState, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, Upload, AlertCircle, Mail, Phone, User, FileText, ShieldIcon } from "lucide-react"; 
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
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

// Schema for profile data - smsMfaEnabled removed, emailLinkSignInEnabled removed
const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(50, "Name must be 50 characters or less."),
  email: z.string().email("Invalid email address."),
  bio: z.string().max(300, "Bio must be 300 characters or less.").optional().nullable(),
  phoneNumber: z.string().optional().nullable()
      .refine(val => !val || /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/.test(val), {
          message: "Invalid phone number format.",
       }),
  imageUrl: z.string().url("Invalid URL.").optional().nullable(), // This will store the URL, not the file
  hasCompletedTutorial: z.boolean().optional().default(false),
  // emailLinkSignInEnabled: z.boolean().optional().default(false), // Removed
});

// Ensure ProfileFormValues exactly matches the schema including optionality for emailLinkSignInEnabled if it were present.
// Since it's removed from schema, we only need Omit if it was ever part of the passed `initialData` type incorrectly.
export type ProfileFormValues = z.infer<typeof profileSchema>;


interface ProfileFormProps {
    initialData?: ProfileFormValues;
    updateFunction: (data: ProfileFormValues, newImageFile?: File) => Promise<{ updatedData: ProfileFormValues }>;
    onSuccess?: (updatedData: ProfileFormValues) => void;
    onCancel?: () => void;
    onManageMfa: () => void;
    isSmsMfaEnrolled: boolean;
    className?: string;
}

export function ProfileForm({
    initialData,
    updateFunction,
    onSuccess,
    onCancel,
    onManageMfa,
    isSmsMfaEnrolled,
    className
}: ProfileFormProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentImageUrl, setCurrentImageUrl] = useState<string | null | undefined>(initialData?.imageUrl);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const [selectedImageFile, setSelectedImageFile] = useState<File | undefined>(undefined);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [formInitialName, setFormInitialName] = useState(initialData?.name || "Artist Name");

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: initialData || {
            name: "",
            email: "",
            bio: null, // Ensure nullable fields default to null if not provided
            phoneNumber: null,
            imageUrl: null,
            hasCompletedTutorial: false,
            // emailLinkSignInEnabled: false, // This field is removed from schema
        },
        mode: "onChange",
    });

    const { isDirty: formIsDirtyState, isValid: formIsValidState } = form.formState;

    useEffect(() => {
        if (initialData) {
             const mergedDefaults: ProfileFormValues = {
                name: initialData.name || "",
                email: initialData.email || "",
                bio: initialData.bio ?? null,
                phoneNumber: initialData.phoneNumber ?? null,
                imageUrl: initialData.imageUrl ?? null, // Use the URL for the form value too
                hasCompletedTutorial: initialData.hasCompletedTutorial ?? false,
                // emailLinkSignInEnabled is removed
            };
            form.reset(mergedDefaults);
            setCurrentImageUrl(initialData.imageUrl ?? null);
            setFormInitialName(initialData.name || "User");
            setSelectedImageFile(undefined); // Clear any previously selected file
            setImagePreviewUrl(null);      // Clear preview
        }
    }, [initialData, form]);


    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast({ title: "Image Too Large", description: "Please select an image smaller than 5MB.", variant: "destructive" });
                return;
            }
            if (!file.type.startsWith('image/')) {
                toast({ title: "Invalid File Type", description: "Please select an image file (e.g., JPG, PNG, GIF).", variant: "destructive" });
                return;
            }

            setSelectedImageFile(file); // Store the file object
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreviewUrl(reader.result as string); // Show client-side preview
            };
            reader.readAsDataURL(file);
            form.setValue('imageUrl', '', { shouldDirty: true }); // Mark form dirty; imageUrl field in schema is for URL
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    async function onSubmit(values: ProfileFormValues) {
        console.log("ProfileForm onSubmit called with values:", values);
        setIsSubmitting(true);

        // Pass the form values and the selected image file (if any) to the updateFunction
        try {
            const { updatedData } = await updateFunction(values, selectedImageFile);
            console.log("ProfileForm: updateFunction successful, updatedData:", updatedData);

            // Update local component state based on the data returned from updateFunction
            setFormInitialName(updatedData.name);
            setCurrentImageUrl(updatedData.imageUrl ?? null); // Update currentImageUrl from returned data
            setSelectedImageFile(undefined); // Clear selected file after successful upload
            setImagePreviewUrl(null);      // Clear preview

            // Reset the form with the new data to clear dirty state, validation errors, etc.
            form.reset(updatedData);

            if (onSuccess) {
                onSuccess(updatedData);
            }
        } catch (error) {
            console.error("ProfileForm: Error during updateFunction call:", error);
            // Error toast is likely handled by the parent updateFunction or UserProfile component
        } finally {
            setIsSubmitting(false);
        }
    }

    // Determine if form is dirty: either RHF says it's dirty OR a new image has been selected
    const formIsDirty = formIsDirtyState || !!selectedImageFile;
    const formIsValid = formIsValidState;

    console.log("ProfileForm Button State (inside form):", { isSubmitting, formIsDirty, formIsValid });


    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className={cn("space-y-4 px-2 py-4 sm:px-6", className)}>

                <FormItem>
                    <FormLabel>Profile Picture</FormLabel>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <Avatar className="h-20 w-20 sm:h-24 sm:w-24 cursor-pointer border-2 border-primary/30 hover:border-primary/60 transition-colors" onClick={handleAvatarClick}>
                           {/* Display preview if available, otherwise current image, then fallback */}
                           <AvatarImage src={imagePreviewUrl || currentImageUrl || undefined} alt={formInitialName} />
                            <AvatarFallback className="text-2xl sm:text-3xl bg-muted text-muted-foreground">
                                {formInitialName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col gap-2 flex-grow">
                            <Button type="button" variant="outline" size="sm" onClick={handleAvatarClick} disabled={isSubmitting}>
                                <Upload className="mr-2 h-4 w-4" /> Change Picture
                            </Button>
                            {/* Hidden file input, controlled by the button/avatar click */}
                            <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileChange} className="hidden" disabled={isSubmitting} />
                            {/* The imageUrl field in the form is for the URL, not the file itself.
                                It's managed by the parent component after upload.
                                We don't need a FormField for 'imageUrl' here for file upload.
                                The selectedImageFile state handles the file.
                            */}
                            <FormDescription className="text-xs">Click avatar or button to upload (JPG, PNG, GIF, max 5MB).</FormDescription>
                        </div>
                    </div>
                    <Alert variant="default" className="mt-3 bg-accent/10 border-accent/30 text-accent-foreground [&>svg]:text-accent">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle className="font-medium text-accent text-sm">Platform Sync Notice</AlertTitle>
                        <AlertDescription className="text-xs text-accent/90">
                            Updating your profile image here may also update it across connected streaming platforms and public profiles associated with this hub.
                        </AlertDescription>
                    </Alert>
                </FormItem>

                <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel className="flex items-center gap-1.5"><User className="h-3.5 w-3.5"/>Artist Name</FormLabel><FormControl><Input placeholder="Your artist or band name" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem> )} />

                <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5"/>Account Email</FormLabel><FormControl><Input type="email" placeholder="your.email@example.com" {...field} disabled={isSubmitting} /></FormControl><FormDescription className="text-xs">Change your sign-in email. Verification will be required.</FormDescription><FormMessage /></FormItem> )} />

                <FormField control={form.control} name="phoneNumber" render={({ field }) => ( <FormItem><FormLabel className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5"/>Phone Number</FormLabel><FormControl><Input type="tel" placeholder="e.g., +1 555-123-4567" {...field} value={field.value ?? ""} disabled={isSubmitting} /></FormControl><FormDescription className="text-xs">Used for urgent communication. SMS 2FA is currently disabled.</FormDescription><FormMessage /></FormItem> )} />

                <FormField control={form.control} name="bio" render={({ field }) => ( <FormItem><FormLabel className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5"/>Bio</FormLabel><FormControl><Textarea placeholder="Tell us a little bit about yourself or your music..." className="resize-y min-h-[80px] sm:min-h-[100px]" {...field} value={field.value ?? ""} disabled={isSubmitting} /></FormControl><FormDescription className="text-xs">A short bio (optional, max 300 characters).</FormDescription><FormMessage /></FormItem> )} />

                <Separator className="my-6" />

                 <h3 className="text-lg font-semibold text-foreground mb-3">Account Security</h3>


                 <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-background/50 dark:bg-background/30">
                    <div className="space-y-0.5">
                        <FormLabel className="flex items-center gap-2">
                             <ShieldIcon className="h-4 w-4" /> SMS Two-Factor Auth (2FA)
                        </FormLabel>
                        <FormDescription className="text-xs">
                             SMS-based 2FA is currently disabled for this portal.
                        </FormDescription>
                    </div>
                     <Button
                         type="button"
                         variant="outline"
                         size="sm"
                         onClick={onManageMfa}
                         disabled={isSubmitting}
                         title={"View 2FA Status"}
                     >
                         View Status
                     </Button>
                 </div>


                <div className="flex justify-end gap-2 pt-4 mt-6">
                     {onCancel && ( <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button> )}
                    <Button type="submit" disabled={isSubmitting || !formIsDirty || !formIsValid} className="min-w-[80px]">
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </Form>
    );
}

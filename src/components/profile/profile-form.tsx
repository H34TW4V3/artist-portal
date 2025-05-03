
"use client"

import { useState, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, Upload, AlertCircle, Mail, Phone, User, FileText, ShieldCheck } from "lucide-react"; // Added ShieldCheck
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
import { Switch } from "@/components/ui/switch"; // Import Switch
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator"; // Import Separator

// Define the schema for profile data, including new fields
// Add smsMfaEnabled field
const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(50, "Name must be 50 characters or less."),
  email: z.string().email("Invalid email address."), // Email is now editable
  bio: z.string().max(300, "Bio must be 300 characters or less.").optional().nullable(), // Allow null for reset
  phoneNumber: z.string().optional().nullable() // Basic validation, make optional
      .refine(val => !val || /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/.test(val), {
          message: "Invalid phone number format.",
       }),
  imageUrl: z.string().url("Invalid URL.").optional().nullable(), // Store URL, upload handled separately
  hasCompletedTutorial: z.boolean().optional().default(false), // Add tutorial flag to schema
  emailLinkSignInEnabled: z.boolean().optional().default(false), // Added email link preference
  // smsMfaEnabled: z.boolean().optional().default(false), // Renamed to reflect preference storage
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileFormProps {
    initialData?: ProfileFormValues; // Make initial data optional, parent handles fetching
    updateFunction: (data: ProfileFormValues, newImageFile?: File) => Promise<{ updatedData: ProfileFormValues }>; // Function to call on submit
    onSuccess?: (updatedData: ProfileFormValues) => void; // Callback on successful update
    onCancel?: () => void; // Callback for cancel action (optional)
    onManageMfa: () => void; // Callback to open MFA management modal
    isSmsMfaEnrolled: boolean; // Pass enrollment status from parent
    className?: string;
}

export function ProfileForm({
    initialData,
    updateFunction,
    onSuccess,
    onCancel,
    onManageMfa,
    isSmsMfaEnrolled, // Receive enrollment status
    className
}: ProfileFormProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentImageUrl, setCurrentImageUrl] = useState<string | undefined>(initialData?.imageUrl ?? undefined);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const [selectedImageFile, setSelectedImageFile] = useState<File | undefined>(undefined);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [formInitialName, setFormInitialName] = useState(initialData?.name || "Artist Name");

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: initialData || {
            name: "",
            email: "",
            bio: "",
            phoneNumber: "",
            imageUrl: "",
            hasCompletedTutorial: false,
            emailLinkSignInEnabled: false,
            // smsMfaEnabled: false, // Initialize preference
        },
        mode: "onChange",
    });

    // Destructure formState for easier access
    const { isDirty: formIsDirtyState, isValid: formIsValidState } = form.formState;

    useEffect(() => {
        if (initialData) {
             const mergedDefaults = {
                name: "",
                email: "",
                bio: null,
                phoneNumber: null,
                imageUrl: null,
                hasCompletedTutorial: false,
                emailLinkSignInEnabled: false,
                // smsMfaEnabled: false, // Don't reset MFA preference based on initial data alone if it exists
                ...initialData,
            };
            form.reset(mergedDefaults);
            setCurrentImageUrl(initialData.imageUrl ?? undefined);
            setFormInitialName(initialData.name);
            setSelectedImageFile(undefined);
            setImagePreviewUrl(null);
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

            setSelectedImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
            form.setValue('imageUrl', '', { shouldDirty: true }); // Mark form as dirty when image changes
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    async function onSubmit(values: ProfileFormValues) {
        console.log("ProfileForm onSubmit triggered!"); // Add log
        setIsSubmitting(true);
        const isImageChanged = !!selectedImageFile;

        let dataToSubmit = { ...values };
         // If a new image was selected, we don't need to send the old imageUrl
         if (isImageChanged) {
             dataToSubmit.imageUrl = null;
         } else {
             // If no new image, ensure the currentImageUrl (from initialData) is included
             // This prevents accidentally wiping the image if the user only changed text fields
             dataToSubmit.imageUrl = currentImageUrl || null;
         }

        try {
            // Pass the optional newImageFile to the updateFunction
            const { updatedData } = await updateFunction(dataToSubmit, selectedImageFile);

            // Update local state *after* successful updateFunction call
            setFormInitialName(updatedData.name);
            setCurrentImageUrl(updatedData.imageUrl ?? undefined);
            setSelectedImageFile(undefined);
            setImagePreviewUrl(null);

            // Reset form with the new data from the backend to clear dirty state
            form.reset(updatedData, { keepValues: false, keepDirty: false, keepDefaultValues: false });

            onSuccess?.(updatedData); // Call success callback if provided

        } catch (error) {
            console.error("Error in ProfileForm onSubmit calling updateFunction:", error);
            // Error toast is handled primarily by the caller (UserProfile)
        } finally {
            setIsSubmitting(false);
        }
    }

    // Recalculate formIsDirty to include selectedImageFile
    const formIsDirty = formIsDirtyState || !!selectedImageFile;
    const formIsValid = formIsValidState;

    // Log button state for debugging
    console.log("ProfileForm Button State:", { isSubmitting, formIsDirty, formIsValid });


    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className={cn("space-y-4 px-2 py-4 sm:px-6", className)}>

                {/* Profile Picture Section */}
                <FormItem>
                    <FormLabel>Profile Picture</FormLabel>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <Avatar className="h-20 w-20 sm:h-24 sm:w-24 cursor-pointer border-2 border-primary/30 hover:border-primary/60 transition-colors" onClick={handleAvatarClick}>
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
                                <Input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileChange} className="hidden" disabled={isSubmitting} />
                            </FormControl>
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

                {/* Artist Name */}
                <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel className="flex items-center gap-1.5"><User className="h-3.5 w-3.5"/>Artist Name</FormLabel><FormControl><Input placeholder="Your artist or band name" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem> )} />

                {/* Email (NOW EDITABLE) */}
                <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5"/>Account Email</FormLabel><FormControl><Input type="email" placeholder="your.email@example.com" {...field} disabled={isSubmitting} /></FormControl><FormDescription className="text-xs">Change your sign-in email. Verification will be required.</FormDescription><FormMessage /></FormItem> )} />

                {/* Phone Number */}
                <FormField control={form.control} name="phoneNumber" render={({ field }) => ( <FormItem><FormLabel className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5"/>Phone Number (Needed for SMS 2FA)</FormLabel><FormControl><Input type="tel" placeholder="e.g., +1 555-123-4567" {...field} value={field.value ?? ""} disabled={isSubmitting} /></FormControl><FormDescription className="text-xs">Used for SMS verification and urgent communication.</FormDescription><FormMessage /></FormItem> )} />

                {/* Bio */}
                <FormField control={form.control} name="bio" render={({ field }) => ( <FormItem><FormLabel className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5"/>Bio</FormLabel><FormControl><Textarea placeholder="Tell us a little bit about yourself or your music..." className="resize-y min-h-[80px] sm:min-h-[100px]" {...field} value={field.value ?? ""} disabled={isSubmitting} /></FormControl><FormDescription className="text-xs">A short bio (optional, max 300 characters).</FormDescription><FormMessage /></FormItem> )} />

                <Separator className="my-6" />

                {/* Account Security Section */}
                 <h3 className="text-lg font-semibold text-foreground mb-3">Account Security</h3>

                 {/* Email Link Sign-in Preference */}
                 <FormField
                    control={form.control}
                    name="emailLinkSignInEnabled"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-background/50 dark:bg-background/30">
                            <div className="space-y-0.5">
                                <FormLabel className="flex items-center gap-2">
                                     <Mail className="h-4 w-4" /> Enable Email Link Sign-In
                                </FormLabel>
                                <FormDescription className="text-xs">
                                    Receive a secure link to sign in instead of using a password.
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    disabled={isSubmitting}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                 />

                {/* SMS Multi-Factor Authentication */}
                 <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-background/50 dark:bg-background/30">
                    <div className="space-y-0.5">
                        <FormLabel className="flex items-center gap-2">
                             <ShieldCheck className="h-4 w-4" /> SMS Two-Factor Auth (2FA)
                        </FormLabel>
                        <FormDescription className="text-xs">
                             Add an extra layer of security using your phone number.
                             {isSmsMfaEnrolled ? <span className="text-green-600 font-medium ml-1">(Enabled)</span> : <span className="text-muted-foreground ml-1">(Disabled)</span>}
                        </FormDescription>
                    </div>
                     {/* Button to open MFA management modal */}
                     <Button
                         type="button"
                         variant="outline"
                         size="sm"
                         onClick={onManageMfa}
                         disabled={isSubmitting || !form.watch('phoneNumber')} // Disable if no phone number
                         title={!form.watch('phoneNumber') ? "Add phone number to manage SMS 2FA" : "Manage SMS 2FA"}
                     >
                         {isSmsMfaEnrolled ? 'Manage 2FA' : 'Setup 2FA'}
                     </Button>
                 </div>


                 {/* Form Actions (Save/Cancel) */}
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

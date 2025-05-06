
"use client"

import { useState, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, Upload, AlertCircle, Mail, Phone, User, FileText, ShieldExclamation } from "lucide-react"; // Changed ShieldCheck to ShieldExclamation
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
// import { Switch } from "@/components/ui/switch"; // Switch for emailLinkSignInEnabled is kept
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator"; 

// Schema for profile data - smsMfaEnabled removed as MFA is disabled
const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(50, "Name must be 50 characters or less."),
  email: z.string().email("Invalid email address."), 
  bio: z.string().max(300, "Bio must be 300 characters or less.").optional().nullable(), 
  phoneNumber: z.string().optional().nullable() 
      .refine(val => !val || /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/.test(val), {
          message: "Invalid phone number format.",
       }),
  imageUrl: z.string().url("Invalid URL.").optional().nullable(), 
  hasCompletedTutorial: z.boolean().optional().default(false), 
  emailLinkSignInEnabled: z.boolean().optional().default(false), 
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileFormProps {
    initialData?: ProfileFormValues; 
    updateFunction: (data: ProfileFormValues, newImageFile?: File) => Promise<{ updatedData: ProfileFormValues }>; 
    onSuccess?: (updatedData: ProfileFormValues) => void; 
    onCancel?: () => void; 
    onManageMfa: () => void; // Kept for potential future re-enablement, but button will be disabled/informational
    isSmsMfaEnrolled: boolean; // Still passed, but will likely always be false
    className?: string;
}

export function ProfileForm({
    initialData,
    updateFunction,
    onSuccess,
    onCancel,
    onManageMfa, // Kept for UI consistency, but its action might change
    isSmsMfaEnrolled, // Still passed, will likely always be false
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
        },
        mode: "onChange",
    });

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
            form.setValue('imageUrl', '', { shouldDirty: true }); 
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    async function onSubmit(values: ProfileFormValues) {
        console.log("ProfileForm onSubmit triggered!"); 
        setIsSubmitting(true);
        const isImageChanged = !!selectedImageFile;

        let dataToSubmit = { ...values };
         if (isImageChanged) {
             dataToSubmit.imageUrl = null;
         } else {
             dataToSubmit.imageUrl = currentImageUrl || null;
         }

        try {
            const { updatedData } = await updateFunction(dataToSubmit, selectedImageFile);

            setFormInitialName(updatedData.name);
            setCurrentImageUrl(updatedData.imageUrl ?? undefined);
            setSelectedImageFile(undefined);
            setImagePreviewUrl(null);

            form.reset(updatedData, { keepValues: false, keepDirty: false, keepDefaultValues: false });

            onSuccess?.(updatedData); 

        } catch (error) {
            console.error("Error in ProfileForm onSubmit calling updateFunction:", error);
        } finally {
            setIsSubmitting(false);
        }
    }

    const formIsDirty = formIsDirtyState || !!selectedImageFile;
    const formIsValid = formIsValidState;

    console.log("ProfileForm Button State:", { isSubmitting, formIsDirty, formIsValid });


    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className={cn("space-y-4 px-2 py-4 sm:px-6", className)}>

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

                <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel className="flex items-center gap-1.5"><User className="h-3.5 w-3.5"/>Artist Name</FormLabel><FormControl><Input placeholder="Your artist or band name" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem> )} />

                <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5"/>Account Email</FormLabel><FormControl><Input type="email" placeholder="your.email@example.com" {...field} disabled={isSubmitting} /></FormControl><FormDescription className="text-xs">Change your sign-in email. Verification will be required.</FormDescription><FormMessage /></FormItem> )} />

                <FormField control={form.control} name="phoneNumber" render={({ field }) => ( <FormItem><FormLabel className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5"/>Phone Number</FormLabel><FormControl><Input type="tel" placeholder="e.g., +1 555-123-4567" {...field} value={field.value ?? ""} disabled={isSubmitting} /></FormControl><FormDescription className="text-xs">Used for urgent communication. SMS 2FA is currently disabled.</FormDescription><FormMessage /></FormItem> )} />

                <FormField control={form.control} name="bio" render={({ field }) => ( <FormItem><FormLabel className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5"/>Bio</FormLabel><FormControl><Textarea placeholder="Tell us a little bit about yourself or your music..." className="resize-y min-h-[80px] sm:min-h-[100px]" {...field} value={field.value ?? ""} disabled={isSubmitting} /></FormControl><FormDescription className="text-xs">A short bio (optional, max 300 characters).</FormDescription><FormMessage /></FormItem> )} />

                <Separator className="my-6" />

                 <h3 className="text-lg font-semibold text-foreground mb-3">Account Security</h3>

                 {/* Email Link Sign-in Preference - REMOVED as per request to remove MFA */}
                 {/* 
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
                 */}

                {/* SMS Multi-Factor Authentication - Changed to informational */}
                 <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-background/50 dark:bg-background/30">
                    <div className="space-y-0.5">
                        <FormLabel className="flex items-center gap-2">
                             <ShieldExclamation className="h-4 w-4" /> SMS Two-Factor Auth (2FA)
                        </FormLabel>
                        <FormDescription className="text-xs">
                             SMS-based 2FA is currently disabled for this portal.
                        </FormDescription>
                    </div>
                     <Button
                         type="button"
                         variant="outline"
                         size="sm"
                         onClick={onManageMfa} // Still calls the function, modal will explain status
                         disabled={isSubmitting} 
                         title={"View 2FA Status"} // Updated title
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

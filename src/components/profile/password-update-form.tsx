
"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { updateUserPassword } from "@/services/auth"; // Import the service function
import { cn } from "@/lib/utils";

// Schema for the password update form
// Note: Firebase updatePassword doesn't require current password via client SDK.
// Re-authentication is handled by Firebase if needed.
const passwordUpdateSchema = z.object({
  newPassword: z.string().min(8, "New password must be at least 8 characters."),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"], // Error applies to the confirmation field
});


type PasswordUpdateFormValues = z.infer<typeof passwordUpdateSchema>;

interface PasswordUpdateFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  className?: string;
}

export function PasswordUpdateForm({ onSuccess, onCancel, className }: PasswordUpdateFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<PasswordUpdateFormValues>({
    resolver: zodResolver(passwordUpdateSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  async function onSubmit(values: PasswordUpdateFormValues) {
    setIsLoading(true);
    try {
        // Call the service function to update the password
        await updateUserPassword(values.newPassword);
        toast({
            title: "Password Updated",
            description: "Your password has been changed successfully.",
             duration: 2000, // Show for 2 seconds
        });
        onSuccess(); // Call success callback (e.g., close modal)

    } catch (error) {
        console.error("Password update failed:", error);
        toast({
            title: "Update Failed",
            description: error instanceof Error ? error.message : "Could not update password.",
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={cn("space-y-4", className)}>
        {/* New Password Field */}
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Enter new password"
                  {...field}
                  disabled={isLoading}
                  className="focus:ring-accent"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Confirm New Password Field */}
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm New Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Confirm new password"
                  {...field}
                  disabled={isLoading}
                   className="focus:ring-accent"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                Cancel
            </Button>
            <Button
            type="submit"
            disabled={isLoading || !form.formState.isValid}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md disabled:shadow-none disabled:bg-muted disabled:text-muted-foreground"
            >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Updating...' : 'Update Password'}
            </Button>
        </div>
      </form>
    </Form>
  );
}

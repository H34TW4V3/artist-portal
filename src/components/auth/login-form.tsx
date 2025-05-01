
"use client";

import React, { useState } from "react"; // Import React
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation"; // Keep useRouter if needed for redirect parameter handling

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
import { ForgotPasswordModal } from "./forgot-password-modal"; // Import the modal
import { useAuth } from "@/context/auth-context"; // Import useAuth hook

// Define the login schema using Zod
const loginSchema = z.object({
  // Change email to artistId if that's what users log in with
  artistId: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// Add onLoginSuccess prop
interface LoginFormProps {
    onLoginSuccess: () => void;
}

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const { login, loading: authLoading } = useAuth(); // Get login function and loading state from context
  const { toast } = useToast();
  const router = useRouter(); // Keep for potential future use (e.g., reading redirect param)
  // Removed local isLoading state, use authLoading from context instead
  // const [isLoading, setIsLoading] = useState(false);
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      artistId: "",
      password: "",
    },
    mode: "onChange", // Validate on change
  });

  async function onSubmit(values: LoginFormValues) {
    // No need to set local isLoading true, AuthProvider handles it
    // setIsLoading(true);
    try {
      // Use the login function from the auth context
      await login(values.artistId, values.password);
      // Removed toast message for successful login
      // toast({
      //   title: "Login Successful",
      //   description: "Welcome back!",
      //   variant: "default",
      //    duration: 2000, // Show for 2 seconds
      // });
      // Redirect is handled by middleware/AuthProvider state change
       onLoginSuccess(); // Call the success handler passed from parent

    } catch (error) {
      console.error("Login failed:", error);
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    }
    // No need to set local isLoading false, AuthProvider handles it
    // finally {
    //   setIsLoading(false);
    // }
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Artist ID (Email) Field */}
          <FormField
            control={form.control}
            name="artistId" // Changed from email
            render={({ field }) => (
              <FormItem>
                <FormLabel>Artist ID (Email)</FormLabel>
                <FormControl>
                  <Input
                    type="email" // Keep type as email for validation
                    placeholder="your.email@example.com"
                    {...field}
                    disabled={authLoading} // Disable based on auth context loading state
                    autoComplete="email"
                    className="bg-background/50 dark:bg-background/30 border-input focus:ring-accent" // Adjusted opacity
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Password Field */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    {...field}
                    disabled={authLoading} // Disable based on auth context loading state
                    autoComplete="current-password"
                    className="bg-background/50 dark:bg-background/30 border-input focus:ring-accent" // Adjusted opacity
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Forgot Password Link */}
           <div className="text-right">
              <Button
                type="button"
                variant="link"
                className="text-sm font-medium text-primary hover:underline p-0 h-auto" // Link styling
                onClick={() => setIsForgotPasswordModalOpen(true)}
                disabled={authLoading} // Disable based on auth context loading state
              >
                Forgot Password?
              </Button>
          </div>

          {/* Submit Button */}
          <Button type="submit" disabled={authLoading || !form.formState.isValid} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md disabled:shadow-none disabled:bg-muted disabled:text-muted-foreground">
            {authLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {authLoading ? 'Logging In...' : 'Login'}
          </Button>
        </form>
      </Form>

       {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordModalOpen}
        onClose={() => setIsForgotPasswordModalOpen(false)}
      />
    </>
  );
}


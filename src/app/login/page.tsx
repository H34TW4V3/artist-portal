
"use client";

import { LoginForm } from '@/components/auth/login-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react'; // Import Loader2 for loading animation

// Placeholder URL for the GIF - replace with actual URL
const LOGIN_BACKGROUND_GIF_URL = "https://giffiles.alphacoders.com/173/173157.gif"; // Updated GIF URL

// Custom Login Icon based on the provided image
const LoginIcon = () => (
    // Add subtle pulse animation to the icon
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 100 100" className="h-24 w-24 mb-6 text-primary animate-subtle-pulse"> {/* Increased size & Added animation */}
      <defs>
        <linearGradient id="oxygenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor: 'hsl(180, 100%, 70%)', stopOpacity: 1}} /> {/* Cyan-ish */}
          <stop offset="50%" style={{stopColor: 'hsl(300, 100%, 80%)', stopOpacity: 1}} /> {/* Magenta-ish */}
          <stop offset="100%" style={{stopColor: 'hsl(35, 100%, 75%)', stopOpacity: 1}} /> {/* Orange-ish */}
        </linearGradient>
      </defs>
      {/* Outer circle with gradient stroke */}
      <circle cx="50" cy="50" r="45" fill="none" stroke="url(#oxygenGradient)" strokeWidth="3" />
      {/* Stylized 'X' with gradient stroke */}
      <path
        d="M30 30 L70 70 M70 30 L30 70"
        stroke="url(#oxygenGradient)"
        strokeWidth="10" // Adjust thickness as needed
        strokeLinecap="round"
        fill="none" // Use stroke instead of fill for the X lines if preferred
      />
        {/* If fill is desired for the X:
         <path d="M30 30 L50 50 L70 30 L50 50 L70 70 L50 50 L30 70 L50 50 Z" fill="url(#oxygenGradient)" />
        */}
    </svg>
);


export default function LoginPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Redirect authenticated users away from login page
        if (!loading && user) {
            router.replace('/'); // Redirect to home page
        }
    }, [user, loading, router]);


    // Show loading state while checking auth status initially
    if (loading) {
        return (
             <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-4">
                 <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        )
    }

     // If user is already determined and exists, let useEffect handle redirect
     if (user) {
         return null;
     }


    // If not loading and no user, show the login form
    return (
        <div className="flex min-h-screen w-full items-center justify-center p-4 relative"> {/* Removed bg-transparent, z-10 */}
             {/* Specific Background for Login Page */}
             <div
                 className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
                 style={{ backgroundImage: `url('${LOGIN_BACKGROUND_GIF_URL}')` }}
             />

            {/* Card container - Ensure it sits above the background */}
            <div className={cn(
                "relative z-10 w-full max-w-md rounded-xl border border-border/30 shadow-xl overflow-hidden animate-fade-in-up bg-card/20 dark:bg-card/10" // Added background opacity, ensure relative and z-10
            )}>
                {/* Card Header */}
                 <CardHeader className="items-center text-center p-6 border-b border-border/30"> {/* Removed background */}
                    <LoginIcon /> {/* Use custom icon */}
                    <CardTitle className="text-2xl font-semibold tracking-tight text-primary">Artist Hub Login</CardTitle>
                    <CardDescription className="text-muted-foreground text-sm">
                       Enter your credentials to access your dashboard.
                    </CardDescription>
                </CardHeader>

                {/* Card Content - LoginForm */}
                 <CardContent className="p-6">
                     <LoginForm />
                 </CardContent>

                {/* Footer - Optional */}
                <div className="p-4 text-center text-xs text-muted-foreground border-t border-border/30 bg-muted/10 dark:bg-muted/5"> {/* Adjusted footer bg */}
                    © {new Date().getFullYear()} Oxygen Group PLC. All rights reserved.
                </div>
            </div>
        </div>
    );
}

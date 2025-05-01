
"use client";

import { LoginForm } from '@/components/auth/login-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react'; // Import useState
import { Loader2 } from 'lucide-react'; // Import Loader2 for loading animation
import { SplashScreen } from '@/components/common/splash-screen'; // Import SplashScreen

// Placeholder URL for the GIF - replace with actual URL
const LOGIN_BACKGROUND_GIF_URL = "https://giffiles.alphacoders.com/173/173157.gif"; // Updated GIF URL

// Custom Login Icon based on the provided image
const LoginIcon = () => (
    // Add subtle pulse animation to the icon
    <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 100 100" className="h-32 w-32 mb-8 text-primary animate-subtle-pulse"> {/* Increased size & adjusted margin */}
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
    const [showSplash, setShowSplash] = useState(false); // State to control splash visibility *after* login
    const [isCardVisible, setIsCardVisible] = useState(true); // State to control login card visibility

    useEffect(() => {
        // Redirect authenticated users away from login page
        if (!loading && user) {
             // Check if splash screen should be shown (only immediately after login success)
             // We need a mechanism to know if the redirection is due to a fresh successful login.
             // This might involve query params or a temporary state, but for now, let's assume
             // if user exists and we are on login, we redirect without splash here.
             // The splash logic is now primarily handled by the HomePage itself.
            router.replace('/'); // Redirect to home page immediately
        }
    }, [user, loading, router]);

    const handleLoginSuccess = () => {
         // Trigger animation: hide card, show splash
         setIsCardVisible(false);
         setShowSplash(true);

        // Set timer to redirect after splash animation completes
        setTimeout(() => {
            router.replace('/'); // Redirect to home page
        }, 1500); // Match splash screen fade-out duration + delay
    };


    // Show loading state (handled by AuthProvider now)
    if (loading) {
         // AuthProvider shows the splash screen during initial loading
         return null; // Return null or a minimal placeholder if needed
    }

     // If user is already determined and exists, let useEffect handle redirect
     if (user) {
         return null;
     }


    // If not loading and no user, show the login form or splash screen
    return (
        <div className="flex min-h-screen w-full items-center justify-center p-4 relative"> {/* Removed bg-transparent, z-10 */}
             {/* Specific Background for Login Page */}
             <div
                 className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
                 style={{ backgroundImage: `url('${LOGIN_BACKGROUND_GIF_URL}')` }}
             />

             {/* Show splash screen if triggered */}
             {showSplash && <SplashScreen />}

            {/* Card container - Conditionally render based on visibility */}
            {isCardVisible && (
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
                         {/* Pass handleLoginSuccess to LoginForm */}
                         <LoginForm onLoginSuccess={handleLoginSuccess} />
                     </CardContent>

                    {/* Footer - Optional */}
                    <div className="p-4 text-center text-xs text-muted-foreground border-t border-border/30 bg-muted/10 dark:bg-muted/5"> {/* Adjusted footer bg */}
                        © {new Date().getFullYear()} Oxygen Group PLC. All rights reserved.
                    </div>
                 </div>
             )}
        </div>
    );
}


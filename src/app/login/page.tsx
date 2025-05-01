"use client";

import { LoginForm } from '@/components/auth/login-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react'; // Import useState
import { SplashScreen } from '@/components/common/splash-screen'; // Import SplashScreen

// Placeholder URL for the GIF - replace with actual URL
const LOGIN_BACKGROUND_GIF_URL = "https://giffiles.alphacoders.com/173/173157.gif"; // Updated GIF URL

export default function LoginPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [showSplash, setShowSplash] = useState(false); // State to control splash visibility *after* login
    const [isCardVisible, setIsCardVisible] = useState(true); // State to control login card visibility
    const [splashUserName, setSplashUserName] = useState<string | null>(null); // State for splash user name
    const [splashUserImageUrl, setSplashUserImageUrl] = useState<string | null>(null); // State for splash user image


    useEffect(() => {
        // Redirect authenticated users away from login page
        if (!loading && user) {
            router.replace('/'); // Redirect to home page immediately
        }
    }, [user, loading, router]);

    // Update handleLoginSuccess to accept name and imageUrl
    const handleLoginSuccess = (name: string, imageUrl: string | null, playLoginSound: () => void) => {
         // Store name and image URL for the splash screen
         setSplashUserName(name);
         setSplashUserImageUrl(imageUrl);

         // Trigger animation: hide card, show splash
         setIsCardVisible(false);
         setShowSplash(true);

         // Play the login sound as the splash appears
         playLoginSound();

        // Set timer to redirect after splash animation completes (at least 3 seconds)
        setTimeout(() => {
            router.replace('/'); // Redirect to home page
        }, 3000); // Set duration to 3 seconds
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
             {showSplash && (
                <SplashScreen
                    loadingText="Logging in..." // Use specific text for login splash
                    userImageUrl={splashUserImageUrl} // Pass stored image URL
                    userName={splashUserName} // Pass stored user name
                    style={{ animationDelay: '0s' }} // Remove delay for instant show
                    // Override default fade-out animation for this specific instance
                    className="animate-none opacity-100"
                 />
              )}

            {/* Card container - Conditionally render based on visibility */}
            {isCardVisible && (
                 <div className={cn(
                    "relative z-10 w-full max-w-md rounded-xl border border-border/30 shadow-xl overflow-hidden animate-fade-in-up bg-card/20 dark:bg-card/10", // Added background opacity, ensure relative and z-10
                    !isCardVisible && "animate-fade-out" // Apply fade-out when card should hide
                 )}>
                    {/* Removed CardHeader - It's now inside LoginForm and conditional */}

                    {/* Card Content - LoginForm (Now multi-step) */}
                     {/* Pass handleLoginSuccess to LoginForm */}
                     <LoginForm onLoginSuccess={handleLoginSuccess} />

                    {/* Footer - Optional */}
                    <div className="p-4 text-center text-xs text-muted-foreground border-t border-border/30 bg-muted/10 dark:bg-muted/5"> {/* Adjusted footer bg */}
                        © {new Date().getFullYear()} Oxygen Group PLC. All rights reserved.
                    </div>
                 </div>
             )}
        </div>
    );
}

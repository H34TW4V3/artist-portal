
import React from 'react'; // Import React
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // Import Avatar components

interface SplashScreenProps {
    className?: string;
    style?: React.CSSProperties; // Allow passing style, e.g., for animation delay
    loadingText?: string; // Optional prop for custom loading text
    userImageUrl?: string | null; // Optional user image URL
    userName?: string | null; // Optional user name for fallback/initials
    appletIcon?: React.ReactNode; // Optional specific icon for the applet being loaded
}

// Placeholder URL for the GIF - consistent with login page
const LOGIN_BACKGROUND_GIF_URL = "https://giffiles.alphacoders.com/173/173157.gif";

// Helper to get initials
const getInitials = (name: string | undefined | null) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'; // Default to 'U'
};


export const SplashScreen: React.FC<SplashScreenProps> = ({
    className,
    style,
    loadingText,
    userImageUrl,
    userName,
    appletIcon // Destructure the new prop
}) => {
    return (
        <div
            className={cn(
                "fixed inset-0 z-[9999] flex flex-col items-center justify-center animate-fade-out", // Use fade-out animation from globals.css if defined, otherwise just animate-out
                "transition-opacity duration-500 ease-in-out", // Ensure opacity transition
                className
            )}
            style={{ animationDelay: '1s', animationFillMode: 'forwards', ...style }} // Delay fade-out, keep final state, merge styles
        >
            {/* Background GIF - Same as login page */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url('${LOGIN_BACKGROUND_GIF_URL}')` }}
            />

             {/* Content Overlay - Ensures content is above the background */}
             <div className="relative z-10 flex flex-col items-center justify-center text-center p-4 rounded-lg bg-background/30 dark:bg-background/20 backdrop-blur-sm">
                 {/* Conditional Logo/Avatar - Prioritize appletIcon, then user info, then default logo */}
                 {appletIcon ? (
                     <div className="h-32 w-32 mb-8 text-primary animate-subtle-pulse flex items-center justify-center">
                          {/* Render the passed icon, ensuring size and color consistency */}
                          {/* Cloning to apply consistent styles */}
                          {React.isValidElement(appletIcon) ? React.cloneElement(appletIcon as React.ReactElement, { className: 'h-20 w-20 text-primary' }) : appletIcon}
                     </div>
                 ) : userImageUrl || userName ? ( // Check for user info if no appletIcon
                     <Avatar className="h-32 w-32 mb-8 border-4 border-primary/50 animate-subtle-pulse">
                         <AvatarImage src={userImageUrl || undefined} alt={userName || 'User'} />
                         <AvatarFallback className="text-4xl bg-muted text-muted-foreground">
                            {getInitials(userName)}
                         </AvatarFallback>
                     </Avatar>
                 ) : (
                     // Default SVG Logo
                     <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 100 100" className="h-32 w-32 mb-8 text-primary animate-subtle-pulse">
                         <defs>
                             <linearGradient id="splashGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                 <stop offset="0%" style={{stopColor: 'hsl(180, 100%, 70%)', stopOpacity: 1}} />
                                 <stop offset="50%" style={{stopColor: 'hsl(300, 100%, 80%)', stopOpacity: 1}} />
                                 <stop offset="100%" style={{stopColor: 'hsl(35, 100%, 75%)', stopOpacity: 1}} />
                             </linearGradient>
                         </defs>
                         <circle cx="50" cy="50" r="45" fill="none" stroke="url(#splashGradient)" strokeWidth="3" />
                         <path d="M30 30 L70 70 M70 30 L30 70" stroke="url(#splashGradient)" strokeWidth="10" strokeLinecap="round" fill="none" />
                     </svg>
                 )}

                 {/* Loading Indicator */}
                 <Loader2 className="h-8 w-8 animate-spin text-primary mt-4" />
                 {/* Use loadingText prop or default */}
                <p className="mt-4 text-lg text-foreground font-semibold">
                    {loadingText || 'Loading Artist Hub...'}
                </p>
                {/* Display User Name if available */}
                {userName && (
                    <p className="mt-1 text-sm text-muted-foreground">{userName}</p>
                 )}
            </div>
        </div>
    );
};


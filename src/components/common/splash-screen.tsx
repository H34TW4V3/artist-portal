
import React, { useEffect, useRef } from 'react'; // Ensure React is imported
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // Import Avatar components
// REMOVED: Howler import

interface SplashScreenProps {
    className?: string;
    style?: React.CSSProperties;
    loadingText?: string;
    userImageUrl?: string | null;
    userName?: string | null;
    appletIcon?: React.ReactNode;
    duration?: number; // Still potentially useful for internal state management if needed
    // REMOVED: playAudioUrl, audioPlayedRef
}

// Helper to get initials
const getInitials = (name: string | undefined | null) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
};

// Use standard function component definition
export function SplashScreen({
    className,
    style,
    loadingText,
    userImageUrl,
    userName,
    appletIcon,
    duration = 5000, // Default duration set here
    // REMOVED: playAudioUrl, audioPlayedRef
}: SplashScreenProps) {
    // REMOVED: audioRef, internalAudioPlayedRef, currentAudioPlayedRef

    // REMOVED: useEffect for audio initialization

    const animationClass = 'animate-fade-in opacity-100';

   // Ensure clean syntax before return
   return (
        <div
            className={cn(
                "flex flex-col items-center justify-center text-center p-6 rounded-lg",
                "transition-opacity duration-500 ease-in-out",
                 animationClass, // Apply fade-in animation
                className // Allow overriding classes
            )}
            style={style}
        >

             {appletIcon ? (
                 <div className="h-20 w-20 mb-4 text-primary animate-subtle-pulse flex items-center justify-center">
                      {React.isValidElement(appletIcon) ? React.cloneElement(appletIcon as React.ReactElement, { className: 'h-16 w-16 text-primary' }) : appletIcon}
                 </div>
             ) : userImageUrl || userName ? (
                 <Avatar className="h-20 w-20 mb-4 border-4 border-primary/50 animate-subtle-pulse">
                     <AvatarImage src={userImageUrl || undefined} alt={userName || 'User'} />
                     <AvatarFallback className="text-3xl bg-muted text-muted-foreground">
                        {getInitials(userName)}
                     </AvatarFallback>
                 </Avatar>
             ) : (
                 <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 100 100" className="h-20 w-20 mb-4 text-primary animate-subtle-pulse">
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

            <p className="mt-3 text-base text-foreground font-semibold">
                {loadingText || 'Loading...'}
            </p>
            {userName && !loadingText?.includes(userName) && (
                <p className="mt-1 text-xs text-muted-foreground">{userName}</p>
             )}
        </div>
    );
}

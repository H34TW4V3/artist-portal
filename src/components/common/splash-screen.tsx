
import React, { useEffect, useRef } from 'react'; // Add explicit React import
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // Import Avatar components
import { Howl } from 'howler'; // Import Howl for audio

interface SplashScreenProps {
    className?: string;
    style?: React.CSSProperties;
    loadingText?: string;
    userImageUrl?: string | null;
    userName?: string | null;
    appletIcon?: React.ReactNode;
    duration?: number; // Still potentially useful for internal state management if needed
    playAudioUrl?: string | null; // URL of the audio to play
    audioPlayedRef?: React.MutableRefObject<boolean>; // Ref to track if audio has played in this instance
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
    duration = 5000,
    playAudioUrl,
    audioPlayedRef,
}: SplashScreenProps) {
    const [isVisible, setIsVisible] = React.useState(true);
    const audioRef = useRef<Howl | null>(null);
    const internalAudioPlayedRef = useRef(false); // Internal tracking if no external ref provided
    const currentAudioPlayedRef = audioPlayedRef || internalAudioPlayedRef;

    // --- Audio Handling ---
    useEffect(() => {
        // Initialize Howler instance only if URL is provided
        if (playAudioUrl && typeof window !== 'undefined' && !audioRef.current) {
            console.log("SplashScreen: Initializing Howler for", playAudioUrl);
            audioRef.current = new Howl({
                src: [playAudioUrl],
                preload: true,
                html5: true,
                onplayerror: (id, error) => {
                    console.error('Howler playback error:', error);
                },
                onloaderror: (id, error) => {
                    console.error('Howler load error:', error);
                },
                onload: () => {
                    console.log('Howler audio loaded:', playAudioUrl);
                    // Attempt to play ONLY if the ref says it hasn't played
                    if (currentAudioPlayedRef && !currentAudioPlayedRef.current) {
                        console.log('Attempting playback after load (splash)...');
                        audioRef.current?.play();
                        currentAudioPlayedRef.current = true; // Mark as played using the ref
                    }
                }
            });
        }

        // Cleanup function to unload audio when component unmounts or URL changes
        return () => {
            console.log("SplashScreen: Unloading Howler instance.");
            audioRef.current?.unload();
            audioRef.current = null;
            // DO NOT reset currentAudioPlayedRef.current here, it's managed by the parent component (LoginForm)
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playAudioUrl]); // Only re-run if the audio URL changes


    // --- Visibility Handling ---
    // Removed useEffect for duration, parent (LoginForm) controls visibility/timing


    // Determine animation based on visibility state
    // Use fade-in for initial appearance, fade-out controlled by parent via duration or explicit state
    const animationClass = 'animate-fade-in opacity-100';

    // Ensure clean syntax before return
    return (
        <div
            className={cn(
                // Removed fixed positioning, z-index, inset, fullscreen styles
                // Added flex for internal centering, padding
                "flex flex-col items-center justify-center text-center p-6 rounded-lg",
                // Use background/backdrop from parent card or apply locally if needed
                // "bg-background/30 dark:bg-background/20 backdrop-blur-sm", // Example local style
                "transition-opacity duration-500 ease-in-out", // Smooth opacity transition
                 animationClass, // Apply fade-in animation
                className // Allow overriding classes
            )}
            // Style might be used for initial animation delay if needed
            style={style}
        >
             {/* Removed Background GIF - Parent card handles background */}

             {/* Content Overlay - No longer needed as a separate overlay */}
             {/* Conditional Logo/Avatar */}
             {appletIcon ? (
                 <div className="h-20 w-20 mb-4 text-primary animate-subtle-pulse flex items-center justify-center"> {/* Reduced size */}
                      {React.isValidElement(appletIcon) ? React.cloneElement(appletIcon as React.ReactElement, { className: 'h-16 w-16 text-primary' }) : appletIcon} {/* Reduced size */}
                 </div>
             ) : userImageUrl || userName ? (
                 <Avatar className="h-20 w-20 mb-4 border-4 border-primary/50 animate-subtle-pulse"> {/* Reduced size */}
                     <AvatarImage src={userImageUrl || undefined} alt={userName || 'User'} />
                     <AvatarFallback className="text-3xl bg-muted text-muted-foreground"> {/* Reduced size */}
                        {getInitials(userName)}
                     </AvatarFallback>
                 </Avatar>
             ) : (
                 // Default SVG Logo - Kept for fallback cases
                 <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 100 100" className="h-20 w-20 mb-4 text-primary animate-subtle-pulse"> {/* Reduced size */}
                     {/* SVG content... */}
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
             <Loader2 className="h-6 w-6 animate-spin text-primary mt-3" /> {/* Reduced size */}
             {/* Loading Text */}
            <p className="mt-3 text-base text-foreground font-semibold"> {/* Reduced margins/size */}
                {loadingText || 'Loading...'}
            </p>
            {/* Display User Name if available AND not already in loadingText */}
            {userName && !loadingText?.includes(userName) && (
                <p className="mt-1 text-xs text-muted-foreground">{userName}</p> {/* Reduced size */}
             )}
        </div>
    );
} // <-- Ensure this brace exists
// No need for SplashScreen.displayName if using standard function

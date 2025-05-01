
import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SplashScreenProps {
    className?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ className }) => {
    return (
        <div
            className={cn(
                "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background animate-fade-out", // Use fade-out animation from globals.css if defined, otherwise just animate-out
                "transition-opacity duration-500 ease-in-out", // Ensure opacity transition
                className
            )}
            style={{ animationDelay: '1s', animationFillMode: 'forwards' }} // Delay fade-out, keep final state
        >
            {/* You can add your logo or brand name here */}
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
            <Loader2 className="h-8 w-8 animate-spin text-primary mt-4" />
            <p className="mt-4 text-lg text-muted-foreground">Loading Artist Hub...</p>
        </div>
    );
};

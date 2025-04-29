
"use client";

import { LoginForm } from '@/components/auth/login-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

// Login Icon (similar to macOS login)
const LoginIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-20 w-20 mb-4 text-primary">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="10" r="3" />
        <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
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
    // The AuthProvider handles the main loading indicator, but this prevents rendering the form prematurely
    if (loading) {
        return (
             <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-4">
                 <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        )
    }

     // If user is already determined and exists, let useEffect handle redirect
     // Render nothing while redirecting
     if (user) {
         return null;
     }


    // If not loading and no user, show the login form
    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-transparent p-4 relative z-10">
            <div className={cn(
                "w-full max-w-md rounded-xl border border-border/30 bg-card/80 dark:bg-card/70 backdrop-blur-lg shadow-xl overflow-hidden" // No background, just blur and border
            )}>
                {/* Card Header */}
                 <CardHeader className="items-center text-center p-6 border-b border-border/30"> {/* Removed background */}
                    <LoginIcon /> {/* Make icon larger */}
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
                <div className="p-4 text-center text-xs text-muted-foreground border-t border-border/30 bg-muted/20 dark:bg-muted/10">
                    © {new Date().getFullYear()} Oxygen Group PLC. All rights reserved.
                </div>
            </div>
        </div>
    );
}

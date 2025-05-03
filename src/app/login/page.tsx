
"use client";

import { LoginForm } from '@/components/auth/login-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
// Import Loader2 for loading animation (if needed, though AuthProvider handles splash)
// import { Loader2 } from 'lucide-react';
import { Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SubmitDemoForm } from '@/components/demo/submit-demo-form';
import { Separator } from '@/components/ui/separator';

// Placeholder URL for the GIF - Updated URL
const LOGIN_BACKGROUND_GIF_URL = "https://static1.squarespace.com/static/5fe4caeadae61a2f19719512/t/6696219ad6dcda40f9fa8ab6/1721115042117/16.gif?format=1500w";


export default function LoginPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    // Removed showSplash state, LoginForm handles its internal splash
    const [isLoginFormVisible, setIsLoginFormVisible] = useState(true);
    const [isDemoCardVisible, setIsDemoCardVisible] = useState(true);
    const [isDemoFlowActive, setIsDemoFlowActive] = useState(false);
    // Removed splash user info states, LoginForm manages splash content

    // Removed redirectTimerRef as redirection is now handled by AuthProvider/middleware


    useEffect(() => {
        // Redirect authenticated users immediately
        if (!loading && user) {
            router.replace('/');
        }
         // Cleanup logic no longer needed here
    }, [user, loading, router]);

    // Removed handleLoginCompletion as it's no longer needed


    const handleDemoSubmitClick = () => {
        console.log("Submit Demo button clicked, starting demo flow.");
        setIsDemoFlowActive(true);
    };

    const handleSubmitDemoSuccess = () => {
        setIsDemoFlowActive(false);
        setIsLoginFormVisible(true); // Ensure login card is visible
        toast({
            title: "Demo Submitted!",
            description: "Thank you for submitting your demo. We'll review it shortly.",
            duration: 4000,
        });
    };

    const handleDemoFormCancel = () => {
         setIsDemoFlowActive(false);
         setIsLoginFormVisible(true);
    }


    // Show loading state (handled by AuthProvider now)
    if (loading) {
         return null; // Or a minimal loading indicator if preferred
    }

     // If user is already logged in, prevent rendering the login page content
     if (user) {
         return null; // Middleware/AuthProvider handles redirect, but this prevents flicker
     }


    // If not loading and no user, show the login form or splash screen
    return (
        <div className="flex min-h-screen w-full items-center justify-center p-4 relative overflow-hidden">
             <div
                 className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
                 style={{ backgroundImage: `url('${LOGIN_BACKGROUND_GIF_URL}')` }}
             />

            {/* Container for Login and Demo Cards */}
            {/* Apply text-foreground which is light in dark mode */}
            <div className={cn(
                "relative z-10 flex flex-col sm:flex-row gap-6 w-full max-w-5xl justify-center items-stretch text-foreground",
                )}>

                {/* Login Card container - LoginForm handles internal transitions */}
                {/* Ensure text inside LoginForm inherits foreground color */}
                <div className={cn(
                    "flex-1 rounded-xl border border-border/30 shadow-xl overflow-hidden bg-card/20 dark:bg-card/10 flex flex-col",
                 )}>
                    {/* LoginForm no longer needs onLoginComplete */}
                    <LoginForm className="flex-grow" />
                </div>

                 {/* Vertical Separator - Force white text */}
                 <div className={cn(
                      "hidden sm:flex flex-col items-center justify-center py-10",
                      (!isLoginFormVisible || !isDemoCardVisible) && "opacity-0 pointer-events-none transition-opacity duration-300"
                 )}>
                     <Separator orientation="vertical" className="flex-grow bg-border/50" />
                     <span className="my-4 px-2 text-xl font-medium text-foreground/80 bg-transparent rounded-full"> {/* Use foreground */}
                         Or
                     </span>
                     <Separator orientation="vertical" className="flex-grow bg-border/50" />
                 </div>
                 {/* Horizontal Separator - Force white text */}
                 <div className={cn(
                      "flex sm:hidden items-center justify-center w-full my-4",
                      (!isLoginFormVisible || !isDemoCardVisible) && "opacity-0 pointer-events-none transition-opacity duration-300"
                 )}>
                     <Separator className="flex-grow bg-border/50" />
                     <span className="mx-2 text-xl font-medium text-foreground/80 px-2 py-0.5 bg-transparent rounded-full"> {/* Use foreground */}
                         Or
                     </span>
                     <Separator className="flex-grow bg-border/50" />
                 </div>


                {/* Demo Submission Card - Ensure text inside inherits foreground color */}
                <Card className={cn(
                    "flex-2 rounded-xl border border-border/30 shadow-xl overflow-hidden bg-card/20 dark:bg-card/10 flex flex-col relative",
                    )}
                    >
                    {/* Initial Content OR SubmitDemoForm */}
                    <div className={cn(
                        "flex flex-col flex-grow transition-opacity duration-300 ease-in-out",
                        isDemoFlowActive && "opacity-0 pointer-events-none"
                    )}>
                        <CardHeader className="items-center text-center p-6 border-b border-border/30">
                            {/* Set icon color explicitly if needed, otherwise inherits */}
                            <Upload className="h-12 w-12 mb-3 text-primary" />
                            {/* Use foreground for title and description */}
                            <CardTitle className="text-2xl font-semibold tracking-tight text-primary">Submit Your Demo</CardTitle>
                            <CardDescription className="text-foreground/80 text-sm mt-1"> {/* Use foreground */}
                                Got music you think we should hear? Submit your demo here.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow flex items-center justify-center p-6">
                            <Button
                                size="lg"
                                onClick={handleDemoSubmitClick}
                                className={cn(
                                    "w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-md",
                                    "hover-glow focus-glow transition-transform duration-200 ease-out hover:scale-105 focus-visible:scale-105"
                                )}
                            >
                                Submit Demo
                            </Button>
                        </CardContent>
                    </div>

                    {/* SubmitDemoForm Container - Ensure text inherits */}
                    {isDemoFlowActive && (
                        <div className={cn(
                            "absolute inset-0 flex flex-col transition-opacity duration-500 ease-in-out",
                            isDemoFlowActive ? "opacity-100 animate-fade-in" : "opacity-0 pointer-events-none"
                        )}>
                            <SubmitDemoForm
                                onSuccess={handleSubmitDemoSuccess}
                                onCancel={handleDemoFormCancel}
                                className="flex-grow flex flex-col text-foreground" // Apply text-foreground here too
                            />
                        </div>
                    )}
                </Card>

            </div>
             {/* Moved copyright footer here - Force white text */}
             <div className="absolute bottom-4 w-full text-center text-xs text-foreground/70 z-10"> {/* Use foreground */}
                 © {new Date().getFullYear()} Oxygen Group PLC. All rights reserved.
             </div>
        </div>
    );
}

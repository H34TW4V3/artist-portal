
"use client";

import { LoginForm } from '@/components/auth/login-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button'; // Import Button
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react'; // Import useState and useRef
import { SplashScreen } from '@/components/common/splash-screen'; // Import SplashScreen
import { Upload } from 'lucide-react'; // Import Upload icon
import { useToast } from '@/hooks/use-toast'; // Import useToast
import { SubmitDemoForm } from '@/components/demo/submit-demo-form'; // Import the form directly
import { Separator } from '@/components/ui/separator'; // Import Separator

// Placeholder URL for the GIF - replace with actual URL
const LOGIN_BACKGROUND_GIF_URL = "https://25.media.tumblr.com/0a0ba077c5c32fc4eaa6778519e56781/tumblr_n1an6osbsL1tpegqko1_r1_500.gif"; // Updated GIF URL
const LOGIN_JINGLE_PATH = '/sounds/login-jingle.mp3'; // Path to the sound file


export default function LoginPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { toast } = useToast(); // Initialize toast
    const [showSplash, setShowSplash] = useState(false); // State to control splash visibility *after* login
    const [isLoginFormVisible, setIsLoginFormVisible] = useState(true); // State to control login form card visibility
    const [isDemoCardVisible, setIsDemoCardVisible] = useState(true); // State for demo card visibility (the card itself)
    const [isDemoFlowActive, setIsDemoFlowActive] = useState(false); // State for showing demo form *steps* inside the card
    const [splashUserName, setSplashUserName] = useState<string | null>(null); // State for splash user name
    const [splashUserImageUrl, setSplashUserImageUrl] = useState<string | null>(null); // State for splash user image
    const audioRef = useRef<HTMLAudioElement | null>(null); // Ref for the audio element

    // Initialize and preload audio element
    useEffect(() => {
        // Ensure this runs only on the client
        if (typeof window !== 'undefined') {
            if (!audioRef.current) {
                audioRef.current = new Audio(LOGIN_JINGLE_PATH);
                audioRef.current.preload = 'auto';
                console.log("Audio element initialized and preloading:", LOGIN_JINGLE_PATH);
            }
        }
    }, []);

    useEffect(() => {
        // Redirect authenticated users away from login page
        if (!loading && user) {
            router.replace('/'); // Redirect to home page immediately
        }
    }, [user, loading, router]);

    // Play login sound function now local to LoginPage
    const playLoginSound = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0; // Rewind to start
            audioRef.current.play().then(() => {
                console.log("Login sound played successfully.");
            }).catch(error => {
                 // Autoplay might be blocked
                 console.error("Error playing login sound:", error);
                 // Consider showing a UI element to enable sound if autoplay fails
             });
        } else {
            console.warn("Login sound audio element not ready or not initialized.");
        }
    };


    // Update handleLoginSuccess - it now calls the local playLoginSound
    const handleLoginSuccess = (name: string, imageUrl: string | null) => {
         // Store name and image URL for the splash screen
         setSplashUserName(name);
         setSplashUserImageUrl(imageUrl);

         // Trigger animation: hide cards, show splash
         // Apply fade-out immediately for the cards container
         // We will rely on the parent div's animation triggered by !isLoginFormVisible && !isDemoCardVisible
         setIsLoginFormVisible(false);
         setIsDemoCardVisible(false); // Hide demo card as well
         setShowSplash(true); // Show splash screen

         // Play the login sound as the splash appears
         playLoginSound();

        // Set timer to redirect after splash animation completes
        setTimeout(() => {
            router.replace('/'); // Redirect to home page
        }, 5000); // Set duration to 5 seconds
    };

    // Update handler to start the demo flow
    const handleDemoSubmitClick = () => {
        console.log("Submit Demo button clicked, starting demo flow.");
        setIsLoginFormVisible(false); // Animate out the login card
        setIsDemoFlowActive(true); // Activate the multi-step form within the demo card
        // Demo card visibility is controlled by isDemoCardVisible (remains true)
    };

    const handleSubmitDemoSuccess = () => {
        setIsDemoFlowActive(false); // Deactivate demo form flow
        setIsLoginFormVisible(true); // Show login card again
        toast({
            title: "Demo Submitted!",
            description: "Thank you for submitting your demo. We'll review it shortly.",
            duration: 4000,
        });
    };

    const handleDemoFormCancel = () => {
         setIsDemoFlowActive(false); // Deactivate demo form flow
         setIsLoginFormVisible(true); // Show login card again
         // No toast needed for cancel
    }


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
        <div className="flex min-h-screen w-full items-center justify-center p-4 relative overflow-hidden"> {/* Added overflow-hidden */}
             {/* Specific Background for Login Page */}
             <div
                 className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
                 style={{ backgroundImage: `url('${LOGIN_BACKGROUND_GIF_URL}')` }}
             />

             {/* Show splash screen if triggered */}
             {showSplash && (
                <SplashScreen
                    // Update loading text to include the user's name
                    loadingText={`Welcome, ${splashUserName || 'User'}!`}
                    userImageUrl={splashUserImageUrl} // Pass stored image URL
                    userName={splashUserName} // Pass stored user name
                    style={{ animationDelay: '0s' }} // Remove delay for instant show
                    // Use animate-fade-in for splash entry, it will be removed by parent fade-out later
                    className="animate-fade-in"
                    // Specify duration for how long this component itself stays visible (redundant if controlled by parent state, but can be useful)
                    duration={5000} // Pass duration to splash screen if it uses it internally
                 />
              )}

            {/* Container for Login and Demo Cards */}
             {/* Use flex-col on small screens and flex-row on larger screens */}
            <div className={cn(
                "relative z-10 flex flex-col sm:flex-row gap-6 w-full max-w-4xl justify-center items-center", // Use items-center for vertical alignment
                 // Apply fade-out animation to the whole container when splash shows
                 showSplash && "animate-fade-out" // Fade out container when splash appears
                )}>

                {/* Login Card container - Apply slide-out animation when demo starts or fade-out for splash */}
                {/* Conditional rendering needed for animation exit */}
                <div className={cn(
                    "flex-1 rounded-xl border border-border/30 shadow-xl overflow-hidden bg-card/20 dark:bg-card/10 flex flex-col self-stretch", // Added self-stretch
                    isLoginFormVisible ? "animate-fade-in-up" : "animate-fade-out", // Use fade-in/fade-out for simplicity or change to slide
                    !showSplash && !isLoginFormVisible && "animate-slide-out-to-left", // Slide left when demo starts (and not splash)
                    !isLoginFormVisible && "pointer-events-none" // Disable interaction when hidden/animating out
                 )}>
                    {/* Card Content - LoginForm */}
                    {/* Pass handleLoginSuccess to LoginForm */}
                    <LoginForm onLoginSuccess={handleLoginSuccess} />

                    {/* Footer - Optional */}
                    <div className="p-4 text-center text-xs text-muted-foreground border-t border-border/30 bg-muted/10 dark:bg-muted/5 mt-auto"> {/* Added mt-auto */}
                        © {new Date().getFullYear()} Oxygen Group PLC. All rights reserved.
                    </div>
                </div>

                 {/* Vertical Separator with "Or" - visible only on sm screens and up */}
                 <div className={cn(
                      "hidden sm:flex flex-col items-center justify-center h-20", // Set a fixed height or use percentage
                      (!isLoginFormVisible || !isDemoCardVisible) && "opacity-0 pointer-events-none transition-opacity duration-300" // Hide when form animates out
                 )}>
                     <Separator orientation="vertical" className="h-full bg-border/50" />
                     <span className="my-2 px-2 text-xs font-medium text-muted-foreground bg-background/50 rounded-full backdrop-blur-sm">
                         Or
                     </span>
                     <Separator orientation="vertical" className="h-full bg-border/50" />
                 </div>
                 {/* Horizontal Separator with "Or" - visible only below sm screens */}
                 <div className={cn(
                      "flex sm:hidden items-center justify-center w-full my-4", // Visible below sm, with margin
                      (!isLoginFormVisible || !isDemoCardVisible) && "opacity-0 pointer-events-none transition-opacity duration-300" // Hide when form animates out
                 )}>
                     <Separator className="flex-grow bg-border/50" />
                     <span className="mx-2 text-xs font-medium text-muted-foreground bg-background/50 px-2 py-0.5 rounded-full backdrop-blur-sm">
                         Or
                     </span>
                     <Separator className="flex-grow bg-border/50" />
                 </div>


                {/* Demo Submission Card - Always present for layout, content changes */}
                {/* Apply slide-in animation only when login form slides out */}
                <Card className={cn(
                    "flex-1 rounded-xl border border-border/30 shadow-xl overflow-hidden bg-card/20 dark:bg-card/10 flex flex-col relative self-stretch", // flex-1, added flex layout, added relative for form positioning, added self-stretch
                    isDemoCardVisible ? "animate-fade-in-up" : "animate-fade-out", // Fade-in initially, fade-out for splash
                    "animation-delay-100" // Slight delay for demo card animation
                    )}
                    style={{ animationDelay: '100ms' }} // Inline style for delay compatibility
                    >
                    {/* Initial Content OR SubmitDemoForm */}
                    {/* Container for initial content with fade-out transition */}
                    <div className={cn(
                        "flex flex-col flex-grow transition-opacity duration-300 ease-in-out",
                        isDemoFlowActive && "opacity-0 pointer-events-none" // Fade out initial content when form is active
                    )}>
                        <CardHeader className="items-center text-center p-6 border-b border-border/30">
                            <Upload className="h-12 w-12 mb-3 text-primary" /> {/* Icon */}
                            <CardTitle className="text-2xl font-semibold tracking-tight text-primary">Submit Your Demo</CardTitle>
                            <CardDescription className="text-muted-foreground text-sm mt-1">
                                Got music you think we should hear? Submit your demo here.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow flex items-center justify-center p-6">
                            <Button
                                size="lg"
                                onClick={handleDemoSubmitClick} // Trigger the flow start
                                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                            >
                                Submit Demo
                            </Button>
                        </CardContent>
                        <div className="p-4 text-center text-xs text-muted-foreground border-t border-border/30 bg-muted/10 dark:bg-muted/5 mt-auto">
                            Unsolicited submissions policy applies.
                        </div>
                    </div>

                    {/* Container for the SubmitDemoForm with fade-in transition */}
                    {isDemoFlowActive && (
                        <div className={cn(
                            "absolute inset-0 flex flex-col transition-opacity duration-500 ease-in-out",
                            isDemoFlowActive ? "opacity-100 animate-fade-in" : "opacity-0 pointer-events-none" // Fade in form when active
                        )}>
                            <SubmitDemoForm
                                onSuccess={handleSubmitDemoSuccess}
                                onCancel={handleDemoFormCancel}
                                className="flex-grow flex flex-col p-0 overflow-y-auto" // Remove padding here, form adds it internally
                            />
                        </div>
                    )}
                </Card>

            </div>
        </div>
    );
}

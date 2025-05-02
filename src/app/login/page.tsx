
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
import { SubmitDemoModal } from '@/components/demo/submit-demo-modal'; // Import the new modal

// Placeholder URL for the GIF - replace with actual URL
const LOGIN_BACKGROUND_GIF_URL = "https://25.media.tumblr.com/0a0ba077c5c32fc4eaa6778519e56781/tumblr_n1an6osbsL1tpegqko1_r1_500.gif"; // Updated GIF URL
const LOGIN_JINGLE_PATH = '/sounds/login-jingle.mp3'; // Path to the sound file


export default function LoginPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { toast } = useToast(); // Initialize toast
    const [showSplash, setShowSplash] = useState(false); // State to control splash visibility *after* login
    const [isLoginFormVisible, setIsLoginFormVisible] = useState(true); // State to control login form card visibility
    const [isDemoCardVisible, setIsDemoCardVisible] = useState(true); // State for demo card visibility
    const [isSubmitDemoModalOpen, setIsSubmitDemoModalOpen] = useState(false); // State for demo modal
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
         setIsLoginFormVisible(false);
         setIsDemoCardVisible(false); // Hide demo card as well
         setShowSplash(true);

         // Play the login sound as the splash appears
         playLoginSound();

        // Set timer to redirect after splash animation completes
        setTimeout(() => {
            router.replace('/'); // Redirect to home page
        }, 5000); // Set duration to 5 seconds
    };

    // Update handler to open the demo submission modal
    const handleDemoSubmitClick = () => {
        console.log("Submit Demo button clicked, opening modal.");
        setIsSubmitDemoModalOpen(true);
    };

    const handleSubmitDemoSuccess = () => {
        setIsSubmitDemoModalOpen(false);
        // Optionally show a success toast here if the form doesn't
        toast({
            title: "Demo Submitted!",
            description: "Thank you for submitting your demo. We'll review it shortly.",
            duration: 4000,
        });
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
                    // Update loading text to include the user's name
                    loadingText={`Welcome, ${splashUserName || 'User'}!`}
                    userImageUrl={splashUserImageUrl} // Pass stored image URL
                    userName={splashUserName} // Pass stored user name
                    style={{ animationDelay: '0s' }} // Remove delay for instant show
                    // Override default fade-out animation for this specific instance if needed
                    className="animate-none opacity-100"
                    // Specify duration for how long this component itself stays visible (redundant if controlled by parent state, but can be useful)
                    duration={5000} // Pass duration to splash screen if it uses it internally
                 />
              )}

            {/* Container for Login and Demo Cards */}
             {/* Use flex-col on small screens and flex-row on larger screens */}
            <div className={cn(
                "relative z-10 flex flex-col sm:flex-row gap-6 w-full max-w-4xl", // Adjusted max-width
                // Apply fade-out animation to the whole container when splash shows
                !isLoginFormVisible && !isDemoCardVisible && "animate-fade-out"
                )}>

                {/* Login Card container - Conditionally render based on visibility */}
                {isLoginFormVisible && (
                     <div className={cn(
                        "flex-1 rounded-xl border border-border/30 shadow-xl overflow-hidden animate-fade-in-up bg-card/20 dark:bg-card/10", // flex-1 to take up space
                        !isLoginFormVisible && "animate-fade-out" // Apply fade-out when card should hide
                     )}>
                        {/* Card Content - LoginForm (Now multi-step) */}
                         {/* Pass handleLoginSuccess to LoginForm */}
                         <LoginForm onLoginSuccess={handleLoginSuccess} />

                        {/* Footer - Optional */}
                        <div className="p-4 text-center text-xs text-muted-foreground border-t border-border/30 bg-muted/10 dark:bg-muted/5"> {/* Adjusted footer bg */}
                            © {new Date().getFullYear()} Oxygen Group PLC. All rights reserved.
                        </div>
                     </div>
                 )}

                {/* Demo Submission Card */}
                {isDemoCardVisible && (
                     <Card className={cn(
                         "flex-1 rounded-xl border border-border/30 shadow-xl overflow-hidden animate-fade-in-up bg-card/20 dark:bg-card/10 flex flex-col justify-between", // flex-1, added flex layout
                         !isDemoCardVisible && "animate-fade-out", // Apply fade-out
                         "animation-delay-100" // Slight delay for demo card animation
                         )}
                         style={{ animationDelay: '100ms' }} // Inline style for delay compatibility
                         >
                        <CardHeader className="items-center text-center p-6 border-b border-border/30">
                            <Upload className="h-12 w-12 mb-3 text-primary" /> {/* Icon */}
                            <CardTitle className="text-2xl font-semibold tracking-tight text-primary">Submit Your Demo</CardTitle>
                            <CardDescription className="text-muted-foreground text-sm mt-1">
                                Got music you think we should hear? Submit your demo here.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow flex items-center justify-center p-6">
                            {/* Content of the demo card, e.g., button */}
                             <Button
                                 size="lg"
                                 onClick={handleDemoSubmitClick}
                                 className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                             >
                                 Submit Demo
                             </Button>
                        </CardContent>
                         {/* Footer - Optional, matching login card style */}
                         <div className="p-4 text-center text-xs text-muted-foreground border-t border-border/30 bg-muted/10 dark:bg-muted/5">
                             Unsolicited submissions policy applies.
                         </div>
                     </Card>
                 )}
            </div>

             {/* Demo Submission Modal */}
            <SubmitDemoModal
                 isOpen={isSubmitDemoModalOpen}
                 onClose={() => setIsSubmitDemoModalOpen(false)}
                 onSuccess={handleSubmitDemoSuccess}
             />

        </div>
    );
}

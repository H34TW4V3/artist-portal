
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


export default function LoginPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { toast } = useToast(); // Initialize toast
    const [showSplash, setShowSplash] = useState(false); // State to control splash visibility *after* login
    const [isLoginFormVisible, setIsLoginFormVisible] = useState(true); // State to control login form card visibility
    const [isDemoCardVisible, setIsDemoCardVisible] = useState(true); // State for demo card visibility (the card itself) - Stays true during flow
    const [isDemoFlowActive, setIsDemoFlowActive] = useState(false); // State for showing demo form *steps* inside the card
    const [splashUserName, setSplashUserName] = useState<string | null>(null); // State for splash user name
    const [splashUserImageUrl, setSplashUserImageUrl] = useState<string | null>(null); // State for splash user image


    useEffect(() => {
        // Redirect authenticated users away from login page
        if (!loading && user) {
            router.replace('/'); // Redirect to home page immediately
        }
    }, [user, loading, router]);


    // Update handleLoginSuccess - remove playLoginSound call
    const handleLoginSuccess = (name: string, imageUrl: string | null) => {
         // Store name and image URL for the splash screen
         setSplashUserName(name);
         setSplashUserImageUrl(imageUrl);

         // Trigger animation: hide cards, show splash
         setIsLoginFormVisible(false);
         setIsDemoCardVisible(false); // Hide demo card as well
         setShowSplash(true); // Show splash screen


        // Set timer to redirect after splash animation completes
        setTimeout(() => {
            router.replace('/'); // Redirect to home page
        }, 5000); // Set duration to 5 seconds
    };

    // Update handler to start the demo flow
    // REMOVED: setIsLoginFormVisible(false);
    const handleDemoSubmitClick = () => {
        console.log("Submit Demo button clicked, starting demo flow.");
        // setIsLoginFormVisible(false); // ** Keep login form visible **
        setIsDemoFlowActive(true); // Activate the multi-step form within the demo card
        // Demo card visibility remains true (isDemoCardVisible is not changed)
    };

    const handleSubmitDemoSuccess = () => {
        setIsDemoFlowActive(false); // Deactivate demo form flow
        setIsLoginFormVisible(true); // Ensure login card is visible
        toast({
            title: "Demo Submitted!",
            description: "Thank you for submitting your demo. We'll review it shortly.",
            duration: 4000,
        });
    };

    const handleDemoFormCancel = () => {
         setIsDemoFlowActive(false); // Deactivate demo form flow
         setIsLoginFormVisible(true); // Ensure login card is visible
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
             {/* Increased max-width to max-w-5xl to accommodate wider demo card */}
            <div className={cn(
                "relative z-10 flex flex-col sm:flex-row gap-6 w-full max-w-5xl justify-center items-stretch", // Increased max-width, use items-stretch
                 // Apply fade-out animation to the whole container when splash shows
                 showSplash && "animate-fade-out" // Fade out container when splash appears
                )}>

                {/* Login Card container - Apply fade-in initially, fade-out for splash */}
                {/* Give Login flex-1 */}
                <div className={cn(
                    "flex-1 rounded-xl border border-border/30 shadow-xl overflow-hidden bg-card/20 dark:bg-card/10 flex flex-col",
                    isLoginFormVisible ? "animate-fade-in-up" : "animate-fade-out", // Use fade-in/fade-out
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
                 {/* Uses flex to stretch vertically */}
                 <div className={cn(
                      "hidden sm:flex flex-col items-center justify-center py-10", // Removed fixed height, rely on flex stretch
                      // Hide when either form animates out (e.g., during splash)
                      (!isLoginFormVisible || !isDemoCardVisible) && "opacity-0 pointer-events-none transition-opacity duration-300"
                 )}>
                     <Separator orientation="vertical" className="flex-grow bg-border/50" /> {/* flex-grow makes separator fill space */}
                     <span className="my-4 px-2 text-xl font-medium text-muted-foreground bg-transparent rounded-full"> {/* Added bg-transparent */}
                         Or
                     </span>
                     <Separator orientation="vertical" className="flex-grow bg-border/50" /> {/* flex-grow makes separator fill space */}
                 </div>
                 {/* Horizontal Separator with "Or" - visible only below sm screens */}
                 <div className={cn(
                      "flex sm:hidden items-center justify-center w-full my-4", // Visible below sm, with margin
                       // Hide when either form animates out (e.g., during splash)
                      (!isLoginFormVisible || !isDemoCardVisible) && "opacity-0 pointer-events-none transition-opacity duration-300"
                 )}>
                     <Separator className="flex-grow bg-border/50" />
                     <span className="mx-2 text-xl font-medium text-muted-foreground px-2 py-0.5 bg-transparent rounded-full"> {/* Added bg-transparent */}
                         Or
                     </span>
                     <Separator className="flex-grow bg-border/50" />
                 </div>


                {/* Demo Submission Card - Always present for layout, content changes */}
                {/* Give Demo flex-2 to make it roughly twice as wide */}
                <Card className={cn(
                    "flex-2 rounded-xl border border-border/30 shadow-xl overflow-hidden bg-card/20 dark:bg-card/10 flex flex-col relative", // Use flex-2, Add relative positioning
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
                                className={cn(
                                    "w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-md",
                                    "hover-glow focus-glow transition-transform duration-200 ease-out hover:scale-105 focus-visible:scale-105" // Added animations
                                )}
                            >
                                Submit Demo
                            </Button>
                        </CardContent>
                        <div className="p-4 text-center text-xs text-muted-foreground border-t border-border/30 bg-muted/10 dark:bg-muted/5 mt-auto">
                            Unsolicited submissions policy applies.
                        </div>
                    </div>

                    {/* Container for the SubmitDemoForm with fade-in transition */}
                     {/* Ensure this container fills the card using absolute positioning */}
                    {isDemoFlowActive && (
                        <div className={cn(
                            "absolute inset-0 flex flex-col transition-opacity duration-500 ease-in-out",
                            isDemoFlowActive ? "opacity-100 animate-fade-in" : "opacity-0 pointer-events-none" // Fade in form when active
                        )}>
                            <SubmitDemoForm
                                onSuccess={handleSubmitDemoSuccess}
                                onCancel={handleDemoFormCancel}
                                className="flex-grow flex flex-col" // Use flex-grow to fill space
                            />
                        </div>
                    )}
                </Card>

            </div>
        </div>
    );
}


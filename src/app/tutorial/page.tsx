
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
import { app } from "@/services/firebase-config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const tutorialSteps = [
  {
    title: "Welcome to the Artist Hub!",
    content: "This quick tutorial will guide you through the main features of your new portal. Use the arrows to navigate.",
    image: "https://picsum.photos/seed/tut1/600/350?blur=2", // Replace with relevant images
    hint: "welcome illustration",
  },
  {
    title: "Dashboard Overview",
    content: "Your central command center. View key streaming statistics like total streams, revenue, and listener counts at a glance.",
    image: "https://picsum.photos/seed/tut2/600/350?grayscale",
    hint: "dashboard analytics chart",
  },
  {
    title: "Managing Releases",
    content: "Upload new music, manage existing releases, view their status, and submit takedown requests when needed.",
    image: "https://picsum.photos/seed/tut3/600/350",
    hint: "music release management interface",
  },
  {
    title: "Event Scheduling",
    content: "Keep track of your gigs, appearances, and other important dates using the integrated events calendar.",
    image: "https://picsum.photos/seed/tut4/600/350?blur=1",
    hint: "calendar event schedule",
  },
  {
    title: "Documents Hub",
    content: "Access important documents like your artist agreement, handbooks, and other management contracts all in one place.",
    image: "https://picsum.photos/seed/tut5/600/350?grayscale",
    hint: "document management system files",
  },
  {
    title: "Pineapple Corner",
    content: "Connect with fellow artists! Share ideas, ask questions, seek collaborations, and send direct messages in this dedicated community space.",
    image: "https://picsum.photos/seed/tut6/600/350",
    hint: "community forum discussion",
  },
  {
    title: "Customization",
    content: "Personalize your Hub experience! Change the background wallpaper and switch between light and dark modes using the settings menu (pencil icon).",
    image: "https://picsum.photos/seed/tut7/600/350?blur=1",
    hint: "customization settings theme wallpaper",
  },
  {
    title: "Ready to Go!",
    content: "You've completed the tour. Click 'Finish' to mark the tutorial as complete and start exploring your Artist Hub!",
    image: "https://picsum.photos/seed/tut8/600/350?grayscale",
    hint: "rocket launch success complete",
  },
];

export default function TutorialPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const db = getFirestore(app);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Redirect if user is not logged in or auth state is still loading
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  const goToNextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const finishTutorial = async () => {
    if (!user) return;

    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        hasCompletedTutorial: true,
      });
      toast({
          title: "Tutorial Completed!",
          description: "Welcome to the Artist Hub!",
          variant: "default",
      })
      router.replace("/"); // Redirect to the main home page
    } catch (error) {
      console.error("Error updating tutorial status:", error);
       toast({
           title: "Error",
           description: "Could not save tutorial completion status. Please try finishing again.",
           variant: "destructive",
       })
    }
  };

  // Show loading state or nothing if redirecting
  if (loading || !user) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        {/* Optional: Add a simple loading indicator here if needed */}
      </div>
    );
  }

  const step = tutorialSteps[currentStep];
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <Card className="w-full max-w-2xl shadow-2xl bg-card/80 border border-border/30 animate-fade-in-up">
        <CardHeader className="text-center border-b border-border/20 pb-4">
          <CardTitle className="text-2xl font-bold text-primary">{step.title}</CardTitle>
           {/* Progress Bar */}
           <Progress value={progress} className="w-full h-1.5 mt-3" />
           <CardDescription className="text-muted-foreground text-sm pt-1">
             Step {currentStep + 1} of {tutorialSteps.length}
           </CardDescription>
        </CardHeader>
        <CardContent className="p-6 text-center space-y-4">
          {/* Optional Image */}
          {step.image && (
            <div className="mb-4 overflow-hidden rounded-lg shadow-md">
              <img
                src={step.image}
                alt={step.title}
                className="w-full h-auto object-cover"
                data-ai-hint={step.hint || 'tutorial step illustration'}
              />
            </div>
          )}
          <p className="text-base text-foreground/90 leading-relaxed">{step.content}</p>
        </CardContent>
        <CardFooter className="flex justify-between p-4 border-t border-border/20">
          <Button
            variant="outline"
            onClick={goToPreviousStep}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Previous
          </Button>
          {currentStep < tutorialSteps.length - 1 ? (
            <Button onClick={goToNextStep} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={finishTutorial} className="bg-green-600 hover:bg-green-700 text-white">
              Finish Tutorial <CheckCircle className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

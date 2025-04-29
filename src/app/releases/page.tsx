
"use client"; // Required for hooks and client-side interactions

import { useState, useEffect } from "react";
import { ReleaseList } from "@/components/dashboard/release-list";
import UserProfile from "@/components/common/user-profile";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListMusic, Home } from "lucide-react"; // Use ListMusic icon
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function ReleasesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect unauthenticated users
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  // Show loading indicator
  if (loading || !user) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-transparent">
      <main className="relative z-10 flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        {/* Header Card */}
        <Card className="mb-4 sm:mb-8 bg-card/80 dark:bg-card/70 shadow-lg rounded-lg border-border/30"> {/* Removed backdrop-blur-md */}
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/" passHref legacyBehavior>
                 {/* Use lg size and adjust padding */}
                <Button variant="ghost" size="lg" className="h-12 w-12 text-primary hover:bg-primary/10 active:bg-primary/20 p-0" aria-label="Go to Home">
                  <Home className="h-7 w-7" /> {/* Ensure icon size fits */}
                </Button>
              </Link>
              <ListMusic className="h-8 w-8 text-primary hidden sm:block" />
              <div className="text-center sm:text-left">
                <CardTitle className="text-xl sm:text-3xl font-bold tracking-tight text-primary text-center sm:text-left">
                  Release Management
                </CardTitle>
                <CardDescription className="text-muted-foreground text-xs sm:text-sm text-center sm:text-left">
                  View, upload, edit, or remove your music releases.
                </CardDescription>
              </div>
            </div>
            <UserProfile />
          </CardHeader>
        </Card>

        {/* Release List Component */}
        <ReleaseList className="bg-card/80 dark:bg-card/70 border-border/30" /> {/* Removed backdrop-blur-md */}

      </main>
    </div>
  );
}

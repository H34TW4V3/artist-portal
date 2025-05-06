"use client";

import type { ProfileFormValues } from "@/components/profile/profile-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, Phone, Info, UserCircle2 } from "lucide-react";
import { Skeleton } from "../ui/skeleton";

interface ArtistProfileDisplayProps {
  artistProfile: ProfileFormValues | null | undefined; // Undefined for loading state
}

export function ArtistProfileDisplay({ artistProfile }: ArtistProfileDisplayProps) {
  const getInitials = (name: string | undefined | null): string => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'A';
  };

  if (artistProfile === undefined) { // Loading state
    return (
      <Card className="bg-card/60 dark:bg-card/50 shadow-md rounded-lg border-border/30">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (!artistProfile) {
    return (
      <Card className="bg-card/60 dark:bg-card/50 shadow-md rounded-lg border-border/30 min-h-[200px] flex flex-col items-center justify-center">
        <CardContent className="text-center p-6">
            <UserCircle2 className="h-16 w-16 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Artist profile not available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/60 dark:bg-card/50 shadow-md rounded-lg border-border/30">
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-primary/40">
            <AvatarImage src={artistProfile.imageUrl || undefined} alt={artistProfile.name} />
            <AvatarFallback className="text-2xl bg-muted text-muted-foreground">
              {getInitials(artistProfile.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-xl font-semibold text-primary">{artistProfile.name}</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">Artist Profile</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-2">
        {artistProfile.email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground">{artistProfile.email}</span>
          </div>
        )}
        {artistProfile.phoneNumber && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground">{artistProfile.phoneNumber}</span>
          </div>
        )}
        {artistProfile.bio && (
          <div className="flex items-start gap-2 text-sm">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-muted-foreground italic">{artistProfile.bio}</p>
          </div>
        )}
         {!artistProfile.email && !artistProfile.phoneNumber && !artistProfile.bio && (
             <p className="text-sm text-muted-foreground">No additional profile details available.</p>
         )}
      </CardContent>
    </Card>
  );
}


"use client";

import type { NextPage } from 'next';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Home, Users, Briefcase, Loader2, Edit3, UserCircle2, UserPlus } from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import UserProfile from '@/components/common/user-profile';
import { TimeWeather } from '@/components/common/time-weather';
import { SplashScreen } from '@/components/common/splash-screen';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import type { ProfileFormValues } from '@/components/profile/profile-form';
import { getUserProfileByUid, createNewArtistAndUser } from '@/services/user'; // Added createNewArtistAndUser
import type { ManagedArtist } from '@/services/artists'; 
import { getManagedArtists } from '@/services/artists'; 
import { ArtistTable } from '@/components/my-artists/artist-table'; 
import { ArtistProfileDisplay } from '@/components/my-artists/artist-profile-display'; 
import { ArtistReleaseList } from '@/components/my-artists/artist-release-list'; 
import { useToast } from '@/hooks/use-toast';
import { CreateArtistModal } from '@/components/dashboard/create-artist-modal'; 

const MyArtistsPage: NextPage = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [profileData, setProfileData] = useState<ProfileFormValues | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [managedArtists, setManagedArtists] = useState<ManagedArtist[]>([]);
  const [selectedArtist, setSelectedArtist] = useState<ManagedArtist | null>(null);
  const [selectedArtistProfile, setSelectedArtistProfile] = useState<ProfileFormValues | null | undefined>(undefined); // Init as undefined for loading
  const [isLoadingArtists, setIsLoadingArtists] = useState(true);
  const [isCreateArtistModalOpen, setIsCreateArtistModalOpen] = useState(false);

  // Fetch current user's profile to check if they are a label
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (authLoading || !user?.uid) {
        setProfileLoading(false);
        setProfileData(null);
        return;
      }
      setProfileLoading(true);
      try {
        const fetchedProfile = await getUserProfileByUid(user.uid);
        setProfileData(fetchedProfile);
        if (fetchedProfile && !fetchedProfile.isLabel) {
          toast({ title: "Access Denied", description: "This page is for label accounts only.", variant: "destructive", duration: 3000 });
          router.replace('/'); // Redirect if not a label
        }
      } catch (error) {
        console.error("Error fetching user profile for My Artists page:", error);
        toast({ title: "Profile Error", description: "Could not load your profile.", variant: "destructive", duration: 3000 });
        router.replace('/');
      } finally {
        setProfileLoading(false);
      }
    };
    fetchUserProfile();
  }, [user, authLoading, router, toast]);

  // Fetch managed artists if the user is a label
  useEffect(() => {
    const fetchArtists = async () => {
      if (user?.uid && profileData?.isLabel) {
        setIsLoadingArtists(true);
        try {
          const artists = await getManagedArtists(user.uid);
          setManagedArtists(artists);
        } catch (error) {
          console.error("Error fetching managed artists:", error);
          toast({ title: "Error", description: "Could not fetch managed artists.", variant: "destructive", duration: 3000 });
          setManagedArtists([]);
        } finally {
          setIsLoadingArtists(false);
        }
      } else if (profileData && !profileData.isLabel) {
        setIsLoadingArtists(false); // Not a label, so no artists to load
        setManagedArtists([]);
      }
    };

    if (!profileLoading && profileData) { // Only fetch artists after profile check is done and profileData is available
        fetchArtists();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profileData, toast]); // Removed profileLoading

  // Fetch selected artist's profile
  useEffect(() => {
    const fetchArtistProfileDetails = async () => {
      if (selectedArtist?.id) {
        setSelectedArtistProfile(undefined); // Set to undefined to show loading state
        try {
          const artistProfile = await getUserProfileByUid(selectedArtist.id);
          setSelectedArtistProfile(artistProfile);
        } catch (error) {
          console.error("Error fetching selected artist's profile:", error);
          toast({ title: "Error", description: "Could not load artist's profile details.", variant: "destructive", duration: 3000 });
          setSelectedArtistProfile(null);
        }
      } else {
        setSelectedArtistProfile(null); // Clear if no artist is selected
      }
    };
    fetchArtistProfileDetails();
  }, [selectedArtist, toast]);


  if (authLoading || profileLoading) {
    return <SplashScreen loadingText="Loading My Artists..." appletIcon={<Users />} />;
  }

  if (!user) { 
    router.replace('/login');
    return <SplashScreen loadingText="Redirecting to login..." appletIcon={<Users />} />;
  }

  if (!profileData?.isLabel) {
    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-transparent p-4">
            <Card className="max-w-md text-center">
                <CardHeader>
                    <CardTitle className="text-destructive">Access Denied</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>This page is for label accounts only.</p>
                    <Button onClick={() => router.push('/')} className="mt-4">Go to Home</Button>
                </CardContent>
            </Card>
        </div>
    );
  }

  const handleArtistSelect = (artist: ManagedArtist) => {
    setSelectedArtist(artist);
  };
  
  const handleRefreshArtists = async () => {
      if (user?.uid && profileData?.isLabel) {
        setIsLoadingArtists(true);
        try {
          const artists = await getManagedArtists(user.uid);
          setManagedArtists(artists);
          toast({ title: "Roster Refreshed", description: "Artist list updated.", duration: 2000 });
        } catch (error) {
          console.error("Error refreshing managed artists:", error);
          toast({ title: "Error", description: "Could not refresh artist list.", variant: "destructive", duration: 3000 });
        } finally {
          setIsLoadingArtists(false);
        }
      }
  };


  return (
    <div className="flex min-h-screen w-full flex-col bg-transparent">
      <main className="relative z-10 flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Card className="mb-4 sm:mb-8 bg-card/60 dark:bg-card/50 shadow-lg rounded-lg border-border/30">
          <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="lg" className="h-12 w-12 text-primary hover:bg-primary/10 active:bg-primary/20 p-0" aria-label="Go to Home">
                  <Home className="h-7 w-7" />
                </Button>
              </Link>
              <Users className="h-8 w-8 text-primary hidden sm:block" />
              <div className="text-center sm:text-left">
                <CardTitle className="text-xl sm:text-3xl font-bold tracking-tight text-primary text-center sm:text-left">
                  My Artists
                </CardTitle>
                <CardDescription className="text-muted-foreground text-xs sm:text-sm text-center sm:text-left">
                  Manage your roster of artists, their profiles, and releases.
                </CardDescription>
              </div>
            </div>
            <div className="flex-shrink-0 ml-auto hidden md:flex">
              <TimeWeather />
            </div>
            <div className="flex-shrink-0">
              <UserProfile />
            </div>
            <div className="w-full md:hidden mt-2">
              <TimeWeather />
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Artist Table and Add Artist Button */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <Card className="bg-card/60 dark:bg-card/50 shadow-md rounded-lg border-border/30">
              <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle className="text-lg font-semibold">Artist Roster</CardTitle>
                <Button size="sm" onClick={() => setIsCreateArtistModalOpen(true)} disabled={!profileData?.isLabel}>
                    <UserPlus className="mr-2 h-4 w-4"/> Add Artist
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingArtists ? (
                  <div className="flex justify-center items-center h-32">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <ArtistTable artists={managedArtists} onSelectArtist={handleArtistSelect} selectedArtistId={selectedArtist?.id} isLoading={isLoadingArtists} />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Selected Artist Details */}
          <div className="lg:col-span-2 space-y-6">
            {selectedArtist ? (
              <>
                <ArtistProfileDisplay artistProfile={selectedArtistProfile} />
                {selectedArtistProfile !== undefined && selectedArtistProfile !== null && (
                  <ArtistReleaseList artistId={selectedArtist.id} artistName={selectedArtist.name} />
                )}
              </>
            ) : (
              <Card className="bg-card/60 dark:bg-card/50 shadow-md rounded-lg border-border/30 min-h-[400px] flex flex-col items-center justify-center text-center">
                <CardContent className="p-6">
                    <UserCircle2 className="h-20 w-20 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium text-foreground">Select an Artist</p>
                    <p className="text-muted-foreground text-sm">
                        Click on an artist from the roster to view their details and manage their releases.
                    </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        
        <CreateArtistModal
            isOpen={isCreateArtistModalOpen}
            onClose={() => setIsCreateArtistModalOpen(false)}
            // The createNewArtistAndUser function in user.ts now handles creating the user and profile
            // This modal's onSuccess should just refresh the list
            onSuccess={(newArtistName) => {
                toast({ title: "Artist Profile Created", description: `Successfully created profile for ${newArtistName}.`, duration: 3000 });
                setIsCreateArtistModalOpen(false);
                handleRefreshArtists(); 
            }}
        />
      </main>
    </div>
  );
};

export default MyArtistsPage;


"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Loader2, Edit3, PlusCircle } from "lucide-react";
import { Timestamp } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { ManageReleaseModal } from '@/components/dashboard/manage-release-modal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ReleaseWithId } from '@/services/music-platform';
import { getReleasesForArtist, removeRelease } from '@/services/music-platform-server-actions'; // Will create server actions
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
// Modals for adding releases will be specific to the selected artist
import { UploadReleaseModal } from '@/components/dashboard/upload-release-modal'; // Re-use, but pass artistId
import { AddExistingReleaseModal } from '@/components/dashboard/add-existing-release-modal'; // Re-use, pass artistId


interface ArtistReleaseListProps {
  artistId: string;
  artistName: string; // To pre-fill artist name in modals
  className?: string;
}

export function ArtistReleaseList({ artistId, artistName, className }: ArtistReleaseListProps) {
  const [releases, setReleases] = useState<ReleaseWithId[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRelease, setSelectedRelease] = useState<ReleaseWithId | null>(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAddExistingModalOpen, setIsAddExistingModalOpen] = useState(false);
  const { toast } = useToast();
  const placeholderArtwork = "https://picsum.photos/seed/placeholder/50/50";

  const fetchArtistReleases = async () => {
    if (!artistId) {
      setReleases([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const fetchedReleases = await getReleasesForArtist(artistId);
      setReleases(fetchedReleases);
    } catch (error) {
      console.error(`Error fetching releases for artist ${artistId}:`, error);
      toast({
        title: "Error Loading Releases",
        description: "Could not load releases for this artist.",
        variant: "destructive",
      });
      setReleases([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchArtistReleases();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artistId]);

  const handleRowClick = (release: ReleaseWithId) => {
    setSelectedRelease(release);
    setIsManageModalOpen(true);
  };

  const handleManageDialogClose = () => {
    setIsManageModalOpen(false);
    setSelectedRelease(null);
  };

  const handleSuccess = async () => {
    setIsManageModalOpen(false);
    setIsUploadModalOpen(false);
    setIsAddExistingModalOpen(false);
    setSelectedRelease(null);
    await fetchArtistReleases(); // Refresh list
  };
  
  const handleTakedownSuccess = async () => {
    await fetchArtistReleases(); // Refresh list after takedown/cancellation
  }


  const formatDate = (dateValue: string | Date | Timestamp | undefined): string => {
    if (!dateValue) return '-';
    try {
        let date: Date;
        if (dateValue instanceof Timestamp) date = dateValue.toDate();
        else if (typeof dateValue === 'string') date = new Date(dateValue.includes('T') ? dateValue : dateValue.replace(/-/g, '/')); // Handle YYYY-MM-DD
        else date = dateValue as Date;
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) { return '-'; }
  };


  return (
    <>
      <Card className={cn("shadow-md rounded-lg bg-card/60 dark:bg-card/50", className)}>
        <CardHeader className="flex flex-row justify-between items-center gap-4 flex-wrap">
          <div>
            <CardTitle className="text-xl font-semibold text-primary">Releases for {artistName}</CardTitle>
            <CardDescription className="text-muted-foreground">View or manage this artist's releases.</CardDescription>
          </div>
           <div className="flex gap-2 ml-auto">
                <Button onClick={() => setIsUploadModalOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
                    <PlusCircle className="mr-2 h-4 w-4" /> Upload New
                </Button>
                <Button onClick={() => setIsAddExistingModalOpen(true)} variant="outline">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Existing
                </Button>
           </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-border/50">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 dark:bg-muted/10 hover:bg-muted/50 dark:hover:bg-muted/20">
                  <TableHead className="w-[64px] hidden sm:table-cell p-2">Artwork</TableHead>
                  <TableHead className="p-2">Title</TableHead>
                  <TableHead className="hidden md:table-cell p-2">Release Date</TableHead>
                  <TableHead className="hidden md:table-cell p-2">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 2 }).map((_, index) => (
                    <TableRow key={`skel-release-${index}`} className="border-b border-border/30">
                      <TableCell className="hidden sm:table-cell p-2"><Skeleton className="h-12 w-12 rounded-md bg-muted/50" /></TableCell>
                      <TableCell className="p-2"><Skeleton className="h-4 w-3/4 bg-muted/50" /></TableCell>
                      <TableCell className="hidden md:table-cell p-2"><Skeleton className="h-4 w-20 bg-muted/50" /></TableCell>
                      <TableCell className="hidden md:table-cell p-2"><Skeleton className="h-4 w-20 bg-muted/50" /></TableCell>
                    </TableRow>
                  ))
                ) : releases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No releases found for this artist.
                    </TableCell>
                  </TableRow>
                ) : (
                  releases.map((release) => (
                    <TableRow
                      key={release.id}
                      className="hover:bg-muted/50 dark:hover:bg-muted/20 transition-colors border-b border-border/30 last:border-b-0 cursor-pointer"
                      onClick={() => handleRowClick(release)}
                    >
                      <TableCell className="hidden sm:table-cell p-2 align-middle">
                        <Image
                          alt={`${release.title} Artwork`}
                          className="aspect-square rounded-md object-cover border border-border/50"
                          height={48}
                          src={release.artworkUrl || placeholderArtwork}
                          width={48}
                          onError={(e) => { (e.target as HTMLImageElement).srcset = placeholderArtwork; (e.target as HTMLImageElement).src = placeholderArtwork; }}
                          data-ai-hint="album artwork cover"
                        />
                      </TableCell>
                      <TableCell className="font-medium text-foreground p-2 align-middle">{release.title}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground p-2 align-middle">
                        {formatDate(release.releaseDate || release.createdAt)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground p-2 align-middle">
                        <span className={cn(
                          "px-2 py-1 text-xs font-medium rounded-full",
                          release.status === "completed" && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
                          release.status === "processing" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
                          release.status === "failed" && "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
                          release.status === "takedown_requested" && "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
                          release.status === "existing" && "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
                          !release.status && "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                        )}>
                          {release.status ? release.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Unknown'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ManageReleaseModal
        isOpen={isManageModalOpen}
        onClose={handleManageDialogClose}
        releaseData={selectedRelease}
        onSuccess={handleSuccess}
        onTakedownSuccess={handleTakedownSuccess}
      />
       {/* TODO: For these modals, we need to pass artistId and artistName for pre-filling */}
       <UploadReleaseModal
         isOpen={isUploadModalOpen}
         onClose={() => setIsUploadModalOpen(false)}
         onSuccess={handleSuccess}
         // Pass artistId and artistName if UploadReleaseModal is adapted
         // initialArtistId={artistId}
         // initialPrimaryArtistName={artistName}
       />
       <AddExistingReleaseModal
         isOpen={isAddExistingModalOpen}
         onClose={() => setIsAddExistingModalOpen(false)}
         onSuccess={handleSuccess}
         // Pass artistId and artistName if AddExistingReleaseModal is adapted
         // initialArtistId={artistId}
         // initialPrimaryArtistName={artistName}
       />
    </>
  );
}

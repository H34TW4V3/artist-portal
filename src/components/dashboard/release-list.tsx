
"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
// Removed MoreHorizontal, Edit, Trash2 from lucide-react imports
import { Loader2, UploadCloud, PlusCircle } from "lucide-react";
import { Timestamp } from "firebase/firestore"; // Import Timestamp

import { Button } from "@/components/ui/button";
// Removed DropdownMenu related imports
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
// Import ManageReleaseModal instead of the generic Dialog
import { ManageReleaseModal } from './manage-release-modal'; // Import the new modal
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// Removed ReleaseForm import as it's likely inside ManageReleaseModal now
import { UploadReleaseModal } from './upload-release-modal'; // Import the upload modal
import { AddExistingReleaseModal } from './add-existing-release-modal'; // Import add existing modal
import type { ReleaseWithId, ReleaseMetadata } from '@/services/music-platform'; // Import types
import { removeRelease, getReleases } from '@/services/music-platform'; // Import the Firestore functions
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context'; // Import useAuth
// Import Table components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu'; // Keep Dropdown for Add Release button

interface ReleaseListProps {
  className?: string;
}

export function ReleaseList({ className }: ReleaseListProps) {
  const { user } = useAuth(); // Get user for conditional rendering/fetching
  const [releases, setReleases] = useState<ReleaseWithId[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRelease, setSelectedRelease] = useState<ReleaseWithId | null>(null); // Changed from editingRelease
  const [isManageModalOpen, setIsManageModalOpen] = useState(false); // Changed from isEditDialogOpen
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAddExistingModalOpen, setIsAddExistingModalOpen] = useState(false); // State for new modal
  // Removed deletingReleaseId and isPerformingAction states related to old dropdown delete
  const { toast } = useToast();
  const placeholderArtwork = "/placeholder-artwork.png"; // Define placeholder path

  // Fetch releases function using the service
  const fetchReleases = async () => {
    if (!user) {
        setIsLoading(false); // No user, stop loading
        setReleases([]);    // Clear releases
        return;
    }
    setIsLoading(true);
    try {
      const fetchedReleases = await getReleases(); // Call the Firestore service function
      setReleases(fetchedReleases);
    } catch (error) {
      console.error("Error fetching releases:", error);
      toast({
        title: "Error Fetching Releases",
        description: error instanceof Error ? error.message : "Could not load your releases.",
        variant: "destructive",
      });
      setReleases([]); // Clear releases on error
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch releases on component mount and when user changes
  useEffect(() => {
    fetchReleases();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Refetch if user logs in/out


  // Handle opening the manage modal when a row is clicked
  const handleRowClick = (release: ReleaseWithId, e: React.MouseEvent) => {
     // Prevent modal open if clicking inside the dropdown trigger/content area (only applies to Add Release now)
     const targetElement = e.target as Element;
     if (targetElement.closest('[data-radix-dropdown-menu-trigger], [data-radix-dropdown-menu-content]')) {
        return;
     }
    setSelectedRelease(release);
    setIsManageModalOpen(true);
  };

  const handleManageDialogClose = () => {
      setIsManageModalOpen(false);
      setSelectedRelease(null); // Clear selected state when dialog closes
  }

  // Callback for successful edit/upload/add existing from respective forms/modals
  // This function IS called by the modals on success and triggers a data refresh.
  const handleSuccess = async () => {
      setIsManageModalOpen(false); // Close manage dialog if open
      setIsUploadModalOpen(false); // Close upload modal if open
      setIsAddExistingModalOpen(false); // Close add existing modal if open
      setSelectedRelease(null); // Clear selection regardless
      console.log("handleSuccess called, fetching releases..."); // Add log
      await fetchReleases(); // Refetch the list to show the newly added/updated release
  }


  // handleDeleteConfirm is now handled within ManageReleaseModal

  // Format date for display
  const formatDate = (dateValue: string | Date | Timestamp | undefined): string => {
    if (!dateValue) return '-';
    try {
        let date: Date;
        if (dateValue instanceof Timestamp) {
            date = dateValue.toDate();
        } else if (typeof dateValue === 'string') {
             // For "YYYY-MM-DD" strings, ensure UTC interpretation for consistency
             if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
                  const [year, month, day] = dateValue.split('-').map(Number);
                  date = new Date(Date.UTC(year, month - 1, day));
             } else {
                  // Fallback for other string formats or ISO strings with timezones
                  date = new Date(dateValue);
             }
        } else { // It's already a Date object
             date = dateValue;
        }

        if (isNaN(date.getTime())) return 'Invalid Date';

        // Format date using UTC values if the input was a YYYY-MM-DD string, otherwise use local.
        // This aims to display the intended date correctly regardless of user's local timezone for YYYY-MM-DD.
        if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                timeZone: 'UTC' // Explicitly use UTC for YYYY-MM-DD strings
            });
        }
        // For Timestamps or full Date objects, use local formatting
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (e) {
        console.error("Error formatting date:", dateValue, e);
        return '-';
    }
  };


  // Main view: Release List Table
  return (
    <>
    <Card className={cn("col-span-1 lg:col-span-2 shadow-md rounded-lg bg-card/60 dark:bg-card/50", className)}>
        <CardHeader className="flex flex-row justify-between items-center gap-4 flex-wrap">
            <div>
                <CardTitle className="text-xl font-semibold text-primary">Manage Releases</CardTitle>
                <CardDescription className="text-muted-foreground">View or edit your releases.</CardDescription> {/* Updated description */}
            </div>
             {user && (
                 <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                         <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md ml-auto">
                             <PlusCircle className="mr-2 h-4 w-4" /> Add Release
                         </Button>
                     </DropdownMenuTrigger>
                     <DropdownMenuContent align="end" className="bg-popover border-border">
                         <DropdownMenuItem onClick={() => setIsUploadModalOpen(true)} className="cursor-pointer focus:bg-accent focus:text-accent-foreground">
                             <UploadCloud className="mr-2 h-4 w-4" />
                             <span>Upload New Release</span>
                         </DropdownMenuItem>
                         <DropdownMenuItem onClick={() => setIsAddExistingModalOpen(true)} className="cursor-pointer focus:bg-accent focus:text-accent-foreground">
                             <PlusCircle className="mr-2 h-4 w-4" />
                             <span>Add Existing Release</span>
                         </DropdownMenuItem>
                     </DropdownMenuContent>
                 </DropdownMenu>
              )}
        </CardHeader>
        <CardContent>
             {!user && (
                 <div className="text-center py-10 text-muted-foreground">
                     Please log in to manage your releases.
                 </div>
             )}
            {user && (
             <div className="overflow-x-auto rounded-md border border-border/50">
                <Table>
                <TableHeader>
                    <TableRow className="bg-muted/30 dark:bg-muted/10 hover:bg-muted/50 dark:hover:bg-muted/20">
                    <TableHead className="w-[64px] hidden sm:table-cell p-2">
                        Artwork
                    </TableHead>
                    <TableHead className="p-2">Title</TableHead>
                    <TableHead className="hidden md:table-cell p-2">Artist</TableHead>
                    <TableHead className="hidden md:table-cell p-2">Release Date</TableHead>
                    <TableHead className="hidden md:table-cell p-2">Status</TableHead>
                    {/* Removed Actions column header */}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        Array.from({ length: 3 }).map((_, index) => (
                            <TableRow key={`skeleton-${index}`} className="border-b border-border/30">
                                <TableCell className="hidden sm:table-cell p-2">
                                    <Skeleton className="h-12 w-12 rounded-md bg-muted/50" />
                                </TableCell>
                                <TableCell className="p-2"><Skeleton className="h-4 w-3/4 bg-muted/50" /></TableCell>
                                <TableCell className="hidden md:table-cell p-2"><Skeleton className="h-4 w-1/2 bg-muted/50" /></TableCell>
                                <TableCell className="hidden md:table-cell p-2"><Skeleton className="h-4 w-20 bg-muted/50" /></TableCell>
                                <TableCell className="hidden md:table-cell p-2"><Skeleton className="h-4 w-20 bg-muted/50" /></TableCell>
                            </TableRow>
                        ))
                    ) : releases.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                No releases found yet. Click "Add Release" to get started!
                            </TableCell>
                        </TableRow>
                    ) : (
                        releases.map((release) => (
                            // Added cursor-pointer and onClick handler to the row
                            <TableRow
                                key={release.id}
                                className="hover:bg-muted/50 dark:hover:bg-muted/20 transition-colors border-b border-border/30 last:border-b-0 cursor-pointer"
                                onClick={(e) => handleRowClick(release, e)}
                            >
                                <TableCell className="hidden sm:table-cell p-2 align-middle">
                                    <Image
                                        alt={`${release.title} Artwork`}
                                        className="aspect-square rounded-md object-cover border border-border/50"
                                        height={48}
                                        src={release.artworkUrl || placeholderArtwork}
                                        width={48}
                                        onError={(e) => { e.currentTarget.src = placeholderArtwork; e.currentTarget.srcset = ""; }}
                                         data-ai-hint="album artwork cover"
                                    />
                                </TableCell>
                                <TableCell className="font-medium text-foreground p-2 align-middle">{release.title}</TableCell>
                                <TableCell className="hidden md:table-cell text-muted-foreground p-2 align-middle">{release.artist}</TableCell>
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
             )}
        </CardContent>
    </Card>

    {/* Manage Release Modal */}
     <ManageReleaseModal
         isOpen={isManageModalOpen}
         onClose={handleManageDialogClose}
         releaseData={selectedRelease} // Pass the selected release data
         onSuccess={handleSuccess} // Re-use the success handler
         // Pass fetchReleases to refresh list after takedown
         onTakedownSuccess={fetchReleases}
     />

     {/* Upload New Release Modal */}
     <UploadReleaseModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={handleSuccess} // Use the same handler to refresh the list
     />

      {/* Add Existing Release Modal */}
      <AddExistingReleaseModal
          isOpen={isAddExistingModalOpen}
          onClose={() => setIsAddExistingModalOpen(false)}
          onSuccess={handleSuccess} // Use the same handler to refresh the list
      />
    </>
  );
}


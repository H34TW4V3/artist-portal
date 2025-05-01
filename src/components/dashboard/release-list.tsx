
"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { MoreHorizontal, Edit, Trash2, Loader2, UploadCloud } from "lucide-react"; // Changed PlusCircle to UploadCloud
import { Timestamp } from "firebase/firestore"; // Import Timestamp

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"; // Removed DialogClose as it's implicit
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ReleaseForm } from './release-form'; // For editing
import { UploadReleaseModal } from './upload-release-modal'; // Import the new upload modal
import type { ReleaseWithId, ReleaseMetadata } from '@/services/music-platform'; // Import types
import { removeRelease, getReleases } from '@/services/music-platform'; // Import the Firestore functions
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context'; // Import useAuth

interface ReleaseListProps {
  className?: string;
}

export function ReleaseList({ className }: ReleaseListProps) {
  const { user } = useAuth(); // Get user for conditional rendering/fetching
  const [releases, setReleases] = useState<ReleaseWithId[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingRelease, setEditingRelease] = useState<ReleaseWithId | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [deletingReleaseId, setDeletingReleaseId] = useState<string | null>(null);
  const [isPerformingAction, setIsPerformingAction] = useState<string | null>(null);
  const { toast } = useToast();

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


  const handleEdit = (release: ReleaseWithId) => {
    setEditingRelease(release);
    setIsEditDialogOpen(true); // Open the edit dialog
  };

  const handleEditDialogClose = (open: boolean) => {
      setIsEditDialogOpen(open);
      if (!open) {
          setEditingRelease(null); // Clear editing state when dialog closes
      }
  }

  // Callback for successful edit/upload from respective forms/modals
  const handleSuccess = async () => {
      setIsEditDialogOpen(false); // Close edit dialog
      setIsUploadModalOpen(false); // Close upload modal
      setEditingRelease(null);
      await fetchReleases(); // Refetch the list
  }


  const handleDeleteConfirm = async (releaseId: string) => {
    setIsPerformingAction(releaseId); // Indicate action started
    try {
        await removeRelease(releaseId); // Call Firestore service function
        // Update state *after* successful deletion
        // No need to manually filter, fetchReleases will get the updated list
        toast({
            title: "Release Removed",
            description: "The release has been successfully removed.",
            variant: "default", // Use default for theme adaptation
        });
        await fetchReleases(); // Refetch to update the list

    } catch (error) {
        console.error("Error removing release:", error);
        toast({
            title: "Removal Failed",
            description: error instanceof Error ? error.message : "Could not remove the release.",
            variant: "destructive",
        });
    } finally {
        setDeletingReleaseId(null); // Close confirmation dialog
        setIsPerformingAction(null); // Indicate action finished
    }
  };

  // Format date for display (handles string YYYY-MM-DD or Firestore Timestamp)
  const formatDate = (dateValue: string | Date | Timestamp | undefined): string => {
    if (!dateValue) return '-';
    try {
        let date: Date;
        if (dateValue instanceof Timestamp) {
            date = dateValue.toDate(); // Convert Firestore Timestamp to Date
        } else if (typeof dateValue === 'string') {
             // Assume 'YYYY-MM-DD' format, parse as UTC date part
             const parts = dateValue.split('-');
             if (parts.length === 3) {
                  // Create date ensuring it's treated as UTC midnight
                  date = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
             } else {
                  // Fallback attempt (might be inaccurate depending on string format)
                  date = new Date(dateValue);
             }
        } else {
             date = dateValue; // Already a Date object
        }


        // Check if the date is valid after parsing/conversion
        if (isNaN(date.getTime())) {
            console.warn("Invalid date encountered:", dateValue);
            return '-';
        }

        // Format using US locale, explicitly using UTC to avoid timezone shifts
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            timeZone: 'UTC' // Display the date as it was intended in UTC
        });
    } catch (e) {
        console.error("Error formatting date:", dateValue, e);
        return '-'; // Handle invalid date formats gracefully
    }
  };


  // Main view: Release List Table
  return (
    <>
    {/* Adjust background/opacity for dark mode */}
    <Card className={cn("col-span-1 lg:col-span-2 shadow-md rounded-lg bg-card/60 dark:bg-card/50", className)}> {/* Adjusted opacity */}
        <CardHeader className="flex flex-row justify-between items-center gap-4 flex-wrap">
            <div>
                <CardTitle className="text-xl font-semibold text-primary">Manage Releases</CardTitle>
                <CardDescription className="text-muted-foreground">View, edit, or remove your existing releases.</CardDescription>
            </div>
             {/* "Upload New Release" button to trigger the modal */}
             {user && ( // Only show upload button if logged in
                <Button onClick={() => setIsUploadModalOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md ml-auto">
                    <UploadCloud className="mr-2 h-4 w-4" /> Upload New Release
                </Button>
              )}
        </CardHeader>
        <CardContent>
             {!user && ( // Show message if not logged in
                 <div className="text-center py-10 text-muted-foreground">
                     Please log in to manage your releases.
                 </div>
             )}
            {user && ( // Only show table if logged in
             <div className="overflow-x-auto rounded-md border border-border/50"> {/* Add border around table */}
                <Table>
                <TableHeader>
                    <TableRow className="bg-muted/30 dark:bg-muted/10 hover:bg-muted/50 dark:hover:bg-muted/20"> {/* Subtle header background */}
                    <TableHead className="w-[64px] hidden sm:table-cell p-2"> {/* Adjusted padding */}
                        Artwork
                    </TableHead>
                    <TableHead className="p-2">Title</TableHead>
                    {/* Removed Artist Header */}
                    <TableHead className="hidden md:table-cell p-2">Release Date</TableHead>
                    <TableHead className="text-right p-2">
                        Actions
                    </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        // Loading Skeletons
                        Array.from({ length: 3 }).map((_, index) => (
                            <TableRow key={`skeleton-${index}`} className="border-b border-border/30">
                                <TableCell className="hidden sm:table-cell p-2">
                                    {/* Skeleton size matches Image size (h-12 w-12 = 48x48) */}
                                    <Skeleton className="h-12 w-12 rounded-md bg-muted/50" />
                                </TableCell>
                                <TableCell className="p-2"><Skeleton className="h-4 w-3/4 bg-muted/50" /></TableCell>
                                {/* Removed Artist Skeleton */}
                                <TableCell className="hidden md:table-cell p-2"><Skeleton className="h-4 w-20 bg-muted/50" /></TableCell>
                                <TableCell className="text-right p-2">
                                    <Skeleton className="h-8 w-8 rounded-md ml-auto bg-muted/50" />
                                </TableCell>
                            </TableRow>
                        ))
                    ) : releases.length === 0 ? (
                        // No releases message
                        <TableRow>
                            {/* Adjusted colspan */}
                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                No releases found yet. Click "Upload New Release" to add your first one!
                            </TableCell>
                        </TableRow>
                    ) : (
                        // Actual releases data
                        releases.map((release) => (
                            <TableRow key={release.id} className="hover:bg-muted/50 dark:hover:bg-muted/20 transition-colors border-b border-border/30 last:border-b-0">
                                <TableCell className="hidden sm:table-cell p-2 align-middle">
                                     {/* Use a consistent placeholder or the actual URL */}
                                    <Image
                                        alt={`${release.title} Artwork`}
                                        className="aspect-square rounded-md object-cover border border-border/50"
                                        height={48}
                                        // Provide a more stable placeholder if needed, or handle potential 404s from picsum
                                        // Use placeholder if artworkUrl is empty or missing
                                        src={release.artworkUrl || '/placeholder-artwork.png'} // Example: local placeholder
                                        width={48}
                                        onError={(e) => {
                                            // Optionally handle image loading errors, e.g., set to placeholder
                                            e.currentTarget.src = '/placeholder-artwork.png';
                                        }}
                                        // unoptimized // Consider removing if URLs are stable
                                    />
                                </TableCell>
                                <TableCell className="font-medium text-foreground p-2 align-middle">{release.title}</TableCell>
                                {/* Removed Artist Cell */}
                                <TableCell className="hidden md:table-cell text-muted-foreground p-2 align-middle">
                                  {formatDate(release.releaseDate || release.createdAt)} {/* Use releaseDate, fallback to createdAt */}
                                </TableCell>
                                <TableCell className="text-right p-2 align-middle">
                                    <AlertDialog open={deletingReleaseId === release.id} onOpenChange={(open) => !open && setDeletingReleaseId(null)}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                            <Button aria-haspopup="true" size="icon" variant="ghost" disabled={isPerformingAction === release.id} className="h-8 w-8 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground">
                                                {isPerformingAction === release.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                                                <span className="sr-only">Toggle menu</span>
                                            </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-popover border-border">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => handleEdit(release)} className="cursor-pointer focus:bg-accent focus:text-accent-foreground">
                                                <Edit className="mr-2 h-4 w-4" />
                                                <span>Edit Metadata</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator className="bg-border/50" />
                                            <DropdownMenuItem
                                                onClick={() => setDeletingReleaseId(release.id)}
                                                className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                                             >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                <span>Delete</span>
                                            </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        {/* Delete Confirmation Dialog */}
                                        <AlertDialogContent className="bg-card/85 dark:bg-card/70 border-border"> {/* Adjusted opacity */}
                                            <AlertDialogHeader>
                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                            <AlertDialogDescription className="text-muted-foreground">
                                                This action cannot be undone. This will permanently remove the release
                                                &quot;{releases.find(r => r.id === deletingReleaseId)?.title}&quot; and its associated data from the platform.
                                            </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                            <AlertDialogCancel disabled={isPerformingAction === release.id} className="border-input hover:bg-muted/50">Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => deletingReleaseId && handleDeleteConfirm(deletingReleaseId)}
                                                disabled={isPerformingAction === release.id}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                                {isPerformingAction === release.id ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                     <Trash2 className="mr-2 h-4 w-4" />
                                                )}
                                                {isPerformingAction === release.id ? 'Deleting...' : 'Confirm Delete'}
                                            </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
                </Table>
             </div>
             )} {/* End of user check for table */}
        </CardContent>
    </Card>

    {/* Edit Release Metadata Dialog */}
     <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogClose}>
         <DialogContent className="sm:max-w-[425px] md:max-w-lg lg:max-w-xl bg-card/85 dark:bg-card/70 border-border/50"> {/* Adjusted opacity */}
             <DialogHeader>
                <DialogTitle className="text-primary">Edit Release Metadata</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                    Make changes to the release details for &quot;{editingRelease?.title}&quot;. Note: Audio/Artwork cannot be changed here.
                </DialogDescription>
             </DialogHeader>
              {editingRelease && (
                 <ReleaseForm // Use the existing form for *editing metadata only*
                     key={editingRelease.id} // Ensure form remounts/resets for different releases
                     releaseId={editingRelease.id}
                     initialData={editingRelease}
                     onSuccess={handleSuccess} // Re-use the success handler
                     className="bg-transparent shadow-none border-0 p-0 mt-4" // Adjust styles for dialog
                 />
             )}
         </DialogContent>
     </Dialog>

     {/* Upload New Release Modal */}
     <UploadReleaseModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={handleSuccess} // Re-use the success handler to refresh list
     />
    </>
  );
}

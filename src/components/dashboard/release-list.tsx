
"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { MoreHorizontal, Edit, Trash2, Loader2, UploadCloud, PlusCircle } from "lucide-react"; // Kept Edit for modal title consistency maybe
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
  const [deletingReleaseId, setDeletingReleaseId] = useState<string | null>(null);
  const [isPerformingAction, setIsPerformingAction] = useState<string | null>(null);
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
     // Prevent modal open if clicking inside the dropdown trigger/content area
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
  const handleSuccess = async () => {
      setIsManageModalOpen(false); // Close manage dialog
      setIsUploadModalOpen(false); // Close upload modal
      setIsAddExistingModalOpen(false); // Close add existing modal
      setSelectedRelease(null);
      await fetchReleases(); // Refetch the list
  }


  const handleDeleteConfirm = async (releaseId: string) => {
    setIsPerformingAction(releaseId); // Indicate action started
    try {
        await removeRelease(releaseId); // Call Firestore service function
        toast({
            title: "Release Removed",
            description: "The release has been successfully removed.",
            variant: "default",
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

  // Format date for display
  const formatDate = (dateValue: string | Date | Timestamp | undefined): string => {
    if (!dateValue) return '-';
    try {
        let date: Date;
        if (dateValue instanceof Timestamp) {
            date = dateValue.toDate();
        } else if (typeof dateValue === 'string') {
             const parts = dateValue.split('-');
             if (parts.length === 3) {
                  date = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
             } else {
                  date = new Date(dateValue);
             }
        } else {
             date = dateValue;
        }
        if (isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            timeZone: 'UTC'
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
                <CardDescription className="text-muted-foreground">View, edit, or remove your releases.</CardDescription> {/* Updated description */}
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
                    <TableHead className="hidden md:table-cell p-2">Release Date</TableHead>
                    <TableHead className="text-right p-2">
                        Actions
                    </TableHead>
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
                                <TableCell className="hidden md:table-cell p-2"><Skeleton className="h-4 w-20 bg-muted/50" /></TableCell>
                                <TableCell className="text-right p-2">
                                    <Skeleton className="h-8 w-8 rounded-md ml-auto bg-muted/50" />
                                </TableCell>
                            </TableRow>
                        ))
                    ) : releases.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
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
                                <TableCell className="hidden md:table-cell text-muted-foreground p-2 align-middle">
                                  {formatDate(release.releaseDate || release.createdAt)}
                                </TableCell>
                                <TableCell className="text-right p-2 align-middle">
                                    {/* Actions Dropdown - Needs stopPropagation */}
                                    <AlertDialog open={deletingReleaseId === release.id} onOpenChange={(open) => !open && setDeletingReleaseId(null)}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                            {/* Added stopPropagation to button click */}
                                            <Button
                                                aria-haspopup="true"
                                                size="icon"
                                                variant="ghost"
                                                disabled={isPerformingAction === release.id}
                                                className="h-8 w-8 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground"
                                                onClick={(e) => e.stopPropagation()} // Stop row click
                                            >
                                                {isPerformingAction === release.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                                                <span className="sr-only">Toggle menu</span>
                                            </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-popover border-border">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            {/* Removed Edit Item - Row click handles opening manage modal now */}
                                            {/* <DropdownMenuItem onClick={() => handleEdit(release)} className="cursor-pointer focus:bg-accent focus:text-accent-foreground">
                                                <Edit className="mr-2 h-4 w-4" />
                                                <span>Edit Metadata</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator className="bg-border/50" /> */}
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
                                        <AlertDialogContent className="bg-card/85 dark:bg-card/70 border-border">
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
             )}
        </CardContent>
    </Card>

    {/* Manage Release Modal */}
     <ManageReleaseModal
         isOpen={isManageModalOpen}
         onClose={handleManageDialogClose}
         releaseData={selectedRelease} // Pass the selected release data
         onSuccess={handleSuccess} // Re-use the success handler
     />

     {/* Upload New Release Modal */}
     <UploadReleaseModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={handleSuccess}
     />

      {/* Add Existing Release Modal */}
      <AddExistingReleaseModal
          isOpen={isAddExistingModalOpen}
          onClose={() => setIsAddExistingModalOpen(false)}
          onSuccess={handleSuccess}
      />
    </>
  );
}

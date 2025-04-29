
"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { MoreHorizontal, Edit, Trash2, Loader2, PlusCircle } from "lucide-react"; // Added PlusCircle

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
  DialogDescription, // Make sure DialogDescription is imported
  DialogClose, // Import DialogClose
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ReleaseForm } from './release-form'; // Import ReleaseForm
import type { ReleaseMetadata } from '@/services/music-platform';
import { removeRelease, getReleases } from '@/services/music-platform'; // Import the functions
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton
import { cn } from '@/lib/utils';


// Type for release including ID
type ReleaseWithId = ReleaseMetadata & { id: string };

interface ReleaseListProps {
  className?: string;
}


export function ReleaseList({ className }: ReleaseListProps) {
  const [releases, setReleases] = useState<ReleaseWithId[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingRelease, setEditingRelease] = useState<ReleaseWithId | null>(null); // Track release being edited in dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deletingReleaseId, setDeletingReleaseId] = useState<string | null>(null); // Track which release is being confirmed for deletion
  const [isPerformingAction, setIsPerformingAction] = useState<string | null>(null); // Track ongoing delete action ID
  const { toast } = useToast();

    // Fetch releases function
  const fetchReleases = async () => {
    setIsLoading(true);
    try {
      const fetchedReleases = await getReleases();
      setReleases(fetchedReleases);
    } catch (error) {
      console.error("Error fetching releases:", error);
      toast({
        title: "Error Fetching Releases",
        description: "Could not load your releases. Please try again later.",
        variant: "destructive",
      });
      setReleases([]); // Clear releases on error
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch releases on component mount and when edit dialog closes successfully
  useEffect(() => {
    fetchReleases();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Fetch initially only

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

  // Callback for successful edit/upload from ReleaseForm (now only used for edit success)
  const handleSuccess = async () => {
      setIsEditDialogOpen(false); // Close dialog on success
      setEditingRelease(null);
      await fetchReleases(); // Refetch the list
  }


  const handleDeleteConfirm = async (releaseId: string) => {
    setIsPerformingAction(releaseId); // Indicate action started
    try {
        await removeRelease(releaseId);
        // Update state *after* successful deletion
        setReleases(prevReleases => prevReleases.filter(r => r.id !== releaseId));
        toast({
            title: "Release Removed",
            description: "The release has been successfully removed.",
            variant: "default", // Use default for theme adaptation
        });
    } catch (error) {
        console.error("Error removing release:", error);
        toast({
            title: "Removal Failed",
            description: "Could not remove the release. Please try again.",
            variant: "destructive",
        });
    } finally {
        setDeletingReleaseId(null); // Close confirmation dialog
        setIsPerformingAction(null); // Indicate action finished
    }
  };

  // Format date for display
  const formatDate = (dateString: string | Date | undefined): string => {
     if (!dateString) return '-';
     try {
         const date = typeof dateString === 'string' ? new Date(dateString + 'T00:00:00') : dateString; // Ensure correct parsing if only date string
         return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
     } catch (e) {
         return '-'; // Handle invalid date formats gracefully
     }
  };

  // Main view: Release List Table
  return (
    <>
    {/* Adjust background/opacity for dark mode */}
    <Card className={cn("col-span-1 lg:col-span-2 shadow-md rounded-lg", className)}>
        <CardHeader className="flex flex-row justify-between items-center">
            <div>
                <CardTitle className="text-xl font-semibold text-primary">Manage Releases</CardTitle>
                <CardDescription className="text-muted-foreground">View, edit, or remove your existing releases.</CardDescription>
            </div>
             {/* Removed "Add New" button as form is always visible now */}
        </CardHeader>
        <CardContent>
            <div className="overflow-x-auto rounded-md border border-border/50"> {/* Add border around table */}
                <Table>
                <TableHeader>
                    <TableRow className="bg-muted/30 dark:bg-muted/10 hover:bg-muted/50 dark:hover:bg-muted/20"> {/* Subtle header background */}
                    <TableHead className="w-[64px] hidden sm:table-cell p-2"> {/* Adjusted padding */}
                        Artwork
                    </TableHead>
                    <TableHead className="p-2">Title</TableHead>
                    <TableHead className="p-2">Artist</TableHead>
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
                                    <Skeleton className="h-12 w-12 rounded-md bg-muted/50" />
                                </TableCell>
                                <TableCell className="p-2"><Skeleton className="h-4 w-3/4 bg-muted/50" /></TableCell>
                                <TableCell className="p-2"><Skeleton className="h-4 w-1/2 bg-muted/50" /></TableCell>
                                <TableCell className="hidden md:table-cell p-2"><Skeleton className="h-4 w-20 bg-muted/50" /></TableCell>
                                <TableCell className="text-right p-2">
                                    <Skeleton className="h-8 w-8 rounded-md ml-auto bg-muted/50" />
                                </TableCell>
                            </TableRow>
                        ))
                    ) : releases.length === 0 ? (
                        // No releases message
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                No releases found yet. Use the form above to upload your first one!
                            </TableCell>
                        </TableRow>
                    ) : (
                        // Actual releases data
                        releases.map((release) => (
                            <TableRow key={release.id} className="hover:bg-muted/50 dark:hover:bg-muted/20 transition-colors border-b border-border/30 last:border-b-0">
                                <TableCell className="hidden sm:table-cell p-2 align-middle">
                                    <Image
                                        alt={`${release.title} Artwork`}
                                        className="aspect-square rounded-md object-cover border border-border/50"
                                        height={48}
                                        src={release.artworkUrl || `https://picsum.photos/seed/${release.id}/64/64?grayscale`} // Consistent grayscale fallback
                                        width={48}
                                        unoptimized // Needed for frequently changing picsum URLs if used heavily
                                    />
                                </TableCell>
                                <TableCell className="font-medium text-foreground p-2 align-middle">{release.title}</TableCell>
                                <TableCell className="text-muted-foreground p-2 align-middle">{release.artist}</TableCell>
                                <TableCell className="hidden md:table-cell text-muted-foreground p-2 align-middle">
                                  {formatDate(release.releaseDate)}
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
                                                <span>Edit</span>
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
                                        <AlertDialogContent className="bg-card border-border">
                                            <AlertDialogHeader>
                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                            <AlertDialogDescription className="text-muted-foreground">
                                                This action cannot be undone. This will permanently remove the release
                                                &quot;{release.title}&quot; and its associated data from the platform.
                                            </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                            <AlertDialogCancel disabled={isPerformingAction === release.id} className="border-input hover:bg-muted/50">Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => handleDeleteConfirm(release.id)}
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
        </CardContent>
    </Card>

    {/* Edit Release Dialog */}
     <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogClose}>
          {/* Adjusted background/opacity for dark mode */}
         <DialogContent className="sm:max-w-[425px] md:max-w-lg lg:max-w-xl bg-card/95 dark:bg-card/80 backdrop-blur-sm border-border/50">
             <DialogHeader>
                <DialogTitle className="text-primary">Edit Release</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                    Make changes to the release details for &quot;{editingRelease?.title}&quot;.
                </DialogDescription>
             </DialogHeader>
              {editingRelease && (
                 <ReleaseForm
                     key={editingRelease.id} // Ensure form remounts/resets for different releases
                     releaseId={editingRelease.id}
                     initialData={editingRelease}
                     onSuccess={handleSuccess}
                     // Use transparent background, no shadow/border as it's inside dialog
                     className="bg-transparent shadow-none border-0 p-0"
                 />
             )}
             {/* Optional: Footer with close button if needed */}
              {/* <DialogFooter className="mt-4">
                 <DialogClose asChild>
                     <Button type="button" variant="outline">
                         Close
                     </Button>
                 </DialogClose>
             </DialogFooter> */}
         </DialogContent>
     </Dialog>
    </>
  );
}

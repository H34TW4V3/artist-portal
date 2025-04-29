"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { MoreHorizontal, Edit, Trash2, Loader2, X } from "lucide-react";

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ReleaseForm } from './release-form';
import type { ReleaseMetadata } from '@/services/music-platform';
import { removeRelease, getReleases } from '@/services/music-platform'; // Import the functions
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton


// Type for release including ID
type ReleaseWithId = ReleaseMetadata & { id: string };

export function ReleaseList() {
  const [releases, setReleases] = useState<ReleaseWithId[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingRelease, setEditingRelease] = useState<ReleaseWithId | null>(null);
  const [deletingReleaseId, setDeletingReleaseId] = useState<string | null>(null); // Track which release is being confirmed for deletion
  const [isPerformingAction, setIsPerformingAction] = useState<string | null>(null); // Track ongoing delete/edit action
  const { toast } = useToast();

  // Fetch releases on component mount
  useEffect(() => {
    async function fetchReleases() {
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
    }
    fetchReleases();
  }, [toast]); // Add toast as dependency

  const handleEdit = (release: ReleaseWithId) => {
    setEditingRelease(release);
  };

  const handleDeleteConfirm = async (releaseId: string) => {
    setIsPerformingAction(releaseId); // Indicate action started
    try {
        await removeRelease(releaseId);
        setReleases(prevReleases => prevReleases.filter(r => r.id !== releaseId));
        toast({
            title: "Release Removed",
            description: "The release has been successfully removed.",
            variant: "default",
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

  const handleCloseEdit = async (refresh: boolean = true) => {
      setEditingRelease(null);
      // Refetch releases list after edit to ensure data consistency
      if (refresh) {
          setIsLoading(true);
          try {
              const fetchedReleases = await getReleases();
              setReleases(fetchedReleases);
          } catch (error) {
              console.error("Error refetching releases:", error);
              // Toast handled in initial fetch, maybe a less intrusive log here
          } finally {
              setIsLoading(false);
          }
      }
  }

  // Render edit form when a release is being edited
  if (editingRelease) {
    return (
        <Card className="bg-card shadow-md rounded-lg transition-subtle relative">
             <CardHeader className="flex flex-row items-start justify-between">
                 <div>
                    <CardTitle className="text-xl font-semibold text-primary">Edit Release</CardTitle>
                    <CardDescription className="text-muted-foreground">Update the details for &quot;{editingRelease.title}&quot;.</CardDescription>
                 </div>
                 <Button variant="ghost" size="icon" onClick={() => handleCloseEdit(false)} className="h-8 w-8 text-muted-foreground hover:bg-secondary">
                     <X className="h-4 w-4" />
                     <span className="sr-only">Close edit form</span>
                 </Button>
            </CardHeader>
            <CardContent>
                {/* Pass onSuccess to handleCloseEdit to trigger refresh */}
                <ReleaseForm
                    releaseId={editingRelease.id}
                    initialData={editingRelease}
                    onSuccess={() => handleCloseEdit(true)}
                 />
             </CardContent>
        </Card>
    );
  }


  // Main view: Release List Table
  return (
    <Card className="col-span-1 lg:col-span-2 bg-card shadow-md rounded-lg transition-subtle">
        <CardHeader>
            <CardTitle className="text-xl font-semibold text-primary">Manage Releases</CardTitle>
            <CardDescription className="text-muted-foreground">View, edit, or remove your existing releases.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead className="w-[64px] hidden sm:table-cell">
                        <span className="sr-only">Artwork</span>
                    </TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Artist</TableHead>
                    <TableHead className="hidden md:table-cell">Release Date</TableHead>
                    <TableHead className="text-right">
                        <span className="sr-only">Actions</span>
                    </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        // Loading Skeletons
                        Array.from({ length: 3 }).map((_, index) => (
                            <TableRow key={`skeleton-${index}`}>
                                <TableCell className="hidden sm:table-cell">
                                    <Skeleton className="h-16 w-16 rounded-md" />
                                </TableCell>
                                <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-1/2" /></TableCell>
                                <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                                <TableCell className="text-right">
                                    <Skeleton className="h-8 w-8 rounded-full ml-auto" />
                                </TableCell>
                            </TableRow>
                        ))
                    ) : releases.length === 0 ? (
                        // No releases message
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                No releases found. Upload your first release using the form!
                            </TableCell>
                        </TableRow>
                    ) : (
                        // Actual releases data
                        releases.map((release) => (
                            <TableRow key={release.id} className="hover:bg-secondary/50 transition-colors">
                                <TableCell className="hidden sm:table-cell">
                                    <Image
                                        alt={`${release.title} Artwork`}
                                        className="aspect-square rounded-md object-cover border border-border"
                                        height={64}
                                        src={release.artworkUrl || 'https://picsum.photos/seed/'+release.id+'/64/64'} // Fallback image
                                        width={64}
                                        unoptimized // Use if picsum URLs change frequently
                                    />
                                </TableCell>
                                <TableCell className="font-medium text-foreground">{release.title}</TableCell>
                                <TableCell className="text-muted-foreground">{release.artist}</TableCell>
                                <TableCell className="hidden md:table-cell text-muted-foreground">
                                {release.releaseDate ? new Date(release.releaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
                                </TableCell>
                                <TableCell className="text-right">
                                    <AlertDialog open={deletingReleaseId === release.id} onOpenChange={(open) => !open && setDeletingReleaseId(null)}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                            <Button aria-haspopup="true" size="icon" variant="ghost" disabled={isPerformingAction === release.id} className="h-8 w-8 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground">
                                                {isPerformingAction === release.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                                                <span className="sr-only">Toggle menu</span>
                                            </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => handleEdit(release)} className="cursor-pointer">
                                                <Edit className="mr-2 h-4 w-4" />
                                                <span>Edit</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => setDeletingReleaseId(release.id)}
                                                className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                                             >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                <span>Delete</span>
                                            </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently remove the release
                                                &quot;{release.title}&quot; and its associated data from the platform.
                                            </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                            <AlertDialogCancel disabled={isPerformingAction === release.id}>Cancel</AlertDialogCancel>
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
  );
}

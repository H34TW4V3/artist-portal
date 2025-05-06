
"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Loader2, UploadCloud, PlusCircle } from "lucide-react";
import { Timestamp } from "firebase/firestore"; 

import { Button } from "@/components/ui/button";
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
import { ManageReleaseModal } from './manage-release-modal'; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadReleaseModal } from './upload-release-modal'; 
import { AddExistingReleaseModal } from './add-existing-release-modal'; 
import type { ReleaseWithId, ReleaseMetadata } from '@/services/music-platform'; 
import { removeRelease, getReleases } from '@/services/music-platform'; 
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton'; 
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context'; 
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu'; 

interface ReleaseListProps {
  className?: string;
}

export function ReleaseList({ className }: ReleaseListProps) {
  const { user } = useAuth(); 
  const [releases, setReleases] = useState<ReleaseWithId[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRelease, setSelectedRelease] = useState<ReleaseWithId | null>(null); 
  const [isManageModalOpen, setIsManageModalOpen] = useState(false); 
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAddExistingModalOpen, setIsAddExistingModalOpen] = useState(false); 
  const { toast } = useToast();
  const placeholderArtwork = "/placeholder-artwork.png"; 

  
  const fetchReleases = async () => {
    if (!user) {
        setIsLoading(false); 
        setReleases([]);    
        return;
    }
    setIsLoading(true);
    try {
      const fetchedReleases = await getReleases(); 
      setReleases(fetchedReleases);
    } catch (error) {
      console.error("Error fetching releases:", error);
      toast({
        title: "Error Fetching Releases",
        description: error instanceof Error ? error.message : "Could not load your releases.",
        variant: "destructive",
      });
      setReleases([]); 
    } finally {
      setIsLoading(false);
    }
  };

  
  useEffect(() => {
    fetchReleases();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); 


  
  const handleRowClick = (release: ReleaseWithId, e: React.MouseEvent) => {
     
     const targetElement = e.target as Element;
     if (targetElement.closest('[data-radix-dropdown-menu-trigger], [data-radix-dropdown-menu-content]')) {
        return;
     }
    setSelectedRelease(release);
    setIsManageModalOpen(true);
  };

  const handleManageDialogClose = () => {
      setIsManageModalOpen(false);
      setSelectedRelease(null); 
  }

  
  
  const handleSuccess = async () => {
      setIsManageModalOpen(false); 
      setIsUploadModalOpen(false); 
      setIsAddExistingModalOpen(false); 
      setSelectedRelease(null); 
      console.log("handleSuccess called, fetching releases..."); 
      await fetchReleases(); 
  }


  

  
  const formatDate = (dateValue: string | Date | Timestamp | undefined): string => {
    if (!dateValue) return '-';
    try {
        let date: Date;
        if (dateValue instanceof Timestamp) {
            date = dateValue.toDate();
        } else if (typeof dateValue === 'string') {
             
             if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
                  const [year, month, day] = dateValue.split('-').map(Number);
                  date = new Date(Date.UTC(year, month - 1, day));
             } else {
                  
                  date = new Date(dateValue);
             }
        } else { 
             date = dateValue;
        }

        if (isNaN(date.getTime())) return 'Invalid Date';

        
        
        if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                timeZone: 'UTC' 
            });
        }
        
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


  
  return (
    <>
    <Card className={cn("col-span-1 lg:col-span-2 shadow-md rounded-lg bg-card/60 dark:bg-card/50", className)}>
        <CardHeader className="flex flex-row justify-between items-center gap-4 flex-wrap">
            <div>
                <CardTitle className="text-xl font-semibold text-primary">Manage Releases</CardTitle>
                <CardDescription className="text-muted-foreground">View or edit your releases.</CardDescription> 
            </div>
             <DropdownMenu>
                 <DropdownMenuTrigger asChild>
                     <Button 
                        className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md ml-auto"
                        disabled={!user} // Disable button if user is not logged in
                      >
                         <PlusCircle className="mr-2 h-4 w-4" /> Add Release
                     </Button>
                 </DropdownMenuTrigger>
                 {user && ( // Only render DropdownMenuContent if user is logged in
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
                 )}
             </DropdownMenu>
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

    
     <ManageReleaseModal
         isOpen={isManageModalOpen}
         onClose={handleManageDialogClose}
         releaseData={selectedRelease} 
         onSuccess={handleSuccess} 
         
         onTakedownSuccess={fetchReleases}
     />

     
     <UploadReleaseModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={handleSuccess} 
     />

      
      <AddExistingReleaseModal
          isOpen={isAddExistingModalOpen}
          onClose={() => setIsAddExistingModalOpen(false)}
          onSuccess={handleSuccess} 
      />
    </>
  );
}


"use client";

import type { ManagedArtist } from '@/services/artists';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton'; // Corrected import
import { cn } from '@/lib/utils';

interface ArtistTableProps {
  artists: ManagedArtist[];
  onSelectArtist: (artist: ManagedArtist) => void;
  selectedArtistId?: string | null;
  isLoading?: boolean; 
}

export function ArtistTable({ artists, onSelectArtist, selectedArtistId, isLoading }: ArtistTableProps) {
  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'A';

  if (isLoading) {
    return (
      <div className="space-y-2 p-2"> {/* Added padding for skeleton consistency */}
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={`skel-artist-${index}`} className="flex items-center gap-3 p-2 rounded-md bg-muted/20"> {/* Light background for skeletons */}
            <Skeleton className="h-10 w-10 rounded-full bg-muted/50" />
            <div className="flex-grow space-y-1.5"> {/* Adjusted spacing */}
              <Skeleton className="h-4 w-3/4 bg-muted/50" />
              <Skeleton className="h-3 w-1/2 bg-muted/50" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!artists || artists.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No artists found.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border/50 max-h-[500px]">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 dark:bg-muted/10 hover:bg-muted/50 dark:hover:bg-muted/20">
            <TableHead className="w-[50px] p-2"></TableHead>
            <TableHead className="p-2">Name</TableHead>
            <TableHead className="hidden sm:table-cell p-2">Email</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {artists.map((artist) => (
            <TableRow
              key={artist.id}
              onClick={() => onSelectArtist(artist)}
              className={cn(
                "cursor-pointer hover:bg-muted/50 dark:hover:bg-muted/20 transition-colors",
                selectedArtistId === artist.id && "bg-primary/10 hover:bg-primary/15 dark:bg-primary/15 dark:hover:bg-primary/20"
              )}
            >
              <TableCell className="p-2">
                <Avatar className="h-8 w-8">
                  {/* Placeholder for artist image - ideally from artist.imageUrl */}
                  <AvatarImage src={undefined} alt={artist.name} />
                  <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                    {getInitials(artist.name)}
                  </AvatarFallback>
                </Avatar>
              </TableCell>
              <TableCell className="font-medium text-foreground p-2">{artist.name}</TableCell>
              <TableCell className="hidden sm:table-cell text-muted-foreground p-2">{artist.email}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

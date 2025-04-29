
"use client"; // Add use client because we're using hooks/interactive components

import Image from 'next/image';
import Link from 'next/link'; // Import Link for navigation
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button"; // Use Button for trigger consistency
import { User, LogOut, Settings, FileText } from 'lucide-react'; // Import icons including FileText
import { cn } from "@/lib/utils";
import { useToast } from '@/hooks/use-toast'; // Import useToast

interface UserProfileProps {
  name: string;
  imageUrl?: string;
  className?: string;
}

export function UserProfile({ name, imageUrl, className }: UserProfileProps) {
  const { toast } = useToast(); // Initialize toast

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  // Placeholder actions - replace with actual logic
  const handleLogout = () => {
    // TODO: Add logout logic here
    toast({ title: "Action", description: "User logged out." });
  };


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
         {/* Wrap the profile display in a button for accessibility and styling */}
         {/* Increased Avatar size and adjusted button padding/height */}
         <Button variant="ghost" className={cn("flex items-center space-x-3 p-1.5 rounded-full h-auto focus-visible:ring-1 focus-visible:ring-ring", className)}>
            {/* Increased avatar size */}
            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-primary/40">
              {imageUrl ? (
                <AvatarImage src={imageUrl} alt={`${name}'s profile picture`} />
              ) : null}
              <AvatarFallback className="bg-muted text-muted-foreground font-semibold text-base sm:text-lg"> {/* Slightly larger initials */}
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block text-left"> {/* Hide name on small screens */}
              {/* Increased font size for name */}
              <p className="text-sm sm:text-base font-medium leading-none text-foreground">{name}</p>
              {/* Optional: Role */}
              <p className="text-xs sm:text-sm leading-none text-muted-foreground">Artist</p>
            </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-popover border-border shadow-lg">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {/* Placeholder Email */}
              artist@example.com
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border/50" />
        {/* Key Documents Link */}
        <DropdownMenuItem asChild className="cursor-pointer focus:bg-accent focus:text-accent-foreground">
            <Link href="/documents">
                <FileText className="mr-2 h-4 w-4" />
                <span>Key Documents</span>
            </Link>
        </DropdownMenuItem>
        {/* Manage Profile Link - Updated */}
        <DropdownMenuItem asChild className="cursor-pointer focus:bg-accent focus:text-accent-foreground">
            <Link href="/profile">
                <Settings className="mr-2 h-4 w-4" />
                <span>Manage Profile</span>
            </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border/50" />
        {/* Logout */}
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


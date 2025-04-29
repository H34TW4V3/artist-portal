
"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  // Removed DropdownMenuLabel and DropdownMenuSeparator imports
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Pencil, Image as ImageIcon, Sun, Moon } from "lucide-react"; // Renamed Image to avoid conflict
import { cn } from "@/lib/utils";

interface SettingsMenuButtonProps {
  onOpenWallpaperModal: () => void;
  onToggleTheme: () => void;
  currentTheme: 'light' | 'dark';
  className?: string;
}

export function SettingsMenuButton({
  onOpenWallpaperModal,
  onToggleTheme,
  currentTheme,
  className,
}: SettingsMenuButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary" // Use secondary for less emphasis than primary
          size="icon"
          className={cn(
            "fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg bg-card/80 dark:bg-card/70 backdrop-blur-md border border-border/30 text-primary hover:bg-primary/10 hover:text-primary active:bg-primary/20 hover-glow focus-glow",
            className
          )}
          aria-label="Open Settings Menu"
        >
          <Pencil className="h-6 w-6" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-56 bg-popover border-border shadow-lg mb-2">
        {/* Removed Settings Label and Separator */}
        {/* <DropdownMenuLabel>Settings</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border/50" /> */}
        <DropdownMenuItem onClick={onOpenWallpaperModal} className="cursor-pointer focus:bg-accent focus:text-accent-foreground">
          <ImageIcon className="mr-2 h-4 w-4" />
          <span>Change Wallpaper</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onToggleTheme} className="cursor-pointer focus:bg-accent focus:text-accent-foreground">
          {currentTheme === 'dark' ? (
            <Sun className="mr-2 h-4 w-4" />
          ) : (
            <Moon className="mr-2 h-4 w-4" />
          )}
          <span>Switch to {currentTheme === 'dark' ? 'Light' : 'Dark'} Mode</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

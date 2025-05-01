
"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator, // Add Separator back
  DropdownMenuLabel, // Add Label back for sectioning
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch"; // Import Switch
import { Label } from "@/components/ui/label"; // Import Label
import { Pencil, Image as ImageIcon, Sun, Moon, Wind, Info } from "lucide-react"; // Renamed Image to avoid conflict, added Wind and Info icons
import { cn } from "@/lib/utils";

interface SettingsMenuButtonProps {
  onOpenWallpaperModal: () => void;
  onToggleTheme: () => void;
  currentTheme: 'light' | 'dark';
  onToggleWeatherAnimations: () => void; // Handler for toggling animations
  weatherAnimationsEnabled: boolean; // Current state of animations
  showWeatherToggle?: boolean; // Added optional prop to control visibility
  onOpenAboutModal: () => void; // Handler for opening the About modal
  className?: string;
}

export function SettingsMenuButton({
  onOpenWallpaperModal,
  onToggleTheme,
  currentTheme,
  onToggleWeatherAnimations,
  weatherAnimationsEnabled,
  showWeatherToggle = true, // Default to true
  onOpenAboutModal, // Receive the new handler
  className,
}: SettingsMenuButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary" // Use secondary for less emphasis than primary
          size="icon"
          className={cn(
            "fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg bg-card/60 dark:bg-card/50 border border-border/30 text-primary hover:bg-primary/10 hover:text-primary active:bg-primary/20 hover-glow focus-glow", // Adjusted opacity
            className
          )}
          aria-label="Open Settings Menu"
        >
          <Pencil className="h-6 w-6" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-56 bg-popover border-border shadow-lg mb-2">
        <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Appearance</DropdownMenuLabel>
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
         {/* Weather Animation Toggle - Conditionally Rendered */}
         {showWeatherToggle && (
             <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-default focus:bg-transparent focus:text-popover-foreground">
                <div className="flex items-center justify-between w-full">
                     <Label htmlFor="weather-animation-switch" className="flex items-center gap-2 cursor-pointer text-sm">
                         <Wind className="h-4 w-4" />
                         <span>Weather FX</span>
                     </Label>
                    <Switch
                        id="weather-animation-switch"
                        checked={weatherAnimationsEnabled}
                        onCheckedChange={onToggleWeatherAnimations}
                        aria-label="Toggle weather animations"
                    />
                </div>
            </DropdownMenuItem>
         )}
        {/* Separator */}
        <DropdownMenuSeparator className="bg-border/50" />
        {/* About Option */}
        <DropdownMenuItem onClick={onOpenAboutModal} className="cursor-pointer focus:bg-accent focus:text-accent-foreground">
          <Info className="mr-2 h-4 w-4" />
          <span>About</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

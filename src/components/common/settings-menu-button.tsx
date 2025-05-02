
"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Pencil, Image as ImageIcon, Sun, Moon, Wind, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsMenuButtonProps {
  onOpenWallpaperModal: () => void;
  onToggleTheme: () => void; // This now toggles the *preferred* theme
  currentTheme: 'light' | 'dark'; // This is the *preferred* theme
  onToggleWeatherAnimations: () => void;
  weatherAnimationsEnabled: boolean;
  showWeatherToggle?: boolean;
  onOpenAboutModal: () => void;
  className?: string;
}

export function SettingsMenuButton({
  onOpenWallpaperModal,
  onToggleTheme,
  currentTheme, // This represents the preferred theme
  onToggleWeatherAnimations,
  weatherAnimationsEnabled,
  showWeatherToggle = true,
  onOpenAboutModal,
  className,
}: SettingsMenuButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className={cn(
            "fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg bg-card/60 dark:bg-card/50 border border-border/30 text-primary hover:bg-primary/10 hover:text-primary active:bg-primary/20 hover-glow focus-glow",
            "transition-transform duration-200 ease-out hover:scale-110 hover:rotate-6 focus-visible:scale-110 focus-visible:rotate-6",
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
        {/* Updated description for theme toggle */}
        <DropdownMenuItem onClick={onToggleTheme} className="cursor-pointer focus:bg-accent focus:text-accent-foreground flex flex-col items-start gap-0.5">
           <div className="flex items-center w-full">
                {currentTheme === 'dark' ? (
                    <Sun className="mr-2 h-4 w-4" />
                ) : (
                    <Moon className="mr-2 h-4 w-4" />
                )}
                <span>Set Preferred: {currentTheme === 'dark' ? 'Light' : 'Dark'}</span>
           </div>
           <span className="text-xs text-muted-foreground pl-6">Theme adjusts to wallpaper brightness</span>
        </DropdownMenuItem>
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
        <DropdownMenuSeparator className="bg-border/50" />
        <DropdownMenuItem onClick={onOpenAboutModal} className="cursor-pointer focus:bg-accent focus:text-accent-foreground">
          <Info className="mr-2 h-4 w-4" />
          <span>About</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

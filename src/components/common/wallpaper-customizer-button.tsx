
"use client";

import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface WallpaperCustomizerButtonProps {
  onClick: () => void;
  className?: string;
}

export function WallpaperCustomizerButton({ onClick, className }: WallpaperCustomizerButtonProps) {
  return (
    <Button
      variant="secondary" // Use secondary for less emphasis than primary
      size="icon"
      onClick={onClick}
      className={cn(
        "fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg bg-card/80 dark:bg-card/70 backdrop-blur-md border border-border/30 text-primary hover:bg-primary/10 hover:text-primary active:bg-primary/20 hover-glow focus-glow",
        className
      )}
      aria-label="Customize Wallpaper"
    >
      <Pencil className="h-6 w-6" />
    </Button>
  );
}

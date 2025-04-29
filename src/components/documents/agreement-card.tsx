
"use client"; // Add use client because useToast is a client-side hook

import type React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Eye } from "lucide-react"; // Import icons for actions
import { cn } from "@/lib/utils";
import { useToast } from '@/hooks/use-toast'; // For placeholder actions

interface AgreementCardProps {
  title: string;
  icon: React.ReactNode;
  className?: string;
}

export function AgreementCard({ title, icon, className }: AgreementCardProps) {
  const { toast } = useToast();

  // Placeholder actions
  const handleView = () => {
    toast({ title: "Action", description: `Viewing "${title}" (Placeholder)` });
    // TODO: Implement view logic (e.g., open PDF in new tab or modal)
  };

  const handleDownload = () => {
    toast({ title: "Action", description: `Downloading "${title}" (Placeholder)` });
    // TODO: Implement download logic
  };

  return (
    <Card className={cn(
        "bg-background/70 dark:bg-background/50 border border-border/40 shadow-sm rounded-lg transition-subtle hover:shadow-md hover:border-border/60 flex flex-col justify-between", // Removed backdrop-blur-sm
        className
    )}>
      <CardHeader className="flex flex-row items-start gap-4 pb-2"> {/* Adjust spacing */}
        <div className="flex-shrink-0 text-primary pt-1">{icon}</div>
        <div className="flex-grow">
            <CardTitle className="text-base font-semibold text-foreground leading-tight">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-grow pt-2 pb-4"> {/* Add some padding */}
         <p className="text-xs text-muted-foreground">
           {/* Placeholder for description or status */}
           Last updated: Jan 1, 2024
         </p>
      </CardContent>
      <CardFooter className="flex justify-end gap-2 pt-0 pb-4 px-4 border-t border-border/30 mt-auto"> {/* Add border and adjust padding */}
        <Button variant="outline" size="sm" onClick={handleView} className="h-8 px-3">
          <Eye className="mr-1.5 h-4 w-4" /> View
        </Button>
        <Button variant="secondary" size="sm" onClick={handleDownload} className="h-8 px-3">
          <Download className="mr-1.5 h-4 w-4" /> Download
        </Button>
      </CardFooter>
    </Card>
  );
}

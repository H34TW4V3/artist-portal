
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface DirectMessagesViewProps {
  className?: string; // Allow passing custom classes
}

export function DirectMessagesView({ className }: DirectMessagesViewProps) {
  return (
    <Card className={cn("shadow-md rounded-lg min-h-[400px] bg-card/60 dark:bg-card/50", className)}> {/* Adjusted opacity */}
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-primary flex items-center gap-2">
            <Send className="h-5 w-5" /> Direct Messages
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Chat privately with other artists. (Feature coming soon!)
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center min-h-[300px] text-center p-6"> {/* Increased min-height */}
         <Construction className="h-16 w-16 text-muted-foreground mb-6" />
        <p className="text-lg font-medium text-foreground">
          Feature Under Construction
        </p>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            We're currently building the direct messaging feature. Soon you'll be able to connect one-on-one with collaborators and friends right here! Stay tuned for updates.
        </p>
        {/* Maybe add a placeholder input/button for visual structure */}
         <div className="mt-8 w-full max-w-sm space-y-3 opacity-30 pointer-events-none">
            <div className="h-10 w-full rounded-md bg-muted"></div> {/* Placeholder input */}
            <div className="h-10 w-24 ml-auto rounded-md bg-muted"></div> {/* Placeholder button */}
        </div>
      </CardContent>
    </Card>
  );
}

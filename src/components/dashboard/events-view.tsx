
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarClock, Construction } from "lucide-react";
import { cn } from "@/lib/utils";

interface EventsViewProps {
  className?: string; // Allow passing custom classes
}

export function EventsView({ className }: EventsViewProps) {
  return (
    <Card className={cn("shadow-md rounded-lg", className)}>
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-primary flex items-center gap-2">
            <CalendarClock className="h-5 w-5" /> Event Management
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Manage your upcoming events and view past ones. (Feature coming soon!)
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center min-h-[200px] text-center">
         <Construction className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          This section is under construction. Check back later for event management features!
        </p>
      </CardContent>
    </Card>
  );
}

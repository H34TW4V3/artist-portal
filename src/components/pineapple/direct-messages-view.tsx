
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface DirectMessagesViewProps {
  className?: string; // Allow passing custom classes
}

export function DirectMessagesView({ className }: DirectMessagesViewProps) {
  return (
    <Card className={cn("shadow-md rounded-lg", className)}>
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-primary flex items-center gap-2">
            <Send className="h-5 w-5" /> Direct Messages
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Chat privately with other artists. (Feature coming soon!)
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center min-h-[300px] text-center p-6">
         <Construction className="h-16 w-16 text-muted-foreground mb-6" />
        <p className="text-muted-foreground">
          Direct messaging is under construction.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
            Soon you'll be able to connect one-on-one with collaborators and friends right here.
        </p>
      </CardContent>
    </Card>
  );
}

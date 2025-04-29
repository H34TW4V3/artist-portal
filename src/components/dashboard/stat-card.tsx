
import type React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  className?: string;
}

export function StatCard({ title, value, icon, description, className }: StatCardProps) {
  return (
    // Adjusted background/opacity for dark mode, consistent border
    <Card className={cn(
        "bg-background/60 dark:bg-background/40 backdrop-blur-sm border border-border/40 shadow-sm rounded-lg transition-subtle hover:shadow-md hover:border-border/60",
        className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {/* Ensure icon uses accent color and consistent sizing */}
        <div className="text-accent [&>svg]:h-5 [&>svg]:w-5">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div> {/* Use foreground for primary text */}
        {description && (
          <p className="text-xs text-muted-foreground pt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

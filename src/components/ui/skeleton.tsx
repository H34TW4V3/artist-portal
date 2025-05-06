
import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      // Use a slightly less transparent muted for better visibility
      className={cn("animate-pulse rounded-md bg-muted/60 dark:bg-muted/50", className)} // Updated opacity
      {...props}
    />
  )
}

export { Skeleton }


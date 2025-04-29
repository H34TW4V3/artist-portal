import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      // Use a slightly less transparent muted for better visibility
      className={cn("animate-pulse rounded-md bg-muted/80 dark:bg-muted/30", className)}
      {...props}
    />
  )
}

export { Skeleton }

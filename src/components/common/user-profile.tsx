
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserProfileProps {
  name: string;
  imageUrl?: string;
  className?: string;
}

export function UserProfile({ name, imageUrl, className }: UserProfileProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className={cn("flex items-center space-x-3", className)}>
      <Avatar className="h-9 w-9 sm:h-10 sm:w-10 border-2 border-primary/30">
        {imageUrl ? (
          <AvatarImage src={imageUrl} alt={`${name}'s profile picture`} />
        ) : null}
        <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="hidden sm:block"> {/* Hide name on small screens to save space */}
        <p className="text-sm font-medium leading-none text-foreground">{name}</p>
        {/* Optional: Add email or role below the name */}
        {/* <p className="text-xs leading-none text-muted-foreground">artist@example.com</p> */}
      </div>
    </div>
  );
}

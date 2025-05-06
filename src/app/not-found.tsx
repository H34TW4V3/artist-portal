
"use client"; // Required for useRouter

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft, AlertTriangle } from 'lucide-react'; // Import icons
import { useRouter } from 'next/navigation'; // Import for "Go Back" functionality

export default function NotFoundPage() {
  const router = useRouter();

  const handleGoBack = () => {
    router.back(); // Navigates to the previous page in history
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground p-6">
      <div className="text-center max-w-md">
        <AlertTriangle className="mx-auto h-24 w-24 text-destructive mb-6" />
        <h1 className="text-5xl font-bold text-primary mb-4">404 - Page Not Found</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Oops! The page you&apos;re looking for doesn&apos;t seem to exist.
          It might have been moved, deleted, or maybe you mistyped the URL.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            onClick={handleGoBack}
            variant="outline"
            size="lg"
            className="w-full sm:w-auto hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <ArrowLeft className="mr-2 h-5 w-5" /> Go Back
          </Button>
          <Link href="/" passHref>
            <Button
              variant="default"
              size="lg"
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
            >
              <Home className="mr-2 h-5 w-5" /> Go to Homepage
            </Button>
          </Link>
        </div>
        <p className="mt-10 text-xs text-muted-foreground">
          If you believe this is an error, please contact support.
        </p>
      </div>
    </div>
  );
}

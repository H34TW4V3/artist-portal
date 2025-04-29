
"use client"; // Add "use client" directive

import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { WallpaperCustomizerButton } from '@/components/common/wallpaper-customizer-button'; // Import button
import { WallpaperCustomizerModal } from '@/components/common/wallpaper-customizer-modal'; // Import modal
import { useState, useEffect } from 'react'; // Import hooks

// Metadata export can still work in client components but might have limitations
// For full server-side metadata generation, consider moving it if possible
// export const metadata: Metadata = {
//   title: 'Artist Hub',
//   description: 'Manage your music releases and view streaming statistics.',
// };

// Default wallpaper URL
const DEFAULT_WALLPAPER_URL = "https://t4.ftcdn.net/jpg/08/62/54/35/360_F_862543518_D0LQEQDZqkbTNM8CMB6iuiauhfaj4wr6.jpg";
const LOCAL_STORAGE_KEY = 'artistHubWallpaperUrl';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [wallpaperUrl, setWallpaperUrl] = useState(DEFAULT_WALLPAPER_URL);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false); // Prevent SSR hydration mismatch

  useEffect(() => {
    setIsMounted(true); // Component has mounted on client
    const savedUrl = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedUrl) {
      setWallpaperUrl(savedUrl);
    }
  }, []); // Run only once on mount

  const handleApplyWallpaper = (newUrl: string) => {
    const urlToSet = newUrl.trim() || DEFAULT_WALLPAPER_URL; // Use default if empty
    setWallpaperUrl(urlToSet);
    localStorage.setItem(LOCAL_STORAGE_KEY, urlToSet);
    setIsModalOpen(false);
  };

  const handleResetWallpaper = () => {
    setWallpaperUrl(DEFAULT_WALLPAPER_URL);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setIsModalOpen(false);
  };

  // Since this is a client component now, metadata needs to be handled differently if static export needed
  // This basic setup might suffice for dynamic title/description updates via document.title etc.

  return (
    <html lang="en" className="dark">
      <head>
         {/* Basic metadata for client component */}
         <title>Artist Hub</title>
         <meta name="description" content="Manage your music releases and view streaming statistics." />
      </head>
      <body className={`${GeistSans.variable} font-sans antialiased bg-background text-foreground relative min-h-screen`}>
        {/* Global Background Image - Uses dynamic URL state */}
        <div
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-[0.08] dark:opacity-[0.10] transition-all duration-500 ease-in-out"
            style={{ backgroundImage: `url('${wallpaperUrl}')` }} // Use state variable
        />

        {/* Content wrapper */}
        <div className="relative z-10 min-h-screen flex flex-col">
             {children}
        </div>

        {/* Wallpaper Customizer - Only render button/modal on client */}
        {isMounted && (
          <>
            <WallpaperCustomizerButton onClick={() => setIsModalOpen(true)} />
            <WallpaperCustomizerModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              currentUrl={wallpaperUrl === DEFAULT_WALLPAPER_URL ? '' : wallpaperUrl} // Show empty if default
              onApply={handleApplyWallpaper}
              onReset={handleResetWallpaper}
              defaultUrl={DEFAULT_WALLPAPER_URL}
            />
          </>
        )}

        <Toaster />
      </body>
    </html>
  );
}


"use client"; // Add "use client" directive

import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { SettingsMenuButton } from '@/components/common/settings-menu-button'; // Import new settings button
import { WallpaperCustomizerModal } from '@/components/common/wallpaper-customizer-modal'; // Import modal
import { useState, useEffect } from 'react'; // Import hooks

// Default wallpaper URL
const DEFAULT_WALLPAPER_URL = "https://t4.ftcdn.net/jpg/08/62/54/35/360_F_862543518_D0LQEQDZqkbTNM8CMB6iuiauhfaj4wr6.jpg";
const LOCAL_STORAGE_WALLPAPER_KEY = 'artistHubWallpaperUrl';
const LOCAL_STORAGE_THEME_KEY = 'artistHubTheme';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [wallpaperUrl, setWallpaperUrl] = useState(DEFAULT_WALLPAPER_URL);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark'); // Default to dark
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false); // Prevent SSR hydration mismatch

  // Effect for loading wallpaper and theme from localStorage
  useEffect(() => {
    setIsMounted(true); // Component has mounted on client

    // Load Wallpaper
    const savedWallpaperUrl = localStorage.getItem(LOCAL_STORAGE_WALLPAPER_KEY);
    if (savedWallpaperUrl) {
      setWallpaperUrl(savedWallpaperUrl);
    }

    // Load Theme
    const savedTheme = localStorage.getItem(LOCAL_STORAGE_THEME_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
    } else {
       // Optional: Check system preference if no theme saved
       const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
       setTheme(prefersDark ? 'dark' : 'light');
    }
  }, []); // Run only once on mount

  // Effect for applying theme class to HTML tag
  useEffect(() => {
    if (isMounted) { // Ensure this runs only on the client
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
      localStorage.setItem(LOCAL_STORAGE_THEME_KEY, theme); // Save theme preference
    }
  }, [theme, isMounted]); // Run when theme or isMounted changes

  const handleApplyWallpaper = (newUrl: string) => {
    const urlToSet = newUrl.trim() || DEFAULT_WALLPAPER_URL; // Use default if empty
    setWallpaperUrl(urlToSet);
    localStorage.setItem(LOCAL_STORAGE_WALLPAPER_KEY, urlToSet);
    setIsModalOpen(false);
  };

  const handleResetWallpaper = () => {
    setWallpaperUrl(DEFAULT_WALLPAPER_URL);
    localStorage.removeItem(LOCAL_STORAGE_WALLPAPER_KEY);
    setIsModalOpen(false);
  };

  const handleToggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
  };


  return (
    // Apply theme class dynamically to html tag
    <html lang="en" className={isMounted ? theme : 'dark'}>
      <head>
         {/* Basic metadata for client component */}
         <title>Artist Hub</title>
         <meta name="description" content="Manage your music releases and view streaming statistics." />
         {/* Add theme-color meta tag if needed for PWA/mobile browsers */}
         {/* <meta name="theme-color" content={theme === 'dark' ? '#1f2937' : '#ffffff'} /> */}
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

        {/* Settings Menu and Wallpaper Modal - Only render on client */}
        {isMounted && (
          <>
            {/* Replace WallpaperCustomizerButton with SettingsMenuButton */}
            <SettingsMenuButton
                onOpenWallpaperModal={() => setIsModalOpen(true)}
                onToggleTheme={handleToggleTheme}
                currentTheme={theme}
            />
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

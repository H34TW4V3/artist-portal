
"use client";

import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { SettingsMenuButton } from '@/components/common/settings-menu-button';
import { WallpaperCustomizerModal } from '@/components/common/wallpaper-customizer-modal';
import { AuthProvider } from '@/context/auth-context'; // Import AuthProvider
import { useState, useEffect } from 'react';

// Default wallpaper URL
const DEFAULT_WALLPAPER_URL = "https://t4.ftcdn.net/jpg/08/62/54/35/360_F_862543518_D0LQEQDZqkbTNM8CMB6iuiauhfaj4wr6.jpg";
const LOCAL_STORAGE_WALLPAPER_KEY = 'artistHubWallpaperUrl';
const LOCAL_STORAGE_THEME_KEY = 'artistHubTheme';

// Basic metadata structure - Note: 'use client' components cannot export metadata directly
// export const metadata: Metadata = {
//   title: 'Artist Hub',
//   description: 'Manage your music releases and view streaming statistics.',
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [wallpaperUrl, setWallpaperUrl] = useState(DEFAULT_WALLPAPER_URL);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const savedWallpaperUrl = localStorage.getItem(LOCAL_STORAGE_WALLPAPER_KEY);
    if (savedWallpaperUrl) {
      setWallpaperUrl(savedWallpaperUrl);
    }
    const savedTheme = localStorage.getItem(LOCAL_STORAGE_THEME_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
    } else {
       const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
       setTheme(prefersDark ? 'dark' : 'light');
    }
  }, []);

  useEffect(() => {
    if (isMounted) {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
      localStorage.setItem(LOCAL_STORAGE_THEME_KEY, theme);
    }
  }, [theme, isMounted]);

  const handleApplyWallpaper = (newUrlOrDataUri: string) => {
    const urlToSet = newUrlOrDataUri.trim() || DEFAULT_WALLPAPER_URL;
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

  // Ensure GeistSans variable is applied correctly
  // Remove whitespace between <html> tags
  return (
    <html lang="en" className={`${GeistSans.variable} ${isMounted ? theme : 'dark'}`}>
      <head>
         {/* Keep basic metadata for client components */}
         <title>Artist Hub</title>
         <meta name="description" content="Manage your music releases and view streaming statistics." />
      </head>
      <body className="font-sans antialiased bg-background text-foreground relative min-h-screen">
        <AuthProvider> {/* Wrap content with AuthProvider */}
            {/* Global Background Image */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-[0.08] dark:opacity-[0.10] transition-all duration-500 ease-in-out"
                style={{ backgroundImage: `url('${wallpaperUrl}')` }}
            />

            {/* Content wrapper */}
            <div className="relative z-10 min-h-screen flex flex-col">
                 {children} {/* Render the page content */}
            </div>

            {/* Settings Menu and Wallpaper Modal - Render only when authenticated or needed */}
            {isMounted && (
              <>
                <SettingsMenuButton
                    onOpenWallpaperModal={() => setIsModalOpen(true)}
                    onToggleTheme={handleToggleTheme}
                    currentTheme={theme}
                />
                <WallpaperCustomizerModal
                  isOpen={isModalOpen}
                  onClose={() => setIsModalOpen(false)}
                  currentUrl={wallpaperUrl === DEFAULT_WALLPAPER_URL ? '' : wallpaperUrl}
                  onApply={handleApplyWallpaper}
                  onReset={handleResetWallpaper}
                  defaultUrl={DEFAULT_WALLPAPER_URL}
                />
              </>
            )}

            <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}

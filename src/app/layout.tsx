
"use client";

import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { SettingsMenuButton } from '@/components/common/settings-menu-button';
import { WallpaperCustomizerModal } from '@/components/common/wallpaper-customizer-modal';
import { AboutModal } from '@/components/common/about-modal'; // Import AboutModal
import { AuthProvider } from '@/context/auth-context'; // Import AuthProvider
import { WeatherProvider } from '@/context/weather-context'; // Import WeatherProvider - Re-enabled
import { WeatherAnimationOverlay } from '@/components/common/weather-animation-overlay'; // Import WeatherAnimationOverlay - Re-enabled
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation'; // Import usePathname

// Default wallpaper URL (used for non-login pages initially)
const DEFAULT_WALLPAPER_URL = "https://t4.ftcdn.net/jpg/08/62/54/35/360_F_862543518_D0LQEQDZqkbTNM8CMB6iuiauhfaj4wr6.jpg";
const LOCAL_STORAGE_WALLPAPER_KEY = 'artistHubWallpaperUrl';
const LOCAL_STORAGE_THEME_KEY = 'artistHubTheme';
const LOCAL_STORAGE_WEATHER_ANIMATION_KEY = 'artistHubWeatherAnimationEnabled'; // Key for weather animation setting

// Basic metadata structure - Note: 'use client' components cannot export metadata directly
// export const metadata: Metadata = {
//   title: 'Artist Hub',
//   description: 'Manage your music releases and view streaming statistics.',
// };

// Define props type explicitly for RootLayout
interface RootLayoutProps {
  children: React.ReactNode;
  // We don't expect params here as it's a client component
}


export default function RootLayout({
  children,
}: RootLayoutProps) { // Use the defined interface
  const [wallpaperUrl, setWallpaperUrl] = useState(DEFAULT_WALLPAPER_URL);
  // Set initial state to 'dark'
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [showWeatherAnimations, setShowWeatherAnimations] = useState(true); // State for weather animations
  const [isWallpaperModalOpen, setIsWallpaperModalOpen] = useState(false); // Renamed for clarity
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false); // State for About modal
  const [isMounted, setIsMounted] = useState(false);
  const [browserLang, setBrowserLang] = useState('en'); // Default to 'en'
  const pathname = usePathname(); // Get current pathname

  useEffect(() => {
    setIsMounted(true);
    // Get browser language
    setBrowserLang(navigator.language.split('-')[0] || 'en');

    const savedWallpaperUrl = localStorage.getItem(LOCAL_STORAGE_WALLPAPER_KEY);
    // Apply saved wallpaper only if not on the login page
    if (savedWallpaperUrl && pathname !== '/login') {
      setWallpaperUrl(savedWallpaperUrl);
    } else if (pathname !== '/login') {
       setWallpaperUrl(DEFAULT_WALLPAPER_URL); // Use default if nothing saved and not login page
    }
    // Check local storage for theme preference
    const savedTheme = localStorage.getItem(LOCAL_STORAGE_THEME_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
    } else {
       // If no saved theme, default to dark (already set in initial state)
       // No need to check prefers-color-scheme unless you want it to override default
       setTheme('dark'); // Explicitly set dark as fallback if needed
    }

    // Check local storage for weather animation preference
    const savedWeatherAnimationPref = localStorage.getItem(LOCAL_STORAGE_WEATHER_ANIMATION_KEY);
    // Default to true if not found or invalid value
    setShowWeatherAnimations(savedWeatherAnimationPref === 'false' ? false : true);

  }, [pathname]); // Re-run when pathname changes to update wallpaper logic

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
    setIsWallpaperModalOpen(false);
  };

  const handleResetWallpaper = () => {
    setWallpaperUrl(DEFAULT_WALLPAPER_URL);
    localStorage.removeItem(LOCAL_STORAGE_WALLPAPER_KEY);
    setIsWallpaperModalOpen(false);
  };

  const handleToggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

   const handleToggleWeatherAnimations = () => {
    setShowWeatherAnimations((prev) => {
        const newState = !prev;
        localStorage.setItem(LOCAL_STORAGE_WEATHER_ANIMATION_KEY, String(newState));
        return newState;
    });
  };


  // Apply 'dark' class by default before mounting
  // Use browserLang for the html lang attribute
  return (
    <html lang={browserLang} className={`${GeistSans.variable} ${isMounted ? theme : 'dark'}`}>
      <head>
         {/* Removed explicit title and meta description - Let Next.js handle metadata via convention or export */}
         {/* Add link for placeholder artwork */}
         <link rel="preload" href="/placeholder-artwork.png" as="image" />
      </head>
      <body className="font-sans antialiased bg-background text-foreground relative min-h-screen">
        <AuthProvider> {/* Wrap content with AuthProvider */}
          <WeatherProvider> {/* Re-enabled WeatherProvider */}
             {/* Global Background Image - Rendered on all pages except potentially login */}
             {/* Conditionally apply based on path if login should NOT have it */}
             {pathname !== '/login' && (
                <div
                    className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-[0.15] dark:opacity-[0.20] transition-all duration-500 ease-in-out" // Adjusted opacity
                    style={{ backgroundImage: `url('${wallpaperUrl}')` }}
                />
             )}

             {/* Weather Animation Overlay - Re-enabled */}
             {pathname !== '/login' && showWeatherAnimations && <WeatherAnimationOverlay />}


            {/* Content wrapper */}
            <div className="relative z-10 min-h-screen flex flex-col">
                 {children} {/* Render the page content */}
            </div>

            {/* Settings Menu and Modals - Render only when authenticated or needed */}
            {/* Conditionally render based on mount state and pathname */}
            {isMounted && pathname !== '/login' && (
              <>
                <SettingsMenuButton
                    onOpenWallpaperModal={() => setIsWallpaperModalOpen(true)}
                    onToggleTheme={handleToggleTheme}
                    currentTheme={theme}
                    onToggleWeatherAnimations={handleToggleWeatherAnimations} // Pass handler
                    weatherAnimationsEnabled={showWeatherAnimations} // Pass current state
                    showWeatherToggle={true} // Re-enabled the toggle
                    onOpenAboutModal={() => setIsAboutModalOpen(true)} // Pass handler for About modal
                />
                <WallpaperCustomizerModal
                  isOpen={isWallpaperModalOpen}
                  onClose={() => setIsWallpaperModalOpen(false)}
                  currentUrl={wallpaperUrl === DEFAULT_WALLPAPER_URL ? '' : wallpaperUrl}
                  onApply={handleApplyWallpaper}
                  onReset={handleResetWallpaper}
                  defaultUrl={DEFAULT_WALLPAPER_URL}
                />
                 <AboutModal
                    isOpen={isAboutModalOpen}
                    onClose={() => setIsAboutModalOpen(false)}
                 />
              </>
            )}

            <Toaster />
           </WeatherProvider> {/* Re-enabled WeatherProvider */}
        </AuthProvider>
      </body>
    </html>
  );
}


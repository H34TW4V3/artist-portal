
"use client";

import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { SettingsMenuButton } from '@/components/common/settings-menu-button';
import { WallpaperCustomizerModal } from '@/components/common/wallpaper-customizer-modal';
import { AboutModal } from '@/components/common/about-modal';
import { AuthProvider } from '@/context/auth-context';
import { WeatherProvider } from '@/context/weather-context';
import { WeatherAnimationOverlay } from '@/components/common/weather-animation-overlay';
import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { getImageBrightness } from '@/lib/imageUtils'; // Import the brightness utility

// Default wallpaper URL
const DEFAULT_WALLPAPER_URL = "https://t4.ftcdn.net/jpg/08/62/54/35/360_F_862543518_D0LQEQDZqkbTNM8CMB6iuiauhfaj4wr6.jpg";
const LOCAL_STORAGE_WALLPAPER_KEY = 'artistHubWallpaperUrl';
const LOCAL_STORAGE_THEME_KEY = 'artistHubPreferredTheme'; // Key for user's preferred theme
const LOCAL_STORAGE_WEATHER_ANIMATION_KEY = 'artistHubWeatherAnimationEnabled';

interface RootLayoutProps {
  children: React.ReactNode;
}

// Brightness threshold to switch between light/dark theme
const BRIGHTNESS_THRESHOLD = 128; // Adjust as needed (0-255)

export default function RootLayout({ children }: RootLayoutProps) {
  const [wallpaperUrl, setWallpaperUrl] = useState(DEFAULT_WALLPAPER_URL);
  const [preferredTheme, setPreferredTheme] = useState<'light' | 'dark'>('dark'); // User's explicit choice, defaults to dark
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('dark'); // Actual theme applied
  const [isAnalyzingWallpaper, setIsAnalyzingWallpaper] = useState(false);
  const [showWeatherAnimations, setShowWeatherAnimations] = useState(true);
  const [isWallpaperModalOpen, setIsWallpaperModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [browserLang, setBrowserLang] = useState('en');
  const pathname = usePathname();

  // Initial load effect for settings from localStorage
  useEffect(() => {
    setIsMounted(true);
    setBrowserLang(navigator.language.split('-')[0] || 'en');

    const savedWallpaperUrl = localStorage.getItem(LOCAL_STORAGE_WALLPAPER_KEY);
    const savedPreferredTheme = localStorage.getItem(LOCAL_STORAGE_THEME_KEY);
    const savedWeatherAnimationPref = localStorage.getItem(LOCAL_STORAGE_WEATHER_ANIMATION_KEY);

    if (savedWallpaperUrl && pathname !== '/login') {
      setWallpaperUrl(savedWallpaperUrl);
    } else if (pathname !== '/login') {
       setWallpaperUrl(DEFAULT_WALLPAPER_URL);
    }

    if (savedPreferredTheme === 'light' || savedPreferredTheme === 'dark') {
      setPreferredTheme(savedPreferredTheme);
      // Set initial effective theme based on preference before analysis
      setEffectiveTheme(savedPreferredTheme);
    } else {
       setPreferredTheme('dark'); // Default preference
       setEffectiveTheme('dark'); // Default effective theme
    }

    setShowWeatherAnimations(savedWeatherAnimationPref === 'false' ? false : true);

  }, [pathname]); // Re-run if pathname changes

  // Effect to analyze wallpaper brightness and set effective theme
  const analyzeAndSetTheme = useCallback(async (url: string) => {
    // On login page or before mount, use preferred theme directly
    if (!isMounted || pathname === '/login') {
        setEffectiveTheme(preferredTheme);
        return;
    }

    setIsAnalyzingWallpaper(true);
    // console.log("Analyzing wallpaper:", url);
    try {
        const brightness = await getImageBrightness(url);
        // console.log("Calculated brightness:", brightness);

        if (brightness !== null) {
            const newEffectiveTheme = brightness > BRIGHTNESS_THRESHOLD ? 'light' : 'dark';
            // console.log("Setting effective theme based on brightness:", newEffectiveTheme);
            setEffectiveTheme(newEffectiveTheme);
        } else {
            // If brightness calculation fails, fall back to user preference
            // console.log("Brightness calculation failed, falling back to preferred theme:", preferredTheme);
            setEffectiveTheme(preferredTheme);
        }
    } catch (error) {
         console.error("Error during wallpaper analysis:", error);
         setEffectiveTheme(preferredTheme); // Fallback on error
    } finally {
         setIsAnalyzingWallpaper(false);
    }
  }, [isMounted, pathname, preferredTheme]); // Add preferredTheme dependency for fallback

  // Analyze wallpaper whenever URL or mounted status changes, or preference changes
  useEffect(() => {
      analyzeAndSetTheme(wallpaperUrl);
  }, [wallpaperUrl, analyzeAndSetTheme]); // Include analyzeAndSetTheme in dependency array

  // Effect to apply the effective theme class to the HTML element
  useEffect(() => {
    if (isMounted) {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(effectiveTheme);
      // console.log("Applied theme class:", effectiveTheme);
    }
  }, [effectiveTheme, isMounted]);


  const handleApplyWallpaper = (newUrlOrDataUri: string) => {
    const urlToSet = newUrlOrDataUri.trim() || DEFAULT_WALLPAPER_URL;
    setWallpaperUrl(urlToSet); // This will trigger the brightness analysis effect
    localStorage.setItem(LOCAL_STORAGE_WALLPAPER_KEY, urlToSet);
    setIsWallpaperModalOpen(false);
  };

  const handleResetWallpaper = () => {
    setWallpaperUrl(DEFAULT_WALLPAPER_URL); // This will trigger the brightness analysis effect
    localStorage.removeItem(LOCAL_STORAGE_WALLPAPER_KEY);
    setIsWallpaperModalOpen(false);
  };

  // Toggle only the *preferred* theme
  const handleTogglePreferredTheme = () => {
    setPreferredTheme((prevTheme) => {
        const newPref = prevTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem(LOCAL_STORAGE_THEME_KEY, newPref);
         // Re-analyze wallpaper immediately with new preference as fallback if needed
         // This is slightly redundant if analyzeAndSetTheme already depends on preferredTheme,
         // but ensures immediate fallback application if analysis is skipped (e.g., on login page).
         analyzeAndSetTheme(wallpaperUrl);
        return newPref;
    });
  };

   const handleToggleWeatherAnimations = () => {
    setShowWeatherAnimations((prev) => {
        const newState = !prev;
        localStorage.setItem(LOCAL_STORAGE_WEATHER_ANIMATION_KEY, String(newState));
        return newState;
    });
  };


  return (
    <html lang={browserLang} className={`${GeistSans.variable} ${isMounted ? effectiveTheme : 'dark'}`}>
      <head>
         {/* Preload placeholder artwork if used frequently */}
         <link rel="preload" href="/placeholder-artwork.png" as="image" />
      </head>
      <body className="font-sans antialiased bg-background text-foreground relative min-h-screen">
        <AuthProvider>
          <WeatherProvider>
             {/* Apply wallpaper background only if not on login page */}
             {pathname !== '/login' && (
                <div
                    className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-[0.15] dark:opacity-[0.20] transition-all duration-500 ease-in-out"
                    style={{ backgroundImage: `url('${wallpaperUrl}')` }}
                />
             )}
             {/* Show weather animations only if enabled and not on login page */}
             {pathname !== '/login' && showWeatherAnimations && <WeatherAnimationOverlay />}
            <div className="relative z-10 min-h-screen flex flex-col">
                 {children}
            </div>
            {/* Show settings button only when mounted and not on login page */}
            {isMounted && pathname !== '/login' && (
              <>
                <SettingsMenuButton
                    onOpenWallpaperModal={() => setIsWallpaperModalOpen(true)}
                    onToggleTheme={handleTogglePreferredTheme} // Toggle preference
                    currentTheme={preferredTheme} // Show preference in menu
                    onToggleWeatherAnimations={handleToggleWeatherAnimations}
                    weatherAnimationsEnabled={showWeatherAnimations}
                    showWeatherToggle={true} // Keep weather toggle visible
                    onOpenAboutModal={() => setIsAboutModalOpen(true)}
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
           </WeatherProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

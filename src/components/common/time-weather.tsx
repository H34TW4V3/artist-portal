
"use client";

import { useState, useEffect } from 'react';
import { Clock, Sun, Cloud, MapPin } from 'lucide-react'; // Import icons

// Placeholder weather data structure
interface WeatherData {
  temp: string;
  description: string;
  icon: React.ReactNode;
  location: string;
}

export function TimeWeather() {
  const [currentTime, setCurrentTime] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Update time every second
  useEffect(() => {
    const updateClock = () => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };

    updateClock(); // Initial update
    const intervalId = setInterval(updateClock, 1000); // Update every second

    return () => clearInterval(intervalId); // Cleanup interval on unmount
  }, []);

  // Fetch location and weather (using placeholders for now)
  useEffect(() => {
    const fetchLocationAndWeather = async () => {
      setLoadingWeather(true);
      setError(null);

      // Placeholder for location - In a real app, use navigator.geolocation
      const locationName = "City Name"; // Placeholder

      // Placeholder for weather fetch - In a real app, use fetch with an API
      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Mock weather data
        const mockWeatherData: WeatherData = {
          temp: "22°C", // Placeholder temperature
          description: "Sunny", // Placeholder description
          icon: <Sun className="h-4 w-4 text-yellow-500" />, // Placeholder icon
          location: locationName,
        };
        setWeather(mockWeatherData);

      } catch (err) {
        console.error("Error fetching weather (placeholder):", err);
        setError("Could not load weather.");
      } finally {
        setLoadingWeather(false);
      }
    };

    fetchLocationAndWeather();
  }, []); // Run once on mount

  return (
    <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
      {/* Time Display */}
      <div className="flex items-center gap-1">
        <Clock className="h-4 w-4" />
        {currentTime !== null ? (
          <span>{currentTime}</span>
        ) : (
          <span className="opacity-50">--:--</span> // Placeholder while loading
        )}
      </div>

      {/* Separator */}
      <div className="h-4 w-px bg-border/50 hidden sm:block"></div>

      {/* Weather Display */}
      <div className="flex items-center gap-1">
        {loadingWeather ? (
          <span className="opacity-50">Loading weather...</span>
        ) : error ? (
          <span className="text-destructive">{error}</span>
        ) : weather ? (
          <>
            {weather.icon}
            <span className="hidden sm:inline">{weather.temp}, {weather.description}</span>
            <span className="sm:hidden">{weather.temp}</span> {/* Show temp only on small screens */}
            <MapPin className="h-4 w-4 ml-1 hidden md:inline" />
            <span className="hidden md:inline">{weather.location}</span>
          </>
        ) : (
          <span className="opacity-50">Weather unavailable</span>
        )}
      </div>
    </div>
  );
}

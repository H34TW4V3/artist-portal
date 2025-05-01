
"use client";

import { useState, useEffect } from 'react';
import { Clock, Sun, Cloud, MapPin, Umbrella, Snowflake } from 'lucide-react'; // MapPin no longer used directly, keep for potential future use
import { useWeather, type WeatherCondition } from '@/context/weather-context'; // Import context hook and type

// Extended Placeholder weather data structure matching WeatherContext
interface WeatherData {
  temp: string;
  description: string;
  icon: React.ReactNode;
  location: string; // Location kept in mock data structure for cycle logic, but not displayed
  condition: WeatherCondition; // Add condition field
}

// Mock weather cycle (Kept for demonstration as real weather requires API key)
const mockWeatherConditions: WeatherCondition[] = ['sunny', 'cloudy', 'rainy', 'snowy'];
const mockWeatherDataCycle: WeatherData[] = [
    { temp: "25°C", description: "Sunny", icon: <Sun className="h-4 w-4 text-yellow-500" />, location: "Los Angeles", condition: 'sunny' },
    { temp: "18°C", description: "Cloudy", icon: <Cloud className="h-4 w-4 text-gray-400" />, location: "London", condition: 'cloudy' }, // Changed description slightly for variety
    { temp: "15°C", description: "Rainy", icon: <Umbrella className="h-4 w-4 text-blue-400" />, location: "Seattle", condition: 'rainy' }, // Changed description slightly
    { temp: "-2°C", description: "Snowy", icon: <Snowflake className="h-4 w-4 text-blue-200" />, location: "Stockholm", condition: 'snowy' }, // Changed description slightly
];

export function TimeWeather() {
  const { setWeatherCondition } = useWeather(); // Get setter from context
  const [currentTime, setCurrentTime] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weatherIndex, setWeatherIndex] = useState(0); // State to cycle mock weather

  // Update time every second
  useEffect(() => {
    const updateClock = () => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };

    updateClock(); // Initial update
    const intervalId = setInterval(updateClock, 1000); // Update every second

    return () => clearInterval(intervalId); // Cleanup interval on unmount
  }, []);

  // Fetch location and weather (using mock cycle for demonstration)
  // NOTE: To use browser location, you'd replace the mock logic below with:
  // 1. navigator.geolocation.getCurrentPosition to get lat/lon.
  // 2. Fetch request to a weather API (like OpenWeatherMap - requires API key) using the coordinates.
  // 3. Update state with real weather data and call setWeatherCondition.
  useEffect(() => {
    const fetchMockWeather = async () => {
      setLoadingWeather(true);
      setError(null);

      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500)); // Shorter delay

        // Get current mock weather data
        const currentMockWeather = mockWeatherDataCycle[weatherIndex];
        setWeather(currentMockWeather);

        // Update the global weather context
        setWeatherCondition(currentMockWeather.condition);
        console.log(`Weather Context Updated: ${currentMockWeather.condition}`);

      } catch (err) {
        console.error("Error setting mock weather:", err);
        setError("Could not load weather.");
        setWeatherCondition(null); // Reset context on error
      } finally {
        setLoadingWeather(false);
      }
    };

    fetchMockWeather();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weatherIndex]); // Rerun when weatherIndex changes

   // Effect to cycle through mock weather every 15 seconds
   useEffect(() => {
     const weatherCycleInterval = setInterval(() => {
       setWeatherIndex(prevIndex => (prevIndex + 1) % mockWeatherDataCycle.length);
     }, 15000); // Change weather every 15 seconds

     return () => clearInterval(weatherCycleInterval);
   }, []);


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

      {/* Weather Display (Updated - No Location) */}
      <div className="flex items-center gap-1">
        {loadingWeather ? (
          <span className="opacity-50">Loading weather...</span>
        ) : error ? (
          <span className="text-destructive">{error}</span>
        ) : weather ? (
          <>
            {weather.icon}
            <span className="">{weather.temp}, {weather.description}</span>
            {/* Location Removed */}
            {/* <MapPin className="h-4 w-4 ml-1 hidden md:inline" /> */}
            {/* <span className="hidden md:inline">{weather.location}</span> */}
          </>
        ) : (
          <span className="opacity-50">Weather unavailable</span>
        )}
      </div>
    </div>
  );
}

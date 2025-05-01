
"use client";

import { useState, useEffect } from 'react';
import { Clock, Sun, Cloud, MapPin, Umbrella, Snowflake } from 'lucide-react'; // Import more icons
import { useWeather, type WeatherCondition } from '@/context/weather-context'; // Import context hook and type

// Extended Placeholder weather data structure matching WeatherContext
interface WeatherData {
  temp: string;
  description: string;
  icon: React.ReactNode;
  location: string;
  condition: WeatherCondition; // Add condition field
}

// Mock weather cycle
const mockWeatherConditions: WeatherCondition[] = ['sunny', 'cloudy', 'rainy', 'snowy'];
const mockWeatherDataCycle: WeatherData[] = [
    { temp: "25°C", description: "Sunny", icon: <Sun className="h-4 w-4 text-yellow-500" />, location: "Los Angeles", condition: 'sunny' },
    { temp: "18°C", description: "Partly Cloudy", icon: <Cloud className="h-4 w-4 text-gray-400" />, location: "London", condition: 'cloudy' },
    { temp: "15°C", description: "Light Rain", icon: <Umbrella className="h-4 w-4 text-blue-400" />, location: "Seattle", condition: 'rainy' },
    { temp: "-2°C", description: "Snowing", icon: <Snowflake className="h-4 w-4 text-blue-200" />, location: "Stockholm", condition: 'snowy' },
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

  // Fetch location and weather (using mock cycle for now)
  useEffect(() => {
    const fetchLocationAndWeather = async () => {
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

    fetchLocationAndWeather();
  }, [weatherIndex, setWeatherCondition]); // Rerun when weatherIndex or setWeatherCondition changes

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

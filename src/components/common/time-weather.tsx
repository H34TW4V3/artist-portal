"use client";

import { useState, useEffect } from 'react';
import { Sun, Cloud, MapPin, Umbrella, Snowflake, LocateFixed, AlertTriangle } from 'lucide-react'; // Removed Clock, Added LocateFixed, AlertTriangle
import { useWeather, type WeatherCondition } from '@/context/weather-context'; // Import context hook and type
import { useToast } from '@/hooks/use-toast'; // Import useToast for notifications

// Extended Placeholder weather data structure matching WeatherContext
interface WeatherData {
  temp: string;
  description: string;
  icon: React.ReactNode;
  location?: string; // Location is now optional in display
  condition: WeatherCondition; // Add condition field
}

// Mock weather cycle (USED AS FALLBACK ONLY)
const mockWeatherDataCycle: WeatherData[] = [
    { temp: "25°C", description: "Sunny", icon: <Sun className="h-4 w-4 text-yellow-500" />, location: "Los Angeles", condition: 'sunny' },
    { temp: "18°C", description: "Cloudy", icon: <Cloud className="h-4 w-4 text-gray-400" />, location: "London", condition: 'cloudy' },
    { temp: "15°C", description: "Rainy", icon: <Umbrella className="h-4 w-4 text-blue-400" />, location: "Seattle", condition: 'rainy' },
    { temp: "-2°C", description: "Snowy", icon: <Snowflake className="h-4 w-4 text-blue-200" />, location: "Stockholm", condition: 'snowy' },
];

export function TimeWeather() {
  const { setWeatherCondition } = useWeather(); // Get setter from context
  const [currentTime, setCurrentTime] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weatherIndex, setWeatherIndex] = useState(0); // State to cycle mock weather (fallback)
  const [usingMockData, setUsingMockData] = useState(false); // Track if using fallback
  const { toast } = useToast(); // Initialize toast

  // Update time every second
  useEffect(() => {
    const updateClock = () => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };

    updateClock(); // Initial update
    const intervalId = setInterval(updateClock, 1000); // Update every second

    return () => clearInterval(intervalId); // Cleanup interval on unmount
  }, []);

  // --- Fetch Real Location and Weather ---
  useEffect(() => {
    const fetchRealWeather = async (latitude: number, longitude: number) => {
        console.log(`Geolocation successful: Lat: ${latitude}, Lon: ${longitude}`);
        // --- API CALL WOULD GO HERE ---
        // const apiKey = process.env.NEXT_PUBLIC_OPENWEATHERMAP_API_KEY;
        // if (!apiKey) {
        //     console.error("Weather API key not configured.");
        //     setError("Weather service unavailable.");
        //     setWeatherCondition(null);
        //     setLoadingWeather(false);
        //     setUsingMockData(true); // Fallback to mock if API key missing
        //     toast({ title: "Weather Service", description: "API key missing. Falling back to mock data.", variant: "destructive" });
        //     return;
        // }
        // const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`;
        // try {
        //     const response = await fetch(apiUrl);
        //     if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        //     const data = await response.json();
        //     // --- PARSE API RESPONSE AND SET STATE ---
        //     // Example parsing (adjust based on actual API response structure):
        //     const temp = `${Math.round(data.main.temp)}°C`;
        //     const description = data.weather[0]?.description || 'Unknown';
        //     const condition = mapApiConditionToLocal(data.weather[0]?.main); // Helper needed
        //     const locationName = data.name;
        //     setWeather({
        //          temp,
        //          description,
        //          icon: getWeatherIcon(condition), // Helper needed
        //          location: locationName,
        //          condition,
        //     });
        //     setWeatherCondition(condition);
        //     setError(null);
        //     setUsingMockData(false);
        // } catch (fetchError) {
        //     console.error("Error fetching real weather:", fetchError);
        //     setError("Could not fetch weather.");
        //     setWeatherCondition(null);
        //     setUsingMockData(true); // Fallback to mock on fetch error
        //     toast({ title: "Weather Error", description: "Could not fetch real weather. Falling back to mock data.", variant: "destructive" });
        // } finally {
        //     setLoadingWeather(false);
        // }

        // --- Placeholder Implementation (Remove when API call is added) ---
        await new Promise(resolve => setTimeout(resolve, 300)); // Simulate short delay
        console.warn("Real weather fetch not implemented. Using placeholder/mock fallback.");
        setWeather({
            temp: "N/A",
            description: "Real weather requires API key",
            icon: <AlertTriangle className="h-4 w-4 text-orange-500" />,
            location: "Your Location",
            condition: null
        });
        setWeatherCondition(null); // Set context condition to null
        setError("Real weather needs setup."); // Indicate setup needed
        setLoadingWeather(false);
        setUsingMockData(true); // Technically falling back
        // toast({ title: "Weather Info", description: "Real weather fetch needs API configuration.", variant: "default" });
         // --- End Placeholder ---
    };

    const handleGeolocationError = (error: GeolocationPositionError) => {
      console.warn("Geolocation error:", error.message);
      let message = "Could not get location. ";
      if (error.code === error.PERMISSION_DENIED) {
          message += "Location permission denied.";
      } else {
          message += "Falling back to mock weather.";
      }
      setError(message);
      toast({ title: "Location Error", description: message, variant: "destructive" });
      setWeatherCondition(null); // Clear condition on error
      setLoadingWeather(false);
      setUsingMockData(true); // Use mock data as fallback
    };

    // Check for geolocation support
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser. Falling back to mock weather.");
      toast({ title: "Compatibility Issue", description: "Geolocation not supported. Using mock weather.", variant: "destructive" });
      setWeatherCondition(null);
      setLoadingWeather(false);
      setUsingMockData(true);
      return;
    }

    // Request location
    setLoadingWeather(true);
    setError(null); // Clear previous errors
    setUsingMockData(false); // Assume real data initially
    navigator.geolocation.getCurrentPosition(
      (position) => fetchRealWeather(position.coords.latitude, position.coords.longitude),
      handleGeolocationError,
      { timeout: 10000 } // Add a timeout
    );

  }, [setWeatherCondition, toast]); // Run once on mount

   // --- Effect for Mock Data Cycle (ONLY RUNS if usingMockData is true) ---
   useEffect(() => {
     if (!usingMockData) return; // Don't run if we got real location/weather

     console.log("Using mock weather data cycle.");

     const fetchMockWeather = async () => {
       setLoadingWeather(true); // Show loading briefly for mock change
       // Simulate API call delay
       await new Promise(resolve => setTimeout(resolve, 200)); // Short delay

       const currentMockWeather = mockWeatherDataCycle[weatherIndex];
       setWeather(currentMockWeather);
       setWeatherCondition(currentMockWeather.condition);
       setLoadingWeather(false);
     };

     fetchMockWeather();

     // Set up the interval to cycle mock data
     const weatherCycleInterval = setInterval(() => {
       setWeatherIndex(prevIndex => (prevIndex + 1) % mockWeatherDataCycle.length);
     }, 15000); // Change weather every 15 seconds

     // Cleanup function
     return () => {
         clearInterval(weatherCycleInterval);
         console.log("Cleared mock weather interval.");
     }
     // Re-run this effect if `usingMockData` becomes true or `weatherIndex` changes
   }, [usingMockData, weatherIndex, setWeatherCondition]);


  return (
    <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
      {/* Time Display (No Icon) */}
      <div className="flex items-center gap-1">
        {/* <Clock className="h-4 w-4" /> Removed */}
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
           <>
            <LocateFixed className="h-4 w-4 animate-spin opacity-50" />
            <span className="opacity-50">Loading weather...</span>
           </>
        ) : error ? ( // Display specific error related to location/fetch
            <>
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-destructive">{error}</span>
            </>
        ) : weather ? (
          <>
            {weather.icon}
            <span>{weather.temp}, {weather.description}</span>
            {/* Optionally show location if available and desired */}
            {/* {weather.location && <span className="hidden md:inline"> - {weather.location}</span>} */}
          </>
        ) : (
           <>
            <AlertTriangle className="h-4 w-4 text-muted-foreground opacity-50" />
            <span className="opacity-50">Weather unavailable</span>
           </>
        )}
      </div>
    </div>
  );
}

// --- Helper functions needed for real API integration ---

// function mapApiConditionToLocal(apiCondition: string): WeatherCondition {
//     // Map API condition strings (e.g., "Clear", "Clouds", "Rain", "Snow") to your local types
//     const lowerCaseCondition = apiCondition.toLowerCase();
//     if (lowerCaseCondition.includes('clear')) return 'sunny';
//     if (lowerCaseCondition.includes('cloud')) return 'cloudy';
//     if (lowerCaseCondition.includes('rain') || lowerCaseCondition.includes('drizzle')) return 'rainy';
//     if (lowerCaseCondition.includes('snow') || lowerCaseCondition.includes('sleet')) return 'snowy';
//     return null; // Default or unknown
// }

// function getWeatherIcon(condition: WeatherCondition): React.ReactNode {
//     switch (condition) {
//         case 'sunny': return <Sun className="h-4 w-4 text-yellow-500" />;
//         case 'cloudy': return <Cloud className="h-4 w-4 text-gray-400" />;
//         case 'rainy': return <Umbrella className="h-4 w-4 text-blue-400" />;
//         case 'snowy': return <Snowflake className="h-4 w-4 text-blue-200" />;
//         default: return <HelpCircle className="h-4 w-4 text-muted-foreground" />; // Or some default icon
//     }
// }

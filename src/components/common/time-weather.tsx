
"use client";

import { useState, useEffect, useCallback } from 'react'; // Import useCallback
import { Sun, Cloud, MapPin, Umbrella, Snowflake, LocateFixed, AlertTriangle, CloudRain, CloudSnow, CloudLightning, Haze, Wind, HelpCircle, Siren } from 'lucide-react'; // Added Siren for limit
import { useWeather, type WeatherCondition } from '@/context/weather-context'; // Import context hook and type
import { useToast } from '@/hooks/use-toast'; // Import useToast for notifications

// Define session storage key for API call count
const WEATHER_API_CALL_COUNT_KEY = 'weatherApiCallCount';
const MAX_API_CALLS_PER_SESSION = 3;

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
    { temp: "15°C", description: "Rainy", icon: <CloudRain className="h-4 w-4 text-blue-400" />, location: "Seattle", condition: 'rainy' },
    { temp: "-2°C", description: "Snowy", icon: <CloudSnow className="h-4 w-4 text-blue-200" />, location: "Stockholm", condition: 'snowy' },
];

export function TimeWeather() {
  const { setWeatherCondition } = useWeather(); // Get setter from context
  const [currentTime, setCurrentTime] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weatherIndex, setWeatherIndex] = useState(0); // State to cycle mock weather (fallback)
  const [usingMockData, setUsingMockData] = useState(false); // Track if using fallback
  const [apiCallLimitReached, setApiCallLimitReached] = useState(false); // Track API limit
  const { toast } = useToast(); // Initialize toast

  // Function to get and increment API call count
  const checkAndIncrementApiCount = useCallback((): boolean => {
    if (typeof window === 'undefined') return false; // Don't run on server

    try {
      const currentCountStr = sessionStorage.getItem(WEATHER_API_CALL_COUNT_KEY);
      const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;

      if (currentCount >= MAX_API_CALLS_PER_SESSION) {
        console.warn(`Weather API call limit (${MAX_API_CALLS_PER_SESSION}) reached for this session.`);
        setApiCallLimitReached(true);
        return false; // Limit reached
      }

      // Increment only if fetch is successful (handled inside fetchRealWeather)
      return true; // Limit not reached, proceed
    } catch (e) {
        console.error("Error accessing sessionStorage for API count:", e);
        // Proceed cautiously if sessionStorage fails, maybe allow one call?
        return true;
    }
  }, []);

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
  const fetchRealWeather = useCallback(async (latitude: number, longitude: number) => {
    console.log(`Geolocation successful: Lat: ${latitude}, Lon: ${longitude}`);
    setLoadingWeather(true);
    setError(null);
    setUsingMockData(false); // Assume real data initially
    setApiCallLimitReached(false); // Reset limit flag

    const apiKey = process.env.NEXT_PUBLIC_OPENWEATHERMAP_API_KEY;
    if (!apiKey) {
        console.error("Weather API key not configured (NEXT_PUBLIC_OPENWEATHERMAP_API_KEY).");
        setError("Weather unavailable.");
        setWeatherCondition(null);
        setLoadingWeather(false);
        setUsingMockData(true); // Fallback to mock if API key missing
        toast({ title: "Weather Service Error", description: "API key missing. Using mock data.", variant: "destructive" });
        return;
    }
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`;
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
             const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
             throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // --- PARSE API RESPONSE AND SET STATE ---
        if (!data.main || !data.weather || !data.weather[0]) {
            throw new Error("Invalid API response structure.");
        }

        // Increment API call count in sessionStorage *after* successful fetch
        try {
            const currentCountStr = sessionStorage.getItem(WEATHER_API_CALL_COUNT_KEY);
            const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;
            sessionStorage.setItem(WEATHER_API_CALL_COUNT_KEY, (currentCount + 1).toString());
            console.log(`Weather API call count incremented to ${currentCount + 1}`);
        } catch (e) {
            console.error("Error updating sessionStorage for API count:", e);
        }


        const temp = `${Math.round(data.main.temp)}°C`;
        // Capitalize first letter of description
        const description = data.weather[0].description
                             ? data.weather[0].description.charAt(0).toUpperCase() + data.weather[0].description.slice(1)
                             : 'Unknown';
        const condition = mapApiConditionToLocal(data.weather[0].main); // Use helper
        const locationName = data.name; // City name from API

        setWeather({
             temp,
             description,
             icon: getWeatherIcon(condition), // Use helper
             location: locationName, // Store location name
             condition,
        });
        setWeatherCondition(condition); // Update context
        setError(null); // Clear any previous error
        setUsingMockData(false);
        console.log("Real weather fetched successfully:", { temp, description, locationName, condition });

    } catch (fetchError) {
        console.error("Error fetching real weather:", fetchError);
        setError("Weather unavailable."); // Keep error simple for UI
        setWeatherCondition(null);
        setUsingMockData(true); // Fallback to mock on fetch error
        toast({ title: "Weather Error", description: `Could not fetch weather. ${fetchError instanceof Error ? fetchError.message : ''}. Using mock data.`, variant: "destructive" });
    } finally {
        setLoadingWeather(false);
    }
  }, [setWeatherCondition, toast]); // Removed checkAndIncrementApiCount from here

  // --- Geolocation and Initial Fetch Logic ---
  useEffect(() => {
    const handleGeolocationError = (error: GeolocationPositionError) => {
      console.warn("Geolocation error:", error.message, `Code: ${error.code}`);
      let message = "Could not get location. ";
      if (error.code === error.PERMISSION_DENIED) {
          message += "Please enable location permissions in your browser settings.";
      } else if (error.code === error.POSITION_UNAVAILABLE) {
          message += "Location information is unavailable.";
      } else if (error.code === error.TIMEOUT) {
           message += "Request timed out.";
      } else {
          message += "An unknown error occurred.";
      }
      message += " Using mock weather.";

      setError(message.split(" Using mock weather.")[0]); // Show only the location error part initially
      toast({ title: "Location Error", description: message, variant: "destructive" });
      setWeatherCondition(null); // Clear condition on error
      setLoadingWeather(false);
      setUsingMockData(true); // Use mock data as fallback
    };

    // Check for geolocation support
    if (typeof window !== 'undefined' && !navigator.geolocation) {
      setError("Geolocation not supported.");
      toast({ title: "Compatibility Issue", description: "Geolocation not supported by this browser. Using mock weather.", variant: "destructive" });
      setWeatherCondition(null);
      setLoadingWeather(false);
      setUsingMockData(true);
      return;
    }

    // Request location only on client-side after mount
    if (typeof window !== 'undefined') {
        // Check API call limit *before* requesting location/fetching
        if (!checkAndIncrementApiCount()) {
            setError(`API call limit (${MAX_API_CALLS_PER_SESSION}) reached.`);
            toast({ title: "Weather Update Limit", description: `Weather API call limit reached for this session. Using mock data.`, variant: "default" });
            setWeatherCondition(null);
            setLoadingWeather(false);
            setUsingMockData(true);
            return; // Stop if limit reached
        }

        console.log("Requesting geolocation...");
        navigator.geolocation.getCurrentPosition(
        (position) => fetchRealWeather(position.coords.latitude, position.coords.longitude),
        handleGeolocationError,
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 } // Use standard accuracy, 10s timeout, cache for 10 min
        );
    }


  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchRealWeather, checkAndIncrementApiCount]); // Add dependencies

   // --- Effect for Mock Data Cycle (ONLY RUNS if usingMockData is true) ---
   useEffect(() => {
     if (!usingMockData) return; // Don't run if we got real location/weather

     console.log("Using mock weather data cycle.");

     const fetchMockWeather = async () => {
       setLoadingWeather(true); // Show loading briefly for mock change
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
        ) : apiCallLimitReached ? ( // Display specific message if limit reached
           <>
               <Siren className="h-4 w-4 text-orange-500" />
               <span className="text-orange-500">API Limit Reached</span>
           </>
        ) : error ? ( // Display specific error related to location/fetch
            <>
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-destructive">{error}</span>
            </>
        ) : weather ? (
          <>
            {weather.icon}
            {/* Only show temp and description */}
            <span>{weather.temp}, {weather.description}</span>
            {/* Optionally show location from API */}
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

/**
 * Maps OpenWeatherMap main condition strings to local WeatherCondition types.
 * @param apiCondition - The main weather condition string from OpenWeatherMap (e.g., "Clear", "Clouds", "Rain").
 * @returns The corresponding local WeatherCondition type or null if unknown.
 */
function mapApiConditionToLocal(apiCondition: string | undefined): WeatherCondition {
    if (!apiCondition) return null;
    const lowerCaseCondition = apiCondition.toLowerCase();

    // Map based on OpenWeatherMap main conditions
    // See: https://openweathermap.org/weather-conditions#Weather-Condition-Codes-2
    if (lowerCaseCondition.includes('clear')) return 'sunny';
    if (lowerCaseCondition.includes('cloud')) return 'cloudy';
    if (lowerCaseCondition.includes('rain') || lowerCaseCondition.includes('drizzle')) return 'rainy';
    if (lowerCaseCondition.includes('snow') || lowerCaseCondition.includes('sleet')) return 'snowy';
    // Add more specific conditions if needed for animations
    if (lowerCaseCondition.includes('thunderstorm')) return 'rainy'; // Group thunderstorm with rainy for now
    if (lowerCaseCondition.includes('mist') || lowerCaseCondition.includes('fog') || lowerCaseCondition.includes('haze')) return 'cloudy'; // Group atmospheric conditions with cloudy
    if (lowerCaseCondition.includes('squall') || lowerCaseCondition.includes('tornado')) return 'cloudy'; // Group extreme weather with cloudy for now

    console.warn("Unmapped API weather condition:", apiCondition);
    return null; // Default or unknown
}

/**
 * Returns the appropriate icon component based on the local WeatherCondition type.
 * @param condition - The local WeatherCondition type.
 * @returns A ReactNode representing the icon.
 */
function getWeatherIcon(condition: WeatherCondition): React.ReactNode {
    switch (condition) {
        case 'sunny': return <Sun className="h-4 w-4 text-yellow-500" />;
        case 'cloudy': return <Cloud className="h-4 w-4 text-gray-400" />;
        case 'rainy': return <CloudRain className="h-4 w-4 text-blue-400" />; // More specific rain icon
        case 'snowy': return <CloudSnow className="h-4 w-4 text-blue-200" />; // More specific snow icon
        // Add other icons if mapApiConditionToLocal is expanded
        // case 'windy': return <Wind className="h-4 w-4 text-gray-500" />;
        // case 'stormy': return <CloudLightning className="h-4 w-4 text-yellow-600" />;
        default: return <HelpCircle className="h-4 w-4 text-muted-foreground" />; // Default icon for null or unmapped
    }
}

    
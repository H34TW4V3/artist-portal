
"use client";

import React from 'react';
import { useWeather, WeatherCondition } from '@/context/weather-context';
import { Sun, Cloud, Umbrella, Snowflake } from 'lucide-react'; // Import icons or use specific animation components

// Helper function to generate random position and animation delays
const randomStyle = (containerWidth: number, containerHeight: number) => ({
  left: `${Math.random() * containerWidth}px`,
  top: `${Math.random() * containerHeight}px`,
  animationDuration: `${Math.random() * 3 + 2}s`, // 2-5 seconds duration
  animationDelay: `${Math.random() * 2}s`, // 0-2 seconds delay
});


const WeatherIconAnimation: React.FC<{ condition: WeatherCondition }> = ({ condition }) => {
    const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });

    React.useEffect(() => {
        const updateDimensions = () => {
             setDimensions({ width: window.innerWidth, height: window.innerHeight });
        }
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);


  const particleCount = 20; // Number of icons/particles

  const renderParticles = () => {
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      let icon;
      let animationClass = '';
      let colorClass = '';

      switch (condition) {
        case 'sunny':
          icon = <Sun className="h-4 w-4" />;
          animationClass = 'animate-subtle-pulse'; // Simple pulse for sun
          colorClass = 'text-yellow-400/70';
          break;
        case 'cloudy':
          icon = <Cloud className="h-5 w-5" />;
          animationClass = 'animate-float'; // Floating animation for clouds
          colorClass = 'text-gray-400/60';
          break;
        case 'rainy':
          icon = <div className="h-3 w-0.5 bg-blue-400/70 rounded-full"></div>; // Simple line for raindrop
          animationClass = 'animate-fall'; // Falling animation for rain
          colorClass = ''; // Color applied directly to div
          break;
        case 'snowy':
           icon = <Snowflake className="h-4 w-4" />;
           animationClass = 'animate-sway-fall'; // Swaying fall for snowflakes
           colorClass = 'text-blue-200/70';
          break;
        default:
          return null; // No animation for null condition
      }

      particles.push(
        <div
          key={i}
          className={`absolute ${animationClass} ${colorClass} pointer-events-none`}
          style={randomStyle(dimensions.width, dimensions.height)}
        >
          {icon}
        </div>
      );
    }
    return particles;
  };

  return <>{renderParticles()}</>;
};


export const WeatherAnimationOverlay: React.FC = () => {
  const { weatherCondition } = useWeather();

  if (!weatherCondition) {
    return null; // Don't render anything if condition is null
  }

  return (
    <div className="absolute inset-0 z-5 pointer-events-none overflow-hidden">
       <WeatherIconAnimation condition={weatherCondition} />
    </div>
  );
};

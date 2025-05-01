
"use client";

import React, { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';

// Define the possible weather conditions
export type WeatherCondition = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | null;

interface WeatherContextType {
  weatherCondition: WeatherCondition;
  setWeatherCondition: Dispatch<SetStateAction<WeatherCondition>>;
}

const WeatherContext = createContext<WeatherContextType | undefined>(undefined);

interface WeatherProviderProps {
  children: ReactNode;
}

export const WeatherProvider: React.FC<WeatherProviderProps> = ({ children }) => {
  const [weatherCondition, setWeatherCondition] = useState<WeatherCondition>(null);

  return (
    <WeatherContext.Provider value={{ weatherCondition, setWeatherCondition }}>
      {children}
    </WeatherContext.Provider>
  );
};

export const useWeather = (): WeatherContextType => {
  const context = useContext(WeatherContext);
  if (context === undefined) {
    throw new Error('useWeather must be used within a WeatherProvider');
  }
  return context;
};

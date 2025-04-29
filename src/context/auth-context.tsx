
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
// Import specific functions needed: login, logout, onAuthStateChange
import { onAuthStateChange, login as fbLogin, logout as fbLogout } from '@/services/auth';
import { Loader2 } from 'lucide-react'; // Import Loader2

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<FirebaseUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true); // Start loading initially

  useEffect(() => {
    // Subscribe using the updated onAuthStateChange from services/auth
    // This function now handles cookie setting/removal internally
    const unsubscribe = onAuthStateChange((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false); // Set loading to false once the initial state is determined
      console.log("AuthProvider: Auth state updated via listener, user:", firebaseUser?.email);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []); // Empty dependency array ensures this runs only once on mount

  // Login function remains the same, relies on service function which now sets cookie
  const login = async (email: string, password: string): Promise<FirebaseUser> => {
    setLoading(true); // Set loading true when login process starts
    try {
      const loggedInUser = await fbLogin(email, password);
      // State update (user, loading=false) is handled by the onAuthStateChange listener upon successful login
      return loggedInUser;
    } catch (error) {
      setLoading(false); // Set loading false on login error
      throw error; // Re-throw error to be caught by the caller
    }
  };

  // Logout function remains the same, relies on service function which now removes cookie
  const logout = async (): Promise<void> => {
     setLoading(true); // Set loading true when logout process starts
    try {
      await fbLogout();
      // State update (user=null, loading=false) is handled by the onAuthStateChange listener upon successful logout
    } catch (error) {
      setLoading(false); // Set loading false on logout error
      throw error; // Re-throw error
    }
  };

  // Display loading indicator whenever the loading state is true.
  // This covers initial auth check and the transition period during login/logout attempts.
  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }


  // Once loading is false, render the context provider with children
  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the AuthContext
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


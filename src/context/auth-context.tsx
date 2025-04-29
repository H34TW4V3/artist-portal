
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChange, login as fbLogin, logout as fbLogout } from '@/services/auth'; // Import auth functions
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
    // Subscribe to Firebase auth state changes
    const unsubscribe = onAuthStateChange((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false); // Set loading to false once the initial state is determined
      console.log("AuthProvider: Auth state changed, user:", firebaseUser?.email);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<FirebaseUser> => {
    setLoading(true); // Set loading true during login attempt
    try {
      const loggedInUser = await fbLogin(email, password);
      // State will update via onAuthStateChanged listener
      return loggedInUser;
    } catch (error) {
      setLoading(false); // Set loading false on login error
      throw error; // Re-throw error to be caught by the caller
    }
     // Loading state will be set to false by the onAuthStateChanged listener upon success
  };

  const logout = async (): Promise<void> => {
    setLoading(true); // Set loading true during logout attempt
    try {
      await fbLogout();
      // State will update via onAuthStateChanged listener
    } catch (error) {
      setLoading(false); // Set loading false on logout error
      throw error; // Re-throw error
    }
     // Loading state will be set to false by the onAuthStateChanged listener upon success
  };

  // Display loading indicator while checking auth state
  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        {/* Optional: Add a message */}
        {/* <p className="mt-4 text-muted-foreground">Initializing...</p> */}
      </div>
    );
  }


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

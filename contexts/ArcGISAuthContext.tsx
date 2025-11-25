"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { arcgisAuth } from "@/lib/auth/arcgis-pkce";

interface ArcGISAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  username: string | null;
  accessToken: string | null;
  login: () => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
}

const ArcGISAuthContext = createContext<ArcGISAuthContextType | undefined>(
  undefined
);

export function ArcGISAuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const pathname = usePathname();

  const checkAuth = () => {
    try {
      setIsLoading(true);
      
      // Check if user is authenticated using client-side storage
      const authenticated = arcgisAuth.isAuthenticated();
      const token = arcgisAuth.getAccessToken();
      const user = arcgisAuth.getUsername();
      
      setIsAuthenticated(authenticated);
      setAccessToken(token);
      setUsername(user);
      
      console.log("🔍 Auth check result:", {
        authenticated,
        hasToken: !!token,
        username: user,
      });
      
    } catch (error) {
      console.error("Auth check failed:", error);
      setIsAuthenticated(false);
      setAccessToken(null);
      setUsername(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async () => {
    try {
      console.log("🔐 Initiating ArcGIS PKCE login");
      await arcgisAuth.login();
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = () => {
    console.log("🚪 Logging out");
    arcgisAuth.logout();
    setIsAuthenticated(false);
    setAccessToken(null);
    setUsername(null);
  };

  useEffect(() => {
    // Skip auth check if we're on the OAuth callback page
    if (pathname === '/auth/arcgis') {
      console.log("🔄 On OAuth callback page, skipping auth check");
      setIsLoading(false);
      return;
    }
    
    checkAuth();
  }, [pathname]);

  // Listen for storage changes (e.g., login in another tab)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('arcgis_')) {
        console.log("🔄 Auth storage changed, rechecking auth");
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <ArcGISAuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        username,
        accessToken,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </ArcGISAuthContext.Provider>
  );
}

export function useArcGISAuth() {
  const context = useContext(ArcGISAuthContext);
  if (context === undefined) {
    throw new Error("useArcGISAuth must be used within an ArcGISAuthProvider");
  }
  return context;
}
"use client";

import React, { createContext, useContext, useEffect, useLayoutEffect, useState, ReactNode } from "react";
import { getToken, isAuthenticated } from "@/lib/arcgis-auth";

interface ArcGISAuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  checkAuth: () => Promise<void>;
}

const ArcGISAuthContext = createContext<ArcGISAuthContextType | undefined>(undefined);

export function ArcGISAuthProvider({ children }: { children: ReactNode }) {
  // Setup ArcGIS IdentityManager to recognize OAuth tokens from cookies
  // Use dynamic import to prevent SSR from loading @arcgis/core
  // Use useLayoutEffect to run synchronously before any FeatureLayer components mount
  useLayoutEffect(() => {
    async function load() {
      // Dynamic import ensures @arcgis/core is only loaded in the browser
      const { setupIdentity } = await import("@/lib/esri/setupIdentity");
      try {
        await setupIdentity();
      } catch (error) {
        console.error("Error setting up ArcGIS OAuth:", error);
      }
    }
    load();
  }, []);

  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    setIsLoading(true);
    try {
      // Get token from API route (which reads from HTTP-only cookies)
      const response = await fetch("/api/auth/check");
      if (response.ok) {
        const data = await response.json();
        if (data.authenticated && data.token) {
          setToken(data.token);
        } else {
          setToken(null);
        }
      } else {
        // Not authenticated
        setToken(null);
      }
    } catch (error) {
      console.error("Error checking auth:", error);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <ArcGISAuthContext.Provider
      value={{
        token,
        isAuthenticated: token !== null,
        isLoading,
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


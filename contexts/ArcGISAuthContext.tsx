// contexts/ArcGISAuthContext.tsx
"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import type Credential from "@arcgis/core/identity/Credential";
import { signOut } from "@/lib/arcgis/setupIdentity";

type ArcGISAuthContextValue = {
  credential: Credential | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => void;
  token: string | null;
};

const ArcGISAuthContext = createContext<ArcGISAuthContextValue>({
  credential: null,
  isAuthenticated: false,
  loading: true,
  login: async () => {},
  logout: () => {},
  token: null,
});

export function useArcGISAuth() {
  return useContext(ArcGISAuthContext);
}

export function ArcGISAuthProvider({ children }: { children: ReactNode }) {
  const [credential, setCredential] = useState<Credential | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check auth status via API (since token cookie is httpOnly)
    // DO NOT call getCredential() - it will trigger IdentityManager's OAuth flow
    async function checkAuth() {
      if (typeof window === "undefined") {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/auth/check");
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated && data.token) {
            console.log("🔐 User is authenticated");
            setToken(data.token);
          } else {
            console.log("🔐 User is not authenticated");
            setToken(null);
          }
        } else {
          console.log("🔐 User is not authenticated");
          setToken(null);
        }
      } catch (error) {
        console.error("Error checking auth status:", error);
        setToken(null);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  const login = async () => {
    // Force browser redirect to our custom OAuth login route
    // This ensures we use the correct redirect URI configured in the route
    // DO NOT use getCredential() - it triggers IdentityManager with wrong redirect URI
    window.location.href = "/api/auth/login";
  };

  const logout = () => {
    // Clear client-side IdentityManager credentials
    signOut();
    
    // Clear client-side state immediately
    setCredential(null);
    setToken(null);
    
    // Redirect to logout API route which clears server-side cookies and redirects to /map
    window.location.href = "/api/auth/logout";
  };

  return (
    <ArcGISAuthContext.Provider
      value={{
        credential,
        isAuthenticated: !!token, // Use token presence to determine auth status
        loading,
        login,
        logout,
        token,
      }}
    >
      {children}
    </ArcGISAuthContext.Provider>
  );
}


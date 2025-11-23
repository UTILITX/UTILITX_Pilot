// contexts/ArcGISAuthContext.tsx
"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();

  // Check auth status via API (since token cookie is httpOnly)
  // DO NOT call getCredential() - it will trigger IdentityManager's OAuth flow
  async function checkAuth() {
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/check", {
        cache: "no-store", // Always fetch fresh auth status
      });
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

  useEffect(() => {
    // Check auth on mount
    checkAuth();

    // Re-check auth when window gains focus (e.g., after OAuth redirect)
    // This ensures we pick up cookies set by the OAuth callback
    const handleFocus = () => {
      console.log("🔄 Window focused, re-checking auth status");
      setLoading(true);
      checkAuth();
    };

    // Also check on visibility change (tab becomes visible)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log("🔄 Tab visible, re-checking auth status");
        setLoading(true);
        checkAuth();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Re-check auth when pathname changes (e.g., after OAuth redirect to /map)
  useEffect(() => {
    if (!pathname) return;
    
    // If we're on an auth-required page, check auth status
    // This handles the case where we're redirected to /map after OAuth
    if (pathname === "/map" || pathname.startsWith("/dashboard")) {
      // Small delay to ensure cookies are set after redirect
      const timeoutId = setTimeout(() => {
        console.log("🔄 Pathname changed to auth-required page, re-checking auth status");
        setLoading(true);
        checkAuth();
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [pathname]);

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


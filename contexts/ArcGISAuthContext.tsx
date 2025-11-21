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
import { getCredential, setupIdentity, signOut } from "@/lib/arcgis/setupIdentity";

type ArcGISAuthContextValue = {
  credential: Credential | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => void;
};

const ArcGISAuthContext = createContext<ArcGISAuthContextValue>({
  credential: null,
  isAuthenticated: false,
  loading: true,
  login: async () => {},
  logout: () => {},
});

export function useArcGISAuth() {
  return useContext(ArcGISAuthContext);
}

export function ArcGISAuthProvider({ children }: { children: ReactNode }) {
  const [credential, setCredential] = useState<Credential | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        console.log("🔐 ArcGISAuthProvider: initializing IdentityManager");
        setupIdentity();
        const cred = await getCredential();
        if (!cancelled) {
          setCredential(cred);
        }
      } catch (err) {
        console.error("Error setting up ArcGIS OAuth:", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async () => {
    try {
      const cred = await getCredential();
      setCredential(cred);
    } catch (err) {
      console.error("ArcGIS login failed:", err);
    }
  };

  const logout = () => {
    signOut();
    setCredential(null);
  };

  return (
    <ArcGISAuthContext.Provider
      value={{
        credential,
        isAuthenticated: !!credential,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </ArcGISAuthContext.Provider>
  );
}


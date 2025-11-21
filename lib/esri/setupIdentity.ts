"use client";

/**
 * IMPORTANT
 * Your hosted services live here:
 *
 * https://services7.arcgis.com/ViYWM4c7kDH7CSCe/
 *
 * ArcGIS IdentityManager MUST be registered with the EXACT service root.
 */
const SERVICE_ROOT =
  "https://services7.arcgis.com/ViYWM4c7kDH7CSCe";

const PORTAL_URL = process.env.NEXT_PUBLIC_ARCGIS_PORTAL_URL || "https://indib78f3690c643.maps.arcgis.com";

export async function setupIdentity() {
  // SSR guard
  if (typeof window === "undefined") {
    return;
  }

  // Dynamically import ArcGIS modules to avoid SSR issues
  const IdentityManager = (await import("@arcgis/core/identity/IdentityManager")).default;
  const OAuthInfo = (await import("@arcgis/core/identity/OAuthInfo")).default;

  console.log("🔐 setupIdentity(): initializing ArcGIS IdentityManager");

  // --- 1. Register OAuth app ---
  const info = new OAuthInfo({
    appId: process.env.NEXT_PUBLIC_ARCGIS_CLIENT_ID || "wqvStHHasME6jfo2",
    popup: false,
    portalUrl: PORTAL_URL,
  });

  IdentityManager.registerOAuthInfos([info]);

  // --- 2. Register hosted feature server root ---
  IdentityManager.registerServers([{ url: SERVICE_ROOT }]);
  console.log("🔐 Registered ArcGIS server:", SERVICE_ROOT);

  // --- 3. Pull token from cookies (if present) ---
  const accessToken = getCookie("arcgis_token");
  const username = getCookie("arcgis_username");
  const expiry = Number(getCookie("arcgis_token_expiry") || 0);

  if (!accessToken || !username) {
    console.log("ℹ️ No ArcGIS cookie session found — login will happen later");
    return;
  }

  console.log("🔐 Found existing ArcGIS OAuth session");

  IdentityManager.registerToken({
    server: PORTAL_URL,
    token: accessToken,
    userId: username,
    expires: expiry,
  });

  console.log("🔐 Token registered successfully with IdentityManager");
}

/** Utility — read cookie */
function getCookie(name: string) {
  if (typeof document === "undefined") return null;

  const v = document.cookie
    .split("; ")
    .find((row) => row.startsWith(name + "="));

  return v ? v.split("=")[1] : null;
}


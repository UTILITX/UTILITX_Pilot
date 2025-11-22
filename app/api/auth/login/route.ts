import { NextRequest, NextResponse } from "next/server";
import { ARCGIS_PORTAL_URL, ARCGIS_CLIENT_ID } from "@/lib/arcgis/config";

export function GET(req: NextRequest) {
  const clientId = ARCGIS_CLIENT_ID || process.env.ARCGIS_CLIENT_ID;

  // Determine redirect URI based on environment
  // CRITICAL: Firebase Functions proxy makes req.nextUrl.hostname = 'localhost'
  // We must use x-forwarded-host header to get the real domain
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
  const hostname = req.nextUrl.hostname;
  const origin = req.nextUrl.origin;
  
  // Get the real hostname from forwarded headers (Firebase proxy) or request
  const realHostname = forwardedHost?.split(",")[0]?.trim() || hostname;
  const realOrigin = forwardedHost 
    ? `${forwardedProto}://${realHostname}`
    : origin;
  
  const isLocalhost = realHostname === "localhost" || realHostname === "127.0.0.1" || realHostname === "::1";
  const isFirebaseDomain = realHostname?.includes("web.app") || realHostname?.includes("firebaseapp.com");
  const envRedirectUri = process.env.NEXT_PUBLIC_ARCGIS_REDIRECT_URI;
  
  // NEVER use localhost redirect URI if we're on Firebase, even if env var is set
  let redirectUri: string;
  if (envRedirectUri && !envRedirectUri.includes("localhost") && !isLocalhost) {
    // Use env var only if it's not localhost and we're not on localhost
    redirectUri = envRedirectUri;
  } else if (isLocalhost && !isFirebaseDomain) {
    // Only use localhost if we're actually on localhost AND not on Firebase
    redirectUri = "https://localhost:3000/api/auth/callback";
  } else {
    // Production: use the real origin from forwarded headers
    redirectUri = `${realOrigin}/api/auth/callback`;
  }

  // Comprehensive debug logging
  console.log("🔍 LOGIN DEBUG:", {
    hostname,
    origin,
    realHostname,
    realOrigin,
    forwardedHost,
    isLocalhost,
    isFirebaseDomain,
    envRedirectUri: envRedirectUri || "not set",
    finalRedirectUri: redirectUri,
    headers: {
      host: req.headers.get("host"),
      "x-forwarded-host": req.headers.get("x-forwarded-host"),
      "x-forwarded-proto": req.headers.get("x-forwarded-proto"),
    },
  });
  console.log("🔍 LOGIN USING REDIRECT URI:", redirectUri);
  
  // Safety check: Never use localhost in production
  if (redirectUri.includes("localhost") && !isLocalhost) {
    console.error("🚨 CRITICAL: Attempted to use localhost redirect in production!");
    console.error("🚨 Overriding to use real origin:", realOrigin);
    redirectUri = `${realOrigin}/api/auth/callback`;
  }

  if (!clientId) {
    console.error("❌ Missing ArcGIS Client ID");
    return NextResponse.json(
      { error: "Missing OAuth client ID" },
      { status: 500 }
    );
  }

  // Request both openid scope (for user identity) and feature layer access
  // The token needs to be valid for accessing feature services
  const authUrl = `${ARCGIS_PORTAL_URL}/sharing/rest/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&expiration=20160&scope=openid`;

  console.log("🔗 FINAL AUTH URL:", authUrl);

  return NextResponse.redirect(authUrl);
}


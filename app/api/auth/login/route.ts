import { NextRequest, NextResponse } from "next/server";
import { ARCGIS_PORTAL_URL, ARCGIS_CLIENT_ID } from "@/lib/arcgis/config";

export function GET(req: NextRequest) {
  const clientId = ARCGIS_CLIENT_ID || process.env.ARCGIS_CLIENT_ID;

  // Determine redirect URI - use server-side environment variables
  // Priority: ARCGIS_REDIRECT_URI (server-side) > NEXT_PUBLIC_ARCGIS_REDIRECT_URI (client-side)
  const redirectUri = process.env.ARCGIS_REDIRECT_URI || process.env.NEXT_PUBLIC_ARCGIS_REDIRECT_URI || "https://localhost:3000/api/auth/callback";
  
  // Get hostname info for logging
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
  const hostname = req.nextUrl.hostname;
  const origin = req.nextUrl.origin;
  
  // Get the real hostname from forwarded headers (Firebase proxy) or request
  const realHostname = forwardedHost?.split(",")[0]?.trim() || hostname;
  const realOrigin = forwardedHost 
    ? `${forwardedProto}://${realHostname}`
    : origin;

  // Comprehensive debug logging
  console.log("🔍 LOGIN DEBUG:", {
    hostname,
    origin,
    realHostname,
    realOrigin,
    forwardedHost,
    serverRedirectUri: process.env.ARCGIS_REDIRECT_URI || "not set",
    publicRedirectUri: process.env.NEXT_PUBLIC_ARCGIS_REDIRECT_URI || "not set",
    finalRedirectUri: redirectUri,
    nextAuthUrl: process.env.NEXTAUTH_URL || "not set",
    authPublicUrl: process.env.AUTH_PUBLIC_URL || "not set",
    headers: {
      host: req.headers.get("host"),
      "x-forwarded-host": req.headers.get("x-forwarded-host"),
      "x-forwarded-proto": req.headers.get("x-forwarded-proto"),
    },
  });
  console.log("🔍 LOGIN USING REDIRECT URI:", redirectUri);

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


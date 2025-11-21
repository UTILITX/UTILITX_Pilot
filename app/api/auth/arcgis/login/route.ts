import { NextResponse } from "next/server";

/**
 * OAuth Login Route
 * Redirects user to ArcGIS OAuth authorization page
 */
export async function GET() {
  const clientId = process.env.ARCGIS_CLIENT_ID;
  const redirectUri = process.env.ARCGIS_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/arcgis/callback`;

  // Debug logging
  console.log("🔍 LOGIN DEBUG CLIENT_ID:", clientId ? `${clientId.substring(0, 10)}...` : "undefined");
  console.log("🔍 LOGIN DEBUG REDIRECT_URI:", redirectUri);

  if (!clientId) {
    console.error("❌ ARCGIS_CLIENT_ID not configured");
    return NextResponse.json(
      { error: "ARCGIS_CLIENT_ID not configured" },
      { status: 500 }
    );
  }

  // Build OAuth authorization URL - use your org portal
  const authUrl = new URL("https://indib78f3690c643.maps.arcgis.com/sharing/rest/oauth2/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("expiration", "7200"); // 2 hours
  authUrl.searchParams.set("scope", "openid");

  return NextResponse.redirect(authUrl.toString());
}


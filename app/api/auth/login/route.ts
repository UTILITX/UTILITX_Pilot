import { NextResponse } from "next/server";

/**
 * OAuth Login Route
 * Redirects user to ArcGIS OAuth authorization page
 */
export function GET() {
  const clientId = process.env.ARCGIS_CLIENT_ID;
  const redirectUri = process.env.ARCGIS_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/callback`;

  if (!clientId) {
    console.error("❌ ARCGIS_CLIENT_ID not configured");
    return NextResponse.json(
      { error: "ARCGIS_CLIENT_ID not configured" },
      { status: 500 }
    );
  }

  console.log("🔍 LOGIN DEBUG CLIENT_ID:", clientId ? `${clientId.substring(0, 10)}...` : "undefined");
  console.log("🔍 LOGIN DEBUG REDIRECT_URI:", redirectUri);

  // Build OAuth authorization URL - use your org portal
  const authUrl = `https://indib78f3690c643.maps.arcgis.com/sharing/rest/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&expiration=7200&scope=openid`;

  return NextResponse.redirect(authUrl);
}


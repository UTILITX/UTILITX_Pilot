import { NextRequest, NextResponse } from "next/server";
import { ARCGIS_PORTAL_URL, ARCGIS_CLIENT_ID } from "@/lib/arcgis/config";

export function GET(req: NextRequest) {
  const clientId = ARCGIS_CLIENT_ID || process.env.ARCGIS_CLIENT_ID;

  // Determine redirect URI based on environment
  // For production, use environment variable or derive from request
  // For local development, use hardcoded localhost URL
  const redirectUri = 
    process.env.NEXT_PUBLIC_ARCGIS_REDIRECT_URI ||
    (process.env.NODE_ENV === "production" 
      ? `${req.nextUrl.origin}/api/auth/callback`
      : "https://localhost:3000/api/auth/callback"
    );

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


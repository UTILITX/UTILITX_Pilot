import { NextResponse } from "next/server";
import { ARCGIS_PORTAL_URL, ARCGIS_CLIENT_ID } from "@/lib/arcgis/config";

export function GET() {
  const clientId = ARCGIS_CLIENT_ID || process.env.ARCGIS_CLIENT_ID;

  // 🚨 HARD-CODE redirect URI — no more fallbacks or environment issues
  const redirectUri = "https://localhost:3000/api/auth/callback";

  console.log("🔍 LOGIN USING REDIRECT URI:", redirectUri);

  // Request both openid scope (for user identity) and feature layer access
  // The token needs to be valid for accessing feature services
  const authUrl = `${ARCGIS_PORTAL_URL}/sharing/rest/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&expiration=20160&scope=openid`;

  console.log("🔗 FINAL AUTH URL:", authUrl);

  return NextResponse.redirect(authUrl);
}


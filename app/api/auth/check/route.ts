import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ARCGIS_PORTAL_URL } from "@/lib/arcgis/config";

/**
 * Check Authentication Route
 * Returns the current ArcGIS token status and validates the token
 */
export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("arcgis_token")?.value;
  const expiry = cookieStore.get("arcgis_token_expiry")?.value;

  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  // Check if token is expired
  if (expiry && Date.now() > parseInt(expiry)) {
    return NextResponse.json({ authenticated: false, expired: true }, { status: 401 });
  }

  // Validate token by checking user info from portal
  try {
    const userInfoUrl = `${ARCGIS_PORTAL_URL}/sharing/rest/community/self?f=json&token=${token}`;
    const userInfoResponse = await fetch(userInfoUrl);
    
    if (!userInfoResponse.ok) {
      console.error("❌ Token validation failed:", userInfoResponse.status, await userInfoResponse.text());
      return NextResponse.json({ authenticated: false, invalid: true }, { status: 401 });
    }

    const userInfo = await userInfoResponse.json();
    
    // Check if response indicates invalid token
    if (userInfo.error) {
      console.error("❌ Token invalid:", userInfo.error);
      return NextResponse.json({ authenticated: false, invalid: true }, { status: 401 });
    }

    const username = cookieStore.get("arcgis_username")?.value || userInfo.username;
    return NextResponse.json({ 
      authenticated: true, 
      token, 
      username,
      userId: userInfo.username,
      orgId: userInfo.orgId,
    });
  } catch (error) {
    console.error("❌ Token validation error:", error);
    // Return token anyway if validation fails (might be network issue)
    const username = cookieStore.get("arcgis_username")?.value;
    return NextResponse.json({ authenticated: true, token, username, validated: false });
  }
}


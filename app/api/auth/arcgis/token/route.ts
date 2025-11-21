import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Get Token Route
 * Returns the current ArcGIS token (for client-side use)
 * Note: In production, you might want to use a more secure method
 */
export async function GET(request: NextRequest) {
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

  return NextResponse.json({
    authenticated: true,
    token: token,
  });
}


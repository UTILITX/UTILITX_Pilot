import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Check Authentication Route
 * Returns the current ArcGIS token status
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

  return NextResponse.json({ authenticated: true, token });
}


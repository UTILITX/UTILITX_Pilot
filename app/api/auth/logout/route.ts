import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Logout Route
 * Clears ArcGIS OAuth tokens
 */
export async function GET(req: NextRequest) {
  const cookieStore = await cookies();

  // Clear all ArcGIS auth cookies
  cookieStore.delete("arcgis_token");
  cookieStore.delete("arcgis_token_expiry");
  cookieStore.delete("arcgis_refresh_token");
  cookieStore.delete("arcgis_username");

  console.log("✅ Logged out - cleared ArcGIS tokens");

  // Use NEXTAUTH_URL or AUTH_PUBLIC_URL for redirect base
  const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_PUBLIC_URL || req.nextUrl.origin;
  return NextResponse.redirect(new URL("/map", baseUrl));
}


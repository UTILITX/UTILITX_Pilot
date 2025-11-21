import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ARCGIS_PORTAL_URL } from "@/lib/arcgis/config";

/**
 * OAuth Callback Route
 * Exchanges authorization code for access token
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    console.error("❌ No code in callback");
    return NextResponse.json({ error: "Missing OAuth code" }, { status: 400 });
  }

  console.log("🔁 Received OAuth code:", code);

  const clientId = process.env.ARCGIS_CLIENT_ID;
  const clientSecret = process.env.ARCGIS_CLIENT_SECRET;
  const redirectUri = process.env.ARCGIS_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/callback`;

  // Debug logging
  console.log("🔍 DEBUG CLIENT_ID:", clientId ? `${clientId.substring(0, 10)}...` : "undefined");
  console.log("🔍 DEBUG SECRET:", clientSecret ? "present" : "missing");
  console.log("🔍 DEBUG REDIRECT_URI:", redirectUri);
  console.log("🔍 DEBUG PORTAL_URL:", ARCGIS_PORTAL_URL);

  if (!clientId || !clientSecret) {
    console.error("❌ Missing ArcGIS OAuth credentials");
    return NextResponse.json(
      { error: "Missing OAuth credentials" },
      { status: 500 }
    );
  }

  try {
    // Exchange code for token - use your org portal from config
    const tokenResponse = await fetch(`${ARCGIS_PORTAL_URL}/sharing/rest/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code: code,
      }),
    });

    const token = await tokenResponse.json();
    console.log("🔑 TOKEN RESPONSE:", {
      hasAccessToken: !!token.access_token,
      expiresIn: token.expires_in,
      username: token.username,
      error: token.error,
    });

    if (!token.access_token) {
      console.error("❌ Token exchange failed:", token);
      return NextResponse.json(token, { status: 401 });
    }

    // Save token into a cookie
    const cookieStore = await cookies();
    const expiresIn = token.expires_in || 7200; // Default 2 hours
    const expiryDate = new Date(Date.now() + expiresIn * 1000);

    cookieStore.set("arcgis_token", token.access_token, {
      expires: expiryDate,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    cookieStore.set("arcgis_token_expiry", expiryDate.getTime().toString(), {
      expires: expiryDate,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    if (token.refresh_token) {
      cookieStore.set("arcgis_refresh_token", token.refresh_token, {
        expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
    }

    if (token.username) {
      cookieStore.set("arcgis_username", token.username, {
        expires: expiryDate,
        httpOnly: false, // Can be accessed by client
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
    }

    console.log("✅ OAuth token stored successfully");

    // Redirect to map page
    return NextResponse.redirect(new URL("/map", req.url));
  } catch (error) {
    console.error("❌ OAuth callback error:", error);
    return NextResponse.json(
      { error: "OAuth callback failed" },
      { status: 500 }
    );
  }
}


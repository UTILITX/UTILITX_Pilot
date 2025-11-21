import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ARCGIS_PORTAL_URL } from "@/lib/arcgis/config";

/**
 * OAuth Callback Route
 * Exchanges authorization code for access token
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // Handle OAuth errors
  if (error) {
    console.error("OAuth error:", error);
    return NextResponse.redirect(
      new URL("/map?error=auth_failed", request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/map?error=no_code", request.url)
    );
  }

  const clientId = process.env.ARCGIS_CLIENT_ID;
  const clientSecret = process.env.ARCGIS_CLIENT_SECRET;
  const redirectUri = process.env.ARCGIS_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/arcgis/callback`;

  // Debug logging
  console.log("🔍 DEBUG CLIENT_ID:", clientId ? `${clientId.substring(0, 10)}...` : "undefined");
  console.log("🔍 DEBUG SECRET:", clientSecret ? "present" : "missing");
  console.log("🔍 DEBUG REDIRECT_URI:", redirectUri);
  console.log("🔍 DEBUG CODE:", code ? "present" : "missing");
  console.log("🔍 DEBUG PORTAL_URL:", ARCGIS_PORTAL_URL);

  if (!clientId || !clientSecret) {
    console.error("❌ Missing ArcGIS OAuth credentials");
    console.error("   CLIENT_ID:", clientId ? "present" : "missing");
    console.error("   CLIENT_SECRET:", clientSecret ? "present" : "missing");
    return NextResponse.redirect(
      new URL("/map?error=config", request.url)
    );
  }

  try {
    // Exchange code for token - use your org portal from config
    const tokenResponse = await fetch(`${ARCGIS_PORTAL_URL}/sharing/rest/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri, // Must match exactly what was used in authorization request
        code: code,
      }),
      
      // Log the request details (without exposing secrets)
      console.log("📤 Token exchange request:", {
        client_id: `${clientId.substring(0, 10)}...`,
        redirect_uri: redirectUri,
        has_code: !!code,
        has_secret: !!clientSecret,
      });
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("❌ Token exchange failed - HTTP Status:", tokenResponse.status);
      console.error("❌ Error response:", errorText);
      
      // Try to parse as JSON for better error details
      try {
        const errorJson = JSON.parse(errorText);
        console.error("❌ ArcGIS Error Details:", JSON.stringify(errorJson, null, 2));
      } catch (e) {
        // Not JSON, log as text
        console.error("❌ Error response (text):", errorText);
      }
      
      return NextResponse.redirect(
        new URL(`/map?error=token_exchange_failed&status=${tokenResponse.status}`, request.url)
      );
    }

    const tokenData = await tokenResponse.json();
    console.log("✅ TOKEN RESPONSE:", {
      hasAccessToken: !!tokenData.access_token,
      expiresIn: tokenData.expires_in,
      username: tokenData.username,
      error: tokenData.error,
    });

    if (tokenData.error) {
      console.error("❌ Token error from ArcGIS:", tokenData.error);
      console.error("❌ Error description:", tokenData.error_description);
      console.error("❌ Error code:", tokenData.error_code);
      return NextResponse.redirect(
        new URL(`/map?error=token_error&msg=${encodeURIComponent(tokenData.error_description || tokenData.error)}`, request.url)
      );
    }

    // Store token in HTTP-only cookie (more secure)
    const cookieStore = await cookies();
    const expiresIn = tokenData.expires_in || 7200; // Default 2 hours
    const expiryDate = new Date(Date.now() + expiresIn * 1000);

    cookieStore.set("arcgis_token", tokenData.access_token, {
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

    if (tokenData.refresh_token) {
      cookieStore.set("arcgis_refresh_token", tokenData.refresh_token, {
        expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
    }

    // Store username if available
    if (tokenData.username) {
      cookieStore.set("arcgis_username", tokenData.username, {
        expires: expiryDate,
        httpOnly: false, // Can be accessed by client
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
    }

    console.log("✅ OAuth token stored successfully");

    // Redirect to map page
    return NextResponse.redirect(new URL("/map", request.url));
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/map?error=callback_error", request.url)
    );
  }
}


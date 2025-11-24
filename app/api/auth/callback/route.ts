import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ARCGIS_PORTAL_URL, ARCGIS_CLIENT_ID } from "@/lib/arcgis/config";

/**
 * OAuth Callback Route
 * Exchanges authorization code for access token
 */
export async function GET(req: NextRequest) {
  console.log("🔁 CALLBACK ROUTE HIT:", {
    url: req.url,
    pathname: req.nextUrl.pathname,
    searchParams: Object.fromEntries(req.nextUrl.searchParams),
    hostname: req.nextUrl.hostname,
    forwardedHost: req.headers.get("x-forwarded-host"),
  });
  
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    console.error("❌ No code in callback");
    return NextResponse.json({ error: "Missing OAuth code" }, { status: 400 });
  }

  console.log("🔁 Received OAuth code:", code.substring(0, 20) + "...");

  // Support both prefixed and non-prefixed env vars (server-side can read both)
  const clientId = ARCGIS_CLIENT_ID || process.env.ARCGIS_CLIENT_ID;
  
  // Get client secret - try multiple sources for Firebase Functions compatibility
  // Priority: 1) process.env (secrets injected as env vars), 2) functions.config() (1st Gen), 3) null
  let clientSecret = process.env.ARCGIS_CLIENT_SECRET;
  
  console.log("🔍 SECRET DEBUG:", {
    fromEnv: !!process.env.ARCGIS_CLIENT_SECRET,
    functionName: (process.env as any).FUNCTION_NAME,
    hasProcess: typeof process !== 'undefined',
  });
  
  // Fallback: Try functions.config() for 1st Gen functions (deprecated but still works)
  // This is only available at runtime in Firebase Functions, not during build
  if (!clientSecret) {
    try {
      // Use dynamic require to avoid Next.js build-time resolution
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const functions = eval('require')("firebase-functions");
      console.log("🔍 functions module:", functions ? "loaded" : "failed");
      if (functions && functions.config) {
        const config = functions.config();
        console.log("🔍 functions.config():", config ? "exists" : "null");
        console.log("🔍 config.arcgis:", config?.arcgis ? "exists" : "null");
        clientSecret = config?.arcgis?.client_secret || null;
        if (clientSecret) {
          console.log("✅ Found secret via functions.config()");
        } else {
          console.log("⚠️ functions.config().arcgis.client_secret is null/undefined");
        }
      } else {
        console.log("⚠️ functions.config() not available");
      }
    } catch (err: any) {
      console.log("⚠️ Could not load firebase-functions:", err?.message || err);
      // firebase-functions not available (e.g., during build or local dev), that's okay
    }
  }
  
  // Determine redirect URI - use server-side environment variables
  // Priority: ARCGIS_REDIRECT_URI (server-side) > NEXT_PUBLIC_ARCGIS_REDIRECT_URI (client-side)
  const redirectUri = process.env.ARCGIS_REDIRECT_URI || process.env.NEXT_PUBLIC_ARCGIS_REDIRECT_URI || "https://localhost:3000/api/auth/callback";
  
  // Get hostname info for logging and final redirect
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
  const hostname = req.nextUrl.hostname;
  const origin = req.nextUrl.origin;
  
  // Get the real hostname from forwarded headers (Firebase proxy) or request
  const realHostname = forwardedHost?.split(",")[0]?.trim() || hostname;
  const realOrigin = forwardedHost 
    ? `${forwardedProto}://${realHostname}`
    : origin;
  
  // Use NEXTAUTH_URL or AUTH_PUBLIC_URL for final redirect base
  const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_PUBLIC_URL || realOrigin;

  // Debug logging
  console.log("🔍 CALLBACK DEBUG:", {
    realHostname,
    realOrigin,
    forwardedHost,
    baseUrl,
    serverRedirectUri: process.env.ARCGIS_REDIRECT_URI || "not set",
    publicRedirectUri: process.env.NEXT_PUBLIC_ARCGIS_REDIRECT_URI || "not set", 
    finalRedirectUri: redirectUri,
    nextAuthUrl: process.env.NEXTAUTH_URL || "not set",
    authPublicUrl: process.env.AUTH_PUBLIC_URL || "not set",
  });
  console.log("🔍 DEBUG CLIENT_ID:", clientId ? `${clientId.substring(0, 12)}...` : "undefined");
  console.log("🔍 DEBUG SECRET:", clientSecret ? `${clientSecret.substring(0, 12)}...` : "missing");
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
    const tokenResponse = await fetch(`${ARCGIS_PORTAL_URL}/sharing/oauth2/token`, {
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
    
    // 🔧 Host / environment helpers
    const host = req.headers.get("x-forwarded-host") || req.nextUrl.hostname || "";

    // Detect localhost (local emulator)
    const isLocalhost =
      host.includes("localhost") ||
      host.includes("127.0.0.1");

    // Detect Firebase Hosting domain (production)
    const isFirebaseDomain =
      host.includes("web.app") ||
      host.includes("firebaseapp.com");

    // Determine environment
    const isProduction = !isLocalhost && isFirebaseDomain;
    
    // For Firebase Hosting, cookies need to be accessible across the domain
    // Don't set domain explicitly - let Next.js handle it based on the request
    // But ensure secure is true in production (HTTPS required)
    const cookieOptions = {
      expires: expiryDate,
      httpOnly: true,
      secure: isProduction, // Always secure in production (HTTPS required)
      sameSite: "lax" as const,
      path: "/",
      // Don't set domain - let browser use default (current domain)
      // Setting domain explicitly can break cookie sharing in Firebase Hosting
    };

    console.log("🍪 Setting cookies:", {
      isProduction,
      realHostname,
      realOrigin,
      secure: cookieOptions.secure,
      expires: expiryDate.toISOString(),
      cookieDomain: "not set (using default)",
    });

    // Use Next.js cookies API - it should handle Firebase Functions correctly
    cookieStore.set("arcgis_token", token.access_token, cookieOptions);
    cookieStore.set("arcgis_token_expiry", expiryDate.getTime().toString(), cookieOptions);

    if (token.refresh_token) {
      cookieStore.set("arcgis_refresh_token", token.refresh_token, {
        ...cookieOptions,
        expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      });
    }

    if (token.username) {
      cookieStore.set("arcgis_username", token.username, {
        ...cookieOptions,
        httpOnly: false, // Can be accessed by client
      });
    }

    console.log("✅ OAuth token stored successfully");

      // Redirect to map page - use baseUrl (from NEXTAUTH_URL/AUTH_PUBLIC_URL)
      const redirectUrl = new URL("/map", baseUrl);
      console.log("🔀 Redirecting to:", redirectUrl.toString());
    
    // Create redirect response
    const response = NextResponse.redirect(redirectUrl);
    
    // CRITICAL: Also manually set cookies on the response for Firebase Functions compatibility
    // Next.js cookies() API might not work correctly in Firebase Functions proxy environment
    const secureFlag = isProduction ? "Secure; " : "";
    const cookieExpires = expiryDate.toUTCString();
    
    response.headers.append(
      "Set-Cookie",
      `arcgis_token=${token.access_token}; HttpOnly; ${secureFlag}SameSite=Lax; Path=/; Expires=${cookieExpires}`
    );
    response.headers.append(
      "Set-Cookie",
      `arcgis_token_expiry=${expiryDate.getTime()}; HttpOnly; ${secureFlag}SameSite=Lax; Path=/; Expires=${cookieExpires}`
    );
    
    if (token.refresh_token) {
      const refreshExpires = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toUTCString();
      response.headers.append(
        "Set-Cookie",
        `arcgis_refresh_token=${token.refresh_token}; HttpOnly; ${secureFlag}SameSite=Lax; Path=/; Expires=${refreshExpires}`
      );
    }
    
    if (token.username) {
      response.headers.append(
        "Set-Cookie",
        `arcgis_username=${token.username}; ${secureFlag}SameSite=Lax; Path=/; Expires=${cookieExpires}`
      );
    }
    
    console.log("🍪 Manually set cookies on response headers for Firebase Functions");
    
    return response;
  } catch (error) {
    console.error("❌ OAuth callback error:", error);
    return NextResponse.json(
      { error: "OAuth callback failed" },
      { status: 500 }
    );
  }
}


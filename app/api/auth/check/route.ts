import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ARCGIS_PORTAL_URL } from "@/lib/arcgis/config";

/**
 * Check Authentication Route
 * Returns the current ArcGIS token status and validates the token
 */
export async function GET(req: NextRequest) {
  // CRITICAL: Read cookies directly from request headers
  // Next.js cookies() API may not work correctly in Firebase Functions proxy environment
  const cookieHeader = req.headers.get("cookie") || "";
  
  // Parse cookies manually from header string
  const parseCookies = (cookieString: string): Record<string, string> => {
    const cookies: Record<string, string> = {};
    if (!cookieString) return cookies;
    
    cookieString.split(";").forEach((cookie) => {
      const [name, ...rest] = cookie.trim().split("=");
      if (name) {
        cookies[name] = decodeURIComponent(rest.join("="));
      }
    });
    return cookies;
  };
  
  const cookieMap = parseCookies(cookieHeader);
  const token = cookieMap["arcgis_token"];
  const expiry = cookieMap["arcgis_token_expiry"];
  
  // Also try Next.js cookies() API as fallback
  const cookieStore = await cookies();
  const nextToken = cookieStore.get("arcgis_token")?.value;
  const nextExpiry = cookieStore.get("arcgis_token_expiry")?.value;
  
  // Use whichever method found the token
  const finalToken = token || nextToken;
  const finalExpiry = expiry || nextExpiry;
  
  // Debug: Log all cookies to see what's available
  const allCookies = cookieStore.getAll();
  
  console.log("🍪 AUTH CHECK - Cookies available:", {
    cookieHeaderLength: cookieHeader.length,
    cookieHeaderPreview: cookieHeader.substring(0, 200),
    parsedCookies: Object.keys(cookieMap),
    hasTokenFromHeader: !!token,
    hasTokenFromNextJS: !!nextToken,
    finalToken: !!finalToken,
    hasExpiry: !!finalExpiry,
    totalCookiesFromNextJS: allCookies.length,
    cookieNamesFromNextJS: allCookies.map(c => c.name),
    hostname: req.nextUrl.hostname,
    forwardedHost: req.headers.get("x-forwarded-host"),
  });

  if (!finalToken) {
    console.log("❌ No token found in cookies (checked both header and Next.js API)");
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  // Check if token is expired
  if (finalExpiry && Date.now() > parseInt(finalExpiry)) {
    return NextResponse.json({ authenticated: false, expired: true }, { status: 401 });
  }

  // Validate token by checking user info from portal
  try {
    const userInfoUrl = `${ARCGIS_PORTAL_URL}/sharing/rest/community/self?f=json&token=${finalToken}`;
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

    const username = cookieMap["arcgis_username"] || cookieStore.get("arcgis_username")?.value || userInfo.username;
    return NextResponse.json({ 
      authenticated: true, 
      token: finalToken, 
      username,
      userId: userInfo.username,
      orgId: userInfo.orgId,
    });
  } catch (error) {
    console.error("❌ Token validation error:", error);
    // Return token anyway if validation fails (might be network issue)
    const username = cookieMap["arcgis_username"] || cookieStore.get("arcgis_username")?.value;
    return NextResponse.json({ authenticated: true, token: finalToken, username, validated: false });
  }
}


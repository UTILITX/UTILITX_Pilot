// app/auth/arcgis/callback/route.ts
import { NextResponse } from "next/server";

/**
 * OAuth Callback Route
 * 
 * This route receives the OAuth redirect from ArcGIS with the authorization code.
 * According to Esri best practices, we should redirect to the app page WITH the code
 * so that IdentityManager.handleRedirect() can process it client-side.
 * 
 * The redirect URI must match exactly what's registered in your ArcGIS app.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    console.error("OAuth error:", error);
    return NextResponse.redirect(`http://localhost:3000/map?oauth_error=${error}`);
  }

  if (!code) {
    console.error("No authorization code in OAuth callback");
    return NextResponse.redirect("http://localhost:3000/map?error=missing_code");
  }

  // Redirect to map page WITH the code parameter
  // IdentityManager.handleRedirect() will process it client-side
  // This is the recommended Esri pattern for authorization-code flow
  return NextResponse.redirect(`http://localhost:3000/map?code=${code}&state=${url.searchParams.get("state") || ""}`);
}


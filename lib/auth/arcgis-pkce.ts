/**
 * Client-side ArcGIS PKCE OAuth Implementation
 * Industry standard approach - no server callbacks, no cookies, stateless
 */

// PKCE helper functions
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export interface ArcGISTokenResponse {
  access_token: string;
  expires_in: number;
  username?: string;
  refresh_token?: string;
  error?: string;
}

export class ArcGISPKCEAuth {
  private clientId: string;
  private portalUrl: string;
  private redirectUri: string;

  constructor(clientId: string, portalUrl: string, redirectUri: string) {
    this.clientId = clientId;
    this.portalUrl = portalUrl;
    this.redirectUri = redirectUri;
  }

  /**
   * Initiate PKCE OAuth flow - redirects to ArcGIS
   */
  async login(): Promise<void> {
    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      console.warn("🔐 Login called during SSR, skipping");
      return;
    }
    
    console.log("🔐 Starting ArcGIS PKCE OAuth flow");
    
    // Generate PKCE parameters
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    
    // Store code verifier in sessionStorage for callback
    sessionStorage.setItem('arcgis_code_verifier', codeVerifier);
    sessionStorage.setItem('arcgis_pkce_timestamp', Date.now().toString());
    
    // Build authorization URL
    const authUrl = new URL(`${this.portalUrl}/sharing/rest/oauth2/authorize`);
    authUrl.searchParams.set('client_id', this.clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', this.redirectUri);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('expiration', '20160'); // 14 days
    authUrl.searchParams.set('scope', 'openid');
    
    console.log("🔗 Redirecting to ArcGIS OAuth:", authUrl.toString());
    
    // Redirect to ArcGIS
    window.location.href = authUrl.toString();
  }

  /**
   * Handle OAuth callback - exchange code for token
   */
  async handleCallback(code: string): Promise<ArcGISTokenResponse> {
    console.log("🔄 Handling OAuth callback with code:", code.substring(0, 20) + "...");
    
    // Retrieve stored code verifier
    const codeVerifier = sessionStorage.getItem('arcgis_code_verifier');
    const timestamp = sessionStorage.getItem('arcgis_pkce_timestamp');
    
    if (!codeVerifier) {
      throw new Error('Missing PKCE code verifier - OAuth flow may have expired');
    }
    
    // Check if PKCE flow hasn't expired (10 minutes max)
    if (timestamp) {
      const age = Date.now() - parseInt(timestamp);
      if (age > 600000) { // 10 minutes
        this.clearPKCEData();
        throw new Error('PKCE flow expired - please try logging in again');
      }
    }
    
    try {
      // Exchange code for token
      const tokenResponse = await fetch(`${this.portalUrl}/sharing/rest/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          grant_type: 'authorization_code',
          code: code,
          code_verifier: codeVerifier,
          redirect_uri: this.redirectUri,
        }),
      });

      const tokenData: ArcGISTokenResponse = await tokenResponse.json();
      
      console.log("🔑 Token exchange result:", {
        hasAccessToken: !!tokenData.access_token,
        expiresIn: tokenData.expires_in,
        username: tokenData.username,
        error: tokenData.error,
      });

      if (tokenData.error || !tokenData.access_token) {
        throw new Error(tokenData.error || 'Token exchange failed');
      }

      // Store tokens in sessionStorage
      this.storeTokens(tokenData);
      
      // Clear PKCE data (one-time use)
      this.clearPKCEData();
      
      return tokenData;
      
    } catch (error) {
      console.error("❌ Token exchange failed:", error);
      this.clearPKCEData();
      throw error;
    }
  }

  /**
   * Store tokens in sessionStorage
   */
  private storeTokens(tokenData: ArcGISTokenResponse): void {
    const expiryTime = Date.now() + (tokenData.expires_in * 1000);
    
    sessionStorage.setItem('arcgis_access_token', tokenData.access_token);
    sessionStorage.setItem('arcgis_token_expiry', expiryTime.toString());
    
    if (tokenData.username) {
      sessionStorage.setItem('arcgis_username', tokenData.username);
    }
    
    if (tokenData.refresh_token) {
      sessionStorage.setItem('arcgis_refresh_token', tokenData.refresh_token);
    }
    
    console.log("✅ Tokens stored in sessionStorage");
  }

  /**
   * Get current access token from sessionStorage
   */
  getAccessToken(): string | null {
    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      return null;
    }
    
    const token = sessionStorage.getItem('arcgis_access_token');
    const expiry = sessionStorage.getItem('arcgis_token_expiry');
    
    if (!token || !expiry) {
      return null;
    }
    
    // Check if token is expired
    if (Date.now() > parseInt(expiry)) {
      console.log("⏰ Token expired, clearing storage");
      this.logout();
      return null;
    }
    
    return token;
  }

  /**
   * Get current username
   */
  getUsername(): string | null {
    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      return null;
    }
    
    return sessionStorage.getItem('arcgis_username');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  /**
   * Logout - clear all stored data
   */
  logout(): void {
    console.log("🚪 Logging out - clearing all auth data");
    
    // Clear all auth-related sessionStorage
    sessionStorage.removeItem('arcgis_access_token');
    sessionStorage.removeItem('arcgis_token_expiry');
    sessionStorage.removeItem('arcgis_username');
    sessionStorage.removeItem('arcgis_refresh_token');
    
    this.clearPKCEData();
  }

  /**
   * Clear PKCE-specific data
   */
  private clearPKCEData(): void {
    sessionStorage.removeItem('arcgis_code_verifier');
    sessionStorage.removeItem('arcgis_pkce_timestamp');
  }

  /**
   * Get token info for debugging
   */
  getTokenInfo(): { hasToken: boolean; username: string | null; expiresAt: Date | null } {
    const token = this.getAccessToken();
    const username = this.getUsername();
    const expiry = sessionStorage.getItem('arcgis_token_expiry');
    
    return {
      hasToken: !!token,
      username,
      expiresAt: expiry ? new Date(parseInt(expiry)) : null,
    };
  }
}

// Default instance using environment variables directly to avoid import issues
export const arcgisAuth = new ArcGISPKCEAuth(
  process.env.NEXT_PUBLIC_ARCGIS_CLIENT_ID || 'X59peolTbh7J43eY',
  process.env.NEXT_PUBLIC_ARCGIS_PORTAL_URL || 'https://indib78f3690c643.maps.arcgis.com',
  typeof window !== 'undefined' 
    ? `${window.location.origin}/auth/arcgis`
    : 'https://utilitx-pilot-a01bb.web.app/auth/arcgis'
);

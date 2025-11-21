/**
 * ArcGIS OAuth Token Management
 * Handles token storage, retrieval, and validation
 */

const TOKEN_COOKIE_NAME = "arcgis_token";
const TOKEN_EXPIRY_COOKIE_NAME = "arcgis_token_expiry";

export interface ArcGISToken {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  username?: string;
}

/**
 * Store token in cookies (client-side)
 */
export function storeToken(token: ArcGISToken) {
  if (typeof document === "undefined") return;

  const expiresIn = token.expires_in || 7200; // Default 2 hours
  const expiryDate = new Date(Date.now() + expiresIn * 1000);

  // Store token
  document.cookie = `${TOKEN_COOKIE_NAME}=${token.access_token}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax; Secure`;
  
  // Store expiry
  document.cookie = `${TOKEN_EXPIRY_COOKIE_NAME}=${expiryDate.getTime()}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax; Secure`;
  
  // Store refresh token if available
  if (token.refresh_token) {
    document.cookie = `arcgis_refresh_token=${token.refresh_token}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax; Secure`;
  }
}

/**
 * Get token from cookies (client-side)
 */
export function getToken(): string | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";");
  const tokenCookie = cookies.find((c) => c.trim().startsWith(`${TOKEN_COOKIE_NAME}=`));
  
  if (!tokenCookie) return null;

  const token = tokenCookie.split("=")[1];
  
  // Check if token is expired
  const expiryCookie = cookies.find((c) => c.trim().startsWith(`${TOKEN_EXPIRY_COOKIE_NAME}=`));
  if (expiryCookie) {
    const expiry = parseInt(expiryCookie.split("=")[1]);
    if (Date.now() > expiry) {
      clearToken();
      return null;
    }
  }

  return token || null;
}

/**
 * Get token from cookies (server-side)
 */
export function getTokenFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split("=");
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  const token = cookies[TOKEN_COOKIE_NAME];
  if (!token) return null;

  // Check expiry
  const expiry = cookies[TOKEN_EXPIRY_COOKIE_NAME];
  if (expiry && Date.now() > parseInt(expiry)) {
    return null;
  }

  return token;
}

/**
 * Clear token from cookies
 */
export function clearToken() {
  if (typeof document === "undefined") return;

  document.cookie = `${TOKEN_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  document.cookie = `${TOKEN_EXPIRY_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  document.cookie = `arcgis_refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getToken() !== null;
}


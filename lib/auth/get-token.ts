/**
 * Helper function to get the current ArcGIS access token
 * This replaces the old /api/auth/check endpoint calls
 */

import { arcgisAuth } from './arcgis-pkce';

export function getArcGISToken(): string | null {
  return arcgisAuth.getAccessToken();
}

export function getArcGISUsername(): string | null {
  return arcgisAuth.getUsername();
}

export function isAuthenticated(): boolean {
  return arcgisAuth.isAuthenticated();
}





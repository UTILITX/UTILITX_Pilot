// lib/arcgis/saveWorkArea.ts
"use client";

import type { LatLng } from "leaflet";
import {
  WORK_AREAS_LAYER_URL,
  WORK_AREAS_SERVER_URL,
  ARCGIS_PORTAL_URL,
} from "./config";

type SaveWorkAreaOptions = {
  geometry: any; // ArcGIS Polygon - imported dynamically
  attributes: Record<string, any>;
};

// Backward compatibility: accept (workAreaUrl, polygon) signature
export async function saveWorkArea(
  workAreaUrlOrOptions: string | SaveWorkAreaOptions,
  polygon?: LatLng[]
): Promise<any> {
  // SSR guard
  if (typeof window === "undefined") {
    throw new Error("saveWorkArea can only be called in the browser");
  }

  // Handle old signature: saveWorkArea(workAreaUrl, polygon)
  if (typeof workAreaUrlOrOptions === "string" && polygon) {
    // Convert LatLng[] to ArcGIS Polygon rings format
    const rings = [polygon.map((p) => [p.lng, p.lat])];
    
    // Dynamically import Polygon to avoid SSR issues
    const PolygonClass = (await import("@arcgis/core/geometry/Polygon")).default;
    
    const geometry = new PolygonClass({
      rings,
      spatialReference: { wkid: 4326 },
    });
    
    const attributes = {
      created_at: new Date().toISOString(),
    };
    
    return saveWorkAreaInternal({ geometry, attributes });
  }

  // Handle new signature: saveWorkArea({ geometry, attributes })
  if (typeof workAreaUrlOrOptions === "object" && workAreaUrlOrOptions.geometry) {
    return saveWorkAreaInternal(workAreaUrlOrOptions);
  }

  throw new Error("Invalid arguments to saveWorkArea");
}

async function saveWorkAreaInternal({ geometry, attributes }: SaveWorkAreaOptions) {
  // Dynamically import ArcGIS modules to avoid SSR issues
  const esriId = (await import("@arcgis/core/identity/IdentityManager")).default;
  const { ARCGIS_CLIENT_ID, ARCGIS_PORTAL_URL: PORTAL_URL } = await import("./config");

  // Get token from client-side auth
  let token: string | null = null;
  let username: string | null = null;
  try {
    const { getArcGISToken, getArcGISUsername } = await import('@/lib/auth/get-token');
    token = getArcGISToken();
    username = getArcGISUsername();
    console.log("✅ [saveWorkArea] Got OAuth token from client-side auth");
  } catch (err) {
    console.error("❌ [saveWorkArea] Failed to get token from API:", err);
    throw new Error("Authentication required. Please log in.");
  }

  if (!token) {
    console.error("❌ [saveWorkArea] No token available");
    throw new Error("No authentication token available. Please log in.");
  }

  // Note: OAuth tokens from the org portal should work for services in the same org
  // If they don't, it's likely a permissions/scope issue, not a token format issue

  // CRITICAL: Save OAuth infos so we can restore them later
  // IdentityManager's registerOAuthInfos causes it to intercept requests and use OAuth credentials
  // instead of our registered token. We'll temporarily unregister them.
  console.log("🔍 [saveWorkArea] Saving OAuth infos for later restoration...");
  let savedOAuthInfos: any[] = [];
  try {
    if (esriId.oAuthInfos && esriId.oAuthInfos.length > 0) {
      savedOAuthInfos = [...esriId.oAuthInfos];
      console.log("🔍 [saveWorkArea] Found", savedOAuthInfos.length, "registered OAuth infos");
    }
  } catch (e) {
    console.warn("[saveWorkArea] Could not access OAuth infos:", e);
  }
  
  // Clear any cached credentials from IdentityManager to ensure we use the fresh token
  console.log("🔍 [saveWorkArea] Clearing old IdentityManager credentials...");
  try {
    // Destroy all credentials first
    esriId.destroyCredentials();
    
    // Also clear any cached credentials from browser storage
    // IdentityManager may cache credentials in localStorage/sessionStorage
    // ArcGIS JS API typically stores credentials with keys like "esri_oauth_state", "arcgis_oauth_*", etc.
    if (typeof window !== "undefined") {
      try {
        // Clear localStorage
        if (window.localStorage) {
          const localStorageKeys = Object.keys(localStorage);
          localStorageKeys.forEach((key) => {
            if (
              key.toLowerCase().includes("arcgis") ||
              key.toLowerCase().includes("credential") ||
              key.toLowerCase().includes("esri") ||
              key.toLowerCase().includes("oauth")
            ) {
              console.log("🔍 [saveWorkArea] Clearing localStorage credential:", key);
              localStorage.removeItem(key);
            }
          });
        }
        
        // Clear sessionStorage
        if (window.sessionStorage) {
          const sessionStorageKeys = Object.keys(sessionStorage);
          sessionStorageKeys.forEach((key) => {
            if (
              key.toLowerCase().includes("arcgis") ||
              key.toLowerCase().includes("credential") ||
              key.toLowerCase().includes("esri") ||
              key.toLowerCase().includes("oauth")
            ) {
              console.log("🔍 [saveWorkArea] Clearing sessionStorage credential:", key);
              sessionStorage.removeItem(key);
            }
          });
        }
      } catch (e) {
        console.warn("[saveWorkArea] Error clearing browser storage:", e);
      }
    }
    
    // Wait a moment to ensure credentials are cleared
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    console.log("✅ [saveWorkArea] Cleared old credentials");
  } catch (err) {
    console.warn("[saveWorkArea] Error clearing credentials (might be empty):", err);
  }

  // Register server and token with IdentityManager
  try {
    if (WORK_AREAS_SERVER_URL && ARCGIS_PORTAL_URL) {
      // Register the server mapping (so IdentityManager knows where to get tokens for this server)
      esriId.registerServers([
        {
          server: WORK_AREAS_SERVER_URL.trim(),
          tokenServiceUrl: `${ARCGIS_PORTAL_URL}/sharing/oauth2/token`,
        },
      ]);

      // Register the token for BOTH the portal AND the feature server
      // This ensures FeatureLayer can authenticate against the server hosting the layer
      
      // 1. Register for portal (for sharing/rest operations)
      esriId.registerToken({
        server: ARCGIS_PORTAL_URL,
        token: token,
        userId: username || "user",
        expires: Date.now() + 7200000, // 2 hours from now
      });

      // 2. Register for feature server (where the layer actually lives)
      // CRITICAL: Register token with exact server URL to prevent IdentityManager from using OAuth flow
      esriId.registerToken({
        server: WORK_AREAS_SERVER_URL.trim(),
        token: token,
        userId: username || "user",
        expires: Date.now() + 7200000, // 2 hours from now
        ssl: false, // Don't require SSL for server tokens
      });
      
      // Also register with the exact layer URL to ensure IdentityManager finds this token
      // IdentityManager matches tokens by server URL, so we need to register for the exact URL
      const exactLayerUrl = WORK_AREAS_LAYER_URL.substring(0, WORK_AREAS_LAYER_URL.lastIndexOf("/"));
      esriId.registerToken({
        server: exactLayerUrl,
        token: token,
        userId: username || "user",
        expires: Date.now() + 7200000,
        ssl: false,
      });

      // 3. Also register for the sharing/rest endpoint (some operations use this)
      const sharingRestUrl = `${ARCGIS_PORTAL_URL}/sharing/rest`;
      esriId.registerToken({
        server: sharingRestUrl,
        token: token,
        userId: username || "user",
        expires: Date.now() + 7200000,
      });

      // 4. Register for the exact layer URL (some FeatureLayer operations check this)
      // Extract the server base URL from the layer URL
      const layerServerUrl = WORK_AREAS_LAYER_URL.substring(0, WORK_AREAS_LAYER_URL.indexOf("/FeatureServer"));
      if (layerServerUrl) {
        esriId.registerToken({
          server: layerServerUrl,
          token: token,
          userId: username || "user",
          expires: Date.now() + 7200000,
        });
      }

      // 5. CRITICAL: Register token for the EXACT layer URL to ensure IdentityManager finds it
      // When FeatureLayer makes requests, IdentityManager matches by server URL, so we need
      // to register for the exact URL that will be requested
      esriId.registerToken({
        server: WORK_AREAS_LAYER_URL,
        token: token,
        userId: username || "user",
        expires: Date.now() + 7200000,
      });

      // 6. Also register for the FeatureServer base URL (without layer ID)
      const featureServerBaseUrl = WORK_AREAS_LAYER_URL.substring(0, WORK_AREAS_LAYER_URL.lastIndexOf("/"));
      if (featureServerBaseUrl && featureServerBaseUrl !== layerServerUrl) {
        esriId.registerToken({
          server: featureServerBaseUrl,
          token: token,
          userId: username || "user",
          expires: Date.now() + 7200000,
        });
      }

      console.log("✅ [saveWorkArea] Token registered with IdentityManager");
      console.log("🔍 [saveWorkArea] Registered servers:", {
        portal: ARCGIS_PORTAL_URL,
        server: WORK_AREAS_SERVER_URL.trim(),
        sharingRest: sharingRestUrl,
        layerServer: layerServerUrl || "N/A",
        exactLayerUrl: WORK_AREAS_LAYER_URL,
        featureServerBase: featureServerBaseUrl || "N/A",
      });
    } else {
      console.warn(
        "[saveWorkArea] WORK_AREAS_SERVER_URL or ARCGIS_PORTAL_URL missing; skipping registerServers."
      );
    }
  } catch (err) {
    console.error("[saveWorkArea] registerServers/registerToken failed:", err);
    // Continue anyway - we'll pass token directly to FeatureLayer
  }

  // SKIP FeatureLayer creation entirely - IdentityManager intercepts it and uses cached token
  // We'll call the REST API directly with our token instead

  // CRITICAL: Skip layer.load() entirely - IdentityManager intercepts it and uses cached token
  // Instead, prepare geometry and call REST API directly with our token
  console.log("🔍 [saveWorkArea] Skipping layer.load() to avoid IdentityManager token interception");
  console.log("🔍 [saveWorkArea] Preparing geometry for direct REST API call...");

  // Convert geometry to ArcGIS REST API format
  // The geometry is already an ArcGIS Polygon, but we need to ensure it's in the right format
  let geometryForAPI: any;
  if (geometry.toJSON) {
    geometryForAPI = geometry.toJSON();
  } else if (geometry.rings) {
    geometryForAPI = {
      rings: geometry.rings,
      spatialReference: geometry.spatialReference || { wkid: 4326 },
    };
  } else {
    geometryForAPI = geometry;
  }

  console.log("✅ [saveWorkArea] Geometry prepared, making direct REST API call...");
  console.log("🔍 [saveWorkArea] Layer URL:", WORK_AREAS_LAYER_URL);
  console.log("🔍 [saveWorkArea] Token present:", !!token);
  console.log("🔍 [saveWorkArea] Attributes:", attributes);
  
  // CRITICAL: Make the request directly using fetch to bypass IdentityManager
  // IdentityManager is intercepting and using cached token, so we'll call the REST API directly
  console.log("🔍 [saveWorkArea] Bypassing IdentityManager - calling REST API directly...");
  console.log("🔍 [saveWorkArea] Using token:", token ? `${token.substring(0, 30)}...` : "null");
  
  try {
    // Call applyEdits directly via REST API with our token
    const applyEditsUrl = `${WORK_AREAS_LAYER_URL}/applyEdits`;
    const formData = new FormData();
    formData.append("f", "json");
    formData.append("token", token || "");
    formData.append("adds", JSON.stringify([{
      geometry: geometryForAPI,
      attributes: attributes,
    }]));

    console.log("🔍 [saveWorkArea] Making direct REST API call to:", applyEditsUrl);
    console.log("🔍 [saveWorkArea] Token in request:", token ? `${token.substring(0, 30)}...` : "null");
    
    const response = await fetch(applyEditsUrl, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    
    console.log("✅ [saveWorkArea] Direct REST API response:", result);

    if (result.error) {
      console.error("❌ [saveWorkArea] Direct REST API error:", result.error);
      throw new Error(
        `ArcGIS applyEdits failed: ${result.error.message || "Unknown error"} (code ${result.error.code || "unknown"})`
      );
    }

    const addResult = result.addResults?.[0];
    if (addResult?.error) {
      console.error("❌ [saveWorkArea] addResults error:", addResult.error);
      throw new Error(
        `ArcGIS applyEdits failed: ${addResult.error.message} (code ${addResult.error.code})`
      );
    }

    console.log("✅ [saveWorkArea] Successfully saved work area via direct REST API!");
    console.log("🔍 [saveWorkArea] Feature ID:", addResult?.objectId);
    console.log("🔍 [saveWorkArea] Success:", addResult?.success);

    return addResult;
  } catch (fetchError: any) {
    console.error("❌ [saveWorkArea] Direct REST API call failed:", fetchError);
    console.error("❌ [saveWorkArea] Error details:", {
      name: fetchError?.name,
      message: fetchError?.message,
      stack: fetchError?.stack,
    });
    
    // If direct call fails, we can't fall back to FeatureLayer because IdentityManager
    // will intercept and use the wrong token. Just throw the error.
    console.error("❌ [saveWorkArea] Direct REST API call failed. Cannot use FeatureLayer fallback because IdentityManager intercepts with wrong token.");
    throw fetchError;
  } finally {
    // Restore OAuth infos after we're done
    if (savedOAuthInfos.length > 0) {
      try {
        console.log("🔍 [saveWorkArea] Restoring OAuth infos...");
        // @ts-ignore - Accessing internal property to restore OAuth infos
        if (esriId.oAuthInfos) {
          savedOAuthInfos.forEach(info => {
            if (!esriId.oAuthInfos.some((existing: any) => existing.appId === info.appId && existing.portalUrl === info.portalUrl)) {
              esriId.oAuthInfos.push(info);
            }
          });
        }
      } catch (e) {
        console.warn("[saveWorkArea] Could not restore OAuth infos:", e);
      }
    }
  }
}


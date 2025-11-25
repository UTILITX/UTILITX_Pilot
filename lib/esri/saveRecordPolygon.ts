"use client";

import type { LatLng } from "leaflet";

export async function saveRecordPolygon(
  polygonUrl: string,
  coords: LatLng[],
  metadata: any
) {
  // SSR guard
  if (typeof window === "undefined") {
    throw new Error("saveRecordPolygon can only be called in the browser");
  }

  console.log("🔍 [saveRecordPolygon] Getting OAuth token from API...");

  // Get token from API (since it's in httpOnly cookie)
  let token: string | null = null;
  let username: string | null = null;
  try {
    const { getArcGISToken, getArcGISUsername } = await import('@/lib/auth/get-token');
    token = getArcGISToken();
    username = getArcGISUsername();
    console.log("✅ [saveRecordPolygon] Got OAuth token from client-side auth");
    console.log("🔍 [saveRecordPolygon] Token length:", token?.length || 0);
    console.log("🔍 [saveRecordPolygon] Username:", username);
  } catch (err) {
    console.error("❌ [saveRecordPolygon] Failed to get token from client-side auth:", err);
    throw new Error("Authentication required. Please log in.");
  }

  if (!token) {
    console.error("❌ [saveRecordPolygon] No token available");
    throw new Error("No authentication token available. Please log in.");
  }

  // Prepare geometry in ArcGIS format
  const rings = [coords.map((p) => [p.lng, p.lat])];

  const geometry = {
    rings: rings,
    spatialReference: { wkid: 4326 },
  };

  const attributes = {
    ...metadata,
    created_at: new Date().toISOString(),
  };

  console.log("💾 [saveRecordPolygon] Saving record polygon via direct REST API...");
  console.log("🔍 [saveRecordPolygon] Layer URL:", polygonUrl);
  console.log("🔍 [saveRecordPolygon] Token present:", !!token);

  // CRITICAL: Make direct REST API call to bypass IdentityManager
  // IdentityManager intercepts FeatureLayer requests and uses cached tokens
  // By calling the REST API directly with fetch, we use the correct token
  try {
    const applyEditsUrl = `${polygonUrl}/applyEdits`;
    const formData = new FormData();
    formData.append("f", "json");
    formData.append("token", token || "");
    formData.append("adds", JSON.stringify([{
      geometry: geometry,
      attributes: attributes,
    }]));

    console.log("🔍 [saveRecordPolygon] Making direct REST API call to:", applyEditsUrl);

    const response = await fetch(applyEditsUrl, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    console.log("✅ [saveRecordPolygon] Direct REST API response:", result);

    if (result.error) {
      console.error("❌ [saveRecordPolygon] Direct REST API error:", result.error);
      throw new Error(
        `ArcGIS applyEdits failed: ${result.error.message || "Unknown error"} (code ${result.error.code || "unknown"})`
      );
    }

    const addResult = result.addResults?.[0];
    if (addResult?.error) {
      console.error("❌ [saveRecordPolygon] addResults error:", addResult.error);
      throw new Error(
        `ArcGIS applyEdits failed: ${addResult.error.message} (code ${addResult.error.code})`
      );
    }

    if (!addResult?.success) {
      console.error("❌ [saveRecordPolygon] Save was not successful:", addResult);
      throw new Error("Failed to save record polygon: Save operation returned unsuccessful");
    }

    console.log("✅ [saveRecordPolygon] Successfully saved record polygon via direct REST API!");
    console.log("🔍 [saveRecordPolygon] Feature ID:", addResult?.objectId);
    
    return addResult;
  } catch (fetchError: any) {
    console.error("❌ [saveRecordPolygon] Direct REST API call failed:", fetchError);
    throw fetchError;
  }
}

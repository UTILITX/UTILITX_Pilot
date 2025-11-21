"use client";

import type { LatLng } from "leaflet";

export async function saveRecordLine(
  lineUrl: string,
  coords: LatLng[],
  metadata: any
) {
  // SSR guard
  if (typeof window === "undefined") {
    throw new Error("saveRecordLine can only be called in the browser");
  }

  console.log("🔍 [saveRecordLine] Getting OAuth token from API...");

  // Get token from API (since it's in httpOnly cookie)
  let token: string | null = null;
  let username: string | null = null;
  try {
    const response = await fetch("/api/auth/check");
    if (response.ok) {
      const data = await response.json();
      if (data.authenticated && data.token) {
        token = data.token;
        username = data.username || null;
        console.log("✅ [saveRecordLine] Got OAuth token from API");
        console.log("🔍 [saveRecordLine] Token length:", token?.length || 0);
        console.log("🔍 [saveRecordLine] Username:", username);
      } else {
        console.error("❌ [saveRecordLine] Token check returned:", data);
      }
    } else {
      const errorText = await response.text();
      console.error("❌ [saveRecordLine] Token check failed:", response.status, errorText);
    }
  } catch (err) {
    console.error("❌ [saveRecordLine] Failed to get token from API:", err);
    throw new Error("Authentication required. Please log in.");
  }

  if (!token) {
    console.error("❌ [saveRecordLine] No token available");
    throw new Error("No authentication token available. Please log in.");
  }

  // Prepare geometry in ArcGIS format
  const paths = [coords.map((p) => [p.lng, p.lat])];

  const geometry = {
    paths: paths,
    spatialReference: { wkid: 4326 },
  };

  const attributes = {
    ...metadata,
    created_at: new Date().toISOString(),
  };

  console.log("💾 [saveRecordLine] Saving record line via direct REST API...");
  console.log("🔍 [saveRecordLine] Layer URL:", lineUrl);
  console.log("🔍 [saveRecordLine] Token present:", !!token);

  // CRITICAL: Make direct REST API call to bypass IdentityManager
  // IdentityManager intercepts FeatureLayer requests and uses cached tokens
  // By calling the REST API directly with fetch, we use the correct token
  try {
    const applyEditsUrl = `${lineUrl}/applyEdits`;
    const formData = new FormData();
    formData.append("f", "json");
    formData.append("token", token || "");
    formData.append("adds", JSON.stringify([{
      geometry: geometry,
      attributes: attributes,
    }]));

    console.log("🔍 [saveRecordLine] Making direct REST API call to:", applyEditsUrl);

    const response = await fetch(applyEditsUrl, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    console.log("✅ [saveRecordLine] Direct REST API response:", result);

    if (result.error) {
      console.error("❌ [saveRecordLine] Direct REST API error:", result.error);
      throw new Error(
        `ArcGIS applyEdits failed: ${result.error.message || "Unknown error"} (code ${result.error.code || "unknown"})`
      );
    }

    const addResult = result.addResults?.[0];
    if (addResult?.error) {
      console.error("❌ [saveRecordLine] addResults error:", addResult.error);
      throw new Error(
        `ArcGIS applyEdits failed: ${addResult.error.message} (code ${addResult.error.code})`
      );
    }

    if (!addResult?.success) {
      console.error("❌ [saveRecordLine] Save was not successful:", addResult);
      throw new Error("Failed to save record line: Save operation returned unsuccessful");
    }

    console.log("✅ [saveRecordLine] Successfully saved record line via direct REST API!");
    console.log("🔍 [saveRecordLine] Feature ID:", addResult?.objectId);
    
    return addResult;
  } catch (fetchError: any) {
    console.error("❌ [saveRecordLine] Direct REST API call failed:", fetchError);
    throw fetchError;
  }
}

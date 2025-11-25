"use client";

export async function saveRecordPoint(
  recordUrl: string,
  lat: number,
  lng: number,
  metadata: any
) {
  // SSR guard
  if (typeof window === "undefined") {
    throw new Error("saveRecordPoint can only be called in the browser");
  }

  console.log("🔍 [saveRecordPoint] Getting OAuth token from API...");

  // Get token from API (since it's in httpOnly cookie)
  let token: string | null = null;
  let username: string | null = null;
  try {
    const { getArcGISToken, getArcGISUsername } = await import('@/lib/auth/get-token');
    token = getArcGISToken();
    username = getArcGISUsername();
    console.log("✅ [saveRecordPoint] Got OAuth token from client-side auth");
    console.log("🔍 [saveRecordPoint] Token length:", token?.length || 0);
    console.log("🔍 [saveRecordPoint] Username:", username);
  } catch (err) {
    console.error("❌ [saveRecordPoint] Failed to get token from client-side auth:", err);
    throw new Error("Authentication required. Please log in.");
  }

  if (!token) {
    console.error("❌ [saveRecordPoint] No token available");
    throw new Error("No authentication token available. Please log in.");
  }

  // Prepare geometry in ArcGIS format
  const geometry = {
    x: lng,
    y: lat,
    spatialReference: { wkid: 4326 },
  };

  const attributes = {
    ...metadata,
    created_at: new Date().toISOString(),
  };

  console.log("💾 [saveRecordPoint] Saving record point via direct REST API...");
  console.log("🔍 [saveRecordPoint] Layer URL:", recordUrl);
  console.log("🔍 [saveRecordPoint] Token present:", !!token);

  // CRITICAL: Make direct REST API call to bypass IdentityManager
  // IdentityManager intercepts FeatureLayer requests and uses cached tokens
  // By calling the REST API directly with fetch, we use the correct token
  try {
    const applyEditsUrl = `${recordUrl}/applyEdits`;
    const formData = new FormData();
    formData.append("f", "json");
    formData.append("token", token || "");
    formData.append("adds", JSON.stringify([{
      geometry: geometry,
      attributes: attributes,
    }]));

    console.log("🔍 [saveRecordPoint] Making direct REST API call to:", applyEditsUrl);

    const response = await fetch(applyEditsUrl, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    console.log("✅ [saveRecordPoint] Direct REST API response:", result);

    if (result.error) {
      console.error("❌ [saveRecordPoint] Direct REST API error:", result.error);
      throw new Error(
        `ArcGIS applyEdits failed: ${result.error.message || "Unknown error"} (code ${result.error.code || "unknown"})`
      );
    }

    const addResult = result.addResults?.[0];
    if (addResult?.error) {
      console.error("❌ [saveRecordPoint] addResults error:", addResult.error);
      throw new Error(
        `ArcGIS applyEdits failed: ${addResult.error.message} (code ${addResult.error.code})`
      );
    }

    if (!addResult?.success) {
      console.error("❌ [saveRecordPoint] Save was not successful:", addResult);
      throw new Error("Failed to save record point: Save operation returned unsuccessful");
    }

    console.log("✅ [saveRecordPoint] Successfully saved record point via direct REST API!");
    console.log("🔍 [saveRecordPoint] Feature ID:", addResult?.objectId);
    
    return addResult;
  } catch (fetchError: any) {
    console.error("❌ [saveRecordPoint] Direct REST API call failed:", fetchError);
    throw fetchError;
  }
}

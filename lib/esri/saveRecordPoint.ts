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

  // Dynamically import ArcGIS modules to avoid SSR issues
  const FeatureLayer = (await import("@arcgis/core/layers/FeatureLayer")).default;
  const IdentityManager = (await import("@arcgis/core/identity/IdentityManager")).default;

  // Register services domain
  IdentityManager.registerServers([{ url: "https://services7.arcgis.com" }]);

  const portalUrl = process.env.NEXT_PUBLIC_ARCGIS_PORTAL_URL || "https://indib78f3690c643.maps.arcgis.com";

  const credential =
    IdentityManager.findCredential(recordUrl) ||
    IdentityManager.findCredential("https://services7.arcgis.com") ||
    IdentityManager.findCredential(portalUrl);

  // Create FeatureLayer
  const layer = new FeatureLayer({
    url: recordUrl,
    outFields: ["*"],
  });

  // Attach credential if found
  if (credential) {
    layer.credential = credential;
  }

  const geometry = {
    type: "point",
    x: lng,
    y: lat,
    spatialReference: { wkid: 4326 },
  };

  const attributes = {
    ...metadata,
    created_at: new Date().toISOString(),
  };

  console.log("💾 Saving record point with OAuth authentication...");
  
  const response = await layer.applyEdits({
    addFeatures: [{ geometry, attributes }],
  });

  // Check for errors
  if (response.addFeatureResults && response.addFeatureResults.length > 0) {
    const result = response.addFeatureResults[0];
    if (!result.success) {
      console.error("❌ Failed to save record point:", result.error);
      throw new Error(result.error?.description || "Failed to save record point");
    }
    console.log("✅ Record point saved successfully:", result.objectId);
  }

  return response;
}


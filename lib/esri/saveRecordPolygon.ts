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

  // Dynamically import ArcGIS modules to avoid SSR issues
  const FeatureLayer = (await import("@arcgis/core/layers/FeatureLayer")).default;
  const IdentityManager = (await import("@arcgis/core/identity/IdentityManager")).default;

  // Register services domain
  IdentityManager.registerServers([{ url: "https://services7.arcgis.com" }]);

  const portalUrl = process.env.NEXT_PUBLIC_ARCGIS_PORTAL_URL || "https://indib78f3690c643.maps.arcgis.com";

  const credential =
    IdentityManager.findCredential(polygonUrl) ||
    IdentityManager.findCredential("https://services7.arcgis.com") ||
    IdentityManager.findCredential(portalUrl);

  // Create FeatureLayer
  const layer = new FeatureLayer({
    url: polygonUrl,
    outFields: ["*"],
  });

  // Attach credential if found
  if (credential) {
    layer.credential = credential;
  }

  const rings = [coords.map((p) => [p.lng, p.lat])];

  const geometry = {
    type: "polygon",
    rings,
    spatialReference: { wkid: 4326 },
  };

  const attributes = {
    ...metadata,
    created_at: new Date().toISOString(),
  };

  console.log("💾 Saving record polygon with OAuth authentication...");
  
  const response = await layer.applyEdits({
    addFeatures: [{ geometry, attributes }],
  });

  // Check for errors
  if (response.addFeatureResults && response.addFeatureResults.length > 0) {
    const result = response.addFeatureResults[0];
    if (!result.success) {
      console.error("❌ Failed to save record polygon:", result.error);
      throw new Error(result.error?.description || "Failed to save record polygon");
    }
    console.log("✅ Record polygon saved successfully:", result.objectId);
  }

  return response;
}


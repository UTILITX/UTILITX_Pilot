"use client";

import type { LatLng } from "leaflet";

export async function saveWorkArea(workAreaUrl: string, polygon: LatLng[]) {
  // SSR guard
  if (typeof window === "undefined") {
    throw new Error("saveWorkArea can only be called in the browser");
  }

  // Dynamically import ArcGIS modules to avoid SSR issues
  const FeatureLayer = (await import("@arcgis/core/layers/FeatureLayer")).default;
  const IdentityManager = (await import("@arcgis/core/identity/IdentityManager")).default;

  console.log("🔍 [saveWorkArea] Registering FeatureServer → Portal OAuth");

  // ⭐ Required fix: ArcGIS NEVER auto-registers services7.arcgis.com
  IdentityManager.registerServers([{ url: "https://services7.arcgis.com" }]);

  console.log("🔍 Looking for credential for:", workAreaUrl);

  const portalUrl = process.env.NEXT_PUBLIC_ARCGIS_PORTAL_URL || "https://indib78f3690c643.maps.arcgis.com";

  const credential =
    IdentityManager.findCredential(workAreaUrl) ||
    IdentityManager.findCredential("https://services7.arcgis.com") ||
    IdentityManager.findCredential(portalUrl);

  console.log("   ➜ Credential found?", !!credential);

  if (!credential) {
    console.error("❌ No valid OAuth credential found");
    throw new Error("No OAuth session active");
  }

  // Create FeatureLayer
  const layer = new FeatureLayer({
    url: workAreaUrl,
    outFields: ["*"],
  });

  // Attach credential to layer
  layer.credential = credential;

  const rings = [polygon.map((p) => [p.lng, p.lat])];

  const geometry = {
    type: "polygon",
    rings,
    spatialReference: { wkid: 4326 },
  };

  const attributes = {
    created_at: new Date().toISOString(),
    ...(credential.userId && { created_by: credential.userId }),
  };

  console.log("💾 Saving work area with OAuth authentication...");

  // Apply edits - credential is already attached to the layer
  const response = await layer.applyEdits({
    addFeatures: [{ geometry, attributes }],
  });

  // Check for errors in the response
  if (response.addFeatureResults && response.addFeatureResults.length > 0) {
    const result = response.addFeatureResults[0];
    if (!result.success) {
      console.error("❌ Failed to save work area:", result.error);
      throw new Error(result.error?.description || "Failed to save work area");
    }
    console.log("✅ Work area saved successfully:", result.objectId);
  }

  return response;
}


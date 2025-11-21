"use client";

/**
 * Creates a FeatureLayer and automatically attaches the active OAuth token.
 * Uses dynamic imports to avoid SSR issues.
 */
export async function createAuthedFeatureLayer(url: string) {
  // SSR guard
  if (typeof window === "undefined") {
    throw new Error("createAuthedFeatureLayer can only be called in the browser");
  }

  // Dynamically import ArcGIS modules to avoid SSR issues
  const FeatureLayer = (await import("@arcgis/core/layers/FeatureLayer")).default;
  const IdentityManager = (await import("@arcgis/core/identity/IdentityManager")).default;

  const credential = IdentityManager.findCredential(url);

  return new FeatureLayer({
    url,
    outFields: ["*"],
    // Attach token if present
    token: credential?.token,
  });
}


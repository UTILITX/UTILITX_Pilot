/**
 * Initializes ArcGIS API key for basemaps and public services
 * 
 * IMPORTANT: This should ONLY be used for:
 * - Basemaps (Streets, Imagery, Topo, etc.)
 * - Geocoding
 * - Directions
 * - Public FeatureLayers
 * 
 * DO NOT use this for secured FeatureLayers - use OAuth instead
 * 
 * This file separates basemap authentication from secured layer authentication
 * to prevent conflicts between API key and OAuth token.
 */

import { ARCGIS_PORTAL_URL } from "./arcgis/config";

export function initBasemapApiKey() {
  // Only run in browser (not SSR)
  if (typeof window === "undefined") {
    return;
  }

  const key = process.env.NEXT_PUBLIC_ARCGIS_API_KEY;
  if (!key) {
    console.warn("⚠️ ArcGIS basemap API key missing. Basemaps may not load correctly.");
    return;
  }

  // Dynamically import esriConfig to avoid SSR issues
  import("@arcgis/core/config").then((esriConfigModule) => {
    const esriConfig = esriConfigModule.default;
    
    // Set portal URL to your org portal (with /sharing/rest suffix)
    esriConfig.portalUrl = `${ARCGIS_PORTAL_URL}/sharing/rest`;
    
    // Only set if not already set (to avoid overriding OAuth)
    if (!esriConfig.apiKey) {
      esriConfig.apiKey = key;
      console.log("✅ ArcGIS API key initialized for basemaps");
    } else {
      console.log("ℹ️ ArcGIS API key already set (possibly by another component)");
    }
    console.log("✅ ArcGIS portal URL set to org portal:", ARCGIS_PORTAL_URL);
  }).catch((error) => {
    console.error("❌ Error initializing ArcGIS API key:", error);
  });
}

